import { PageHeader } from '../components/layout/PageHeader';

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
const RED     = '#ef4444';

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

// Step 1 — Full screen overview
function DiagScreenOverview() {
  return (
    <svg viewBox="0 0 320 210" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Score header */}
      <rect x="0" y="0" width="320" height="38" fill={SURFACE} />
      {/* Serve circles — our side */}
      <circle cx="14" cy="19" r="6" fill="none" stroke={PRIMARY} strokeWidth="2" />
      <circle cx="28" cy="19" r="6" fill={PRIMARY} />
      {/* Score */}
      <text x="52" y="27" fill={TXT} fontSize="18" fontWeight="900" fontFamily="monospace">14</text>
      {/* Set indicator */}
      <text x="160" y="13" fill={TXT4} fontSize="8" textAnchor="middle" fontWeight="700">SET 2</text>
      <circle cx="160" cy="27" r="5" fill={PRIMARY} />
      {/* Opp score */}
      <text x="258" y="27" fill={TXT} fontSize="18" fontWeight="900" fontFamily="monospace">12</text>
      {/* Opp serve circles */}
      <circle cx="292" cy="19" r="6" fill="none" stroke={BORDER2} strokeWidth="1.5" />
      <circle cx="306" cy="19" r="6" fill="none" stroke={BORDER2} strokeWidth="1.5" />
      {/* Labels */}
      <text x="3" y="38" fill={TXT5} fontSize="6">← serve indicator</text>
      <text x="124" y="38" fill={TXT5} fontSize="6">set / ball-in-play</text>

      {/* Player grid — 2 rows × 3 cols */}
      {[
        { slot: 'S4', jersey: '#7',  name: 'Emma'  },
        { slot: 'S3', jersey: '#3',  name: 'Sara'  },
        { slot: 'S2', jersey: '#11', name: 'Ava'   },
        { slot: 'S5', jersey: '#15', name: 'Jess'  },
        { slot: 'S6', jersey: '#4',  name: 'Kate'  },
        { slot: 'S1', jersey: '#1',  name: 'Lexi', server: true },
      ].map((p, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const W = 106, H = 70;
        const x = col * W + 1, y = 40 + row * H;
        return (
          <g key={p.slot}>
            <rect x={x} y={y} width={W - 1} height={H - 1}
              fill={p.server ? `${PRIMARY}15` : SURFACE}
              stroke={p.server ? PRIMARY : BORDER}
              strokeWidth={p.server ? 1.5 : 0.5} />
            <text x={x + 5} y={y + 12} fill={p.server ? PRIMARY : TXT5} fontSize="7" fontWeight={p.server ? '700' : '400'}>
              {p.slot}{p.server ? ' ★ SERVER' : ''}
            </text>
            <text x={x + W/2 - 0.5} y={y + 40} fill={p.server ? PRIMARY : TXT}
              fontSize="14" fontWeight="900" textAnchor="middle">{p.jersey}</text>
            <text x={x + W/2 - 0.5} y={y + 55} fill={TXT3} fontSize="8" textAnchor="middle">{p.name}</text>
          </g>
        );
      })}
      {/* Net line */}
      <line x1="0" y1="110" x2="320" y2="110" stroke={BORDER2} strokeWidth="1" />

      {/* Action bar */}
      <rect x="0" y="180" width="320" height="30" fill={SURFACE} />
      {[['↺ ROT', 32], ['↻ ROT', 96], ['UNDO', 160], ['SUB', 224], ['≡', 294]].map(([lbl, cx]) => (
        <text key={lbl} x={cx} y="199" fill={TXT4} fontSize="8" textAnchor="middle">{lbl}</text>
      ))}

      {/* Region labels */}
      <text x="2"   y="178" fill={TXT5} fontSize="6">↑ player tiles (tap to record)</text>
      <text x="2"   y="210" fill={TXT5} fontSize="6">↑ action bar</text>
    </svg>
  );
}

// Step 2 — Score header detail
function DiagScoreHeader() {
  return (
    <svg viewBox="0 0 320 72" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="0" y="0" width="320" height="52" fill={SURFACE} />
      {/* Our serve dots */}
      <circle cx="14" cy="26" r="7" fill="none" stroke={PRIMARY} strokeWidth="2" />
      <circle cx="30" cy="26" r="7" fill={PRIMARY} />
      <text x="14" y="62" fill={PRIMARY} fontSize="7" textAnchor="middle">serve</text>
      <text x="30" y="62" fill={PRIMARY} fontSize="7" textAnchor="middle">indicator</text>
      {/* Score */}
      <text x="60" y="36" fill={TXT} fontSize="22" fontWeight="900" fontFamily="monospace">14</text>
      {/* Set counter */}
      <rect x="118" y="6" width="84" height="40" rx="6" fill={SURFACE2} />
      <text x="160" y="20" fill={TXT4} fontSize="8" textAnchor="middle" fontWeight="700">SET 2</text>
      <text x="148" y="38" fill={TXT4} fontSize="8" textAnchor="middle">●</text>
      <text x="160" y="38" fill={PRIMARY} fontSize="8" textAnchor="middle">●</text>
      <text x="172" y="38" fill={TXT5} fontSize="8" textAnchor="middle">○</text>
      {/* Opp score */}
      <text x="258" y="36" fill={TXT} fontSize="22" fontWeight="900" fontFamily="monospace">12</text>
      {/* Opp serve dots — greyed */}
      <circle cx="290" cy="26" r="7" fill="none" stroke={BORDER2} strokeWidth="1.5" />
      <circle cx="306" cy="26" r="7" fill="none" stroke={BORDER2} strokeWidth="1.5" />
      <text x="298" y="62" fill={TXT5} fontSize="7" textAnchor="middle">not serving</text>
    </svg>
  );
}

// Step 3 — Player tile + action panel
function DiagTileAction() {
  return (
    <svg viewBox="0 0 320 200" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Single tile (server) */}
      <rect x="12" y="8" width="130" height="80" rx="10"
        fill={`${PRIMARY}15`} stroke={PRIMARY} strokeWidth="2" />
      <text x="22" y="22" fill={PRIMARY} fontSize="8" fontWeight="700">S1 ★ SERVER</text>
      <text x="77" y="55" fill={PRIMARY} fontSize="22" fontWeight="900" textAnchor="middle">#1</text>
      <text x="77" y="72" fill={TXT3} fontSize="10" textAnchor="middle">Lexi</text>
      {/* Arrow */}
      <text x="152" y="55" fill={PRIMARY} fontSize="20" fontWeight="900">→</text>
      {/* Action panel (bottom sheet mockup) */}
      <rect x="0" y="100" width="320" height="100" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="160" y="120" fill={TXT4} fontSize="9" textAnchor="middle" letterSpacing="1">RECORDING FOR: #1 LEXI</text>
      {/* Action buttons */}
      {[
        { lbl: 'KILL',  x: 14,  color: GREEN },
        { lbl: 'ERR',   x: 90,  color: RED   },
        { lbl: 'ATT',   x: 166, color: BLUE  },
        { lbl: 'ACE',   x: 242, color: PRIMARY },
      ].map(({ lbl, x, color }) => (
        <g key={lbl}>
          <rect x={x} y="130" width="68" height="36" rx="7"
            fill={`${color}20`} stroke={color} strokeWidth="1.2" />
          <text x={x + 34} y="153" fill={color} fontSize="11" fontWeight="800" textAnchor="middle">{lbl}</text>
        </g>
      ))}
      <text x="160" y="192" fill={TXT5} fontSize="8" textAnchor="middle">More actions: PASS, BLOCK, DIG, SERVE ERROR, FREE…</text>
    </svg>
  );
}

// Step 4 — Action Bar detail
function DiagActionBar() {
  const btns = [
    { lbl: '↺ ROT', sub: 'Manual\nrotate back',  w: 66 },
    { lbl: '↻ ROT', sub: 'Manual\nrotate fwd',   w: 66 },
    { lbl: 'UNDO',  sub: 'Remove last\naction',   w: 66 },
    { lbl: 'SUB',   sub: 'Substitution\nor libero', w: 66 },
    { lbl: '≡',     sub: 'Menu:\nstats, end', w: 56 },
  ];
  let xCursor = 0;
  return (
    <svg viewBox="0 0 320 90" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="0" y="0" width="320" height="36" fill={SURFACE} />
      {btns.map(({ lbl, sub, w }) => {
        const cx = xCursor + w / 2;
        xCursor += w;
        return (
          <g key={lbl}>
            <text x={cx} y="22" fill={TXT3} fontSize="10" textAnchor="middle" fontWeight="600">{lbl}</text>
            <line x1={xCursor} y1="6" x2={xCursor} y2="30" stroke={BORDER} strokeWidth="0.5" />
            <text x={cx} y="50" fill={TXT5} fontSize="7.5" textAnchor="middle">
              {sub.split('\n')[0]}
            </text>
            <text x={cx} y="62" fill={TXT5} fontSize="7.5" textAnchor="middle">
              {sub.split('\n')[1] || ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Step 5 — Rotation tracking
function DiagRotation() {
  const slots = [
    { slot: 'S4', jersey: '#7',  name: 'Emma'  },
    { slot: 'S3', jersey: '#3',  name: 'Sara'  },
    { slot: 'S2', jersey: '#11', name: 'Ava'   },
    { slot: 'S5', jersey: '#15', name: 'Jess'  },
    { slot: 'S6', jersey: '#4',  name: 'Kate'  },
    { slot: 'S1', jersey: '#1',  name: 'Lexi', server: true },
  ];
  return (
    <svg viewBox="0 0 320 180" className="w-full rounded-xl" style={{ background: BG }}>
      {slots.map((p, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const W = 106, H = 68;
        const x = col * W + 1, y = row * H + 2;
        return (
          <g key={p.slot}>
            <rect x={x} y={y} width={W - 1} height={H - 1}
              fill={p.server ? `${PRIMARY}15` : SURFACE}
              stroke={p.server ? PRIMARY : BORDER}
              strokeWidth={p.server ? 1.5 : 0.5} />
            <text x={x + 5} y={y + 12} fill={p.server ? PRIMARY : TXT5} fontSize="7">{p.slot}</text>
            <text x={x + W/2 - 0.5} y={y + 38} fill={p.server ? PRIMARY : TXT}
              fontSize="14" fontWeight="900" textAnchor="middle">{p.jersey}</text>
            <text x={x + W/2 - 0.5} y={y + 53} fill={TXT3} fontSize="8" textAnchor="middle">{p.name}</text>
          </g>
        );
      })}
      <line x1="0" y1="90" x2="320" y2="90" stroke={BORDER2} strokeWidth="1" />
      {/* After side-out rotation arrow */}
      <path d="M 290 100 Q 310 138 290 170" fill="none" stroke={PRIMARY} strokeWidth="2" markerEnd="url(#arr)" />
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={PRIMARY} />
        </marker>
      </defs>
      <text x="240" y="135" fill={PRIMARY} fontSize="7" textAnchor="middle">side-out →</text>
      <text x="240" y="146" fill={PRIMARY} fontSize="7" textAnchor="middle">rotation advances</text>
    </svg>
  );
}

// Step 6 — Substitution modal
function DiagSubModal() {
  return (
    <svg viewBox="0 0 320 160" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="12" y="8" width="296" height="145" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="160" y="30" fill={TXT} fontSize="13" fontWeight="700" textAnchor="middle">Substitution</text>
      {/* Out row */}
      <text x="28" y="54" fill={TXT4} fontSize="9" letterSpacing="1">OUT</text>
      <rect x="28" y="60" width="125" height="30" rx="7" fill={SURFACE2} stroke={BORDER2} strokeWidth="1" />
      <text x="90" y="80" fill={TXT} fontSize="11" textAnchor="middle">#1 Lexi</text>
      {/* ⇄ */}
      <text x="164" y="80" fill={PRIMARY} fontSize="18" fontWeight="900" textAnchor="middle">⇄</text>
      {/* In row */}
      <text x="196" y="54" fill={TXT4} fontSize="9" letterSpacing="1">IN</text>
      <rect x="196" y="60" width="110" height="30" rx="7" fill={`${PRIMARY}20`} stroke={PRIMARY} strokeWidth="1" />
      <text x="251" y="80" fill={PRIMARY} fontSize="11" textAnchor="middle">#22 Taylor</text>
      {/* Sub counter */}
      <text x="28" y="108" fill={TXT5} fontSize="8">Substitution 1 of 18 · 17 remaining</text>
      {/* Confirm */}
      <rect x="28" y="118" width="128" height="30" rx="7" fill={BORDER} />
      <text x="92" y="137" fill={TXT4} fontSize="11" textAnchor="middle">Cancel</text>
      <rect x="164" y="118" width="128" height="30" rx="7" fill={PRIMARY} />
      <text x="228" y="137" fill="#000" fontSize="11" fontWeight="800" textAnchor="middle">Confirm Sub</text>
    </svg>
  );
}

// Step 7 — Menu drawer
function DiagMenuDrawer() {
  const items = [
    { lbl: 'Live Stats',     icon: '📊' },
    { lbl: 'Scoring Summary',icon: '🏐' },
    { lbl: 'End Set',        icon: '⏱' },
    { lbl: 'End Match',      icon: '🏁' },
    { lbl: 'Export Backup',  icon: '💾' },
  ];
  return (
    <svg viewBox="0 0 320 185" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Dim background */}
      <rect x="0" y="0" width="200" height="185" fill="#00000066" />
      {/* Drawer */}
      <rect x="200" y="0" width="120" height="185" fill={SURFACE} />
      <text x="260" y="22" fill={TXT4} fontSize="9" textAnchor="middle" letterSpacing="1">MENU</text>
      {items.map(({ lbl, icon }, i) => (
        <g key={lbl}>
          <rect x="208" y={34 + i * 30} width="104" height="24" rx="5" fill={SURFACE2} />
          <text x="222" y={51 + i * 30} fill={TXT3} fontSize="10">{icon}</text>
          <text x="236" y={51 + i * 30} fill={TXT3} fontSize="9">{lbl}</text>
        </g>
      ))}
      {/* ≡ button callout */}
      <text x="306" y="15" fill={PRIMARY} fontSize="16" textAnchor="middle">≡</text>
    </svg>
  );
}

export function HelpLiveMatchPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Live Match Screen Guide" backTo="" />

      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        {/* Intro */}
        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            The live match screen is where you track every point in real time. This guide walks
            through each section of the screen — score header, player grid, action bar, substitutions,
            and the menu — so you know exactly what to tap and when.
          </p>
        </div>

        <Step
          number={1}
          title="Screen Layout Overview"
          note="The screen has three sections stacked top-to-bottom: the Score Header (team scores and set info), the Player Grid (six player tiles), and the Action Bar (rotation, undo, sub, and menu). Your team is always on the left side of the score header."
        >
          <DiagScreenOverview />
        </Step>

        <Step
          number={2}
          title="Score Header — Scores & Serve"
          note="The score header shows the current set score and which team is serving. Two dots appear on each side — the filled orange dot means that team is currently serving. The set indicator in the center shows which set you're in, and the small dots below it show sets won by each team."
        >
          <DiagScoreHeader />
        </Step>

        <Step
          number={3}
          title="Tap a Player Tile to Record a Stat"
          note="The six player tiles mirror your court positions: top row = front row (positions S2–S4 left to right), bottom row = back row (S5–S6–S1). The current server's tile is highlighted in orange with a ★ SERVER label. Tap any tile to open the action panel for that player and select what happened on the play."
        >
          <DiagTileAction />
        </Step>

        <Step
          number={4}
          title="Action Bar — Rotate, Undo, Sub, Menu"
          note="The action bar runs across the bottom of the screen. Use it to manually rotate (if the app doesn't auto-rotate), undo the last recorded action, open the substitution panel, or access the full menu. The app auto-advances rotation on side-outs, but you can tap ↺/↻ ROT if you need to correct it manually."
        >
          <DiagActionBar />
        </Step>

        <Step
          number={5}
          title="Rotation — How it Advances"
          note="When your team wins a rally while the opponent is serving (a side-out), the app automatically rotates your lineup one position clockwise. The new S1 tile becomes the highlighted server. Use ↺ ROT to rotate backward or ↻ ROT forward if you need to manually correct the rotation after a wrong tap."
        >
          <DiagRotation />
        </Step>

        <Step
          number={6}
          title="Substitutions"
          note='Tap SUB in the Action Bar to open the substitution panel. Select who is going out and who is coming in, then tap Confirm Sub. The counter at the bottom tracks how many subs you have used out of your total allowance (18 in FIVB format). Libero swaps are tracked separately and do not count against this total.'
        >
          <DiagSubModal />
        </Step>

        <Step
          number={7}
          title='Menu (≡) — Stats, End Set, End Match'
          note="Tap ≡ in the top-right or Action Bar to open the menu drawer. From here you can view live player stats (without leaving the match), see a scoring run summary, manually end the current set, or end the full match. Always use End Match through the menu — it saves all stats and takes you to the match summary."
        >
          <DiagMenuDrawer />
        </Step>

        {/* Tips */}
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips</p>
          {[
            ['Auto-save', 'Every point recorded triggers an auto-save. If the app is closed accidentally, reopen it — you can restore from the auto-backup in Settings → Data.'],
            ['Undo any mistake', "Tap UNDO to remove the last recorded action. You can undo multiple times. It won't undo a rotation — use ↺ ROT for that."],
            ['Serve type', 'If you track serve type (float vs. topspin), the serve action panel will prompt you to select the type before confirming.'],
            ['Landscape mode', 'Rotate your device to landscape for a wider player grid — useful on smaller phones during fast-paced play.'],
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
