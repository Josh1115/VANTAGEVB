import { PageHeader } from '../components/layout/PageHeader';
import { BG, SURFACE, SURFACE2, BORDER, TXT3, TXT4, TXT5, PRIMARY, EMERALD, RED, AMBER, HelpStep as Step } from './helpTheme';

function DiagTabBar() {
  const tabs = ['Team Stats', 'Player Stats', 'Rotation', 'Trends', 'Heat Map', 'Opp Stats', 'Insights'];
  return (
    <svg viewBox="0 0 320 36" className="w-full rounded-xl" style={{ background: SURFACE2 }}>
      {tabs.map((t, i) => {
        const x = 4 + i * 45;
        const active = i === 2;
        return (
          <g key={t}>
            {active && <rect x={x} y="30" width="43" height="2.5" rx="1.5" fill={PRIMARY} />}
            <text x={x + 21} y="19" fontSize={active ? 7 : 6.5} fontWeight={active ? '800' : '500'}
              fill={active ? PRIMARY : TXT5} textAnchor="middle">{t}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DiagRotationRadar() {
  const pts = [
    [160, 28], [224, 68], [208, 148], [140, 180], [76, 148], [68, 68],
  ];
  const outer = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const inner = [
    [160, 80], [195, 98], [188, 140], [152, 158], [114, 138], [108, 98],
  ].map(([x, y]) => `${x},${y}`).join(' ');
  const labels = [
    [160, 18, 'R1'], [236, 72, 'R2'], [220, 158, 'R3'],
    [140, 196, 'R4'], [62, 156, 'R5'], [54, 70, 'R6'],
  ];
  return (
    <svg viewBox="0 0 320 210" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <polygon points={outer} fill="none" stroke={BORDER} strokeWidth="1" />
      <polygon points={inner} fill={`${PRIMARY}22`} stroke={PRIMARY} strokeWidth="1.5" />
      {labels.map(([x, y, lbl]) => (
        <text key={lbl} x={x} y={y} fill={TXT5} fontSize="9" fontWeight="700" textAnchor="middle">{lbl}</text>
      ))}
      <text x="160" y="108" fill={PRIMARY} fontSize="8" fontWeight="800" textAnchor="middle">SO%</text>
      <text x="160" y="10" fill={TXT4} fontSize="7" textAnchor="middle">Rotation Radar</text>
    </svg>
  );
}

function DiagRotationTable() {
  const rows = [
    { r: 'R1', so: '72%', bp: '48%', color: EMERALD },
    { r: 'R2', so: '65%', bp: '41%', color: TXT3 },
    { r: 'R3', so: '58%', bp: '38%', color: AMBER },
    { r: 'R4', so: '51%', bp: '35%', color: RED },
  ];
  return (
    <svg viewBox="0 0 320 110" className="w-full rounded-xl" style={{ background: SURFACE }}>
      {['Rotation', 'Sideout %', 'Break Pt %'].map((h, i) => (
        <text key={h} x={[16, 130, 230][i]} y="14" fill={TXT5} fontSize="8" fontWeight="700">{h}</text>
      ))}
      <line x1="8" y1="18" x2="312" y2="18" stroke={BORDER} strokeWidth="0.5" />
      {rows.map(({ r, so, bp, color }, i) => (
        <g key={r}>
          {i % 2 !== 0 && <rect x="8" y={22 + i * 20} width="304" height="20" rx="3" fill="rgba(255,255,255,0.02)" />}
          <text x="16"  y={36 + i * 20} fill={color} fontSize="9" fontWeight="700">{r}</text>
          <text x="130" y={36 + i * 20} fill={color} fontSize="9" fontWeight="800">{so}</text>
          <text x="230" y={36 + i * 20} fill={TXT3}  fontSize="9" fontWeight="400">{bp}</text>
        </g>
      ))}
    </svg>
  );
}

function DiagInsights() {
  return (
    <svg viewBox="0 0 320 80" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="14" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">WIN CORRELATION — SEASON</text>
      <rect x="8" y="22" width="304" height="50" rx="8" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="16" y="36" fill={TXT3} fontSize="8" fontWeight="900">SIDEOUT %</text>
      <text x="306" y="36" fill={EMERALD} fontSize="8" fontWeight="800" textAnchor="end">✓ On track</text>
      <text x="50" y="54" fill={RED} fontSize="11" fontWeight="900" textAnchor="middle">51%</text>
      <text x="50" y="62" fill="#7f1d1d" fontSize="6" textAnchor="middle">LOSS AVG</text>
      <text x="160" y="54" fill={EMERALD} fontSize="11" fontWeight="900" textAnchor="middle">66%</text>
      <text x="160" y="62" fill={TXT5} fontSize="6" textAnchor="middle">THIS MATCH</text>
      <text x="270" y="54" fill={EMERALD} fontSize="11" fontWeight="900" textAnchor="middle">68%</text>
      <text x="270" y="62" fill="#14532d" fontSize="6" textAnchor="middle">WIN AVG</text>
      <rect x="16" y="66" width="288" height="4" rx="2" fill="#334155" />
      <rect x="16" y="66" width="225" height="4" rx="2" fill={EMERALD} />
    </svg>
  );
}

export function HelpReportsPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Reading the Reports Page" backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            The Reports page is your season-wide analytics hub. It aggregates data across every recorded match and surfaces trends, rotation efficiency, player rankings, and win correlations. Access it from the bottom nav bar (the chart icon).
          </p>
        </div>

        <Step number={1} title="Navigating the tabs">
          <DiagTabBar />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Seven tabs sit at the top. Each one filters the same season data through a different lens. Use the season selector at the top of the page to switch between seasons.
          </p>
        </Step>

        <Step number={2} title="Team Stats — season totals at a glance"
          note="The Team Stats tab shows totals, per-set averages, and per-match averages for the whole season. Toggle between views using the three sub-tabs at the top. Use Per Match to compare yourself to opposing teams since totals reflect match count, not efficiency." />

        <Step number={3} title="Player Stats — ranked by category"
          note="Player Stats organizes every player across Serving, Passing, Attacking, Setting, Blocking, Defense, and VER sub-tabs. Each table is sortable by column header. Tap a player's name to open their full season report card. The Totals row always pins to the bottom." />

        <Step number={4} title="Rotation Analysis — your best and worst rotations">
          <div className="flex gap-3">
            <div className="flex-1 min-w-0"><DiagRotationRadar /></div>
            <div className="flex-1 min-w-0"><DiagRotationTable /></div>
          </div>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            The radar shows all 6 rotations' Sideout % in a single shape — a pointy spike means one rotation is clearly dominant, a flat shape means they're balanced. The table below ranks every rotation by SO% and Break Point %. R1 highlighted red or marked with a warning means that rotation needs attention. The Expected Pts Per Set chart at the bottom lets you compare projected outcomes if the set opens in each rotation.
          </p>
        </Step>

        <Step number={5} title="Trends — set-by-set momentum across the season"
          note="Trends shows how the team is progressing over time. The score timeline view shows both teams' scoring curves within a set. Look for stretches where both lines run parallel — those are traded-point sequences — versus stretches where yours pulls ahead. Useful for identifying which part of the game (first third, late-set pressure) breaks down most." />

        <Step number={6} title="Heat Map — where attacks land and where they fail"
          note="The Heat Map visualizes attack contact zones across the season. Brighter zones = more contacts. Toggle between kills and errors to see where efficient attacks originate vs. where high-error contacts come from. Use it to coach attackers to favor their hot zones and reduce contacts from their error-prone zones." />

        <Step number={7} title="Insights — win correlation across the season">
          <DiagInsights />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Insights compares 12 key metrics between your wins and losses for the season — sideout %, hitting efficiency, ace rate, and more. Each metric shows your Loss Average (red, left), Win Average (green, right), and this season's current value as an animated bar. Requires at least 2 wins and 2 losses.
          </p>
        </Step>

        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Key terms</p>
          {[
            ['SO% — Sideout Percentage', 'How often you score the point when receiving serve. League average is roughly 55–65%. Elite teams target 65%+.'],
            ['BP% — Break Point Percentage', 'How often you score the point when serving. Harder to control than sideout, but critical in close matches.'],
            ['VER — Volleyball Efficiency Rating', 'A composite score that weighs positive contacts (kills, aces, digs on live ball) against negative ones (errors, poor passes). Higher is better; above +10 per set is strong.'],
            ['HIT% — Hitting Efficiency', 'Standard formula: (kills − errors) ÷ attempts. .250 is considered good at the high school level. Negative means more errors than kills.'],
          ].map(([title, body]) => (
            <div key={title} className="pl-10 flex gap-3">
              <span className="mt-0.5 shrink-0" style={{ color: PRIMARY }}>›</span>
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
