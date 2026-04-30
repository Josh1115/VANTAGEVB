import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, LabelList, ResponsiveContainer,
} from 'recharts';

// Color per rating: 0 = red, 1 = amber, 2 = yellow-green, 3 = emerald
const RATING_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
const RATING_LABELS = ['0', '1', '2', '3'];

function buildData(totals) {
  if (!totals) return [];
  const counts = [totals.p0 ?? 0, totals.p1 ?? 0, totals.p2 ?? 0, totals.p3 ?? 0];
  const total   = counts.reduce((s, n) => s + n, 0);
  return RATING_LABELS.map((label, i) => ({
    label,
    count: counts[i],
    pct:   total > 0 ? counts[i] / total : 0,
  }));
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { label, count, pct } = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
      <p className="text-slate-100 font-semibold text-sm mb-0.5">Rating {label}</p>
      <p className="text-slate-400 text-xs">{count} passes · {(pct * 100).toFixed(1)}%</p>
    </div>
  );
}

export function PassDistributionChart({ totals }) {
  const data = buildData(totals);
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  return (
    <div className="bg-surface rounded-xl p-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
        Pass Rating Distribution
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={64}
            animationBegin={0} animationDuration={500} animationEasing="ease-out"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={RATING_COLORS[i]} />
            ))}
            <LabelList
              dataKey="pct"
              position="top"
              formatter={(v) => v > 0 ? `${(v * 100).toFixed(0)}%` : ''}
              style={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
