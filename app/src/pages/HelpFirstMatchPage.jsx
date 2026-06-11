import { PageHeader } from '../components/layout/PageHeader';
import { BG, SURFACE, SURFACE2, BORDER, BORDER2, TXT, TXT3, TXT4, TXT5, PRIMARY, BLUE, GREEN, HelpStep as Step } from './helpTheme';

function DiagCreateTeam() {
  return (
    <svg viewBox="0 0 320 120" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Bottom nav */}
      <rect x="0" y="88" width="320" height="32" fill={SURFACE} />
      {['Home','Teams','Seasons','History','Settings'].map((lbl, i) => {
        const x = 16 + i * 58;
        const active = i === 1;
        return (
          <g key={lbl}>
            <text x={x + 21} y="108" fill={active ? PRIMARY : TXT5} fontSize="9"
              textAnchor="middle" fontWeight={active ? '700' : '400'}>{lbl}</text>
          </g>
        );
      })}
      {/* Teams list */}
      <rect x="12" y="10" width="264" height="60" rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="28" y="30" fill={TXT4} fontSize="9" letterSpacing="1">MY TEAMS</text>
      <text x="28" y="52" fill={TXT5} fontSize="10" fontStyle="italic">No teams yet — tap + to create your first</text>
      {/* + button */}
      <rect x="280" y="14" width="32" height="32" rx="7" fill={PRIMARY} />
      <text x="296" y="35" fill="#000" fontSize="18" fontWeight="900" textAnchor="middle">+</text>
      {/* Callout arrow */}
      <text x="285" y="60" fill={PRIMARY} fontSize="8">← tap</text>
    </svg>
  );
}

// Step 2 — Add Players
function DiagAddPlayers() {
  const players = [
    { jersey: '#3',  name: 'Harris', pos: 'OH' },
    { jersey: '#7',  name: 'Kim',    pos: 'MB' },
    { jersey: '#11', name: 'Jones',  pos: 'S'  },
  ];
  return (
    <svg viewBox="0 0 320 150" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Roster tab */}
      <rect x="12" y="8" width="80" height="26" rx="6" fill={PRIMARY} />
      <text x="52" y="26" fill="#000" fontSize="10" fontWeight="800" textAnchor="middle">Roster</text>
      <rect x="100" y="8" width="80" height="26" rx="6" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="140" y="26" fill={TXT4} fontSize="10" textAnchor="middle">Lineups</text>
      <rect x="188" y="8" width="80" height="26" rx="6" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="228" y="26" fill={TXT4} fontSize="10" textAnchor="middle">Seasons</text>
      {/* Player rows */}
      {players.map(({ jersey, name, pos }, i) => (
        <g key={name}>
          <rect x="12" y={44 + i * 30} width="260" height="26" rx="6" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
          <text x="26" y={62 + i * 30} fill={PRIMARY} fontSize="10" fontWeight="700">{jersey}</text>
          <text x="58" y={62 + i * 30} fill={TXT3} fontSize="10">{name}</text>
          <text x="218" y={62 + i * 30} fill={TXT5} fontSize="9">{pos}</text>
        </g>
      ))}
      {/* + Player button */}
      <rect x="12" y="136" width="260" height="0" rx="6" fill="none" />
      <rect x="240" y="46" width="60" height="26" rx="6" fill={PRIMARY} fillOpacity="0.15" stroke={PRIMARY} strokeWidth="1" />
      <text x="270" y="63" fill={PRIMARY} fontSize="9" fontWeight="700" textAnchor="middle">+ Player</text>
    </svg>
  );
}

// Step 3 — Create a Season
function DiagCreateSeason() {
  return (
    <svg viewBox="0 0 320 110" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Seasons tab highlighted */}
      <rect x="12" y="8" width="80" height="26" rx="6" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="52" y="26" fill={TXT4} fontSize="10" textAnchor="middle">Roster</text>
      <rect x="100" y="8" width="80" height="26" rx="6" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="140" y="26" fill={TXT4} fontSize="10" textAnchor="middle">Lineups</text>
      <rect x="188" y="8" width="80" height="26" rx="6" fill={PRIMARY} />
      <text x="228" y="26" fill="#000" fontSize="10" fontWeight="800" textAnchor="middle">Seasons</text>
      {/* Season card */}
      <rect x="12" y="44" width="240" height="56" rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="28" y="64" fill={TXT} fontSize="12" fontWeight="700">2025 Spring</text>
      <text x="28" y="80" fill={TXT4} fontSize="9">Mar 2025 – Jun 2025</text>
      <text x="28" y="93" fill={TXT5} fontSize="8">0 matches · 0–0</text>
      {/* + Season */}
      <rect x="260" y="44" width="48" height="26" rx="6" fill={PRIMARY} />
      <text x="284" y="61" fill="#000" fontSize="9" fontWeight="800" textAnchor="middle">+ Season</text>
    </svg>
  );
}

// Step 4 — Schedule a Match
function DiagScheduleMatch() {
  return (
    <svg viewBox="0 0 320 130" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Match setup form card */}
      <rect x="12" y="10" width="296" height="110" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="28" y="32" fill={TXT4} fontSize="9" letterSpacing="1">NEW MATCH</text>
      {/* Opponent row */}
      <text x="28" y="52" fill={TXT3} fontSize="10">vs.</text>
      <rect x="50" y="40" width="150" height="22" rx="5" fill={SURFACE2} stroke={BORDER2} strokeWidth="1" />
      <text x="60" y="55" fill={TXT3} fontSize="10">Riverside High</text>
      {/* Season row */}
      <text x="28" y="78" fill={TXT3} fontSize="10">Season:</text>
      <rect x="80" y="66" width="120" height="22" rx="5" fill={SURFACE2} stroke={BORDER2} strokeWidth="1" />
      <text x="90" y="81" fill={TXT3} fontSize="10">2025 Spring</text>
      {/* Format */}
      <text x="28" y="102" fill={TXT3} fontSize="10">Format:</text>
      <rect x="80" y="90" width="60" height="22" rx="5" fill={PRIMARY} />
      <text x="110" y="105" fill="#000" fontSize="10" fontWeight="800" textAnchor="middle">Best of 5</text>
      <rect x="148" y="90" width="60" height="22" rx="5" fill={SURFACE2} stroke={BORDER2} strokeWidth="1" />
      <text x="178" y="105" fill={TXT4} fontSize="10" textAnchor="middle">Best of 3</text>
    </svg>
  );
}

// Step 5 — Load a Lineup
function DiagLoadLineup() {
  return (
    <svg viewBox="0 0 320 110" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="12" y="10" width="296" height="90" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="28" y="30" fill={TXT4} fontSize="9" letterSpacing="1">CHOOSE LINEUP</text>
      <text x="28" y="52" fill={TXT} fontSize="13" fontWeight="700">Base 5-1</text>
      <rect x="28" y="60" width="68" height="16" rx="3" fill="#1e3a5f" stroke="#1d4ed8" strokeWidth="0.5" />
      <text x="62" y="72" fill={BLUE} fontSize="8" textAnchor="middle">6 formations</text>
      <rect x="102" y="60" width="48" height="16" rx="3" fill="#14402f" stroke="#166534" strokeWidth="0.5" />
      <text x="126" y="72" fill={GREEN} fontSize="8" textAnchor="middle">2 subs</text>
      {/* Load button */}
      <rect x="232" y="40" width="62" height="32" rx="7" fill={PRIMARY} />
      <text x="263" y="60" fill="#000" fontSize="11" fontWeight="800" textAnchor="middle">Load</text>
      {/* Skip label */}
      <text x="28" y="94" fill={TXT5} fontSize="8">Or tap "No lineup" to use default positioning</text>
    </svg>
  );
}

// Step 6 — Go Live (Live match screen overview)
function DiagGoLive() {
  return (
    <svg viewBox="0 0 320 200" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Score header */}
      <rect x="0" y="0" width="320" height="36" fill={SURFACE} />
      <circle cx="14" cy="18" r="5" fill="none" stroke={BORDER2} strokeWidth="1.5" />
      <circle cx="26" cy="18" r="5" fill="none" stroke={BORDER2} strokeWidth="1.5" />
      <text x="48" y="25" fill={TXT} fontSize="16" fontWeight="900" fontFamily="monospace">0</text>
      <text x="150" y="14" fill={TXT4} fontSize="8" textAnchor="middle" fontWeight="700">SET 1</text>
      <circle cx="150" cy="26" r="5" fill={PRIMARY} />
      <text x="266" y="25" fill={TXT} fontSize="16" fontWeight="900" fontFamily="monospace">0</text>
      <circle cx="294" cy="18" r="5" fill="none" stroke={BORDER2} strokeWidth="1.5" />
      <circle cx="306" cy="18" r="5" fill="none" stroke={BORDER2} strokeWidth="1.5" />
      {/* Player grid — 2×3 */}
      {[
        { label: 'S4', jersey: '#7', name: 'Emma'  },
        { label: 'S3', jersey: '#3', name: 'Sara'  },
        { label: 'S2', jersey: '#11',name: 'Ava'   },
        { label: 'S5', jersey: '#15',name: 'Jess'  },
        { label: 'S6', jersey: '#4', name: 'Kate'  },
        { label: 'S1', jersey: '#1', name: 'Lexi', server: true },
      ].map((p, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const W = 106, H = 68;
        const x = col * W + 1;
        const y = 38 + row * H;
        return (
          <g key={p.label}>
            <rect x={x} y={y} width={W - 1} height={H - 1}
              fill={p.server ? `${PRIMARY}14` : SURFACE}
              stroke={p.server ? PRIMARY : BORDER}
              strokeWidth={p.server ? 1.5 : 0.5} />
            <text x={x + 6} y={y + 12} fill={TXT5} fontSize="7">{p.label}{p.server ? ' ★' : ''}</text>
            <text x={x + W/2 - 0.5} y={y + 38} fill={p.server ? PRIMARY : TXT} fontSize="13"
              fontWeight="700" textAnchor="middle">{p.jersey}</text>
            <text x={x + W/2 - 0.5} y={y + 52} fill={TXT3} fontSize="8" textAnchor="middle">{p.name}</text>
          </g>
        );
      })}
      {/* Horizontal divider */}
      <line x1="0" y1="106" x2="320" y2="106" stroke={BORDER} strokeWidth="0.5" />
      {/* Action bar */}
      <rect x="0" y="174" width="320" height="26" fill={SURFACE} />
      <text x="32"  y="190" fill={TXT4} fontSize="8" textAnchor="middle">↺ ROT</text>
      <text x="96"  y="190" fill={TXT4} fontSize="8" textAnchor="middle">↻ ROT</text>
      <text x="160" y="190" fill={TXT4} fontSize="8" textAnchor="middle">UNDO</text>
      <text x="234" y="190" fill={TXT4} fontSize="8" textAnchor="middle">SUB</text>
      <text x="296" y="190" fill={TXT4} fontSize="8" textAnchor="middle">≡</text>
    </svg>
  );
}

// Step 7 — Read the Match Summary
function DiagMatchSummary() {
  const stats = [
    { name: 'Harris', k: 14, ace: 3, ver: '24.1', tier: 'ELITE' },
    { name: 'Kim',    k: 8,  ace: 0, ver: '18.7', tier: 'GOOD'  },
    { name: 'Jones',  k: 2,  ace: 1, ver: '16.2', tier: 'GOOD'  },
  ];
  return (
    <svg viewBox="0 0 320 170" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Header score */}
      <rect x="12" y="8" width="296" height="48" rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="28" y="24" fill={TXT4} fontSize="8" letterSpacing="1">MATCH RESULT</text>
      <text x="28" y="46" fill={GREEN} fontSize="20" fontWeight="900">WIN</text>
      <text x="90" y="46" fill={TXT} fontSize="20" fontWeight="900">3 – 1</text>
      <text x="200" y="46" fill={TXT4} fontSize="10">vs. Riverside</text>
      {/* Player stat rows */}
      {stats.map(({ name, k, ace, ver, tier }, i) => (
        <g key={name}>
          <rect x="12" y={66 + i * 30} width="296" height="26" rx="6" fill={SURFACE} stroke={BORDER} strokeWidth="0.5" />
          <text x="26" y={83 + i * 30} fill={TXT3} fontSize="10">{name}</text>
          <text x="120" y={83 + i * 30} fill={GREEN} fontSize="10">{k}K</text>
          <text x="158" y={83 + i * 30} fill={BLUE} fontSize="10">{ace}A</text>
          <text x="196" y={83 + i * 30} fill={TXT3} fontSize="10">VER {ver}</text>
          <rect x="260" y={68 + i * 30} width="40" height="16" rx="3"
            fill={tier === 'ELITE' ? `${PRIMARY}30` : `${GREEN}20`}
            stroke={tier === 'ELITE' ? PRIMARY : GREEN} strokeWidth="0.8" />
          <text x="280" y={80 + i * 30} fill={tier === 'ELITE' ? PRIMARY : GREEN}
            fontSize="7" fontWeight="800" textAnchor="middle">{tier}</text>
        </g>
      ))}
      {/* Tap hint */}
      <text x="160" y="162" fill={TXT5} fontSize="8" textAnchor="middle">Tap any player row to see full report card →</text>
    </svg>
  );
}

export function HelpFirstMatchPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Your First Match — Walkthrough" backTo="" />

      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        {/* Intro */}
        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            This walkthrough takes you from a fresh install through your first complete match —
            creating a team, adding your players, scheduling a match, and reading the results.
            Follow the steps in order and you'll be tracking live stats in under five minutes.
          </p>
        </div>

        <Step
          number={1}
          title="Create a Team"
          note='Open the Teams tab in the bottom navigation. Tap the + button in the top-right corner and enter your team name. You can change the name, colors, or format later.'
        >
          <DiagCreateTeam />
        </Step>

        <Step
          number={2}
          title="Add Your Players"
          note="Inside your new team, tap the Roster tab. Tap + Player for each athlete — enter their jersey number, name, and primary position. Add all players who might appear in a lineup (including libero/DS)."
        >
          <DiagAddPlayers />
        </Step>

        <Step
          number={3}
          title="Create a Season"
          note="Tap the Seasons tab on the team page, then tap + Season. Give it a name and date range (e.g. 2025 Spring). Every match you record will be linked to a season so you can compare across years."
        >
          <DiagCreateSeason />
        </Step>

        <Step
          number={4}
          title="Schedule a Match"
          note='From the home screen or the Seasons page, tap New Match (or the + button). Choose your opponent (or type a new name), select the season, and pick the format (Best of 3 or Best of 5). Tap Start when ready.'
        >
          <DiagScheduleMatch />
        </Step>

        <Step
          number={5}
          title="Load a Lineup (optional)"
          note='After creating the match you will be taken to the Set Lineup page. If you have a saved lineup, tap Load — it will apply your rotation order and any saved serve-receive formations. Tap "No lineup" to use the default player order instead.'
        >
          <DiagLoadLineup />
        </Step>

        <Step
          number={6}
          title="Track Stats Live"
          note="The live match screen shows your six players in a 2×3 grid mirroring the court. The current server tile is highlighted in orange. Tap a player tile to record a stat for that player, then confirm the action in the panel that appears. Use the Action Bar at the bottom to rotate, undo, sub, or open the menu."
        >
          <DiagGoLive />
        </Step>

        <Step
          number={7}
          title="Read the Match Summary"
          note="When the match ends, tap End Match to see the full summary — final score, kills, aces, and VER ratings for every player. Tap any player row to drill into their individual report card with per-set breakdowns and trend charts."
        >
          <DiagMatchSummary />
        </Step>

        {/* Tips */}
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Pro Tips</p>
          {[
            ['Auto-backup', 'The app saves a backup of all your data to local storage after every point. If the app closes mid-match, reopen it — you can restore from the auto-backup in Settings → Data.'],
            ['Default team', 'Set a Default Team and Season in Settings so the home screen shows your team record, stat leaders, and totals the moment you open the app.'],
            ['Offline-first', 'No internet required during a match. All data is stored on-device. Export a backup file after important matches to keep a copy safe.'],
            ['Build a lineup first', 'Saved lineups unlock serve-receive formations and planned substitutions. See the Serve-Receive Formation Setup guide for full details.'],
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
