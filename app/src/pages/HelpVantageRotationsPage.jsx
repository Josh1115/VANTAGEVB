import { PageHeader } from '../components/layout/PageHeader';
import { SURFACE2 as BG, SURFACE, PRIMARY, TXT, TXT4, TXT5, BLUE, GREEN, AMBER, RED, HelpStep as Step } from './helpTheme';

function DiagRotationGrid() {
  const rotations = [
    { r: 'R4', so: '74%', bp: '48%', soColor: GREEN,  bpColor: GREEN },
    { r: 'R3', so: '68%', bp: '44%', soColor: GREEN,  bpColor: AMBER },
    { r: 'R2', so: '71%', bp: '41%', soColor: GREEN,  bpColor: AMBER },
    { r: 'R5', so: '61%', bp: '38%', soColor: AMBER,  bpColor: RED   },
    { r: 'R6', so: '58%', bp: '36%', soColor: RED,    bpColor: RED   },
    { r: 'R1', so: '63%', bp: '45%', soColor: AMBER,  bpColor: GREEN },
  ];

  return (
    <svg viewBox="0 0 320 230" className="w-full rounded-xl" style={{ background: BG }}>
      <text x="16" y="18" fill={TXT5} fontSize="9" fontWeight="700" letterSpacing="1.5">ROTATION PERFORMANCE GRID</text>
      {/* Column headers */}
      <text x="76" y="32" textAnchor="middle" fill={TXT5} fontSize="8" fontWeight="700">ROTATION</text>
      <text x="174" y="32" textAnchor="middle" fill={TXT4} fontSize="8" fontWeight="700">SO% (receive)</text>
      <text x="266" y="32" textAnchor="middle" fill={TXT4} fontSize="8" fontWeight="700">SP% (serve)</text>

      {rotations.map(({ r, so, bp, soColor, bpColor }, i) => {
        const y = 40 + i * 30;
        const isStar = r === 'R1';
        return (
          <g key={r}>
            <rect x="12" y={y} width="296" height="26" rx="6" fill={SURFACE} />
            {isStar && <rect x="12" y={y} width="4" height="26" rx="2" fill={PRIMARY} />}
            <text x="76" y={y + 17} textAnchor="middle" fill={isStar ? PRIMARY : TXT} fontSize="12" fontWeight="900">{r}</text>
            {isStar && <text x="98" y={y + 17} fill={PRIMARY} fontSize="8" fontWeight="700">★ SERVER</text>}
            <rect x="140" y={y + 6} width="64" height="14" rx="4" fill={`${soColor}22`} />
            <text x="172" y={y + 17} textAnchor="middle" fill={soColor} fontSize="12" fontWeight="900">{so}</text>
            <rect x="232" y={y + 6} width="64" height="14" rx="4" fill={`${bpColor}22`} />
            <text x="264" y={y + 17} textAnchor="middle" fill={bpColor} fontSize="12" fontWeight="900">{bp}</text>
          </g>
        );
      })}

      <text x="160" y="224" textAnchor="middle" fill={TXT5} fontSize="9">R1 = serving rotation (bottom-right position)</text>
    </svg>
  );
}

// Diagram showing how to identify a weak rotation and what to do
function DiagWeakRotationAction() {
  return (
    <svg viewBox="0 0 320 160" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="20" fill={TXT5} fontSize="9" fontWeight="700" letterSpacing="1.5">WEAK ROTATION RESPONSE PLAN</text>

      {/* Weak rotation card */}
      <rect x="12" y="30" width="130" height="60" rx="8" fill="#7f1d1d22" stroke={RED} strokeWidth="1" />
      <text x="77" y="50" textAnchor="middle" fill={RED} fontSize="13" fontWeight="900">R6</text>
      <text x="77" y="64" textAnchor="middle" fill={TXT4} fontSize="8">SO% 58% · SP% 36%</text>
      <text x="77" y="78" textAnchor="middle" fill={RED} fontSize="8" fontWeight="700">WEAKEST ROTATION</text>

      {/* Arrow */}
      <line x1="148" y1="60" x2="168" y2="60" stroke={PRIMARY} strokeWidth="2" />
      <polygon points="168,55 178,60 168,65" fill={PRIMARY} />

      {/* Actions */}
      <rect x="180" y="30" width="128" height="120" rx="8" fill={`${PRIMARY}11`} stroke={`${PRIMARY}44`} strokeWidth="1" />
      <text x="244" y="48" textAnchor="middle" fill={PRIMARY} fontSize="9" fontWeight="900">RESPONSE OPTIONS</text>
      {[
        '› Serve tough to R6 setter',
        '› Sub off weak passer',
        '› Call timeout in R6',
        '› Schedule R6 practice reps',
      ].map((line, i) => (
        <text key={i} x="188" y={66 + i * 18} fill={TXT4} fontSize="9">{line}</text>
      ))}
    </svg>
  );
}

// Diagram: sideout vs break point concept
function DiagSOvsBP() {
  return (
    <svg viewBox="0 0 320 100" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="18" fill={TXT5} fontSize="9" fontWeight="700" letterSpacing="1.5">TWO WAYS TO SCORE POINTS</text>

      {/* SO side */}
      <rect x="12" y="26" width="140" height="62" rx="8" fill="#1e3a5f" />
      <text x="82" y="46" textAnchor="middle" fill={TXT} fontSize="11" fontWeight="900">Sideout %</text>
      <text x="82" y="60" textAnchor="middle" fill={BLUE} fontSize="18" fontWeight="900">SO%</text>
      <text x="82" y="78" textAnchor="middle" fill={TXT4} fontSize="8">Scoring when receiving serve</text>

      {/* BP side */}
      <rect x="168" y="26" width="140" height="62" rx="8" fill="#1f2d1a" />
      <text x="238" y="46" textAnchor="middle" fill={TXT} fontSize="11" fontWeight="900">Serving Point %</text>
      <text x="238" y="60" textAnchor="middle" fill={GREEN} fontSize="18" fontWeight="900">SP%</text>
      <text x="238" y="78" textAnchor="middle" fill={TXT4} fontSize="8">Scoring when serving</text>
    </svg>
  );
}

export function HelpVantageRotationsPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Rotation Intelligence" backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">Find where you win and lose sets</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Every team has strong and weak rotations. The app tracks your Sideout % and Serving Point % in all six rotations so you can see exactly where points are slipping away — and make lineup and strategy decisions to fix it.
          </p>
        </div>

        <div className="space-y-8">
          <Step number={1} title="Understand Sideout % and Serving Point %"
            note="These are the two ways your team scores points in volleyball. Together they determine who wins every set.">
            <DiagSOvsBP />
          </Step>

          <Step number={2} title="Find your rotation stats"
            note="Go to Reports → Team tab. Scroll down to the rotation breakdown table. Each row is a rotation (R1–R6), and each column shows how your team performs in that rotation. R1 is always the serving rotation — it's marked with ★." >
            <DiagRotationGrid />
          </Step>

          <Step number={3} title="Identify your weakest rotation"
            note="Look for the rotation with the lowest SO% (if you struggle receiving serve in it) or the lowest SP% (if you struggle serving in it). A rotation with both stats low is a significant liability — this is where sets slip away." />

          <Step number={4} title="Build a response plan"
            note="Once you know your weak rotation, you have several tools to respond. The key is to make the decision before the match, not during it.">
            <DiagWeakRotationAction />
          </Step>

          <Step number={5} title="Use the Rotation Optimizer"
            note="From a team's page, tap Rotation Optimizer to test different player arrangements. Try moving your best passer into a specific rotation and see how it affects your lineup structure. Use this during off-days to plan lineup adjustments before the next match." />

          <Step number={6} title="Target opponent weak rotations on serve"
            note="The same logic applies to your opponents. In the Opponents section, historical match data shows which rotations they struggled in against you. If R5 is their weak serve receive rotation, map your serving scheme to exploit it early in the set." />
        </div>

        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pro Tips</p>
          {[
            ['Call timeouts in your weak rotation', 'If you know R6 is your worst rotation and the opponent is serving into it, use a timeout proactively rather than reacting to a 3-0 run.'],
            ['Track trends over time', 'A rotation that was weak early in the season may strengthen as players develop chemistry. Check every 5 matches to see if your weak rotation has improved.'],
            ['SO% below 60% is a problem', 'Elite teams sideout 65%+. If any rotation is below 60%, it\'s giving opponents easy scoring opportunities every time through the rotation cycle.'],
            ['SP% above 45% is elite', 'Most teams earn serving points at 40–45%. If you have a rotation above 45%, make sure you\'re serving aggressively into it to maximize that advantage.'],
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
