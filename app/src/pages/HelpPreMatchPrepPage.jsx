import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';

const BG      = '#000000';
const SURFACE = '#1e293b';
const SURFACE2= '#0f172a';
const BORDER  = '#334155';
const TXT     = '#f8fafc';
const TXT3    = '#cbd5e1';
const TXT4    = '#94a3b8';
const TXT5    = '#64748b';
const PRIMARY = '#f97316';
const EMERALD = '#34d399';
const RED     = '#f87171';
const AMBER   = '#fbbf24';

function Step({ number, title, note, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center shrink-0" style={{ background: PRIMARY }}>
          {number}
        </span>
        <span className="font-semibold text-white">{title}</span>
      </div>
      {note && <p className="text-sm text-slate-400 pl-10 leading-relaxed">{note}</p>}
      {children && <div className="pl-10">{children}</div>}
    </div>
  );
}

// ── Diagram: rotation radar with weak rotation flagged ─────────────────────────
function DiagRotationWeakness() {
  const cx = 160; const cy = 52; const R = 36;
  const angles = [0,60,120,180,240,300].map(d => d * Math.PI / 180);
  const vals   = [0.72, 0.65, 0.41, 0.68, 0.71, 0.67]; // SO% per rotation, R3 is weak
  const pts = vals.map((v, i) => ({
    x: cx + Math.cos(angles[i] - Math.PI/2) * R * v,
    y: cy + Math.sin(angles[i] - Math.PI/2) * R * v,
  }));
  const outline = angles.map((a, i) => ({
    x: cx + Math.cos(a - Math.PI/2) * R,
    y: cy + Math.sin(a - Math.PI/2) * R,
  }));
  const polyPts = pts.map(p => `${p.x},${p.y}`).join(' ');
  const outlinePts = outline.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <svg viewBox="0 0 320 110" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="16" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">ROTATION RADAR — LAST 5 MATCHES</text>
      {/* grid */}
      {[0.25,0.5,0.75,1].map(s => (
        <polygon key={s} points={outline.map(p => `${cx+(p.x-cx)*s},${cy+(p.y-cy)*s}`).join(' ')}
          fill="none" stroke={BORDER} strokeWidth="0.5" />
      ))}
      {outline.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={BORDER} strokeWidth="0.5" />
      ))}
      {/* filled area */}
      <polygon points={polyPts} fill={`${PRIMARY}22`} stroke={PRIMARY} strokeWidth="1.5" />
      {/* R3 weak dot + label */}
      <circle cx={pts[2].x} cy={pts[2].y} r="5" fill={RED} />
      <rect x="172" y="62" width="54" height="18" rx="5" fill="rgba(248,113,113,0.15)" stroke={RED} strokeWidth="1" />
      <text x="199" y="74" fill={RED} fontSize="8" fontWeight="800" textAnchor="middle">⚠ R3: 41%</text>
      {/* axis labels */}
      {['R1','R2','R3','R4','R5','R6'].map((l, i) => {
        const lx = cx + Math.cos(angles[i] - Math.PI/2) * (R + 10);
        const ly = cy + Math.sin(angles[i] - Math.PI/2) * (R + 10);
        return <text key={l} x={lx} y={ly + 3} fill={i === 2 ? RED : TXT4} fontSize="8" fontWeight="700" textAnchor="middle">{l}</text>;
      })}
    </svg>
  );
}

// ── Diagram: insights "watch this" banner ─────────────────────────────────────
function DiagInsightsBanner() {
  return (
    <svg viewBox="0 0 320 96" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="16" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">⚡ INSIGHTS — FOCUS AREAS</text>

      {/* Close — watch this */}
      <rect x="8" y="22" width="304" height="30" rx="7" fill="rgba(251,191,36,0.1)" stroke="rgba(251,191,36,0.4)" strokeWidth="1" />
      <text x="16" y="35" fill={TXT3} fontSize="8" fontWeight="900">HITTING EFF.</text>
      <text x="306" y="35" fill={AMBER} fontSize="8" fontWeight="800" textAnchor="end">⚡ Close — watch this</text>
      <rect x="16" y="40" width="288" height="5" rx="2.5" fill="#334155" />
      <rect x="16" y="40" width="144" height="5" rx="2.5" fill={AMBER} />

      {/* Below threshold */}
      <rect x="8" y="60" width="304" height="30" rx="7" fill="rgba(248,113,113,0.1)" stroke="rgba(248,113,113,0.4)" strokeWidth="1" />
      <text x="16" y="73" fill={TXT3} fontSize="8" fontWeight="900">BREAK POINT %</text>
      <text x="306" y="73" fill={RED} fontSize="8" fontWeight="800" textAnchor="end">✗ Below threshold</text>
      <rect x="16" y="78" width="288" height="5" rx="2.5" fill="#334155" />
      <rect x="16" y="78" width="60" height="5" rx="2.5" fill={RED} />
    </svg>
  );
}

// ── Diagram: opponent scouting card ───────────────────────────────────────────
function DiagOpponentCard() {
  return (
    <svg viewBox="0 0 320 110" className="w-full rounded-xl" style={{ background: SURFACE }}>
      {/* header */}
      <rect x="0" y="0" width="320" height="32" rx="0" fill={SURFACE} />
      <text x="16" y="13" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">LINCOLN HIGH SCHOOL</text>
      <text x="16" y="26" fill={TXT4} fontSize="10" fontWeight="700">3–2 all-time vs us</text>
      <line x1="0" y1="32" x2="320" y2="32" stroke={BORDER} strokeWidth="0.5" />

      {/* tendency chips */}
      <text x="16" y="46" fill={TXT5} fontSize="8" fontWeight="700" letterSpacing="1">TENDENCIES</text>
      {[
        { icon:'🎯', text:'Targets zone 5-6 serve', x: 16,  y: 56 },
        { icon:'⚡', text:'22 kills, 6 errors last match', x: 16,  y: 72 },
        { icon:'🛡️', text:'Strong R2 blocking scheme', x: 16,  y: 88 },
        { icon:'⚠️', text:'Weak sideout in R4', x: 170, y: 56 },
      ].map(({ icon, text, x, y }) => (
        <g key={text}>
          <text x={x} y={y} fontSize="10">{icon}</text>
          <text x={x + 16} y={y} fill={TXT3} fontSize="8">{text}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Diagram: lineup load screen ───────────────────────────────────────────────
function DiagLineupLoad() {
  const positions = ['P1','P2','P3','P4','P5','P6'];
  const players   = ['Harris (OH)','Kim (DS)','Patel (MB)','Lee (S)','Jones (OH)','Cruz (MB)'];
  return (
    <svg viewBox="0 0 320 120" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="16" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">LOAD SAVED LINEUP</text>
      {/* saved lineup button */}
      <rect x="8" y="22" width="200" height="26" rx="8" fill={`${PRIMARY}22`} stroke={PRIMARY} strokeWidth="1.5" />
      <text x="108" y="39" fill={PRIMARY} fontSize="10" fontWeight="800" textAnchor="middle">Base 5-1 ↩ Load</text>
      {/* grid */}
      {positions.map((p, i) => {
        const col = i % 3; const row = Math.floor(i / 3);
        const x = 8 + col * 102; const y = 56 + row * 30;
        return (
          <g key={p}>
            <rect x={x} y={y} width="96" height="26" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
            <text x={x + 8} y={y + 11} fill={TXT5} fontSize="7" fontWeight="700">{p}</text>
            <text x={x + 8} y={y + 21} fill={TXT3} fontSize="8" fontWeight="600">{players[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Diagram: live match settings ──────────────────────────────────────────────
function DiagLiveSettings() {
  const items = [
    { label: 'Keep Screen Awake', on: true  },
    { label: 'Haptic Feedback',   on: true  },
    { label: 'Sound Feedback',    on: false },
  ];
  return (
    <svg viewBox="0 0 320 88" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="16" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">SETTINGS → LIVE MATCH</text>
      {items.map(({ label, on }, i) => {
        const y = 28 + i * 22;
        return (
          <g key={label}>
            <text x="16" y={y + 10} fill={TXT} fontSize="11" fontWeight="500">{label}</text>
            {/* toggle pill */}
            <rect x="256" y={y + 2} width="48" height="16" rx="8" fill={on ? PRIMARY : BORDER} />
            <circle cx={on ? 296 : 264} cy={y + 10} r="6" fill="white" />
          </g>
        );
      })}
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function HelpPreMatchPrepPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Pre-Match Prep Workflow" backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            VANTAGE has everything you need to walk into a match prepared. This guide shows how to use the app as a 15-minute pre-match routine — from identifying rotation vulnerabilities to loading your lineup and arming your device.
          </p>
        </div>

        <Step number={1} title="Check rotation weaknesses in Reports"
          note="Open Reports → pick your team and season → tap the Rotation Analysis tab. The radar chart shows SO% and BP% by rotation at a glance. Any rotation sitting noticeably inside the others is a vulnerability. Cross-reference with the Rotation Spotlight section below the chart — it calls out the single worst SO% and BP% rotation with context.">
          <DiagRotationWeakness />
        </Step>

        <Step number={2} title="Review ⚡ Insights for focus metrics"
          note="Still in Reports, tap the ⚡ Insights tab. Look for any metric flagged '⚡ Close — watch this' or '✗ Below threshold.' These are the areas where small improvements produce the biggest swing in match outcomes. Identify one or two specific focus points to emphasize in your pre-match talk.">
          <DiagInsightsBanner />
        </Step>

        <Step number={3} title="Pull up opponent scouting notes"
          note="Navigate to Opponents (bottom nav) → tap the opponent you're playing. The detail page shows their all-time record against you, any manual tendencies you've saved, and stats auto-populated from past matches. Review their attack patterns, serving targets, and any rotation strengths you've noted.">
          <DiagOpponentCard />
        </Step>

        <Step number={4} title="Load your saved lineup for the opening set"
          note="When you start the match and reach the lineup setup screen, tap your saved lineup at the top of the screen. All 6 positions fill instantly. Review the rotation order and confirm the libero assignment. If tonight's lineup is different from your saved version, adjust the individual slots — it doesn't overwrite the saved lineup.">
          <DiagLineupLoad />
        </Step>

        <Step number={5} title="Set serve zones (optional)"
          note="If you're using the serve zone feature, tap the zone indicator next to each server's slot before starting. This tells the app where each player is targeting and enables zone-level serve placement reports in the Heat Map tab after the match." />

        <Step number={6} title="Arm your device for the live screen"
          note="Open Settings → Live Match. Enable Keep Screen Awake so the phone doesn't lock between rallies. Enable Haptic Feedback for silent confirmation on every tap. If you're sharing stats with a manager on a second device, make sure both devices have the same match open before the first serve.">
          <DiagLiveSettings />
        </Step>

        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips & notes</p>
          {[
            ['Use L5 filter for recent form', 'In Reports, tap the L5 chip under Result to filter everything to the last 5 matches. Rotation analysis and Insights calculated from recent matches are more predictive than full-season data for tonight\'s opponent.'],
            ['Conference filter for big games', 'Before a conference match, filter Reports to Conference only. Your team\'s performance against conference opponents may differ significantly from non-conference play — both rotation tendencies and overall efficiency.'],
            ['Screenshot the rotation radar', 'Take a screenshot of the rotation radar from the Reports page and share it with your assistants before the match. It communicates weak spots faster than any verbal briefing.'],
            ['Check opponent record for serve targets', 'On the opponent detail page, past match data shows which of your players got aced most often. That player\'s zone is likely the opponent\'s preferred serve target — rotate them away from P1 or prepare a serve receive package.'],
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
