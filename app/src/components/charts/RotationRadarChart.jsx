import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

/**
 * rotationStats: { rotations: { 1..6: { so_pct, bp_pct } } }
 */
export function RotationRadarChart({ rotationStats }) {
  const data = Object.entries(rotationStats.rotations).map(([n, r]) => ({
    rotation: `R${n}`,
    'SO%': r.so_pct != null ? +(r.so_pct * 100).toFixed(1) : 0,
    'SP%': r.bp_pct != null ? +(r.bp_pct * 100).toFixed(1) : 0,
  }));

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis dataKey="rotation" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#64748b', fontSize: 9 }}
            tickFormatter={(v) => `${v}%`}
          />
          <Radar name="SO%" dataKey="SO%" stroke="#f97316" fill="#f97316" fillOpacity={0.25} animationBegin={0} animationDuration={600} animationEasing="ease-out" />
          <Radar name="SP%" dataKey="SP%" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.15} animationBegin={100} animationDuration={600} animationEasing="ease-out" />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(v) => [`${v}%`]}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="flex gap-6 mt-1 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] inline-block" />
          <span className="text-xs text-slate-400">SO%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] inline-block" />
          <span className="text-xs text-slate-400">SP%</span>
        </div>
      </div>
    </div>
  );
}
