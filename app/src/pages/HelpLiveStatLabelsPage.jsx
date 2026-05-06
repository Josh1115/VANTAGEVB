import { useLocation } from 'react-router-dom';
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
const PURPLE  = '#a78bfa';
const TEAL    = '#2dd4bf';
const ROSE    = '#fb7185';

function Badge({ x, y, n, color = PRIMARY }) {
  return (
    <g>
      <circle cx={x} cy={y} r="6.5" fill={color} />
      <text x={x} y={y + 2.5} fill="#000" fontSize="7" fontWeight="900" textAnchor="middle" dominantBaseline="middle">{n}</text>
    </g>
  );
}

function CalloutLine({ x1, y1, x2, y2, color = PRIMARY }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.8" strokeDasharray="3 2" />;
}

function Section({ title, note, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-primary shrink-0" />
        <span className="font-semibold text-white text-sm">{title}</span>
      </div>
      {note && <p className="text-xs text-slate-400 pl-4 leading-relaxed">{note}</p>}
      <div className="pl-0">{children}</div>
    </div>
  );
}

function LabelRow({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-4">
      {items.map(({ n, label, color = TXT3 }) => (
        <span key={n} className="flex items-center gap-1.5 text-xs">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-black text-black shrink-0"
            style={{ background: color }}>{n}</span>
          <span className="text-slate-300">{label}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Diagram 1: Full-screen landscape overview ────────────────────────────────
function DiagOverview() {
  const W = 700, H = 390;
  const hdr = 38, run = 14, bar = 18, opp = 26;
  const courtH = H - hdr - run - bar;
  const courtW = W - opp;

  const zones = [
    { x: 0,      y: 0,      w: W,    h: hdr,    fill: '#1e3a5f', label: '① Score Header',   cy: hdr / 2 },
    { x: 0,      y: hdr,    w: W,    h: run,    fill: '#1a2e1a', label: '② Run Bar',         cy: hdr + run / 2 },
    { x: 0,      y: hdr+run,w: courtW,h: courtH, fill: '#1e293b', label: '③ Player Tiles',   cy: hdr + run + courtH / 2 },
    { x: courtW, y: hdr+run,w: opp,  h: courtH, fill: '#1f1222', label: '④ Opp Col',         cy: hdr + run + courtH / 2 },
    { x: 0,      y: H-bar,  w: W,    h: bar,    fill: '#1a1a2e', label: '⑤ Action Bar',      cy: H - bar / 2 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-slate-700" style={{ background: BG }}>
      {zones.map(({ x, y, w, h, fill, label, cy }) => (
        <g key={label}>
          <rect x={x} y={y} width={w} height={h} fill={fill} opacity="0.9" />
          <text x={x + w / 2} y={cy} fill={TXT} fontSize="11" fontWeight="700" textAnchor="middle" dominantBaseline="middle">{label}</text>
        </g>
      ))}
      {/* Grid dividers */}
      <line x1={courtW / 3}     y1={hdr + run} x2={courtW / 3}     y2={H - bar} stroke={BORDER} strokeWidth="1" />
      <line x1={courtW * 2 / 3} y1={hdr + run} x2={courtW * 2 / 3} y2={H - bar} stroke={BORDER} strokeWidth="1" />
      <line x1={0}              y1={hdr + run + courtH / 2} x2={courtW} y2={hdr + run + courtH / 2} stroke={BORDER} strokeWidth="1" />
      {/* NET label */}
      <text x={courtW / 2} y={hdr + run + courtH / 2 + 6} fill={BORDER2} fontSize="7" textAnchor="middle">— NET —</text>
      {/* Landscape label */}
      <rect x="0" y="0" width={W} height={H} fill="none" stroke={BORDER2} strokeWidth="1.5" />
      <text x={W - 6} y={H - 4} fill={TXT5} fontSize="7" textAnchor="end">Landscape only</text>
    </svg>
  );
}

// ─── Diagram 2: Score Header ──────────────────────────────────────────────────
function DiagScoreHeader() {
  return (
    <svg viewBox="0 0 700 160" className="w-full rounded-xl" style={{ background: BG }}>
      {/* Header bar */}
      <rect x="0" y="20" width="700" height="60" fill={SURFACE} />

      {/* ① Our sets won */}
      <rect x="6" y="28" width="22" height="22" rx="3" fill="none" stroke="#f97316" strokeWidth="1.5" />
      <text x="17" y="43" fill={PRIMARY} fontSize="12" fontWeight="900" textAnchor="middle">1</text>
      <Badge x={17} y={20} n={1} />
      <text x={17} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Sets</text>
      <text x={17} y={109} fill={TXT5} fontSize="7" textAnchor="middle">Won</text>

      {/* ② Our timeouts */}
      <circle cx="36" cy="39" r="6" fill="none" stroke={PRIMARY} strokeWidth="1.5" />
      <circle cx="50" cy="39" r="6" fill={PRIMARY} />
      <Badge x={43} y={20} n={2} />
      <text x={43} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Time-</text>
      <text x={43} y={109} fill={TXT5} fontSize="7" textAnchor="middle">outs</text>

      {/* ③ Sub counter */}
      <text x="63" y="36" fill={TXT3} fontSize="9" fontWeight="700">6</text>
      <text x="63" y="46" fill={TXT5} fontSize="7">SUB</text>
      <Badge x={70} y={20} n={3} />
      <text x={70} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Sub</text>
      <text x={70} y={109} fill={TXT5} fontSize="7" textAnchor="middle">Count</text>

      {/* ④ Libero box */}
      <rect x="84" y="26" width="54" height="28" rx="4" fill={SURFACE2} stroke={GREEN} strokeWidth="1" />
      <circle cx="96" cy="40" r="5" fill={GREEN} />
      <text x="107" y="37" fill={TXT3} fontSize="8" fontWeight="700">LIB</text>
      <text x="107" y="48" fill={TXT5} fontSize="7">#12 Kai</text>
      <Badge x={111} y={20} n={4} />
      <text x={111} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Libero</text>
      <text x={111} y={109} fill={TXT5} fontSize="7" textAnchor="middle">Box</text>

      {/* ⑤ Rotation tracker */}
      <rect x="144" y="26" width="32" height="28" rx="4" fill={SURFACE2} stroke={PURPLE} strokeWidth="1" />
      <text x="160" y="36" fill={PURPLE} fontSize="6" textAnchor="middle" fontWeight="700">ROT</text>
      <text x="160" y="48" fill={PURPLE} fontSize="13" fontWeight="900" textAnchor="middle">2</text>
      <Badge x={160} y={20} n={5} color={PURPLE} />
      <text x={160} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Rotation</text>
      <text x={160} y={109} fill={TXT5} fontSize="7" textAnchor="middle">Number</text>

      {/* ⑥ Our score (left) */}
      <text x="215" y="58" fill={TXT} fontSize="26" fontWeight="900" fontFamily="monospace" textAnchor="middle">14</text>
      <text x="200" y="36" fill={TXT4} fontSize="8" textAnchor="middle">HOME</text>
      <Badge x={215} y={20} n={6} />
      <text x={215} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Our Score</text>
      <text x={215} y={109} fill={TXT5} fontSize="7" textAnchor="middle">(hold 3s to adj)</text>

      {/* ⑦ Serve ball + set block */}
      <text x="264" y="52" fontSize="16" textAnchor="middle">🏐</text>
      <rect x="288" y="26" width="60" height="28" rx="5" fill={SURFACE2} />
      <text x="318" y="37" fill={TXT5} fontSize="7" textAnchor="middle">Set 2</text>
      <line x1="288" y1="44" x2="348" y2="44" stroke={BORDER2} strokeWidth="0.5" strokeDasharray="3 2" />
      <text x="349" y="52" fontSize="16" textAnchor="middle">🏐</text>
      <Badge x={318} y={20} n={7} color={BLUE} />
      <text x={318} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Set # ·</text>
      <text x={318} y={109} fill={TXT5} fontSize="7" textAnchor="middle">Sparkline</text>
      <text x={264} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Serve</text>
      <text x={264} y={109} fill={TXT5} fontSize="7" textAnchor="middle">Ball 🏐</text>

      {/* ⑧ Opp score (right) */}
      <text x="445" y="36" fill={TXT4} fontSize="8" textAnchor="middle">AWAY</text>
      <text x="445" y="58" fill={TXT3} fontSize="26" fontWeight="900" fontFamily="monospace" textAnchor="middle">12</text>
      <Badge x={445} y={20} n={8} />
      <text x={445} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Opp</text>
      <text x={445} y={109} fill={TXT5} fontSize="7" textAnchor="middle">Score</text>

      {/* ⑨ Last action feed */}
      <rect x="468" y="30" width="96" height="20" rx="10" fill="#334155aa" stroke={BORDER2} strokeWidth="0.8" />
      <text x="516" y="44" fill={TXT} fontSize="7.5" textAnchor="middle" fontWeight="700">+1 Smith KILL</text>
      <Badge x={516} y={20} n={9} />
      <text x={516} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Last Action</text>
      <text x={516} y={109} fill={TXT5} fontSize="7" textAnchor="middle">Feed</text>

      {/* ⑩ Opp timeouts */}
      <circle cx="572" cy="39" r="6" fill="none" stroke={BORDER2} strokeWidth="1.5" />
      <circle cx="586" cy="39" r="6" fill="none" stroke={BORDER2} strokeWidth="1.5" />
      <Badge x={579} y={20} n={10} />
      <text x={579} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Opp</text>
      <text x={579} y={109} fill={TXT5} fontSize="7" textAnchor="middle">Timeouts</text>

      {/* ⑪ Opp sets won */}
      <rect x="596" y="28" width="22" height="22" rx="3" fill="none" stroke={BORDER2} strokeWidth="1.5" />
      <text x="607" y="43" fill={TXT3} fontSize="12" fontWeight="900" textAnchor="middle">0</text>
      <Badge x={607} y={20} n={11} />
      <text x={607} y={100} fill={TXT5} fontSize="7" textAnchor="middle">Opp Sets</text>
      <text x={607} y={109} fill={TXT5} fontSize="7" textAnchor="middle">Won</text>

      {/* Tap-to-adjust note */}
      <text x="350" y="130" fill={TXT5} fontSize="7.5" textAnchor="middle">① Timeout dots: tap to call timeout · Scores: hold 3s to open adjust panel</text>
      <text x="350" y="143" fill={TXT5} fontSize="7.5" textAnchor="middle">🏐 ball shows the serving team — it animates across when serve changes</text>
    </svg>
  );
}

// ─── Diagram 3: Run Bar ───────────────────────────────────────────────────────
function DiagRunBar() {
  return (
    <svg viewBox="0 0 700 110" className="w-full rounded-xl" style={{ background: BG }}>
      <rect x="0" y="20" width="700" height="28" fill="#0f1a0f" />

      {/* ① Win % */}
      <text x="14" y="38" fill="#4ade80" fontSize="8" fontWeight="900">WIN</text>
      <text x="14" y="46" fill="#4ade80" fontSize="10" fontWeight="900">62%</text>
      <Badge x={14} y={20} n={1} color={GREEN} />

      {/* ② Team stats */}
      {[
        { lbl: 'S%',  val: '87%',  x: 55  },
        { lbl: 'ACE', val: '4',    x: 98  },
        { lbl: 'SE',  val: '2',    x: 135 },
        { lbl: 'K',   val: '12',   x: 172 },
        { lbl: 'AE',  val: '3',    x: 209 },
        { lbl: 'BLK', val: '2',    x: 248 },
        { lbl: 'APR', val: '2.4',  x: 291 },
      ].map(({ lbl, val, x }) => (
        <g key={lbl}>
          <text x={x} y="35" fill={TXT5} fontSize="7" fontWeight="600">{lbl}</text>
          <text x={x + lbl.length * 3.8} y="35" fill={TXT3} fontSize="7" fontWeight="700"> {val}</text>
        </g>
      ))}
      <Badge x={175} y={20} n={2} />

      {/* ③ Run badge */}
      <text x="350" y="40" fill={PRIMARY} fontSize="11" fontWeight="900" textAnchor="middle">🔥 HOME 5 RUN</text>
      <Badge x={350} y={20} n={3} />

      {/* ④ Opp stats */}
      {[
        { lbl: 'ACE',  val: '1',  x: 430 },
        { lbl: 'SE',   val: '3',  x: 468 },
        { lbl: 'K',    val: '8',  x: 504 },
        { lbl: 'AE',   val: '4',  x: 538 },
        { lbl: 'BLK',  val: '1',  x: 574 },
        { lbl: 'ERRS', val: '9',  x: 608 },
      ].map(({ lbl, val, x }) => (
        <g key={lbl}>
          <text x={x} y="35" fill="#f87171" fontSize="7" fontWeight="600">{lbl}</text>
          <text x={x + lbl.length * 3.8} y="35" fill="#fca5a5" fontSize="7" fontWeight="700"> {val}</text>
        </g>
      ))}
      <Badge x={530} y={20} n={4} color={RED} />

      {/* Legend */}
      <text x="10" y="70" fill={TXT5} fontSize="7.5">① Win probability badge · ② Your team's current-set stats (S% = serve-in rate) · ③ Run badge appears after 3+ consecutive points · ④ Opponent stats</text>
      <text x="10" y="84" fill={TXT5} fontSize="7.5">Run badge pulses faster as the run grows. 🧊 cold / 🔥 hot indicators appear on tile stat chips when a stat is trending.</text>
    </svg>
  );
}

// ─── Diagram 4: Player Tile (full detail) ─────────────────────────────────────
function DiagPlayerTile() {
  const TW = 280, TH = 390;
  const LX = TW + 20; // label area x start

  const rows = [
    { y: 0,   h: 30,  label: 'Badge Strip — jersey · name · position · rotation slot', color: SURFACE },
    { y: 30,  h: 18,  label: 'Live Stats — K · ACE · DIG · BLK · SE · AE · APR',       color: SURFACE2 },
    { y: 48,  h: 48,  label: 'Serve Row (server only): FLOAT / TOP → ATT / ACE / SE',  color: '#0c1f0c' },
    { y: 96,  h: 50,  label: 'Hitting: ATT · FREE · K (→ kill type) · AE (→ error type)', color: '#1a100a' },
    { y: 146, h: 48,  label: 'Defense: DIG · FREE · SBLK · HBLK',                      color: '#0a0f1a' },
    { y: 194, h: 48,  label: 'Serve Receive: 0 (aced) · 1 · 2 · 3 (perfect)',           color: '#0a1a0a' },
    { y: 242, h: 48,  label: 'Errors (opponent scores): L · DBL · NET · BHE · FBE',    color: '#1a0a0a' },
  ];

  return (
    <svg viewBox={`0 0 ${LX + 320} ${TH + 20}`} className="w-full rounded-xl" style={{ background: BG }}>
      {/* Tile outline */}
      <rect x="10" y="10" width={TW} height={TH} fill={SURFACE} stroke={PRIMARY} strokeWidth="1.5" />

      {/* ── Badge strip ── */}
      <rect x="10" y="10" width={TW} height={rows[0].h} fill="#111827" stroke="none" />
      {/* jersey shape */}
      <path d="M34 15Q42 22 50 15L60 20 57 28H54V38H26V28H23L20 20Z" fill="#1d4ed8" opacity="0.75" stroke="#60a5fa" strokeWidth="0.8" />
      <text x="40" y="30" fill={TXT} fontSize="9" fontWeight="900" textAnchor="middle">1</text>
      <text x="100" y="30" fill={TXT} fontSize="10" fontWeight="700" textAnchor="middle">SMITH</text>
      <text x="230" y="27" fill={TXT5} fontSize="8">OH</text>
      <rect x="250" y="18" width="26" height="14" rx="3" fill={SURFACE2} stroke={BORDER} strokeWidth="0.8" />
      <text x="263" y="29" fill={TXT5} fontSize="8" textAnchor="middle">S1</text>
      <Badge x={10 + TW + 8} y={10 + rows[0].h / 2} n={1} />
      <line x1={TW + 10} y1={10 + rows[0].h / 2} x2={TW + 14} y2={10 + rows[0].h / 2} stroke={PRIMARY} strokeWidth="0.8" />
      <text x={TW + 22} y={10 + rows[0].h / 2 + 3} fill={TXT3} fontSize="7.5">{rows[0].label}</text>

      {/* ── Live stats bar ── */}
      <rect x="10" y={10 + rows[0].h} width={TW} height={rows[1].h} fill="#050f05" />
      {[
        { l: '12 K', c: PRIMARY }, { l: '4 ACE', c: GREEN }, { l: '6 DIG', c: BLUE },
        { l: '2 BLK', c: '#818cf8' }, { l: '1 SE', c: RED }, { l: '2.4 APR', c: TEAL },
      ].map(({ l, c }, i) => (
        <text key={l} x={16 + i * 42} y={10 + rows[0].h + 12} fill={c} fontSize="7.5" fontWeight="700">{l}</text>
      ))}
      <Badge x={10 + TW + 8} y={10 + rows[0].h + rows[1].h / 2} n={2} color={TEAL} />
      <line x1={TW + 10} y1={10 + rows[0].h + rows[1].h / 2} x2={TW + 14} y2={10 + rows[0].h + rows[1].h / 2} stroke={TEAL} strokeWidth="0.8" />
      <text x={TW + 22} y={10 + rows[0].h + rows[1].h / 2 + 3} fill={TXT3} fontSize="7.5">{rows[1].label}</text>

      {/* ── Serve row ── */}
      <rect x="10" y={10 + rows[0].h + rows[1].h} width={TW} height={rows[2].h} fill="#0a1a0a" />
      <text x="22" y={10 + rows[0].h + rows[1].h + 10} fill={TXT5} fontSize="7" fontWeight="700">Serving</text>
      <text x="170" y={10 + rows[0].h + rows[1].h + 10} fill="#f59e0b80" fontSize="7">★ Z1 · Z5</text>
      {[
        { l: 'FLOAT', bg: '#166534', tc: '#fff', x: 16  },
        { l: 'TOP',   bg: '#6d28d9', tc: '#c4b5fd', x: 72 },
        { l: 'ATT',   bg: '#064e3b', tc: '#6ee7b7', x: 128 },
        { l: 'ACE',   bg: '#16a34a', tc: '#fff', x: 184 },
        { l: 'SE',    bg: '#7f1d1d', tc: '#fca5a5', x: 240 },
      ].map(({ l, bg, tc, x }) => (
        <g key={l}>
          <rect x={x} y={10 + rows[0].h + rows[1].h + 14} width={48} height={22} rx="5" fill={bg} />
          <text x={x + 24} y={10 + rows[0].h + rows[1].h + 28} fill={tc} fontSize="8.5" fontWeight="800" textAnchor="middle">{l}</text>
        </g>
      ))}
      <Badge x={10 + TW + 8} y={10 + rows[0].h + rows[1].h + rows[2].h / 2} n={3} color={GREEN} />
      <line x1={TW + 10} y1={10 + rows[0].h + rows[1].h + rows[2].h / 2} x2={TW + 14} y2={10 + rows[0].h + rows[1].h + rows[2].h / 2} stroke={GREEN} strokeWidth="0.8" />
      <text x={TW + 22} y={10 + rows[0].h + rows[1].h + rows[2].h / 2 + 3} fill={TXT3} fontSize="7.5">{rows[2].label}</text>

      {/* ── Hitting row ── */}
      <rect x="10" y={10 + 96} width={TW} height={rows[3].h} fill="#1a0f05" />
      <text x="22" y={10 + 96 + 10} fill={TXT5} fontSize="7" fontWeight="700">Hitting</text>
      {[
        { l: 'ATT',  bg: '#431407', tc: '#fed7aa', x: 16  },
        { l: 'FREE', bg: '#2e1065', tc: '#c4b5fd', x: 72  },
        { l: 'K',    bg: '#c2410c', tc: '#fff', x: 128 },
        { l: 'AE',   bg: '#7f1d1d', tc: '#fca5a5', x: 184 },
      ].map(({ l, bg, tc, x }) => (
        <g key={l}>
          <rect x={x} y={10 + 96 + 14} width={48} height={22} rx="5" fill={bg} />
          <text x={x + 24} y={10 + 96 + 28} fill={tc} fontSize="8.5" fontWeight="800" textAnchor="middle">{l}</text>
        </g>
      ))}
      <text x="22" y={10 + 96 + 42} fill={TXT5} fontSize="6.5">K → PURE · TOUCH · TOOL · TIP/ROLL · BK ROW · OVER</text>
      <text x="22" y={10 + 96 + 50} fill={TXT5} fontSize="6.5">AE → OB · NET · BLK · BRA</text>
      <Badge x={10 + TW + 8} y={10 + 96 + rows[3].h / 2} n={4} color={PRIMARY} />
      <line x1={TW + 10} y1={10 + 96 + rows[3].h / 2} x2={TW + 14} y2={10 + 96 + rows[3].h / 2} stroke={PRIMARY} strokeWidth="0.8" />
      <text x={TW + 22} y={10 + 96 + rows[3].h / 2 + 3} fill={TXT3} fontSize="7.5">{rows[3].label}</text>

      {/* ── Defense row ── */}
      <rect x="10" y={10 + 146} width={TW} height={rows[4].h} fill="#050a1f" />
      <text x="22" y={10 + 146 + 10} fill={TXT5} fontSize="7" fontWeight="700">Defense</text>
      {[
        { l: 'DIG',  bg: '#0c2340', tc: '#93c5fd', x: 16  },
        { l: 'FREE', bg: '#083344', tc: '#a5f3fc', x: 72  },
        { l: 'SBLK', bg: '#1e1b4b', tc: '#a5b4fc', x: 128 },
        { l: 'HBLK', bg: '#312e81', tc: '#c7d2fe', x: 184 },
      ].map(({ l, bg, tc, x }) => (
        <g key={l}>
          <rect x={x} y={10 + 146 + 14} width={48} height={22} rx="5" fill={bg} />
          <text x={x + 24} y={10 + 146 + 28} fill={tc} fontSize="8.5" fontWeight="800" textAnchor="middle">{l}</text>
        </g>
      ))}
      <text x="22" y={10 + 146 + 42} fill={TXT5} fontSize="6.5">SBLK = solo block (we score) · HBLK = tap two players for team block</text>
      <Badge x={10 + TW + 8} y={10 + 146 + rows[4].h / 2} n={5} color={BLUE} />
      <line x1={TW + 10} y1={10 + 146 + rows[4].h / 2} x2={TW + 14} y2={10 + 146 + rows[4].h / 2} stroke={BLUE} strokeWidth="0.8" />
      <text x={TW + 22} y={10 + 146 + rows[4].h / 2 + 3} fill={TXT3} fontSize="7.5">{rows[4].label}</text>

      {/* ── Serve Receive row ── */}
      <rect x="10" y={10 + 194} width={TW} height={rows[5].h} fill="#051a05" />
      <text x="22" y={10 + 194 + 10} fill={TXT5} fontSize="7" fontWeight="700">S/R</text>
      {[
        { l: '0', bg: '#450a0a', tc: '#fca5a5', x: 16  },
        { l: '1', bg: '#451a03', tc: '#fed7aa', x: 72  },
        { l: '2', bg: '#1a2e05', tc: '#bef264', x: 128 },
        { l: '3', bg: '#0d3b2c', tc: '#5eead4', x: 184 },
      ].map(({ l, bg, tc, x }) => (
        <g key={l}>
          <rect x={x} y={10 + 194 + 14} width={48} height={22} rx="5" fill={bg} />
          <text x={x + 24} y={10 + 194 + 28} fill={tc} fontSize="14" fontWeight="900" textAnchor="middle">{l}</text>
        </g>
      ))}
      <text x="22" y={10 + 194 + 42} fill={TXT5} fontSize="6.5">0 = aced (they score) · 1 = poor · 2 = good · 3 = perfect</text>
      <Badge x={10 + TW + 8} y={10 + 194 + rows[5].h / 2} n={6} color={GREEN} />
      <line x1={TW + 10} y1={10 + 194 + rows[5].h / 2} x2={TW + 14} y2={10 + 194 + rows[5].h / 2} stroke={GREEN} strokeWidth="0.8" />
      <text x={TW + 22} y={10 + 194 + rows[5].h / 2 + 3} fill={TXT3} fontSize="7.5">{rows[5].label}</text>

      {/* ── Errors row ── */}
      <rect x="10" y={10 + 242} width={TW} height={rows[6].h} fill="#1a050a" />
      <text x="22" y={10 + 242 + 10} fill={TXT5} fontSize="7" fontWeight="700">Errors</text>
      {[
        { l: 'L',   x: 16  },
        { l: 'DBL', x: 64  },
        { l: 'NET', x: 112 },
        { l: 'BHE', x: 160 },
        { l: 'FBE', x: 208 },
      ].map(({ l, x }) => (
        <g key={l}>
          <rect x={x} y={10 + 242 + 14} width={40} height={22} rx="5" fill="#4c0519" stroke="#be185d" strokeWidth="0.8" />
          <text x={x + 20} y={10 + 242 + 28} fill={ROSE} fontSize="8.5" fontWeight="800" textAnchor="middle">{l}</text>
        </g>
      ))}
      <text x="22" y={10 + 242 + 42} fill={TXT5} fontSize="6.5">All give opponent a point: L=lift · DBL=double · NET=net touch · BHE=set error · FBE=freeball err</text>
      <Badge x={10 + TW + 8} y={10 + 242 + rows[6].h / 2} n={7} color={ROSE} />
      <line x1={TW + 10} y1={10 + 242 + rows[6].h / 2} x2={TW + 14} y2={10 + 242 + rows[6].h / 2} stroke={ROSE} strokeWidth="0.8" />
      <text x={TW + 22} y={10 + 242 + rows[6].h / 2 + 3} fill={TXT3} fontSize="7.5">{rows[6].label}</text>

      {/* Server badge */}
      <rect x="10" y={10 + 290} width={TW} height={TH - 290} fill="#1c0a00" stroke={PRIMARY} strokeWidth="0" />
      <text x={10 + TW / 2} y={10 + 290 + 14} fill={PRIMARY} fontSize="8" textAnchor="middle" fontWeight="700">★ Server tile highlighted orange — serve row auto-shows</text>
      <text x={10 + TW / 2} y={10 + 290 + 26} fill={TXT5} fontSize="7" textAnchor="middle">Tile background glows when server</text>
    </svg>
  );
}

// ─── Diagram 5: Opponent Scoring Column ──────────────────────────────────────
function DiagOppColumn() {
  const btns = [
    { l: 'K',   color: RED,   sub: "Opp kill — they score",              pointsUs: false },
    { l: 'SE',  color: GREEN, sub: "Opp serve error — we score",         pointsUs: true  },
    { l: 'AE',  color: GREEN, sub: "Opp attack error — we score",        pointsUs: true  },
    { l: 'BHE', color: GREEN, sub: "Opp ball handling error — we score", pointsUs: true  },
    { l: 'NET', color: GREEN, sub: "Opp net touch — we score",           pointsUs: true  },
    { l: 'ROT', color: GREEN, sub: "Opp rotation violation — we score",  pointsUs: true  },
  ];
  const BW = 48, BH = 40;
  return (
    <svg viewBox={`0 0 600 ${btns.length * BH + 40}`} className="w-full rounded-xl" style={{ background: BG }}>
      <text x="10" y="16" fill={TXT4} fontSize="9" fontWeight="700" letterSpacing="1">OPPONENT SCORING COLUMN — right edge of court</text>
      {btns.map(({ l, color, sub, pointsUs }, i) => (
        <g key={l}>
          <rect x="10" y={24 + i * BH} width={BW} height={BH - 2} rx="4"
            fill={pointsUs ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'}
            stroke={color} strokeWidth="1.2" />
          <text x={10 + BW / 2} y={24 + i * BH + BH / 2 + 2} fill={color}
            fontSize={l.length > 2 ? '8' : '14'} fontWeight="900" textAnchor="middle" dominantBaseline="middle">{l}</text>
          <text x={70} y={24 + i * BH + 12} fill={TXT3} fontSize="9" fontWeight="700">{l}</text>
          <text x={70} y={24 + i * BH + 26} fill={TXT5} fontSize="8">{sub}</text>
          <Badge x={6} y={24 + i * BH + BH / 2} n={i + 1} color={color} />
        </g>
      ))}
    </svg>
  );
}

// ─── Diagram 6: Action Bar ────────────────────────────────────────────────────
function DiagActionBar() {
  const btns = [
    { l: 'ROT\nBACK', color: TXT4,   sub: 'Hold 450ms to rotate\nlineup backward',    n: 1  },
    { l: 'ROT\nFWD',  color: TXT4,   sub: 'Hold 450ms to rotate\nlineup forward',     n: 2  },
    { l: 'UNDO',      color: '#fbbf24', sub: 'Removes last recorded\naction (multi-undo ok)', n: 3 },
    { l: 'SUB',       color: TXT3,   sub: 'Open substitution\npanel',                 n: 4  },
    { l: 'LIB\nON',   color: '#34d399', sub: 'Libero swap\n(if libero assigned)',     n: 5  },
    { l: 'ROT\nERR',  color: ROSE,   sub: 'Home team rotation\nviolation (we lose pt)',n: 6 },
    { l: 'STATS',     color: PRIMARY, sub: 'Live stats modal\n(● = alert active)',    n: 7  },
    { l: 'SCORE',     color: TXT5,   sub: 'Scoring run\nsummary',                    n: 8  },
    { l: '⌂',         color: PRIMARY, sub: 'Home — exit to\nmatch list',             n: 9  },
    { l: '⚙',         color: PRIMARY, sub: 'Menu — end set,\nend match, export',     n: 10 },
  ];

  const BH = 34, totalW = 700;
  const bw = totalW / btns.length;

  return (
    <svg viewBox={`0 0 ${totalW} 130`} className="w-full rounded-xl" style={{ background: BG }}>
      <text x="10" y="14" fill={TXT4} fontSize="9" fontWeight="700" letterSpacing="1">ACTION BAR — bottom of screen</text>

      {/* Bar background */}
      <rect x="0" y="20" width={totalW} height={BH} fill={SURFACE} />

      {btns.map(({ l, color, sub, n }, i) => {
        const cx = i * bw + bw / 2;
        const lines = l.split('\n');
        return (
          <g key={l + i}>
            {/* Divider */}
            {i > 0 && <line x1={i * bw} y1="20" x2={i * bw} y2="54" stroke={BORDER} strokeWidth="0.8" />}
            {/* Label */}
            {lines.length === 1
              ? <text x={cx} y={20 + BH / 2 + 4} fill={color} fontSize="9" fontWeight="800" textAnchor="middle">{l}</text>
              : lines.map((line, li) => (
                  <text key={li} x={cx} y={20 + BH / 2 - 3 + li * 10} fill={color} fontSize="7.5" fontWeight="800" textAnchor="middle">{line}</text>
                ))
            }
            <Badge x={cx} y={20} n={n} />
            {/* Sub-label below bar */}
            {sub.split('\n').map((s, si) => (
              <text key={si} x={cx} y={62 + si * 12} fill={TXT5} fontSize="6.5" textAnchor="middle">{s}</text>
            ))}
          </g>
        );
      })}

      {/* Notes */}
      <text x="10" y="118" fill={TXT5} fontSize="7.5">ROT buttons require a hold — prevents accidental rotations. LIB button only appears when a libero is designated in the lineup.</text>
    </svg>
  );
}

export function HelpLiveStatLabelsPage() {
  const { state } = useLocation();
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Live Stat Phase Labels" backTo={state?.fromLive ? null : '/settings'} />

      <div className="p-4 space-y-8 max-w-2xl mx-auto pb-12">

        {/* Intro */}
        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">Every button, labeled</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            This guide labels every button and indicator on the live stat screen so new users can identify
            each element at a glance. The screen operates in landscape orientation only.
            Tap sections below to zoom into each region.
          </p>
        </div>

        {/* Section 1 — Overview */}
        <Section
          title="① Screen Layout — Five Zones"
          note="The live match screen is divided into five fixed regions stacked top to bottom. The player grid fills the majority of the screen; the score header and action bar are always visible at top and bottom."
        >
          <DiagOverview />
        </Section>

        {/* Section 2 — Score Header */}
        <Section
          title="② Score Header — All 11 Elements"
          note="The header shows live match state. Tap timeout dots to mark a timeout used. Hold either score for 3 seconds to open a ± adjust panel. The 🏐 ball animates across the center when the serve switches teams."
        >
          <DiagScoreHeader />
        </Section>

        {/* Section 3 — Run Bar */}
        <Section
          title="③ Run Bar — Live Stats Strip"
          note="The run bar sits directly below the header. Your team's current-set stats appear on the left; opponent stats on the right. When either team scores 3+ consecutive points, the run badge appears in the center and pulses faster as the streak grows."
        >
          <DiagRunBar />
        </Section>

        {/* Section 4 — Player Tile */}
        <Section
          title="④ Player Tile — All Button Rows"
          note="Each of the six court tiles has identical button rows. The serve row only appears on the current server's tile. Tap a button to record that action immediately — there is no confirm step. Subpanels (kill type, error type) appear inline for two-step actions."
        >
          <DiagPlayerTile />
          <div className="mt-3 space-y-1.5">
            <LabelRow items={[
              { n: 1, label: 'Badge strip — jersey · player name · position label · rotation slot (S1–S6)' },
              { n: 2, label: 'Live stats — running K · ACE · DIG totals for this set', color: TEAL },
              { n: 3, label: 'Serve row (server tile only) — FLOAT/TOP type → ATT / ACE / SE', color: GREEN },
              { n: 4, label: 'Hitting — ATT (attempt) · FREE (freeball) · K (kill) · AE (attack error)', color: PRIMARY },
              { n: 5, label: 'Defense — DIG · FREE receive · SBLK (solo) · HBLK (team block, tap 2 tiles)', color: BLUE },
              { n: 6, label: 'Serve Receive — 0 aced / 1 poor / 2 good / 3 perfect pass rating', color: GREEN },
              { n: 7, label: 'Errors (all give opp a point) — L lift · DBL double · NET net touch · BHE set err · FBE freeball err', color: ROSE },
            ]} />
          </div>
        </Section>

        {/* Section 5 — Opponent Column */}
        <Section
          title="⑤ Opponent Scoring Column — Right Edge"
          note="When an opponent action ends the rally without any of your players touching the ball, use this column. Green buttons score a point for you; the red K button gives them a point."
        >
          <DiagOppColumn />
        </Section>

        {/* Section 6 — Action Bar */}
        <Section
          title="⑥ Action Bar — Bottom Row"
          note="The action bar spans the full width at the bottom. ROT buttons require a hold to prevent accidental rotation. LIB only appears when a libero is in the lineup. The STATS button shows an orange dot when a performance alert is active."
        >
          <DiagActionBar />
          <div className="mt-3 space-y-1.5">
            <LabelRow items={[
              { n: 1,  label: 'ROT BACK — hold to rotate lineup one position backward' },
              { n: 2,  label: 'ROT FWD — hold to rotate lineup one position forward' },
              { n: 3,  label: 'UNDO — remove the last recorded action (can undo multiple times)', color: '#fbbf24' },
              { n: 4,  label: 'SUB — open substitution panel (count shown as x/max)' },
              { n: 5,  label: 'LIB ON/OFF — libero swap button (only shown when libero is assigned)', color: GREEN },
              { n: 6,  label: 'ROT ERR — home team rotation violation (opponent scores)', color: ROSE },
              { n: 7,  label: 'STATS — live player stats modal (● dot = performance alert)', color: PRIMARY },
              { n: 8,  label: 'SCORE — scoring run summary panel' },
              { n: 9,  label: '⌂ Home — navigate to match list without ending the match', color: PRIMARY },
              { n: 10, label: '⚙ Menu — end set · end match · export backup', color: PRIMARY },
            ]} />
          </div>
        </Section>

        {/* Quick reference card */}
        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Quick Reference</p>
          {[
            ['We score a point when…', 'you tap ACE · SBLK · HBLK · K on a tile, or SE · AE · BHE · NET · ROT in the opp column'],
            ['Opp scores a point when…', 'you tap 0 (pass) · AE→BLK · SE (OB/NET/FOOT) on a tile, or K in the opp column'],
            ['Serve row appears?',       'Only on the current server\'s tile (S1, highlighted orange) when we are serving'],
            ['HBLK (team block)',         'Tap HBLK on two different tiles in the same rally — first tap turns amber, second completes it'],
            ['Kill subpanel',             'K → choose PURE / TOUCH / TOOL / TIP-ROLL / BK ROW / OVER, then assist is auto-prompted'],
            ['AE subpanel',               'AE → choose OB / NET / BLK / BRA — BLK also credits an opponent block'],
          ].map(([q, a]) => (
            <div key={q}>
              <p className="text-xs font-bold text-primary">{q}</p>
              <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{a}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
