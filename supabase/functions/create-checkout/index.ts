import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PRICE_IDS: Record<string, string> = {
  '1_team':      'price_1TovYrR160jcuzTwbVuf4qUp',
  '2_teams':     'price_1TovZQR160jcuzTwI3m6t1du',
  '3_teams':     'price_1TovZpR160jcuzTwW9jW8MzR',
  '4_teams':     'price_1TovaAR160jcuzTw5Bl3BvZt',
  '5plus_teams': 'price_1TovaWR160jcuzTwxMfFpdKd',
};

// Team-count rank per plan, used to block buying a smaller plan while a
// bigger one is still active (no downgrades — see PLAN_RANK check below).
const PLAN_RANK: Record<string, number> = {
  '1_team':      1,
  '2_teams':     2,
  '3_teams':     3,
  '4_teams':     4,
  '5plus_teams': 5,
};

// Fix 7: Restrict CORS to known origins instead of wildcard
const ALLOWED_ORIGINS = ['https://vantagevb.net', 'https://www.vantagevb.net'];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { plan } = await req.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) throw new Error(`Unknown plan: ${plan}`);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-04-10',
    });

    // Fetch or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, plan, plan_expires_at')
      .eq('id', user.id)
      .single();

    // No downgrades: if the caller already has a paid plan that's still
    // active (not expired), refuse to sell them a smaller team-count tier.
    // Same tier (early renewal) and bigger tiers (real upgrade) stay allowed.
    const currentExpires = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
    const currentIsActivePaid = !!profile?.plan
      && PLAN_RANK[profile.plan] !== undefined
      && (!currentExpires || currentExpires > new Date());
    if (currentIsActivePaid && PLAN_RANK[plan] < PLAN_RANK[profile!.plan]) {
      throw new Error(
        `You already have an active ${profile!.plan.replace('_', ' ')} plan through ${currentExpires ? currentExpires.toDateString() : 'a later date'}. ` +
        `You can renew the same tier or upgrade to a bigger one, but not switch down while it's still active.`
      );
    }

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      // stripe_customer_id is now tamper-guarded against authenticated clients
      // (enforce_plan_immutability trigger), so this write must use the service
      // role — the user-scoped anon client would be rejected.
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { error: linkError } = await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      if (linkError) throw new Error(`Failed to link billing account: ${linkError.message}`);
    }

    const rawOrigin = req.headers.get('origin') ?? '';
    const safeOrigin = ALLOWED_ORIGINS.includes(rawOrigin) ? rawOrigin : ALLOWED_ORIGINS[0];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${safeOrigin}/upgrade?success=1&plan=${plan}`,
      cancel_url:  `${safeOrigin}/upgrade?canceled=1`,
      metadata: { supabase_user_id: user.id, plan },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
