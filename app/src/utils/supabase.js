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

// ── Page view tracking ────────────────────────────────────────────────────────

export function trackPageView(page) {
  supabase.from('page_views').insert({ page }).then(() => {}).catch(() => {});
}
