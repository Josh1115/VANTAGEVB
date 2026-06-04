import { PageHeader } from '../components/layout/PageHeader';

const BG      = '#0f172a';
const SURFACE = '#1e293b';
const PRIMARY = '#f97316';
const TXT     = '#f8fafc';
const TXT4    = '#94a3b8';
const TXT5    = '#64748b';
const GREEN   = '#34d399';
const AMBER   = '#fbbf24';
const RED     = '#f87171';
const BLUE    = '#60a5fa';

function Step({ number, title, note, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-primary text-black text-sm font-black flex items-center justify-center shrink-0">{number}</span>
        <span className="font-semibold text-white">{title}</span>
      </div>
      {note && <p className="text-sm text-slate-400 pl-10 leading-relaxed">{note}</p>}
      {children && <div className="pl-10">{children}</div>}
    </div>
  );
}

function DiagWinFactorsPanel() {
  return (
    <svg viewBox="0 0 320 290" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Card 1 */}
      <rect x="12" y="12" width="296" height="122" rx="10" fill={SURFACE} />
      <rect x="22" y="22" width="28" height="16" rx="4" fill="#7c3aed33" stroke="#7c3aed" strokeWidth="1" />
      <text x="36" y="34" textAnchor="middle" fill={AMBER} fontSize="9" fontWeight="900">#1</text>
      <text x="58" y="34" fill={TXT} fontSize="10" fontWeight="900">HITTING EFFICIENCY</text>
      <text x="298" y="34" textAnchor="end" fill={RED} fontSize="9" fontWeight="700">✗ Focus here</text>
      <text x="70" y="60" textAnchor="middle" fill={RED} fontSize="15" fontWeight="900">+.087</text>
      <text x="70" y="73" textAnchor="middle" fill="#7f1d1d" fontSize="8" fontWeight="700">LOSS AVG</text>
      <text x="160" y="60" textAnchor="middle" fill={AMBER} fontSize="15" fontWeight="900">+.142</text>
      <text x="160" y="73" textAnchor="middle" fill={TXT5} fontSize="8" fontWeight="700">THIS SEASON</text>
      <text x="252" y="60" textAnchor="middle" fill={GREEN} fontSize="15" fontWeight="900">+.248</text>
      <text x="252" y="73" textAnchor="middle" fill="#065f46" fontSize="8" fontWeight="700">WIN AVG</text>
      <rect x="22" y="84" width="276" height="6" rx="3" fill="#334155" />
      <rect x="22" y="84" width="100" height="6" rx="3" fill={AMBER} />
      <line x1="22" y1="101" x2="298" y2="101" stroke="#334155" strokeWidth="1" />
      <text x="22" y="116" fill={TXT} fontSize="9" fontWeight="700">WIN FACTOR:</text>
      <text x="100" y="116" fill={BLUE} fontSize="9" fontWeight="900">28%</text>

      {/* Card 2 */}
      <rect x="12" y="146" width="296" height="122" rx="10" fill={SURFACE} />
      <rect x="22" y="156" width="28" height="16" rx="4" fill="#47556944" stroke="#475569" strokeWidth="1" />
      <text x="36" y="168" textAnchor="middle" fill={TXT4} fontSize="9" fontWeight="900">#2</text>
      <text x="58" y="168" fill={TXT} fontSize="10" fontWeight="900">SIDEOUT %</text>
      <text x="298" y="168" textAnchor="end" fill={GREEN} fontSize="9" fontWeight="700">✓ On track</text>
      <text x="70" y="194" textAnchor="middle" fill={RED} fontSize="15" fontWeight="900">54%</text>
      <text x="70" y="207" textAnchor="middle" fill="#7f1d1d" fontSize="8" fontWeight="700">LOSS AVG</text>
      <text x="160" y="194" textAnchor="middle" fill={GREEN} fontSize="15" fontWeight="900">68%</text>
      <text x="160" y="207" textAnchor="middle" fill={TXT5} fontSize="8" fontWeight="700">THIS SEASON</text>
      <text x="252" y="194" textAnchor="middle" fill={GREEN} fontSize="15" fontWeight="900">71%</text>
      <text x="252" y="207" textAnchor="middle" fill="#065f46" fontSize="8" fontWeight="700">WIN AVG</text>
      <rect x="22" y="218" width="276" height="6" rx="3" fill="#334155" />
      <rect x="22" y="218" width="228" height="6" rx="3" fill={GREEN} />
      <line x1="22" y1="235" x2="298" y2="235" stroke="#334155" strokeWidth="1" />
      <text x="22" y="250" fill={TXT} fontSize="9" fontWeight="700">WIN FACTOR:</text>
      <text x="100" y="250" fill={BLUE} fontSize="9" fontWeight="900">21%</text>

      {/* Arrow label */}
      <text x="160" y="282" textAnchor="middle" fill={TXT5} fontSize="9">Move your season value → toward WIN AVG</text>
    </svg>
  );
}

function DiagColorLegend() {
  return (
    <svg viewBox="0 0 320 90" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="20" fill={TXT5} fontSize="9" fontWeight="700" letterSpacing="1.5">STATUS COLORS</text>
      {/* Green */}
      <circle cx="26" cy="44" r="7" fill={GREEN} />
      <text x="40" y="40" fill={TXT} fontSize="11" fontWeight="700">On track</text>
      <text x="40" y="55" fill={TXT4} fontSize="9">At or near win-level performance</text>
      {/* Amber */}
      <circle cx="26" cy="76" r="7" fill={AMBER} />
      <text x="40" y="72" fill={TXT} fontSize="11" fontWeight="700">Watch this</text>
      <text x="40" y="83" fill={TXT4} fontSize="9">Trending closer to loss average</text>
      {/* Red — right column */}
      <circle cx="200" cy="44" r="7" fill={RED} />
      <text x="214" y="40" fill={TXT} fontSize="11" fontWeight="700">Focus here</text>
      <text x="214" y="55" fill={TXT4} fontSize="9">Below win threshold — priority</text>
    </svg>
  );
}

function DiagWinFactorExplainer() {
  return (
    <svg viewBox="0 0 320 110" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="20" fill={TXT5} fontSize="9" fontWeight="700" letterSpacing="1.5">WIN FACTOR % — WHAT IT MEANS</text>
      {/* Bar chart of 4 metrics */}
      {[
        { label: 'HIT%',  pct: 28, color: PRIMARY },
        { label: 'SO%',   pct: 21, color: '#818cf8' },
        { label: 'APR',   pct: 18, color: BLUE },
        { label: 'BLK',   pct: 12, color: '#22d3ee' },
      ].map(({ label, pct, color }, i) => {
        const y = 32 + i * 18;
        return (
          <g key={label}>
            <text x="16" y={y + 10} fill={TXT4} fontSize="9" fontWeight="700">{label}</text>
            <rect x="54" y={y} width="220" height="12" rx="3" fill="#334155" />
            <rect x="54" y={y} width={220 * pct / 30} height="12" rx="3" fill={color} />
            <text x={54 + 220 * pct / 30 + 5} y={y + 10} fill={color} fontSize="9" fontWeight="900">{pct}%</text>
          </g>
        );
      })}
      <text x="16" y="108" fill={TXT5} fontSize="9">Larger bar = bigger share of what decides your matches</text>
    </svg>
  );
}

export function HelpVantageWinFactorsPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Reading Your Win Factors" backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">Your most powerful coaching tool</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            The Win Factors panel ranks every tracked stat by how strongly it predicts your match outcomes. Instead of guessing what to improve, the app tells you — ranked #1 to #12 based on your own data.
          </p>
        </div>

        <div className="space-y-8">
          <Step number={1} title="Open the Insights tab"
            note="From the bottom nav tap Reports, then tap the Insights tab at the top. This tab requires a default season selected with at least 2 wins and 2 losses." />

          <Step number={2} title="Read the ranking"
            note="Stats are sorted by impact — #1 has the biggest gap between your win average and loss average. The #1 stat is the single metric that most separates how you play in wins vs. losses this season.">
            <DiagWinFactorsPanel />
          </Step>

          <Step number={3} title="Understand the three columns"
            note="Each card shows: Loss Average (red, left) — how this stat looks in your losses. This Season (center, color-coded) — where you currently sit. Win Average (green, right) — how this stat looks in your wins. Your goal is to move the center column toward the right." />

          <Step number={4} title="Use the color coding"
            note="The color of your current season value tells you where you stand relative to your own win/loss history.">
            <DiagColorLegend />
          </Step>

          <Step number={5} title="Read the Win Factor %"
            note="Each card shows a Win Factor percentage — how much of the total win/loss separation this stat accounts for across all metrics. A 28% win factor means this one stat explains more of your match outcomes than almost anything else.">
            <DiagWinFactorExplainer />
          </Step>

          <Step number={6} title="Take action on red metrics"
            note='Any metric showing "✗ Focus here" means your current performance is closer to your loss average than your win average. These are your highest-leverage practice priorities. Red + high Win Factor% = the most urgent area of improvement on your entire team.' />
        </div>

        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pro Tips</p>
          {[
            ['Check after every match', 'The ranking updates live. A tough loss can shift which stat is #1 — check Insights the day after each match.'],
            ['Your #1 changes season to season', 'Every team has a different #1 win factor. Some win on serving, others on passing. Trust your data, not generic volleyball advice.'],
            ['Red + high Win Factor% = most urgent', 'If a metric is red AND carries 20%+ of win factors, that combination is your single most important coaching focus.'],
          ].map(([title, body]) => (
            <div key={title} className="flex gap-3">
              <span className="text-primary mt-0.5 shrink-0">›</span>
              <div>
                <span className="text-slate-300 text-sm font-semibold">{title} — </span>
                <span className="text-slate-400 text-sm">{body}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
