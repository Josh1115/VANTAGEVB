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
const LIME    = '#a3e635';

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

// ── Diagram: score header ──────────────────────────────────────────────────────
function DiagScoreHeader() {
  return (
    <svg viewBox="0 0 320 90" className="w-full rounded-xl" style={{ background: SURFACE }}>
      {/* opponent name */}
      <text x="160" y="20" fill={TXT4} fontSize="9" textAnchor="middle" fontWeight="600" letterSpacing="1">vs. LINCOLN HIGH SCHOOL</text>
      {/* W badge */}
      <rect x="16" y="28" width="32" height="32" rx="8" fill="#14532d" stroke="#22c55e" strokeWidth="1.5" />
      <text x="32" y="50" fill={EMERALD} fontSize="18" fontWeight="900" textAnchor="middle">W</text>
      {/* set score */}
      <text x="80" y="52" fill={TXT} fontSize="28" fontWeight="900" textAnchor="middle">3</text>
      <text x="100" y="52" fill={TXT5} fontSize="20" fontWeight="700" textAnchor="middle">–</text>
      <text x="120" y="52" fill={TXT4} fontSize="28" fontWeight="700" textAnchor="middle">1</text>
      {/* set chips */}
      {[['S1','25–18',true],['S2','25–21',true],['S3','22–25',false],['S4','25–19',true]].map(([label, score, won], i) => (
        <g key={label}>
          <rect x={168 + i * 37} y="32" width="33" height="24" rx="6"
            fill={won ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)'}
            stroke={won ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'} strokeWidth="1" />
          <text x={184 + i * 37} y="41" fill={TXT5} fontSize="7" fontWeight="700" textAnchor="middle">{label}</text>
          <text x={184 + i * 37} y="52" fill={won ? EMERALD : RED} fontSize="8" fontWeight="800" textAnchor="middle">{score}</text>
        </g>
      ))}
      {/* date / location */}
      <text x="160" y="78" fill={TXT5} fontSize="8" textAnchor="middle">Oct 14 · Home · Conference</text>
    </svg>
  );
}

// ── Diagram: tab bar ───────────────────────────────────────────────────────────
function DiagTabBar() {
  const tabs = ['Scoring','Report','Insights','Trends','Serving','Passing','Attacking','…'];
  return (
    <svg viewBox="0 0 320 40" className="w-full rounded-xl" style={{ background: SURFACE2 }}>
      <rect x="0" y="0" width="320" height="40" fill={SURFACE2} />
      {tabs.map((t, i) => {
        const x = 8 + i * 39;
        const active = i === 2;
        return (
          <g key={t}>
            {active && <rect x={x - 2} y="32" width="36" height="2.5" rx="1.5" fill={PRIMARY} />}
            <text x={x + 16} y="22" fontSize={active ? 8 : 7.5} fontWeight={active ? '800' : '500'}
              fill={active ? PRIMARY : TXT5} textAnchor="middle">{t}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Diagram: report card grades ────────────────────────────────────────────────
function DiagReportCard() {
  const grades = [
    { cat: 'Serving',   grade: 'A', color: EMERALD,  bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.4)'  },
    { cat: 'Passing',   grade: 'B', color: LIME,     bg: 'rgba(163,230,53,0.12)',  border: 'rgba(163,230,53,0.4)'  },
    { cat: 'Attacking', grade: 'C', color: AMBER,    bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.4)'  },
    { cat: 'Blocking',  grade: 'A', color: EMERALD,  bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.4)'  },
    { cat: 'Defense',   grade: 'B', color: LIME,     bg: 'rgba(163,230,53,0.12)',  border: 'rgba(163,230,53,0.4)'  },
    { cat: 'Overall',   grade: 'B+',color: LIME,     bg: 'rgba(163,230,53,0.18)',  border: 'rgba(163,230,53,0.6)'  },
  ];
  return (
    <svg viewBox="0 0 320 100" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="18" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">MATCH REPORT CARD</text>
      {grades.map(({ cat, grade, color, bg, border }, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 12 + col * 100;
        const y = 24 + row * 44;
        return (
          <g key={cat}>
            <rect x={x} y={y} width="92" height="36" rx="8" fill={bg} stroke={border} strokeWidth="1" />
            <text x={x + 46} y={y + 14} fill={TXT5} fontSize="8" fontWeight="700" textAnchor="middle">{cat}</text>
            <text x={x + 46} y={y + 30} fill={color} fontSize="16" fontWeight="900" textAnchor="middle">{grade}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Diagram: insights bar card ─────────────────────────────────────────────────
function DiagInsightsCard() {
  return (
    <svg viewBox="0 0 320 130" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="18" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">WIN CORRELATION — THIS MATCH</text>

      {/* Metric card 1 — on track */}
      <rect x="8" y="26" width="304" height="44" rx="8" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="16" y="40" fill={TXT3} fontSize="8" fontWeight="900" letterSpacing="0.5">SIDEOUT %</text>
      <text x="306" y="40" fill={EMERALD} fontSize="8" fontWeight="800" textAnchor="end">✓ On track</text>
      <text x="60" y="58" fill={RED} fontSize="12" fontWeight="900" textAnchor="middle">51%</text>
      <text x="60" y="65" fill="#7f1d1d" fontSize="7" fontWeight="700" textAnchor="middle">LOSS AVG</text>
      <text x="160" y="58" fill={EMERALD} fontSize="12" fontWeight="900" textAnchor="middle">66%</text>
      <text x="160" y="65" fill={TXT5} fontSize="7" fontWeight="700" textAnchor="middle">THIS MATCH</text>
      <text x="262" y="58" fill={EMERALD} fontSize="12" fontWeight="900" textAnchor="middle">68%</text>
      <text x="262" y="65" fill="#14532d" fontSize="7" fontWeight="700" textAnchor="middle">WIN AVG</text>
      {/* bar */}
      <rect x="16" y="61" width="288" height="5" rx="2.5" fill="#334155" />
      <rect x="16" y="61" width="230" height="5" rx="2.5" fill={EMERALD} />

      {/* Metric card 2 — watch this */}
      <rect x="8" y="78" width="304" height="44" rx="8" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="16" y="92" fill={TXT3} fontSize="8" fontWeight="900" letterSpacing="0.5">HITTING EFF.</text>
      <text x="306" y="92" fill={AMBER} fontSize="8" fontWeight="800" textAnchor="end">Close</text>
      <text x="60" y="110" fill={RED} fontSize="12" fontWeight="900" textAnchor="middle">.148</text>
      <text x="60" y="117" fill="#7f1d1d" fontSize="7" fontWeight="700" textAnchor="middle">LOSS AVG</text>
      <text x="160" y="110" fill={AMBER} fontSize="12" fontWeight="900" textAnchor="middle">.219</text>
      <text x="160" y="117" fill={TXT5} fontSize="7" fontWeight="700" textAnchor="middle">THIS MATCH</text>
      <text x="262" y="110" fill={EMERALD} fontSize="12" fontWeight="900" textAnchor="middle">.301</text>
      <text x="262" y="117" fill="#14532d" fontSize="7" fontWeight="700" textAnchor="middle">WIN AVG</text>
      <rect x="16" y="113" width="288" height="5" rx="2.5" fill="#334155" />
      <rect x="16" y="113" width="140" height="5" rx="2.5" fill={AMBER} />
    </svg>
  );
}

// ── Diagram: trends / score timeline ──────────────────────────────────────────
function DiagTimeline() {
  const pts = [0,1,1,2,2,3,4,4,5,5,6,7,7,8,9,9,10,11,12,12,13,14,15,16,17,18,18,19,20,21,22,23,24,25];
  const opp = [0,0,1,1,2,2,2,3,3,4,4,4,5,5,5,6,6,6,7,8,8,8,9,10,10,10,11,12,13,13,14,15,16,17];
  const W = 288; const H = 60; const OX = 16; const OY = 74;
  const mx = pts.length - 1;
  const path = (arr, color) => {
    const d = arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${OX + (i/mx)*W},${OY - (v/25)*H}`).join(' ');
    return <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />;
  };
  return (
    <svg viewBox="0 0 320 90" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="14" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">SCORE TIMELINE — SET 1</text>
      {[5,10,15,20,25].map(v => (
        <line key={v} x1={OX} y1={OY-(v/25)*H} x2={OX+W} y2={OY-(v/25)*H} stroke={BORDER} strokeWidth="0.5" strokeDasharray="2 3" />
      ))}
      {path(pts, PRIMARY)}
      {path(opp, TXT5)}
      <circle cx={OX + W} cy={OY - (25/25)*H} r="3" fill={EMERALD} />
      <circle cx={OX + W} cy={OY - (17/25)*H} r="3" fill={RED} />
      <text x="310" y={OY-(25/25)*H+4} fill={EMERALD} fontSize="8" fontWeight="700" textAnchor="end">25</text>
      <text x="310" y={OY-(17/25)*H+4} fill={RED} fontSize="8" fontWeight="700" textAnchor="end">18</text>
    </svg>
  );
}

// ── Diagram: stat table row ────────────────────────────────────────────────────
function DiagStatTable() {
  const rows = [
    { name: 'Harris', sa: '18', ace: '3', se: '1', k: '14', hit: '.341', apr: '—',  ver: '+22.1', verColor: EMERALD },
    { name: 'Kim',    sa: '16', ace: '2', se: '2', k: '2',  hit: '.180', apr: '2.6',ver: '+14.8', verColor: EMERALD },
    { name: 'Patel',  sa: '4',  ace: '0', se: '0', k: '8',  hit: '.290', apr: '—',  ver: '+11.2', verColor: LIME    },
  ];
  const cols = ['Player','SA','ACE','SE','K','HIT%','APR','VER'];
  const cw   = [72, 24, 28, 24, 24, 36, 32, 44];
  let cx = 4;
  const xs = cw.map(w => { const x = cx; cx += w; return x; });
  return (
    <svg viewBox="0 0 320 96" className="w-full rounded-xl" style={{ background: SURFACE }}>
      {cols.map((c, i) => (
        <text key={c} x={xs[i] + (i === 0 ? 4 : cw[i]/2)} y="14"
          fill={TXT5} fontSize="7" fontWeight="700"
          textAnchor={i === 0 ? 'start' : 'middle'} letterSpacing="0.5">{c}</text>
      ))}
      <line x1="4" y1="18" x2="316" y2="18" stroke={BORDER} strokeWidth="0.5" />
      {rows.map((r, ri) => {
        const y = 32 + ri * 22;
        const vals = [r.name, r.sa, r.ace, r.se, r.k, r.hit, r.apr, r.ver];
        return (
          <g key={r.name}>
            {ri % 2 !== 0 && <rect x="4" y={y - 12} width="312" height="22" rx="3" fill="rgba(255,255,255,0.02)" />}
            {vals.map((v, i) => (
              <text key={i} x={xs[i] + (i === 0 ? 4 : cw[i]/2)} y={y}
                fill={i === 7 ? r.verColor : i === 0 ? TXT : TXT3}
                fontSize={i === 0 ? 8.5 : 8} fontWeight={i === 0 ? '600' : '400'}
                textAnchor={i === 0 ? 'start' : 'middle'}>{v}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function HelpMatchSummaryPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Match Summary Guide" backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Match Summary is where post-game analysis lives. It opens automatically after the final set and is always accessible by tapping a completed match on the Home or History screen. This guide walks through every tab so you know exactly where to look for the data you need.
          </p>
        </div>

        <Step number={1} title="Score header & set breakdown"
          note="At the top you'll see the opponent name, a W or L badge, the final set score, and a chip for each set showing that set's point score. Tap any set chip to filter all stat tabs below to that set only — useful for isolating a bad third set from an otherwise strong performance.">
          <DiagScoreHeader />
        </Step>

        <Step number={2} title="Navigate tabs — the full menu"
          note="A scrollable tab bar sits below the header. Slide left to reveal all tabs: Scoring, Report, Insights, Trends, Serving, Passing, Attacking, Setting, Blocking, Defense, VER, Compare, and Opp. Each tab recalculates instantly if you've filtered to a single set.">
          <DiagTabBar />
        </Step>

        <Step number={3} title="Scoring tab — point quality & timeline"
          note="The Scoring tab shows how your points were earned: kills, aces, blocks, and opponent errors. The Point Quality panel separates earned points (your team won the rally) from gifted points (opponent error). A healthy match has 60%+ earned points. Below that, a Team vs Opp comparison shows head-to-head efficiency in every category.">
        </Step>

        <Step number={4} title="Report tab — letter grades"
          note="The Report tab grades each phase of the game (Serving, Passing, Attacking, Blocking, Defense) with a letter grade from A to F, plus an overall grade. Grades are calculated against internal thresholds so they reflect real volleyball standards — not just relative performance. A C in Attacking means something specific and actionable, not just 'below your average.'">
          <DiagReportCard />
        </Step>

        <Step number={5} title="Insights tab — this match vs your averages"
          note="Insights shows 12 key metrics for this specific match and positions each one between your season loss average (left, red) and season win average (right, green). The animated bar shows exactly how close you were to your winning benchmark. Requires at least 2 wins and 2 losses in the season to populate.">
          <DiagInsightsCard />
        </Step>

        <Step number={6} title="Trends tab — score timeline & win probability"
          note="The Trends tab has three sub-views. TRENDS shows a set-by-set score timeline charting both teams' scoring momentum. ROTATION shows a radar chart of SO% and BP% by rotation for this match. WIN PROB shows a live rally-by-rally win probability graph — you can see exactly which stretch of rallies in a set swung the match.">
          <DiagTimeline />
        </Step>

        <Step number={7} title="Stat tabs — individual category breakdowns"
          note="Each stat tab (Serving, Passing, Attacking, Setting, Blocking, Defense, VER) shows a full player stat table sorted by that category. Tap any column header to sort. Tap a player's name to open their full season report card. The Totals row at the bottom summarizes the team.">
          <DiagStatTable />
        </Step>

        <Step number={8} title="Compare tab — head-to-head with the opponent"
          note="Compare renders a side-by-side efficiency comparison between your team and this specific opponent. Categories include serving, attacking, blocking, and passing. Useful for scouting context — if their ACE% was 12% against you, that's a tendency to note before a rematch." />

        <Step number={9} title="Exporting this match"
          note="The action menu (⋮ or share icon at the top) offers three exports: PDF stat sheet (formatted for printing or sending to parents), CSV (spreadsheet-friendly raw data), and MaxPreps CSV (ready to upload to maxpreps.com). You can also share a match result card as an image — tap Share Card to generate it." />

        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips & notes</p>
          {[
            ['Set filter stacks across all tabs', 'When you tap a set chip to filter, every stat tab reflects that set only — including Insights, Rotation, and the player tables. Tap the chip again or tap a different one to change scope.'],
            ['Coach notes field', 'Below the tab bar, there is a Coach Notes text field. Notes auto-save after a short delay and persist forever. Use it for context you want to remember at end-of-season review: opponent tendencies, substitution notes, or anything the stats don\'t capture.'],
            ['Scouting auto-populate', 'After a match is completed, the app offers to auto-populate opponent scouting notes from that game\'s stats — ace count, attack patterns, blocking presence. Tap Review to accept, edit, or discard each suggestion before saving.'],
            ['Revise Set Scores', 'If you manually entered scores (rather than recording contacts), use the Revise Set button to correct any set scores. This does not affect contact stats.'],
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
