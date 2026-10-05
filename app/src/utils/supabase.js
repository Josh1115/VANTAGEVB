import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Marketing program counter ─────────────────────────────────────────────────

export async function fetchProgramCount(state = 'IL') {
  const { data, error } = await supabase.rpc('get_program_count', { p_state: state });
  if (error) return null;
  return data;
}

// ── Trial match-slot enforcement ────────────────────────────────────────────
//
// Unlike the recording flow's best-effort check (which falls back to a local
// count when offline — necessary there since live stat entry must keep
// working with no wifi in the gym), this REQUIRES the server round-trip to
// succeed. It's for actions that create a brand-new counted match — schedule
// creation and starting an unscheduled match on the spot — where the trial
// user can reasonably be asked to have a connection once. Without this, a
// trial account could dodge the limit forever by staying offline (or
// clearing local data) without ever creating a new account.
export async function consumeMatchSlotStrict() {
  let data, error;
  try {
    ({ data, error } = await supabase.rpc('consume_match_slot'));
  } catch (err) {
    error = err;
  }
  if (error) {
    const e = new Error("You'll need an internet connection for this — trial matches are confirmed with the server. Try again once you're back online, or schedule matches ahead of time so they're ready to record offline.");
    e.code = 'MATCH_LIMIT';
    e.offline = true;
    throw e;
  }
  if (data?.allowed === false) {
    const e = new Error(
      data.reason === 'inactive'
        ? 'Your plan is inactive. Upgrade to record matches.'
        : `Trial limit reached (${data.used}/${data.limit} matches). Upgrade to continue.`
    );
    e.code = 'MATCH_LIMIT';
    throw e;
  }
  return data;
}

// ── Page view tracking ────────────────────────────────────────────────────────

export function trackPageView(page) {
  supabase.from('page_views').insert({ page }).then(() => {}).catch(() => {});
}
