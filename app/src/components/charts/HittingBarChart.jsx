import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';

function hitColor(val) {
  if (val == null) return '#64748b';
  if (val >= 0.25) return '#22c55e';
  if (val >= 0.10) return '#eab308';
  return '#ef4444';
}

const fmt = (v) => (v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(3).replace(/^(-?)0\./, '$1.'));

export function HittingBarChart({ data }) {
  // data: [{ name, hit_pct }]
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ fill: '#1e293b' }}
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#f1f5f9' }}
          formatter={(v) => [fmt(v), 'HIT%']}
        />
        <ReferenceLine y={0} stroke="#475569" />
        <Bar dataKey="hit_pct" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={hitColor(entry.hit_pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
