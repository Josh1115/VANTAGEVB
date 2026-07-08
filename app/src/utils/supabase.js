import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── FamilyScope HUB helpers ───────────────────────────────────────────────────
//
// pv_stats has no client-readable SELECT policy — reads go through the
// get_pv_stats RPC (SECURITY DEFINER, looks up by token) and live updates go
// over Realtime Broadcast on a channel named after the token, not Postgres
// Changes. Both mean a caller can only ever act on the one token they already
// have; they can't enumerate every team's data via a filter-less REST call
// the way the old public-SELECT + Postgres Changes setup allowed.

function pvChannel(token) {
  return supabase.channel(`pv-changes-${token}`);
}

export async function publishPvStats(token, teamName, payload) {
  const { error } = await supabase
    .from('pv_stats')
    .upsert({ token, team_name: teamName, payload, updated_at: new Date().toISOString() });
  if (error) throw error;
  pvChannel(token).httpSend('update', { payload }).catch(() => {});
}

export async function fetchPvStats(token) {
  const { data, error } = await supabase.rpc('get_pv_stats', { p_token: token });
  if (error) return null;
  return data;
}

// Writes lightweight live score state to the DB after each point.
// Authenticated coach only — RLS rejects anon/wrong-owner writes.
export async function updatePvLiveScore(token, liveState) {
  await supabase
    .from('pv_stats')
    .update({ live_score: liveState, updated_at: new Date().toISOString() })
    .eq('token', token);
  pvChannel(token).httpSend('update', { live_score: liveState }).catch(() => {});
}

// Subscribe to live broadcast updates for a specific token.
export function subscribePvChanges(token, onUpdate) {
  const channel = pvChannel(token)
    .on('broadcast', { event: 'update' }, ({ payload }) => onUpdate(payload))
    .subscribe();
  return channel;
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
