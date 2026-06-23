import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Map Stripe Price IDs back to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1Tgv6hEZO853IB28UMuYmThg': '1_team',
  'price_1Tgv6hEZO853IB28oD6EK5Nv': '2_teams',
  'price_1Tgv6iEZO853IB28yjTenLlh': '3_teams',
  'price_1Tgv6iEZO853IB28cvivhAJ1': '4_teams',
  'price_1Tgv6jEZO853IB28b5NnUVVJ': '5plus_teams',
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

  // Fix 8: Idempotency — skip events we've already processed
  const { error: insertError } = await supabase
    .from('processed_stripe_events')
    .insert({ event_id: event.id });

  if (insertError?.code === '23505') {
    console.log(`Event ${event.id} already processed, skipping`);
    return new Response(JSON.stringify({ received: true, skipped: true }), {
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

        // Plans expire 1 year from purchase date
        const planExpiresAt = new Date();
        planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1);

        await supabase
          .from('profiles')
          .update({
            plan,
            stripe_customer_id: session.customer as string,
            plan_expires_at: planExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        console.log(`Updated user ${userId} to plan: ${plan}, expires: ${planExpiresAt.toISOString()}`);
        break;
      }

      case 'charge.refunded':
      case 'charge.dispute.created': {
        // Fix 3: Revoke plan on both manual refunds and bank chargebacks
        let customerId: string | null = null;

        if (event.type === 'charge.refunded') {
          const charge = event.data.object as Stripe.Charge;
          customerId = charge.customer as string;
        } else {
          const dispute = event.data.object as Stripe.Dispute;
          const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
          const charge = await stripe.charges.retrieve(chargeId);
          customerId = charge.customer as string;
        }

        if (!customerId) break;

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId);

        if (!profiles?.length) {
          console.warn(`${event.type}: no profile found for customer ${customerId}`);
          break;
        }

        await supabase
          .from('profiles')
          .update({
            plan: 'inactive',
            plan_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        console.log(`Revoked plan for customer ${customerId} (${profiles.length} profile(s)) — reason: ${event.type}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response('Internal error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
