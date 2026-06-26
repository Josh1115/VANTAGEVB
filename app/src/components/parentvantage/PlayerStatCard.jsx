import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const fmt = (v, decimals = 0) =>
  v == null ? '—' : decimals > 0 ? (v * 100).toFixed(1) + '%' : String(v);

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-700/40 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
    </div>
  );
}

export function PlayerStatCard({ player, matchHistory }) {
  if (!player) return null;
  const s = player.stats;

  // Build kill% trend from match history (matches that have per-player breakdown)
  // matchHistory: [{ date, kills, attempts }] — computed from snapshot if available
  const chartData = (matchHistory ?? []).slice(-8).map((m, i) => ({
    name: m.label ?? `M${i + 1}`,
    kPct: m.kPct != null ? +(m.kPct * 100).toFixed(1) : 0,
  }));

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-black text-sm">#{player.jersey}</span>
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">{player.name}</div>
            <div className="text-slate-400 text-xs">{player.position} · {s.mp ?? 0} matches · {s.sp ?? 0} sets</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 py-2 divide-y divide-slate-700/30">
        {s.serves > 0 && (
          <>
            <StatRow label="Aces" value={`${s.aces}  (${fmt(s.acePct, 1)})`} />
            <StatRow label="Serve %" value={fmt(s.serves > 0 ? (s.serves - s.serveErr) / s.serves : null, 1)} />
          </>
        )}
        {s.kills > 0 && (
          <>
            <StatRow label="Kills" value={`${s.kills}  (${fmt(s.killPct, 1)})`} />
            <StatRow label="Hit %" value={fmt(s.hitPct, 1)} />
          </>
        )}
        {s.passes > 0 && (
          <StatRow label="Pass Avg (APR)" value={s.apr != null ? s.apr.toFixed(2) : '—'} />
        )}
        {(s.blocks > 0) && (
          <StatRow label="Blocks" value={String(s.blocks)} />
        )}
        {s.digs > 0 && (
          <StatRow label="Digs" value={String(s.digs)} />
        )}
        {s.assists > 0 && (
          <StatRow label="Assists" value={String(s.assists)} />
        )}
      </div>

      {/* Kill % trend chart */}
      {chartData.length > 1 && (
        <div className="px-4 pb-4 pt-2">
          <div className="text-xs text-slate-500 mb-2">Kill % by match</div>
          <ResponsiveContainer width="100%" height={72}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 6, fontSize: 11 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v) => [`${v}%`, 'Kill%']}
              />
              <Bar dataKey="kPct" radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === chartData.length - 1 ? '#e8530b' : '#334155'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
