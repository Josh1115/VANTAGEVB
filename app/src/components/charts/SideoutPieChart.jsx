import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * so_pct: 0.0–1.0  (team sideout percentage)
 * label:  optional override for win slice label
 */
export function SideoutPieChart({ so_pct, label = 'Sideout' }) {
  if (so_pct == null) return (
    <div className="flex items-center justify-center h-32 text-slate-500 text-sm">No data</div>
  );

  const win = +(so_pct * 100).toFixed(1);
  const loss = +(100 - win).toFixed(1);
  const data = [
    { name: `${label} Win`, value: win },
    { name: `${label} Loss`, value: loss },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          label={({ name, value }) => `${value}%`}
          labelLine={false}
        >
          <Cell fill="#f97316" />
          <Cell fill="#334155" />
        </Pie>
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          formatter={(v) => [`${v}%`]}
        />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
