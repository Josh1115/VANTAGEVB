import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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
    <div className="flex flex-col items-center">
      <div className="text-sm font-bold text-slate-200 tracking-wide mb-1">{label}</div>
      <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="42%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          label={false}
          labelLine={false}
          animationBegin={0}
          animationDuration={600}
          animationEasing="ease-out"
        >
          <Cell fill="#4ade80" />
          <Cell fill="#f87171" />
        </Pie>
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#f1f5f9' }}
          itemStyle={{ color: '#ffffff' }}
          formatter={(v) => [`${v}%`]}
        />
      </PieChart>
    </ResponsiveContainer>
    <div className="flex gap-6 mt-1 mb-2">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] inline-block" />
        <span className="text-sm font-bold text-[#4ade80]">{win}%</span>
        <span className="text-xs text-slate-400">Win</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#f87171] inline-block" />
        <span className="text-sm font-bold text-[#f87171]">{loss}%</span>
        <span className="text-xs text-slate-400">Loss</span>
      </div>
    </div>
    </div>
  );
}
