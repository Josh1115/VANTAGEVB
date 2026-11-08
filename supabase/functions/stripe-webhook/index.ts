import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Map Stripe Price IDs back to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1TovYrR160jcuzTwbVuf4qUp': '1_team',
  'price_1TovZQR160jcuzTwI3m6t1du': '2_teams',
  'price_1TovZpR160jcuzTwW9jW8MzR': '3_teams',
  'price_1TovaAR160jcuzTw5Bl3BvZt': '4_teams',
  'price_1TovaWR160jcuzTwxMfFpdKd': '5plus_teams',
};

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-04-10',
  });

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Skip events we've already handled — Stripe redelivers when a response is slow
  // or dropped, and without this check a redelivery would reprocess the same
  // purchase/refund a second time.
  const { data: alreadyProcessed } = await supabase
    .from('processed_stripe_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle();
  if (alreadyProcessed) {
    console.log(`Event ${event.id} already processed, skipping`);
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Fix 2: Only grant a plan when payment is confirmed
        if (session.payment_status !== 'paid') {
          console.log(`checkout.session.completed: payment_status=${session.payment_status}, skipping`);
          break;
        }

        const userId = session.metadata?.supabase_user_id;
        if (!userId) break;

        // Fix 1: Derive plan from the actual purchased price ID, not metadata
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
        const priceId = lineItems.data[0]?.price?.id;
        const plan = PRICE_TO_PLAN[priceId ?? ''];
        if (!plan) {
          console.error(`checkout.session.completed: unknown price ${priceId}, refusing to grant plan`);
          break;
        }

        // Adding time isn't safe to repeat, so claim this event before touching the
        // plan. Without this, a redelivery after a failed "processed" note below
        // would add a second 6 months. Losing the claim means another delivery has it.
        const { error: claimError } = await supabase
          .from('processed_stripe_events')
          .insert({ event_id: event.id });
        if (claimError?.code === '23505') {
          console.log(`Event ${event.id} claimed by another delivery, skipping`);
          break;
        }
        if (claimError) throw claimError;

        // One database step (add_plan_time), so two payments landing together
        // can't both start from the same end date and lose one payment's time.
        let planExpiresAt: string;
        try {
          const { data, error: updateError } = await supabase.rpc('add_plan_time', {
            p_user_id: userId,
            p_plan: plan,
            p_customer_id: session.customer as string,
          });
          if (updateError) throw updateError;
          if (!data) throw new Error(`no profile for user ${userId}`);
          planExpiresAt = data as string;
        } catch (err) {
          // Release the claim so Stripe's retry can still grant what was paid for.
          await supabase.from('processed_stripe_events').delete().eq('event_id', event.id);
          throw err;
        }

        console.log(`Updated user ${userId} to plan: ${plan}, expires: ${planExpiresAt}`);
        break;
      }

      case 'charge.refunded':
      case 'charge.dispute.created': {
        // A full refund or chargeback takes back only that payment's 6 months, so
        // earlier paid time (e.g. before an early renewal) is kept. Partial refunds
        // leave the plan alone.
        let charge: Stripe.Charge;
        if (event.type === 'charge.refunded') {
          charge = event.data.object as Stripe.Charge;
          if (!charge.refunded) {
            console.log(`charge.refunded: partial refund on ${charge.id}, plan unchanged`);
            break;
          }
        } else {
          const dispute = event.data.object as Stripe.Dispute;
          const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
          charge = await stripe.charges.retrieve(chargeId);
        }

        const customerId = charge.customer as string | null;
        if (!customerId) break;

        if (await claimEvent(supabase, event.id)) {
          await changePlanTime(supabase, event, () =>
            supabase.rpc('remove_plan_time', { p_customer_id: customerId }));
        }
        break;
      }

      case 'charge.dispute.closed': {
        // Won chargeback: give back the 6 months the dispute took off.
        const dispute = event.data.object as Stripe.Dispute;
        if (dispute.status !== 'won') {
          console.log(`charge.dispute.closed: status=${dispute.status}, plan unchanged`);
          break;
        }
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
        const charge = await stripe.charges.retrieve(chargeId);
        const customerId = charge.customer as string | null;
        if (!customerId) break;

        // The tier that payment bought, used if the plan was switched off meanwhile.
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent : charge.payment_intent?.id;
        if (!paymentIntentId) throw new Error(`charge ${chargeId} has no payment intent`);
        const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
        const sessionId = sessions.data[0]?.id;
        if (!sessionId) throw new Error(`no checkout session for payment ${paymentIntentId}`);
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
        const plan = PRICE_TO_PLAN[lineItems.data[0]?.price?.id ?? ''];
        if (!plan) throw new Error(`unknown price on checkout ${sessionId}`);

        if (await claimEvent(supabase, event.id)) {
          await changePlanTime(supabase, event, () =>
            supabase.rpc('restore_plan_time', { p_customer_id: customerId, p_plan: plan }));
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response('Internal error', { status: 500 });
  }

  // Record event as processed AFTER successful handling so Stripe retries work on transient failures.
  // Duplicate key (23505) is expected: purchases, refunds and won chargebacks claim their event up front.
  const { error: insertError } = await supabase
    .from('processed_stripe_events')
    .insert({ event_id: event.id });
  if (insertError && insertError.code !== '23505') {
    console.warn(`Failed to record idempotency key for ${event.id}:`, insertError.message);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// deno-lint-ignore no-explicit-any
type Supabase = any;

// Changing plan time isn't safe to repeat, so claim the event first. Returns
// false when another delivery already has it.
async function claimEvent(supabase: Supabase, eventId: string): Promise<boolean> {
  const { error } = await supabase.from('processed_stripe_events').insert({ event_id: eventId });
  if (error?.code === '23505') {
    console.log(`Event ${eventId} claimed by another delivery, skipping`);
    return false;
  }
  if (error) throw error;
  return true;
}

// Runs one plan-time database call for a claimed event and logs each account it
// changed. On failure the claim is released so Stripe's retry can try again.
async function changePlanTime(
  supabase: Supabase,
  event: Stripe.Event,
  run: () => PromiseLike<{ data: unknown; error: unknown }>,
) {
  try {
    const { data, error } = await run();
    if (error) throw error;
    const rows = (data ?? []) as { id: string; plan: string; plan_expires_at: string | null }[];
    if (!rows.length) console.warn(`${event.type}: no profile found for this customer`);
    for (const r of rows) {
      console.log(`${event.type}: ${r.id} now ${r.plan}, expires ${r.plan_expires_at ?? 'never (switched off)'}`);
    }
  } catch (err) {
    await supabase.from('processed_stripe_events').delete().eq('event_id', event.id);
    throw err;
  }
}
