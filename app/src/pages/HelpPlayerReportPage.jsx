import { PageHeader } from '../components/layout/PageHeader';
import { BG, SURFACE, SURFACE2, BORDER, BORDER2, TXT, TXT3, TXT4, TXT5, PRIMARY, BLUE, GREEN, DANGER as RED, HelpStep as Step } from './helpTheme';

function DiagOpenReport() {
  const rows = [
    { name: 'Harris', k: 14, ver: '5.20', tier: 'ELITE', tierColor: PRIMARY },
    { name: 'Kim',    k: 8,  ver: '3.40', tier: 'GOOD',  tierColor: GREEN   },
    { name: 'Jones',  k: 2,  ver: '2.80', tier: 'GOOD',  tierColor: GREEN   },
  ];
  return (
    <svg viewBox="0 0 320 150" className="w-full rounded-xl" style={{ background: BG }}>
      <text x="14" y="20" fill={TXT4} fontSize="9" letterSpacing="1">PLAYER STATS</text>
      {rows.map(({ name, k, ver, tier, tierColor }, i) => (
        <g key={name}>
          <rect x="12" y={28 + i * 36} width="280" height="30" rx="7"
            fill={SURFACE} stroke={BORDER} strokeWidth="1" />
          <text x="26" y={48 + i * 36} fill={TXT} fontSize="11" fontWeight="600">{name}</text>
          <text x="130" y={48 + i * 36} fill={GREEN} fontSize="10">{k}K</text>
          <text x="168" y={48 + i * 36} fill={TXT4} fontSize="10">VER {ver}</text>
          <rect x="218" y={32 + i * 36} width="44" height="18" rx="4"
            fill={`${tierColor}25`} stroke={tierColor} strokeWidth="0.8" />
          <text x="240" y={45 + i * 36} fill={tierColor} fontSize="8" fontWeight="800" textAnchor="middle">{tier}</text>
          {/* Arrow indicating tap */}
          <text x="276" y={48 + i * 36} fill={TXT5} fontSize="12">›</text>
        </g>
      ))}
      <text x="14" y="145" fill={PRIMARY} fontSize="8">Tap any player row to open their full report →</text>
    </svg>
  );
}

// Step 2 — VER Hero section
function DiagVERHero() {
  return (
    <svg viewBox="0 0 320 130" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="12" y="8" width="296" height="115" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      {/* Player name & position */}
      <text x="28" y="30" fill={TXT} fontSize="14" fontWeight="800">Harris</text>
      <rect x="28" y="36" width="28" height="14" rx="3" fill={`${PRIMARY}30`} stroke={PRIMARY} strokeWidth="0.8" />
      <text x="42" y="47" fill={PRIMARY} fontSize="8" fontWeight="700" textAnchor="middle">OH</text>
      {/* Big VER number */}
      <text x="160" y="80" fill={PRIMARY} fontSize="44" fontWeight="900" textAnchor="middle">5.20</text>
      <text x="160" y="96" fill={TXT4} fontSize="9" textAnchor="middle" letterSpacing="2">VER SCORE</text>
      {/* ELITE badge */}
      <rect x="222" y="58" width="72" height="28" rx="7"
        fill={`${PRIMARY}25`} stroke={PRIMARY} strokeWidth="1.5" />
      <text x="258" y="77" fill={PRIMARY} fontSize="12" fontWeight="900" textAnchor="middle">ELITE</text>
      {/* Pos multiplier note */}
      <text x="28" y="113" fill={TXT5} fontSize="8">Position multiplier: OH ×2.70  ·  Sets played: 12</text>
    </svg>
  );
}

// Step 3 — VER Tier scale
function DiagVERTiers() {
  const tiers = [
    { lbl: 'ELITE+', min: 6.00, color: '#fbbf24' },
    { lbl: 'ELITE',  min: 4.00, color: PRIMARY   },
    { lbl: 'GOOD',   min: 2.50, color: GREEN     },
    { lbl: 'AVG',    min: 1.50, color: BLUE      },
    { lbl: 'LOW',    min: 1.00, color: TXT4      },
    { lbl: 'BENCH',  min: 0,    color: BORDER2   },
    { lbl: 'NEG',    min: -99,  color: RED       },
  ];
  return (
    <svg viewBox="0 0 320 120" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="12" y="8" width="296" height="104" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="28" y="26" fill={TXT4} fontSize="9" letterSpacing="1">VER TIER SCALE (all positions)</text>
      {tiers.map(({ lbl, min, color }, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const x = 24 + col * 72;
        const y = 36 + row * 36;
        return (
          <g key={lbl}>
            <rect x={x} y={y} width="64" height="26" rx="5"
              fill={`${color}20`} stroke={color} strokeWidth="1" />
            <text x={x + 32} y={y + 12} fill={color} fontSize="9" fontWeight="800" textAnchor="middle">{lbl}</text>
            <text x={x + 32} y={y + 22} fill={color} fontSize="7" textAnchor="middle">
              {min === -99 ? '< 0' : `≥ ${min}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Step 4 — Stat tiles (category cards)
function DiagStatTiles() {
  const cats = [
    { label: 'Attacking', grade: 'A', gradeColor: GREEN,   stats: 'K 14  ATT 28  HIT% .321' },
    { label: 'Serving',   grade: 'B', gradeColor: BLUE,    stats: 'ACE 3  SE 1  ACE% 12%' },
    { label: 'Passing',   grade: 'C', gradeColor: PRIMARY, stats: 'APR 2.31  P3 42%' },
    { label: 'Blocking',  grade: 'D', gradeColor: RED,     stats: 'BS 0  BA 2  BHE 0' },
  ];
  return (
    <svg viewBox="0 0 320 200" className="w-full rounded-xl" style={{ background: BG }}>
      {cats.map(({ label, grade, gradeColor, stats }, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const W = 148, H = 76;
        const x = 12 + col * (W + 8);
        const y = 10 + row * (H + 8);
        return (
          <g key={label}>
            <rect x={x} y={y} width={W} height={H} rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
            <text x={x + 12} y={y + 20} fill={TXT3} fontSize="10" fontWeight="700">{label}</text>
            {/* Grade badge */}
            <rect x={x + W - 38} y={y + 8} width="28" height="28" rx="5"
              fill={`${gradeColor}25`} stroke={gradeColor} strokeWidth="1.2" />
            <text x={x + W - 24} y={y + 27} fill={gradeColor} fontSize="15"
              fontWeight="900" textAnchor="middle">{grade}</text>
            {/* Stats */}
            <text x={x + 12} y={y + 40} fill={TXT4} fontSize="8">{stats.split('  ')[0]}</text>
            <text x={x + 12} y={y + 52} fill={TXT4} fontSize="8">{stats.split('  ').slice(1).join('  ')}</text>
          </g>
        );
      })}
    </svg>
  );
}

// Step 5 — WPA card
function DiagWPA() {
  return (
    <svg viewBox="0 0 320 120" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="12" y="8" width="296" height="104" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="28" y="28" fill={TXT4} fontSize="9" letterSpacing="1">WIN PROBABILITY ADDED (WPA)</text>
      {/* WPA total */}
      <text x="28" y="56" fill={GREEN} fontSize="28" fontWeight="900">+4.7%</text>
      <text x="28" y="72" fill={TXT4} fontSize="8">Total match WPA</text>
      {/* Positive vs Negative */}
      <rect x="160" y="32" width="64" height="36" rx="6"
        fill={`${GREEN}20`} stroke={GREEN} strokeWidth="1" />
      <text x="192" y="50" fill={GREEN} fontSize="12" fontWeight="900" textAnchor="middle">+7.2%</text>
      <text x="192" y="62" fill={GREEN} fontSize="7" textAnchor="middle">positive plays</text>
      <rect x="234" y="32" width="64" height="36" rx="6"
        fill={`${RED}20`} stroke={RED} strokeWidth="1" />
      <text x="266" y="50" fill={RED} fontSize="12" fontWeight="900" textAnchor="middle">−2.5%</text>
      <text x="266" y="62" fill={RED} fontSize="7" textAnchor="middle">negative plays</text>
      {/* Note */}
      <text x="28" y="96" fill={TXT5} fontSize="7">Each kill/ace/error is weighted by how much it shifted win probability</text>
    </svg>
  );
}

// Step 6 — Trend chart (per-match sparkline mockup)
function DiagTrendChart() {
  const pts = [8, 12, 6, 15, 10, 14, 18].map((v, i) => ({
    x: 28 + i * 40,
    y: 96 - v * 3,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <svg viewBox="0 0 320 120" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="12" y="8" width="296" height="104" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="28" y="26" fill={TXT4} fontSize="9" letterSpacing="1">PER-MATCH TREND — KILLS</text>
      {/* Y axis labels */}
      <text x="18" y="42" fill={TXT5} fontSize="7">18</text>
      <text x="18" y="66" fill={TXT5} fontSize="7">10</text>
      <text x="18" y="96" fill={TXT5} fontSize="7">0</text>
      {/* Zero line */}
      <line x1="28" y1="96" x2="290" y2="96" stroke={BORDER} strokeWidth="0.5" />
      {/* Trend line */}
      <path d={pathD} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" />
      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={GREEN} />
      ))}
      {/* Match labels */}
      {['G1','G2','G3','G4','G5','G6','G7'].map((lbl, i) => (
        <text key={lbl} x={28 + i * 40} y="110" fill={TXT5} fontSize="7" textAnchor="middle">{lbl}</text>
      ))}
      {/* Trend arrow */}
      <text x="260" y="46" fill={GREEN} fontSize="9">↗ improving</text>
    </svg>
  );
}

// Step 7 — Tabs (categories)
function DiagReportTabs() {
  const tabs = ['Overview', 'Attacking', 'Serving', 'Passing', 'Blocking', 'Trends'];
  return (
    <svg viewBox="0 0 320 52" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="0" y="0" width="320" height="52" rx="8" fill={SURFACE} />
      {tabs.map((t, i) => {
        const W = 52;
        const x = 4 + i * (W + 2);
        const active = i === 0;
        return (
          <g key={t}>
            <rect x={x} y="8" width={W} height="34" rx="6"
              fill={active ? PRIMARY : SURFACE2}
              stroke={active ? PRIMARY : BORDER}
              strokeWidth="1" />
            <text x={x + W/2} y="30" fill={active ? '#000' : TXT5}
              fontSize="8" fontWeight={active ? '800' : '400'} textAnchor="middle">{t}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function HelpPlayerReportPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Player Report Card Guide" backTo="" />

      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        {/* Intro */}
        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Every player has a full report card showing their overall efficiency rating,
            letter-graded category performance, win probability contribution, and per-match
            trend charts. This guide explains each section so you can quickly spot strengths,
            weaknesses, and improvement over time.
          </p>
        </div>

        <Step
          number={1}
          title="Opening a Player's Report Card"
          note="Tap any player row on a team or match stats table to open their full report card. You can reach it from the match summary, the team roster table, the Reports page, or directly from a season's player-stats tab."
        >
          <DiagOpenReport />
        </Step>

        <Step
          number={2}
          title="VER Hero — Your Player's Bottom Line"
          note="The top of the report shows the player's VER (Volleyball Efficiency Rating) — a single number that weights all their contributions by position. A higher VER = more efficient player. The tier badge (ELITE, GOOD, AVG, etc.) appears next to the score for a quick read."
        >
          <DiagVERHero />
        </Step>

        <Step
          number={3}
          title="VER Tier Scale"
          note="The same tier scale applies to all positions — position multipliers (OH ×2.70, MB ×4.75, S ×4.00, L ×4.75, DS ×5.00) are already baked into the VER calculation, so you can compare across positions on the same scale. A libero with a VER of 4.5 is just as efficient at their role as an OH with a VER of 4.5."
        >
          <DiagVERTiers />
        </Step>

        <Step
          number={4}
          title="Category Tiles — Letter Grades by Skill"
          note="Below the VER hero, four category tiles grade the player's performance in Attacking, Serving, Passing, and Blocking. Each tile shows the letter grade (A–F) based on how their stats compare to positional averages, along with the key numbers driving that grade."
        >
          <DiagStatTiles />
        </Step>

        <Step
          number={5}
          title="WPA — Win Probability Added"
          note="WPA measures how much a player's individual actions shifted your team's chance of winning each rally. A +4.7% WPA means that player's plays, on net, increased your win probability by 4.7 percentage points over the match. Green shows positive-play contribution; red shows negative-play cost."
        >
          <DiagWPA />
        </Step>

        <Step
          number={6}
          title="Per-Match Trend Charts"
          note="Scroll down to see per-match trend charts for key stats like kills, hitting percentage, ace rate, and passing average. Each dot is one match. An upward trend line means the player is improving over the season. Tap a dot to see the exact value for that match."
        >
          <DiagTrendChart />
        </Step>

        <Step
          number={7}
          title="Category Tabs — Drill Into Any Skill"
          note="At the top of the report is a tab bar with six views: Overview (summary), Attacking, Serving, Passing, Blocking, and Trends. Tap any tab to see the full stat breakdown for that category — kill types, serve types, pass distribution, block counts, and more."
        >
          <DiagReportTabs />
        </Step>

        {/* Glossary note */}
        <div className="pl-10">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-1">
            <p className="text-slate-300 text-sm font-semibold">Not sure what a stat means?</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Open the stat glossary from Settings → Help &amp; Guide → "What do the stats mean?"
              Every metric — including VER weights, WPA formula, and grade thresholds — is explained
              in detail.
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips</p>
          {[
            ['Filter by season or match', "Use the filter controls at the top of the report to scope stats to a specific season or date range — useful for tracking improvement since a lineup change or mid-season adjustment."],
            ['Compare players side by side', 'The team stats table (Teams → your team → roster tab) lets you sort all players by any column. Sort by VER to instantly rank your roster by overall efficiency.'],
            ['VER across positions', 'Because position multipliers normalize VER, you can compare your setter\'s VER directly to your OH\'s VER. Both numbers live on the same scale.'],
            ['WPA ≠ just kills', 'WPA credits clutch plays heavily. A kill at 24–24 is worth far more WPA than a kill at 8–3. Check WPA to find who performs under pressure.'],
          ].map(([title, body]) => (
            <div key={title} className="pl-10 flex gap-3">
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
