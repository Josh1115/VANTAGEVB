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

export function subscribePvChannel(token, onMessage) {
  const channel = supabase.channel(`pv-${token}`, { config: { broadcast: { self: false } } });
  channel.on('broadcast', { event: 'match_update' }, ({ payload }) => onMessage(payload));
  channel.subscribe();
  return channel;
}

export function broadcastPvUpdate(channel, payload) {
  channel.send({ type: 'broadcast', event: 'match_update', payload }).catch(() => {});
}
