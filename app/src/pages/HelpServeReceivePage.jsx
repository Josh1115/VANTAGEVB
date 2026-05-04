import { PageHeader } from '../components/layout/PageHeader';

// ── Shared diagram constants ───────────────────────────────────────────────────
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
const BLUE    = '#60a5fa';
const GREEN   = '#34d399';
const ROMAN_C = '#fb923c';

function Step({ number, title, note, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-primary text-black text-sm font-black flex items-center justify-center shrink-0">
          {number}
        </span>
        <span className="font-semibold text-white">{title}</span>
      </div>
      {note && <p className="text-sm text-slate-400 pl-10">{note}</p>}
      <div className="pl-10">{children}</div>
    </div>
  );
}

// ── Step 1 — Open your Team page ──────────────────────────────────────────────
function DiagTeamCard() {
  return (
    <svg viewBox="0 0 320 100" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Card */}
      <rect x="12" y="12" width="220" height="76" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="28" y="38" fill={TXT} fontSize="13" fontWeight="700">Varsity HS</text>
      <text x="28" y="57" fill={TXT4} fontSize="10">2025 Season · 8 players</text>
      <text x="28" y="74" fill={TXT5} fontSize="9">3 saved lineups</text>
      {/* Arrow */}
      <text x="246" y="56" fill={PRIMARY} fontSize="26" fontWeight="900">→</text>
    </svg>
  );
}

// ── Step 2 — Lineups tab ───────────────────────────────────────────────────────
function DiagLineupsTab() {
  const tabs = ['Roster', 'Lineups', 'Seasons'];
  return (
    <svg viewBox="0 0 320 52" className="w-full rounded-xl" style={{ background: BG }}>
      {tabs.map((t, i) => {
        const active = i === 1;
        const x = 12 + i * 100;
        return (
          <g key={t}>
            <rect x={x} y="8" width="94" height="36" rx="7"
              fill={active ? PRIMARY : SURFACE}
              stroke={active ? PRIMARY : BORDER}
              strokeWidth="1" />
            <text x={x + 47} y="31" fill={active ? '#000' : TXT4}
              fontSize="12" fontWeight={active ? '800' : '500'} textAnchor="middle">
              {t}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Step 3 — Lineup card with ▼ callout ────────────────────────────────────────
function DiagLineupCard() {
  const rows = [
    { r: 'I',   name: '#3 Harris (OH)' },
    { r: 'II',  name: '#7 Kim (MB)'    },
    { r: 'III', name: '#11 Jones (S)'  },
    { r: 'IV',  name: '#2 Lee (OH)'    },
    { r: 'V',   name: '#9 Patel (MB)'  },
    { r: 'VI',  name: '#14 Cruz (OPP)' },
  ];
  return (
    <svg viewBox="0 0 320 200" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Card bg */}
      <rect x="12" y="10" width="296" height="180" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      {/* Header row */}
      <text x="28" y="32" fill={TXT} fontSize="13" fontWeight="700">Base 5-1</text>
      <text x="205" y="32" fill={TXT4} fontSize="11">Edit</text>
      <text x="240" y="32" fill="#f87171" fontSize="11">Delete</text>
      {/* ▼ button callout */}
      <rect x="270" y="18" width="28" height="22" rx="5"
        fill={PRIMARY} fillOpacity="0.15" stroke={PRIMARY} strokeWidth="1.5" />
      <text x="284" y="33" fill={PRIMARY} fontSize="13" fontWeight="900" textAnchor="middle">▼</text>
      {/* Serve order */}
      {rows.map(({ r, name }, i) => (
        <g key={r}>
          <text x="30" y={58 + i * 22} fill={ROMAN_C} fontSize="10" fontWeight="900">{r}</text>
          <text x="52" y={58 + i * 22} fill={TXT3} fontSize="10">{name}</text>
        </g>
      ))}
      {/* Tap hint */}
      <text x="284" y="48" fill={PRIMARY} fontSize="8" textAnchor="middle">tap</text>
    </svg>
  );
}

// ── Step 4 — Expanded panel + Serve Rec Formations tab ────────────────────────
function DiagSubTabs() {
  return (
    <svg viewBox="0 0 320 70" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <rect x="8" y="10" width="146" height="50" rx="7"
        fill={PRIMARY} stroke={PRIMARY} strokeWidth="1" />
      <text x="81" y="40" fill="#000" fontSize="11" fontWeight="800" textAnchor="middle">
        Serve Rec Formations
      </text>
      <rect x="162" y="10" width="150" height="50" rx="7"
        fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="237" y="40" fill={TXT4} fontSize="11" fontWeight="500" textAnchor="middle">
        Planned Subs
      </text>
    </svg>
  );
}

// ── Step 5 — Rotation tab bar with blue dots ───────────────────────────────────
function DiagRotationTabs() {
  const hasDot = [false, true, false, true, false, false];
  return (
    <svg viewBox="0 0 320 70" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="12" y="15" fill={TXT5} fontSize="8" letterSpacing="1">ROTATION</text>
      {[1,2,3,4,5,6].map((r, i) => {
        const active = i === 1;
        const x = 8 + i * 51;
        return (
          <g key={r}>
            <rect x={x} y="22" width="45" height="38" rx="6"
              fill={active ? BORDER2 : SURFACE2}
              stroke={active ? BORDER : BORDER}
              strokeWidth="1" />
            <text x={x + 22} y="45" fill={active ? TXT : TXT4}
              fontSize="14" fontWeight="900" textAnchor="middle">
              {r}
            </text>
            {hasDot[i] && (
              <circle cx={x + 38} cy="27" r="4" fill={BLUE} />
            )}
          </g>
        );
      })}
      <text x="12" y="72" fill={TXT5} fontSize="8">● = formation already saved for this rotation</text>
    </svg>
  );
}

// ── Step 6 — Court grid, first tap (cell selected) ───────────────────────────
function DiagGridSelect() {
  // TL TM TR / BL BM BR
  const cells = [
    { label: 'TL', jersey: '#3',  name: 'Harris', pos: 'OH'  },
    { label: 'TM', jersey: '#9',  name: 'Patel',  pos: 'MB'  },
    { label: 'TR', jersey: '#7',  name: 'Kim',    pos: 'MB'  },
    { label: 'BL', jersey: '#2',  name: 'Lee',    pos: 'OH'  },
    { label: 'BM', jersey: '#14', name: 'Cruz',   pos: 'OPP' },
    { label: 'BR', jersey: '#11', name: 'Jones',  pos: 'S'   },
  ];
  const cols = 3;
  const CW = 88, CH = 66, GAP = 6, OX = 14, OY = 10;

  return (
    <svg viewBox="0 0 320 185" className="w-full rounded-xl" style={{ background: SURFACE }}>
      {cells.map((c, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = OX + col * (CW + GAP);
        const y = OY + row * (CH + GAP);
        const selected = i === 0;

        return (
          <g key={c.label}>
            <rect x={x} y={y} width={CW} height={CH} rx="8"
              fill={selected ? `${PRIMARY}22` : `${SURFACE2}cc`}
              stroke={selected ? PRIMARY : BORDER2}
              strokeWidth={selected ? 2 : 1} />
            {/* corner label */}
            <text x={x + 5} y={y + 11} fill={TXT5} fontSize="7">{c.label}</text>
            {/* checkmark on selected */}
            {selected && <text x={x + CW - 6} y={y + 11} fill={PRIMARY} fontSize="7" fontWeight="900">✓</text>}
            <text x={x + CW/2} y={y + 32} fill={TXT} fontSize="13" fontWeight="700" textAnchor="middle">{c.jersey}</text>
            <text x={x + CW/2} y={y + 46} fill={TXT3} fontSize="9" textAnchor="middle">{c.name}</text>
            <text x={x + CW/2} y={y + 57} fill={TXT5} fontSize="8" textAnchor="middle">{c.pos}</text>
          </g>
        );
      })}
      {/* Net divider */}
      <line x1={OX} y1={OY + CH + GAP/2} x2={OX + 3*(CW+GAP) - GAP} y2={OY + CH + GAP/2}
        stroke={BORDER2} strokeWidth="1" />
      <text x={OX + (3*(CW+GAP)-GAP)/2} y={OY + CH + GAP/2 - 2} fill={TXT5}
        fontSize="7" letterSpacing="2" textAnchor="middle">NET</text>
      {/* Hint */}
      <text x={OX} y="178" fill={PRIMARY} fontSize="9" fontWeight="600">
        TL selected — tap another cell to swap
      </text>
    </svg>
  );
}

// ── Step 7 — After swap ────────────────────────────────────────────────────────
function DiagGridSwapped() {
  // TL and BL swapped vs. Step 6
  const cells = [
    { label: 'TL', jersey: '#2',  name: 'Lee',    pos: 'OH',  swapped: true  },
    { label: 'TM', jersey: '#9',  name: 'Patel',  pos: 'MB',  swapped: false },
    { label: 'TR', jersey: '#7',  name: 'Kim',    pos: 'MB',  swapped: false },
    { label: 'BL', jersey: '#3',  name: 'Harris', pos: 'OH',  swapped: true  },
    { label: 'BM', jersey: '#14', name: 'Cruz',   pos: 'OPP', swapped: false },
    { label: 'BR', jersey: '#11', name: 'Jones',  pos: 'S',   swapped: false },
  ];
  const cols = 3;
  const CW = 88, CH = 66, GAP = 6, OX = 14, OY = 10;

  return (
    <svg viewBox="0 0 320 190" className="w-full rounded-xl" style={{ background: SURFACE }}>
      {cells.map((c, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = OX + col * (CW + GAP);
        const y = OY + row * (CH + GAP);

        return (
          <g key={c.label}>
            <rect x={x} y={y} width={CW} height={CH} rx="8"
              fill={c.swapped ? `${GREEN}15` : `${SURFACE2}cc`}
              stroke={c.swapped ? GREEN : BORDER2}
              strokeWidth={c.swapped ? 1.5 : 1} />
            <text x={x + 5} y={y + 11} fill={TXT5} fontSize="7">{c.label}</text>
            <text x={x + CW/2} y={y + 32} fill={TXT} fontSize="13" fontWeight="700" textAnchor="middle">{c.jersey}</text>
            <text x={x + CW/2} y={y + 46} fill={TXT3} fontSize="9" textAnchor="middle">{c.name}</text>
            <text x={x + CW/2} y={y + 57} fill={TXT5} fontSize="8" textAnchor="middle">{c.pos}</text>
          </g>
        );
      })}
      {/* Net divider */}
      <line x1={OX} y1={OY + CH + GAP/2} x2={OX + 3*(CW+GAP) - GAP} y2={OY + CH + GAP/2}
        stroke={BORDER2} strokeWidth="1" />
      <text x={OX + (3*(CW+GAP)-GAP)/2} y={OY + CH + GAP/2 - 2} fill={TXT5}
        fontSize="7" letterSpacing="2" textAnchor="middle">NET</text>
      {/* Swap arrows */}
      <text x={OX + CW/2} y="170" fill={GREEN} fontSize="9" textAnchor="middle">↕</text>
      <text x={OX + CW/2 + 20} y="170" fill={GREEN} fontSize="9">TL ↔ BL swapped</text>
    </svg>
  );
}

// ── Step 8 — Save button ───────────────────────────────────────────────────────
function DiagSaveButton() {
  return (
    <svg viewBox="0 0 320 60" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <rect x="12" y="10" width="138" height="40" rx="8"
        fill="transparent" stroke={BORDER} strokeWidth="1" />
      <text x="81" y="34" fill={TXT4} fontSize="12" textAnchor="middle">Cancel</text>
      <rect x="158" y="10" width="150" height="40" rx="8"
        fill={PRIMARY} stroke={PRIMARY} strokeWidth="1" />
      <text x="233" y="34" fill="#000" fontSize="12" fontWeight="800" textAnchor="middle">Save</text>
    </svg>
  );
}

// ── Step 9 — Loaded in match setup ───────────────────────────────────────────
function DiagMatchSetup() {
  return (
    <svg viewBox="0 0 320 110" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Lineup picker card */}
      <rect x="12" y="10" width="296" height="90" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="28" y="32" fill={TXT4} fontSize="9" letterSpacing="1">SAVED LINEUP</text>
      <text x="28" y="52" fill={TXT} fontSize="13" fontWeight="700">Base 5-1</text>
      {/* Badges */}
      <rect x="28" y="60" width="68" height="18" rx="4"
        fill="#1e3a5f" stroke="#1d4ed8" strokeWidth="0.5" />
      <text x="62" y="73" fill={BLUE} fontSize="8" textAnchor="middle">6 formations</text>
      <rect x="104" y="60" width="48" height="18" rx="4"
        fill="#14402f" stroke="#166534" strokeWidth="0.5" />
      <text x="128" y="73" fill={GREEN} fontSize="8" textAnchor="middle">2 subs</text>
      {/* Load button */}
      <rect x="234" y="44" width="62" height="32" rx="7" fill={PRIMARY} />
      <text x="265" y="64" fill="#000" fontSize="11" fontWeight="800" textAnchor="middle">Load</text>
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function HelpServeReceivePage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Serve-Receive Setup Guide" backTo="" />

      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        {/* Intro */}
        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            You can save a custom serve-receive formation for each of the 6 rotations
            inside any saved lineup. When that lineup is loaded for a match, the court
            grid will automatically show your custom formation each time your team is
            receiving serve.
          </p>
        </div>

        {/* Step 1 */}
        <Step
          number={1}
          title="Open your Team page"
          note="From the home screen, tap the team you want to edit. Any saved lineups live on the team page."
        >
          <DiagTeamCard />
        </Step>

        {/* Step 2 */}
        <Step
          number={2}
          title='Tap the "Lineups" tab'
          note="The team page has three tabs — Roster, Lineups, and Seasons. Tap Lineups to see all saved lineups for this team."
        >
          <DiagLineupsTab />
        </Step>

        {/* Step 3 */}
        <Step
          number={3}
          title="Expand a saved lineup"
          note='Find the lineup you want to edit and tap the ▼ arrow on the right side of the card. The card will expand to show formation and sub editors.'
        >
          <DiagLineupCard />
        </Step>

        {/* Step 4 */}
        <Step
          number={4}
          title='Select "Serve Rec Formations"'
          note="Two sub-tabs appear inside the expanded card. Make sure Serve Rec Formations is selected (shown in orange). Planned Subs is the other tab."
        >
          <DiagSubTabs />
        </Step>

        {/* Step 5 */}
        <Step
          number={5}
          title="Pick a rotation to configure"
          note="Tap any rotation number (1–6) to edit that rotation's serve-receive formation. A blue dot on a tab means a custom formation is already saved for that rotation. Rotations without a dot use the standard default positioning."
        >
          <DiagRotationTabs />
        </Step>

        {/* Step 6 */}
        <Step
          number={6}
          title="Tap a cell to select a player"
          note="The 2×3 grid shows your six players positioned on the court — front row on top, back row on the bottom. Tap any cell to select it. The selected cell highlights in orange with a ✓."
        >
          <DiagGridSelect />
        </Step>

        {/* Step 7 */}
        <Step
          number={7}
          title="Tap a second cell to swap"
          note="After selecting one player, tap any other cell to swap those two players' positions. Swapped cells are outlined in green. Tap the same cell again to deselect without swapping. Tap Reset to restore the default formation for this rotation."
        >
          <DiagGridSwapped />
        </Step>

        {/* Repeat note */}
        <div className="pl-10">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
            <p className="text-slate-300 text-sm font-semibold mb-1">Repeat for every rotation</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Go back to the rotation tab bar (Step 5) and repeat Steps 6–7 for each rotation
              you want to customize. You can leave any rotation on its default — those rotations
              won't show a blue dot and will use standard FIVB positioning during the match.
            </p>
          </div>
        </div>

        {/* Step 8 */}
        <Step
          number={8}
          title='Tap "Save" to store all formations'
          note="Once you've set up all the rotations you want, tap Save at the bottom of the expanded card. All formations are saved to that lineup immediately. Tap Cancel to discard any unsaved changes."
        >
          <DiagSaveButton />
        </Step>

        {/* Step 9 */}
        <Step
          number={9}
          title="Load the lineup before a match"
          note='During match setup (or when changing a set lineup mid-match), select your saved lineup from the lineup picker. The badge shows how many rotations have saved formations. Tap Load — all formations are applied automatically and the court grid will use them when your team is receiving serve.'
        >
          <DiagMatchSetup />
        </Step>

        {/* Tips */}
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips</p>
          {[
            ['Court orientation', 'Top row = front row (positions 4-3-2 left to right). Bottom row = back row (positions 5-6-1 left to right). The "net" label separates them.'],
            ['Default positioning', 'If you reset a rotation or leave it without a custom formation, the court uses standard FIVB overlap positioning based on serve order.'],
            ['Formation badge', 'The blue dot on a rotation tab and the "N formations" badge on the lineup card update live as you make changes — before you save.'],
            ['Mid-match edits', 'Formations stored in a saved lineup flow into each set when the lineup is loaded. You cannot edit formations during a live match — set them up here beforehand.'],
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
