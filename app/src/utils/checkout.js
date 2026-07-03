// Shared helper for starting a Stripe Checkout session for a specific plan.
// Used by the Settings plan rows, the Upgrade page, and the post-signup
// "pending plan" flow (a plan picked before the visitor had an account).

// localStorage key: set when an anonymous visitor picks a plan before signing
// up. Read once a real session exists, then cleared.
export const PENDING_PLAN_KEY = 'vantage_pending_plan';

export async function startPlanCheckout(session, planKey) {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ plan: planKey }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Checkout failed');
  window.location.href = json.url;
}
