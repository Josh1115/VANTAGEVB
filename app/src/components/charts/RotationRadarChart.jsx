import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Tooltip, Legend, ResponsiveContainer,
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
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis dataKey="rotation" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#64748b', fontSize: 9 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Radar name="SO%" dataKey="SO%" stroke="#f97316" fill="#f97316" fillOpacity={0.25} />
        <Radar name="SP%" dataKey="SP%" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.15} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          formatter={(v) => [`${v}%`]}
        />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
