import { PageHeader } from '../components/layout/PageHeader';
import { BG, SURFACE, SURFACE2, BORDER, BORDER2, TXT, TXT3, TXT4, TXT5, PRIMARY, BLUE, GREEN, DANGER as RED, HelpStep as Step } from './helpTheme';

// The real live-match action bar, left to right (see components/match/ActionBar.jsx)
const ACTION_BAR = [
  ['ROT BACK',  'Hold to\nrotate back'],
  ['ROT FWD',   'Hold to\nrotate fwd'],
  ['UNDO',      'Remove last\naction'],
  ['MAKE SUB',  'Open\nsubs'],
  ['LIB SWAP',  'Libero\nin / out'],
  ['ROT ERR',   'Our rotation\nviolation'],
  ['STATS',     'Live\nstats'],
  ['SCOREBOOK', 'Point-by-\npoint log'],
  ['DASHBOARD', 'Leave\nmatch'],
  ['SETTINGS',  'Match\nmenu'],
];

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
      {ACTION_BAR.map(([lbl], i) => (
        <text key={lbl} x={16 + i * 32} y="198" fill={TXT4} fontSize="5.2" fontWeight="700" textAnchor="middle">{lbl}</text>
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

// Step 3 — Player tile: stat buttons live right on the tile
function DiagTileAction() {
  const rows = [
    { lbl: 'SERVE (server only)', btns: [['FLOAT', BLUE], ['TOP', BLUE], ['ATT', TXT3], ['ACE', GREEN], ['SE', RED]] },
    { lbl: 'ATTACK',              btns: [['ATT', TXT3], ['FREE', TXT3], ['K', GREEN], ['AE', RED]] },
    { lbl: 'DEFENSE',             btns: [['DIG', BLUE], ['FREE', BLUE], ['TOUCH', BLUE], ['SBLK', BLUE], ['HBLK', BLUE]] },
    { lbl: 'PASS',                btns: [['0', RED], ['1', PRIMARY], ['2', '#eab308'], ['3', GREEN]] },
    { lbl: 'ERRORS (their point)', btns: [['L', RED], ['DBL', RED], ['NET', RED], ['BHE', RED], ['DROP', RED]] },
  ];
  return (
    <svg viewBox="0 0 320 205" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="6" y="4" width="308" height="196" rx="10" fill={`${PRIMARY}10`} stroke={PRIMARY} strokeWidth="1.5" />
      <text x="16" y="20" fill={PRIMARY} fontSize="9" fontWeight="800">#1 LEXI ★ SERVER</text>
      {rows.map((r, ri) => (
        <g key={r.lbl}>
          <text x="16" y={42 + ri * 35} fill={TXT5} fontSize="6.5" fontWeight="700" letterSpacing="0.5">{r.lbl}</text>
          {r.btns.map(([b, c], bi) => (
            <g key={b + bi}>
              <rect x={16 + bi * 58} y={46 + ri * 35} width="52" height="18" rx="4" fill={`${c}22`} stroke={c} strokeWidth="0.8" />
              <text x={42 + bi * 58} y={58.5 + ri * 35} fill={c} fontSize="8" fontWeight="800" textAnchor="middle">{b}</text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

// Step 4 — Action Bar detail (two rows of five so the labels stay readable)
function DiagActionBar() {
  const W = 64;
  return (
    <svg viewBox="0 0 320 150" className="w-full rounded-xl" style={{ background: BG }}>
      {[ACTION_BAR.slice(0, 5), ACTION_BAR.slice(5)].map((row, ri) => (
        <g key={ri} transform={`translate(0 ${ri * 74})`}>
          <rect x="0" y="0" width="320" height="28" fill={SURFACE} />
          {row.map(([lbl, sub], i) => {
            const cx = i * W + W / 2;
            const [l1, l2] = sub.split('\n');
            return (
              <g key={lbl}>
                <text x={cx} y="18" fill={lbl === 'UNDO' ? '#facc15' : lbl === 'ROT ERR' ? RED : TXT3} fontSize="8.5" textAnchor="middle" fontWeight="700">{lbl}</text>
                {i > 0 && <line x1={i * W} y1="5" x2={i * W} y2="23" stroke={BORDER} strokeWidth="0.5" />}
                <text x={cx} y="42" fill={TXT5} fontSize="7" textAnchor="middle">{l1}</text>
                <text x={cx} y="53" fill={TXT5} fontSize="7" textAnchor="middle">{l2 || ''}</text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

// Step 5 — Hold-to-rotate: the button fills orange and reads HOLD
function DiagHold() {
  return (
    <svg viewBox="0 0 320 60" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="20" y="14" width="110" height="32" fill={SURFACE} />
      <text x="75" y="34" fill={TXT} fontSize="10" fontWeight="700" textAnchor="middle">ROT FWD</text>
      <text x="160" y="35" fill={PRIMARY} fontSize="16" fontWeight="900" textAnchor="middle">→</text>
      <rect x="190" y="14" width="110" height="32" fill={SURFACE} />
      <rect x="190" y="14" width="66" height="32" fill={`${PRIMARY}88`} />
      <text x="245" y="34" fill={TXT} fontSize="10" fontWeight="800" letterSpacing="2" textAnchor="middle">HOLD</text>
      <text x="245" y="57" fill={TXT5} fontSize="7" textAnchor="middle">keep holding until it fills</text>
    </svg>
  );
}

// Step 6 — One-screen kill / attack error on the shot chart
function DiagKillPopup() {
  const kill = ['PURE', 'TOUCH', 'TOOL', 'TIP/ROLL', 'BACK ROW', 'OVER PASS'];
  const setBy = ['★ Sara', 'Kate', 'Ava', 'UNASSISTED'];
  return (
    <svg viewBox="0 0 320 170" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="4" y="4" width="312" height="162" rx="8" fill="#0b1220" stroke={BORDER} strokeWidth="0.8" />
      <text x="160" y="19" fill={TXT} fontSize="9" fontWeight="800" textAnchor="middle">KILL — #11 AVA</text>
      {kill.map((k, i) => (
        <g key={k}>
          <rect x={14 + i * 49} y="25" width="45" height="14" rx="7" fill={i === 0 ? `${GREEN}33` : SURFACE} stroke={i === 0 ? GREEN : BORDER2} strokeWidth="0.7" />
          <text x={36.5 + i * 49} y="35" fill={i === 0 ? GREEN : TXT3} fontSize="6.5" fontWeight="700" textAnchor="middle">{k}</text>
        </g>
      ))}
      <text x="14" y="53" fill={TXT5} fontSize="6.5" fontWeight="700">SET BY</text>
      {setBy.map((k, i) => (
        <g key={k}>
          <rect x={46 + i * 62} y="45" width="58" height="14" rx="7" fill={i === 0 ? `${PRIMARY}33` : SURFACE} stroke={i === 0 ? PRIMARY : BORDER2} strokeWidth="0.7" />
          <text x={75 + i * 62} y="55" fill={i === 0 ? PRIMARY : TXT3} fontSize="6.5" fontWeight="700" textAnchor="middle">{k}</text>
        </g>
      ))}
      {/* court */}
      <rect x="40" y="68" width="240" height="88" fill={SURFACE2} stroke="#fff" strokeWidth="0.8" />
      <line x1="160" y1="64" x2="160" y2="160" stroke={PRIMARY} strokeOpacity="0.6" strokeWidth="1.5" />
      <line x1="120" y1="68" x2="120" y2="156" stroke="#fff" strokeWidth="0.5" />
      <line x1="200" y1="68" x2="200" y2="156" stroke="#fff" strokeWidth="0.5" />
      <line x1="130" y1="90" x2="245" y2="140" stroke={GREEN} strokeWidth="1.2" />
      <circle cx="130" cy="90" r="2.5" fill={GREEN} />
      <circle cx="245" cy="140" r="4" fill="none" stroke={GREEN} strokeWidth="1.2" />
      <text x="70" y="130" fill={TXT5} fontSize="6">tap where it was hit,</text>
      <text x="70" y="139" fill={TXT5} fontSize="6">then where it landed</text>
      <text x="70" y="148" fill={TXT5} fontSize="6">(or drag in one motion)</text>
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

// Step 9 — Match menu (SETTINGS button)
function DiagMenuDrawer() {
  const cards = [
    ['ADJUST SCORE', 'fix the score without a stat'],
    ['MATCH', 'End Current Set · Match Set Up · Reset to Rotation'],
    ['DISPLAY', 'Flip Layout · Court View · Spray Charts · Names'],
    ['JERSEYS', 'jersey colors'],
    ['HELP', 'Button Guide'],
  ];
  return (
    <svg viewBox="0 0 320 190" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="0" y="0" width="320" height="190" fill={SURFACE} />
      <text x="160" y="16" fill={TXT} fontSize="9" fontWeight="800" textAnchor="middle" letterSpacing="1">MATCH MENU</text>
      {cards.map(([t, d], i) => (
        <g key={t}>
          <rect x="10" y={24 + i * 28} width="300" height="24" rx="5" fill={SURFACE2} />
          <text x="20" y={39.5 + i * 28} fill={PRIMARY} fontSize="7.5" fontWeight="800">{t}</text>
          <text x="92" y={39.5 + i * 28} fill={TXT4} fontSize="7">{d}</text>
        </g>
      ))}
      <rect x="10" y="166" width="300" height="20" rx="5" fill={`${RED}30`} stroke={RED} strokeWidth="0.8" />
      <text x="160" y="179.5" fill={RED} fontSize="8" fontWeight="800" textAnchor="middle">END MATCH</text>
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
            through each section of the screen — score header and timeouts, player tiles, the action
            bar, kills and errors, substitutions, and the match menu — so you know exactly what to tap and when.
          </p>
        </div>

        <Step
          number={1}
          title="Screen Layout Overview"
          note="The screen has three sections stacked top-to-bottom: the Score Header (scores, set, timeouts), the Player Tiles (one per player on the court), and the Action Bar along the bottom. Your team is on the left side of the score header unless you turn on Flip Team Layout."
        >
          <DiagScreenOverview />
        </Step>

        <Step
          number={2}
          title="Score Header — Scores, Serve & Timeouts"
          note="The score header shows the current set score and which team is serving (the filled orange dot). The center shows the set number and sets won. Each side also has timeout boxes — one tap calls a timeout right away (no confirm pop-up). Tapped it by mistake? Hit UNDO."
        >
          <DiagScoreHeader />
        </Step>

        <Step
          number={3}
          title="Tap the Buttons on a Player's Tile"
          note="Every player tile has its own stat buttons — there's no extra menu to open. The server's tile shows a serve row (pick FLOAT or TOP, then ATT, ACE or SE). Every tile has an attack row (ATT, FREE, K, AE), a defense row (DIG, FREE, TOUCH, SBLK, HBLK), pass ratings 0–3, and error buttons (L, DBL, NET, BHE, DROP) that give the other team the point. Tiles also show the player's running K / ACE / DIG totals."
        >
          <DiagTileAction />
        </Step>

        <Step
          number={4}
          title="Action Bar — Every Button"
          note="The action bar runs across the bottom of the screen. ROT BACK / ROT FWD fix the rotation, UNDO removes the last action, MAKE SUB opens substitutions, LIB SWAP moves your libero in or out, ROT ERR records your own rotation violation, STATS shows live stats, SCOREBOOK shows the point-by-point log, DASHBOARD leaves the match (you can come back), and SETTINGS opens the match menu."
        >
          <DiagActionBar />
        </Step>

        <Step
          number={5}
          title="Rotation — Hold to Fix It"
          note="When your team wins a rally while the opponent is serving (a side-out), the app rotates your lineup automatically. If you need to correct it, press and HOLD ROT BACK or ROT FWD — the button turns into HOLD and fills orange; keep holding until it fills. A quick tap does nothing, so you can't rotate by accident. A rotation can be undone with UNDO."
        >
          <DiagHold />
        </Step>

        <Step
          number={6}
          title="Kills & Attack Errors — One Screen"
          note="Tap K and the kill is saved immediately — the point is already on the board. If the Attack Shot Chart is on, the court pops up: tap where the ball was hit, then where it landed (or drag in one motion). On the same screen, pick the kill type (PURE, TOUCH, TOOL, TIP/ROLL, BACK ROW, OVER PASS) and who set it — the setter on court is pre-picked, or choose UNASSISTED. BACK ROW is picked for you when the hit spot is behind the 10-foot line. AE works the same way with OB, NET, BLK and BRA; a landing outside the court picks OB automatically, and for NET or BLK the line stops at the net. Don't want to chart it? Tap SAVE (NO SHOT)."
        >
          <DiagKillPopup />
        </Step>

        <Step
          number={7}
          title="Rotation — How it Advances"
          note="After a side-out, the new player in position 1 becomes the highlighted server. Use ROT BACK or ROT FWD (hold) only if the rotation on screen doesn't match the court."
        >
          <DiagRotation />
        </Step>

        <Step
          number={8}
          title="Substitutions"
          note='Tap MAKE SUB to open the substitution panel. Select who is going out and who is coming in, then confirm. The counter tracks how many subs you have used out of your limit (set in Settings → Match Rules). When a player who was subbed out can come back, the panel suggests the return sub for you. Libero swaps use LIB SWAP and do not count against the sub limit.'
        >
          <DiagSubModal />
        </Step>

        <Step
          number={9}
          title="SETTINGS — The Match Menu"
          note="Tap SETTINGS on the action bar to open the match menu. Adjust the score, end the current set, go back to match set up, reset to a rotation, change display options (flip layout, court view, spray charts on/off, player name format), set jersey colors, or open the Button Guide. End Match is at the bottom — always end a match from here; it saves all stats and takes you to the match summary."
        >
          <DiagMenuDrawer />
        </Step>

        {/* Tips */}
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips</p>
          {[
            ['Auto-save', 'Every point recorded triggers an auto-save. If the app is closed accidentally, reopen it — you can restore from the auto-backup in Settings → Data.'],
            ['Undo any mistake', 'Tap UNDO to remove the last recorded action — stats, points, timeouts, subs, libero swaps and rotations. The button shows what it will undo. You can undo multiple times.'],
            ['Serve type', 'On the server\'s tile, tap FLOAT or TOP first — ATT and ACE read "← PICK" / "← TYPE" until you do.'],
            ['Between sets', 'When a set ends you go to the next set\'s lineup screen, which also shows that set\'s stat boards — score line, player stats, rotation results and a set recap.'],
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
