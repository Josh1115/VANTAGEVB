import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── FamilyScope HUB helpers ───────────────────────────────────────────────────

export async function publishPvStats(token, teamName, payload) {
  const { error } = await supabase
    .from('pv_stats')
    .upsert({ token, team_name: teamName, payload, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function fetchPvStats(token) {
  const { data, error } = await supabase
    .from('pv_stats')
    .select('*')
    .eq('token', token)
    .single();
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
}

// Subscribe to Postgres Changes on pv_stats for a specific token.
// Only fires on real DB writes (authenticated coach), so fake events are impossible.
export function subscribePvChanges(token, onUpdate) {
  const channel = supabase
    .channel(`pv-changes-${token}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pv_stats', filter: `token=eq.${token}` },
      (change) => onUpdate(change.new),
    )
    .subscribe();
  return channel;
}

// ── Page view tracking ────────────────────────────────────────────────────────

export function trackPageView(page) {
  supabase.from('page_views').insert({ page }).then(() => {}).catch(() => {});
}
