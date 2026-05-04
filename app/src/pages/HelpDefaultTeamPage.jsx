import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';

// ── Palette (matches app exactly) ─────────────────────────────────────────────
const BG      = '#000000';
const SURFACE = '#1e293b';
const SURFACE2= '#0f172a';
const BORDER  = '#334155';
const BORDER2 = '#475569';
const TXT     = '#f8fafc';
const TXT3    = '#cbd5e1';
const TXT4    = '#94a3b8';
const TXT5    = '#64748b';
const PRIMARY = '#f97316';
const EMERALD = '#34d399';
const RED     = '#f87171';
const BLUE    = '#60a5fa';
const YELLOW  = '#fbbf24';

function Step({ number, title, note, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center shrink-0"
          style={{ background: PRIMARY }}
        >
          {number}
        </span>
        <span className="font-semibold text-white">{title}</span>
      </div>
      {note && <p className="text-sm text-slate-400 pl-10 leading-relaxed">{note}</p>}
      {children && <div className="pl-10">{children}</div>}
    </div>
  );
}

// ── Step 1 — Navigate to Settings ─────────────────────────────────────────────
function DiagNavToSettings() {
  const items = [
    { label: 'Home',     icon: '🏠', active: false },
    { label: 'Teams',    icon: '👥', active: false },
    { label: 'Reports',  icon: '📊', active: false },
    { label: 'Settings', icon: '⚙️', active: true  },
  ];
  return (
    <svg viewBox="0 0 320 64" className="w-full rounded-xl" style={{ background: SURFACE2 }}>
      <rect x="0" y="0" width="320" height="64" fill={SURFACE2} />
      <line x1="0" y1="1" x2="320" y2="1" stroke={BORDER} strokeWidth="1" />
      {items.map((item, i) => {
        const x = 40 + i * 80;
        return (
          <g key={item.label}>
            {item.active && (
              <rect x={x - 34} y="0" width="68" height="2" rx="1" fill={PRIMARY} />
            )}
            <text x={x} y="28" fontSize="18" textAnchor="middle">{item.icon}</text>
            <text x={x} y="50" fontSize="10" textAnchor="middle"
              fill={item.active ? PRIMARY : TXT5}
              fontWeight={item.active ? '700' : '500'}>
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Step 2 — Personalization section header ────────────────────────────────────
function DiagPersonalization() {
  return (
    <svg viewBox="0 0 320 56" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <rect x="0" y="0" width="320" height="56" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="16" y="25" fill={TXT} fontSize="14" fontWeight="700">Personalization</text>
      <text x="16" y="42" fill={TXT5} fontSize="9" letterSpacing="0.5">Program name · Coach name · Win message · Default team · Default season · …</text>
      {/* Callout arrow */}
      <text x="292" y="30" fill={PRIMARY} fontSize="14" textAnchor="middle">↓</text>
    </svg>
  );
}

// ── Step 3 — Default Team dropdown ────────────────────────────────────────────
function DiagDefaultTeam() {
  return (
    <svg viewBox="0 0 320 100" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="22" fill={TXT} fontSize="12" fontWeight="600">Default Team</text>
      <text x="16" y="37" fill={TXT5} fontSize="9">Pre-selected in tool pages and session setup</text>
      {/* Select box */}
      <rect x="16" y="46" width="288" height="38" rx="8" fill={SURFACE2} stroke={PRIMARY} strokeWidth="1.5" />
      <text x="30" y="70" fill={TXT} fontSize="12">Varsity HS</text>
      {/* Dropdown arrow */}
      <text x="286" y="70" fill={TXT4} fontSize="12" textAnchor="middle">▾</text>
      {/* Dropdown options hint */}
      <rect x="16" y="84" width="288" height="1" rx="0" fill={BORDER} />
    </svg>
  );
}

// ── Step 4 — Default Season dropdown (appears after team selected) ─────────────
function DiagDefaultSeason() {
  return (
    <svg viewBox="0 0 320 160" className="w-full rounded-xl" style={{ background: SURFACE }}>
      {/* Default Team (greyed, already set) */}
      <text x="16" y="22" fill={TXT} fontSize="12" fontWeight="600">Default Team</text>
      <text x="16" y="37" fill={TXT5} fontSize="9">Pre-selected in tool pages and session setup</text>
      <rect x="16" y="46" width="288" height="36" rx="8" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="30" y="68" fill={TXT3} fontSize="12">Varsity HS</text>
      <text x="286" y="68" fill={TXT4} fontSize="12" textAnchor="middle">▾</text>

      {/* Divider */}
      <line x1="16" y1="94" x2="304" y2="94" stroke={BORDER} strokeWidth="1" />

      {/* Default Season (newly appeared) */}
      <text x="16" y="112" fill={TXT} fontSize="12" fontWeight="600">Default Season</text>
      <text x="16" y="126" fill={TXT5} fontSize="9">Pre-selected in Reports and tool pages for this team</text>
      {/* Select box with orange highlight */}
      <rect x="16" y="136" width="288" height="16" rx="6" fill={SURFACE2} stroke={PRIMARY} strokeWidth="1.5" />
      <text x="30" y="148" fill={TXT} fontSize="10">2024-25 Varsity</text>
      <text x="286" y="148" fill={TXT4} fontSize="10" textAnchor="middle">▾</text>
    </svg>
  );
}

// ── Step 5 — Season record card ────────────────────────────────────────────────
function DiagSeasonRecord() {
  return (
    <svg viewBox="0 0 320 220" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Card */}
      <rect x="4" y="4" width="312" height="212" rx="12" fill={SURFACE} stroke={BORDER} strokeWidth="1" />

      {/* Header */}
      <rect x="4" y="4" width="312" height="34" rx="12" fill={SURFACE} />
      <rect x="4" y="26" width="312" height="12" fill={SURFACE} />
      <line x1="4" y1="38" x2="316" y2="38" stroke={BORDER} strokeWidth="0.5" strokeOpacity="0.6" />
      <text x="160" y="26" fill={TXT} fontSize="11" fontWeight="900" textAnchor="middle" letterSpacing="3">VARSITY HS</text>
      <text x="160" y="36" fill={TXT4} fontSize="9" textAnchor="middle">·</text>
      <text x="170" y="36" fill={TXT4} fontSize="9">2024-25</text>

      {/* W / L split */}
      <line x1="160" y1="38" x2="160" y2="128" stroke={BORDER} strokeWidth="0.5" strokeOpacity="0.6" />

      {/* WINS */}
      <text x="80" y="105" fill={EMERALD} fontSize="52" fontWeight="900" textAnchor="middle" fontFamily="monospace">12</text>
      <text x="80" y="122" fill="#14532d" fontSize="9" fontWeight="900" textAnchor="middle" letterSpacing="3">WINS</text>

      {/* LOSSES */}
      <text x="240" y="105" fill={RED} fontSize="52" fontWeight="900" textAnchor="middle" fontFamily="monospace">4</text>
      <text x="240" y="122" fill="#7f1d1d" fontSize="9" fontWeight="900" textAnchor="middle" letterSpacing="3">LOSSES</text>

      {/* Stats row */}
      <line x1="4" y1="130" x2="316" y2="130" stroke={BORDER} strokeWidth="0.5" strokeOpacity="0.6" />
      <text x="160" y="148" fill={TXT5} fontSize="8" textAnchor="middle">
        75% WIN · 7–2 HOME · 4–2 AWAY · 8–3 CONF · 3–1 L5
      </text>

      {/* Progress bar */}
      <line x1="4" y1="158" x2="316" y2="158" stroke={BORDER} strokeWidth="0.5" strokeOpacity="0.6" />
      <text x="16" y="172" fill={TXT5} fontSize="8" fontWeight="700" letterSpacing="1">SEASON PROGRESS · 80%</text>
      <text x="304" y="172" fill={TXT5} fontSize="8" textAnchor="end">16 / 20</text>
      <rect x="16" y="178" width="288" height="6" rx="3" fill={BORDER} />
      <rect x="16" y="178" width="230" height="6" rx="3" fill={PRIMARY} />
    </svg>
  );
}

// ── Step 6 — Quick team stats strip ───────────────────────────────────────────
function DiagStatsStrip() {
  const stats = [
    { label: 'HIT%', val: '.312' },
    { label: 'SRV%', val: '82%'  },
    { label: 'ACE%', val: '7.4%' },
  ];
  return (
    <svg viewBox="0 0 320 80" className="w-full rounded-xl" style={{ background: BG }}>
      {stats.map(({ label, val }, i) => {
        const x = 6 + i * 104;
        return (
          <g key={label}>
            <rect x={x} y="6" width="98" height="68" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
            <text x={x + 49} y="30" fill={TXT5} fontSize="9" fontWeight="900" textAnchor="middle" letterSpacing="1">{label}</text>
            <text x={x + 49} y="58" fill={PRIMARY} fontSize="24" fontWeight="900" textAnchor="middle" fontFamily="monospace">{val}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Step 7 — Season Leaders grid ──────────────────────────────────────────────
function DiagLeaders() {
  const leaders = [
    { label: 'K',   val: '287', name: 'Harris', delta: '+12' },
    { label: 'ACE', val: '41',  name: 'Kim',    delta: '+3'  },
    { label: 'BLK', val: '98',  name: 'Patel',  delta: '+7'  },
    { label: 'DIG', val: '312', name: 'Jones',  delta: '+18' },
    { label: 'AST', val: '521', name: 'Lee',    delta: '+40' },
    { label: 'REC', val: '298', name: 'Cruz',   delta: '+22' },
    { label: 'APR', val: '2.41',name: 'Morris', delta: '+.04'},
  ];
  const CW = 40, CH = 82, GAP = 4, OX = 6;
  return (
    <svg viewBox="0 0 320 110" className="w-full rounded-xl" style={{ background: BG }}>
      <text x={OX} y="14" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">SEASON LEADERS · 2024-25</text>
      {leaders.map(({ label, val, name, delta }, i) => {
        const x = OX + i * (CW + GAP);
        return (
          <g key={label}>
            <rect x={x} y="20" width={CW} height={CH} rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
            <text x={x + CW/2} y="35" fill={TXT5} fontSize="7" fontWeight="900" textAnchor="middle" letterSpacing="0.5">{label}</text>
            <text x={x + CW/2} y="57" fill={PRIMARY} fontSize="15" fontWeight="900" textAnchor="middle" fontFamily="monospace">{val}</text>
            <text x={x + CW/2} y="70" fill={EMERALD} fontSize="7" fontWeight="700" textAnchor="middle">{delta}</text>
            <text x={x + CW/2} y="96" fill={TXT3} fontSize="7" fontWeight="600" textAnchor="middle">{name}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Step 8 — Team Totals grid ─────────────────────────────────────────────────
function DiagTeamTotals() {
  const totals = [
    { label: 'K',   val: '1,243', avg: '77.7' },
    { label: 'ACE', val: '187',   avg: '11.7' },
    { label: 'BLK', val: '421',   avg: '26.3' },
    { label: 'DIG', val: '1,518', avg: '94.9' },
    { label: 'AST', val: '1,156', avg: '72.3' },
    { label: 'REC', val: '1,104', avg: '69.0' },
    { label: 'APR', val: '2.31',  avg: null   },
  ];
  const CW = 40, CH = 82, GAP = 4, OX = 6;
  return (
    <svg viewBox="0 0 320 110" className="w-full rounded-xl" style={{ background: BG }}>
      <text x={OX} y="14" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">TEAM TOTALS</text>
      {totals.map(({ label, val, avg }, i) => {
        const x = OX + i * (CW + GAP);
        return (
          <g key={label}>
            <rect x={x} y="20" width={CW} height={CH} rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
            <text x={x + CW/2} y="35" fill={TXT5} fontSize="7" fontWeight="900" textAnchor="middle" letterSpacing="0.5">{label}</text>
            <text x={x + CW/2} y="57" fill={PRIMARY} fontSize={val.length > 4 ? '10' : '15'} fontWeight="900" textAnchor="middle" fontFamily="monospace">{val}</text>
            {avg && (
              <text x={x + CW/2} y="72" fill={TXT} fontSize="7" fontWeight="600" textAnchor="middle">
                {avg}<tspan fill={TXT5}>/M</tspan>
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Step 9 — Tap to drill down ─────────────────────────────────────────────────
function DiagDrillDown() {
  return (
    <svg viewBox="0 0 320 100" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Leader card tapped */}
      <rect x="6" y="8" width="64" height="84" rx="8" fill={SURFACE} stroke={PRIMARY} strokeWidth="2" />
      <text x="38" y="28" fill={TXT5} fontSize="7" fontWeight="900" textAnchor="middle" letterSpacing="0.5">K</text>
      <text x="38" y="52" fill={PRIMARY} fontSize="18" fontWeight="900" textAnchor="middle">287</text>
      <text x="38" y="65" fill={EMERALD} fontSize="7" fontWeight="700" textAnchor="middle">▲12</text>
      <text x="38" y="84" fill={TXT3} fontSize="7" fontWeight="600" textAnchor="middle">Harris</text>

      {/* Arrow */}
      <text x="92" y="54" fill={PRIMARY} fontSize="22" fontWeight="900">→</text>

      {/* Destination: player stats page */}
      <rect x="120" y="8" width="194" height="84" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="136" y="30" fill={TXT4} fontSize="9">Player Report Card</text>
      <text x="136" y="48" fill={TXT} fontSize="13" fontWeight="700">Harris</text>
      <text x="136" y="63" fill={TXT5} fontSize="9">#3 · OH · 2024-25</text>
      <text x="136" y="78" fill={PRIMARY} fontSize="9" fontWeight="700">VER: +18.4  →  full stats</text>
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function HelpDefaultTeamPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Default Team & Season Guide" backTo="" />

      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        {/* Intro */}
        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Setting a default team and season unlocks the home screen dashboard: a live season
            record scoreboard, team efficiency stats, individual stat leaders across seven
            categories, and full team season totals — all on the home page the moment you open
            the app.
          </p>
        </div>

        {/* Step 1 */}
        <Step
          number={1}
          title="Open the Settings page"
          note='Tap Settings in the bottom navigation bar. It is the ⚙ icon on the far right.'
        >
          <DiagNavToSettings />
        </Step>

        {/* Step 2 */}
        <Step
          number={2}
          title='Scroll to the "Personalization" section'
          note="Settings is organized into sections — Personalization is below the Install App banner. Scroll down until you see the section card with that heading."
        >
          <DiagPersonalization />
        </Step>

        {/* Step 3 */}
        <Step
          number={3}
          title="Select your Default Team"
          note='Tap the "Default Team" dropdown. Every team you have created in the app appears in the list. Select the team whose home screen dashboard you want to see. This also pre-fills that team in tool pages and match setup.'
        >
          <DiagDefaultTeam />
        </Step>

        {/* Step 4 */}
        <Step
          number={4}
          title="Select your Default Season"
          note='Once a Default Team is chosen, a second dropdown labeled "Default Season" appears immediately below it. Tap it and select the season you want to track. The list shows all seasons on record for that team. Changing the team selection here automatically clears the season so you always pick one that belongs to the right team.'
        >
          <DiagDefaultSeason />
        </Step>

        {/* Tip card */}
        <div className="pl-10">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
            <p className="text-slate-300 text-sm font-semibold mb-1">Changes are instant</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              There is no Save button — both dropdowns write immediately. As soon as you
              select the season, navigate back to the home screen and the dashboard will
              already be populated.
            </p>
          </div>
        </div>

        {/* Step 5 */}
        <Step
          number={5}
          title="Home screen: Season record scoreboard"
          note="Return to the home screen. The first new element is the season record card. It shows your team name and season at the top, then the WINS and LOSSES in large scoreboard digits. Below the numbers is a row of split records — home, away, neutral, conference, tournament, and last-5 — and a progress bar showing how far through the scheduled season you are."
        >
          <DiagSeasonRecord />
        </Step>

        {/* Step 6 */}
        <Step
          number={6}
          title="Quick team efficiency strip"
          note="Just below the record card, three tiles show the team's season-wide efficiency rates: HIT% (hitting percentage), SRV% (serve-in rate), and ACE% (ace rate). Tap any tile to jump directly to the full team stats page filtered to that stat."
        >
          <DiagStatsStrip />
        </Step>

        {/* Step 7 */}
        <Step
          number={7}
          title="Season Leaders — one card per stat category"
          note="Seven cards show the season leader in each category: K (kills), ACE, BLK (blocks), DIG, AST (assists), REC (receptions), and APR (average pass rating). Each card shows the leader's total, a delta triangle indicating how many they added in the most recent match (green ▲ for gain), and the player's name. Tap any card to go directly to that player's full stats page for the season."
        >
          <DiagLeaders />
        </Step>

        {/* Step 8 */}
        <Step
          number={8}
          title="Team Totals — season-wide team numbers"
          note="Directly below Season Leaders is a matching grid showing the same seven categories summed across all players for the entire season. Each card also shows a per-match average below the total so you can see the team's typical output in a single match. Tap any tile to navigate to the full team season stats table for that category."
        >
          <DiagTeamTotals />
        </Step>

        {/* Step 9 */}
        <Step
          number={9}
          title="Tap any card to drill deeper"
          note="Every number on the home screen is a live link. Tapping a leader card opens that player's report card. Tapping a team total opens the full season team stats page sorted by that category. The home screen is designed to be your daily briefing — one tap always gets you to the detail."
        >
          <DiagDrillDown />
        </Step>

        {/* Tips section */}
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips & notes</p>
          {[
            [
              'Leaders require minimum attempts',
              'To avoid noise from players with one or two contacts, stat leaders require a minimum number of attempts: 10+ serve attempts for ACE leaders, 10+ attack attempts for kill leaders, 10+ pass attempts for REC and APR leaders, etc.',
            ],
            [
              'Delta arrows update after each match',
              'The ▲/▼ triangle next to each leader value shows what they added in the single most recent completed match. It disappears when only one match is recorded.',
            ],
            [
              'Exhibition matches are excluded',
              'The season record scoreboard and all leader/total calculations automatically exclude matches marked as exhibitions. Only regular season and tournament matches count.',
            ],
            [
              'Changing the season mid-season',
              'You can update the Default Season at any time in Settings. Useful if you want to compare current-year leaders against a prior year without navigating away from the home screen.',
            ],
            [
              'No data yet?',
              'If you have set both defaults but the dashboard shows dashes, it means no completed (non-exhibition) matches exist for the selected season yet. Record your first match and the dashboard populates automatically.',
            ],
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
