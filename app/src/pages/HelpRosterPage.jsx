import { PageHeader } from '../components/layout/PageHeader';
import { BG, SURFACE, SURFACE2, BORDER, TXT, TXT4, TXT5, PRIMARY, BLUE, EMERALD, HelpStep as Step } from './helpTheme';

function DiagPlayerCard() {
  return (
    <svg viewBox="0 0 320 100" className="w-full rounded-xl" style={{ background: SURFACE }}>
      {[
        { jersey: '12', name: 'Harris, A.', pos: 'OH',  active: true  },
        { jersey: '7',  name: 'Kim, J.',    pos: 'S',   active: true  },
        { jersey: '3',  name: 'Patel, R.',  pos: 'L',   active: true, libero: true },
        { jersey: '21', name: 'Torres, M.', pos: 'MB',  active: false },
      ].map(({ jersey, name, pos, active, libero }, i) => (
        <g key={name}>
          <rect x="8" y={6 + i * 22} width="304" height="20" rx="5"
            fill={active ? SURFACE2 : 'rgba(255,255,255,0.02)'}
            stroke={active ? BORDER : 'rgba(255,255,255,0.04)'} strokeWidth="1" />
          <text x="18" y={20 + i * 22}
            fill={active ? PRIMARY : TXT5} fontSize="9" fontWeight="900">#{jersey}</text>
          <text x="50" y={20 + i * 22}
            fill={active ? TXT : TXT5} fontSize="9" fontWeight={active ? '600' : '400'}>{name}</text>
          {libero && (
            <text x="160" y={20 + i * 22} fill={BLUE} fontSize="8" fontWeight="700">LIBERO</text>
          )}
          <text x="230" y={20 + i * 22}
            fill={active ? TXT4 : TXT5} fontSize="8" fontWeight="600">{pos}</text>
          <text x="290" y={20 + i * 22}
            fill={active ? EMERALD : TXT5} fontSize="7" fontWeight="700"
            textAnchor="middle">{active ? 'Active' : 'Inactive'}</text>
        </g>
      ))}
    </svg>
  );
}

function DiagPositions() {
  const positions = [
    { code: 'OH',  full: 'Outside Hitter',  color: PRIMARY  },
    { code: 'OPP', full: 'Opposite / Right Side', color: PRIMARY },
    { code: 'MB',  full: 'Middle Blocker',  color: BLUE     },
    { code: 'S',   full: 'Setter',          color: EMERALD  },
    { code: 'L',   full: 'Libero',          color: BLUE     },
    { code: 'DS',  full: 'Defensive Specialist', color: TXT4 },
    { code: 'RS',  full: 'Right Side (DS)', color: TXT4     },
  ];
  return (
    <svg viewBox="0 0 320 118" className="w-full rounded-xl" style={{ background: SURFACE }}>
      {positions.map(({ code, full, color }, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 8 + col * 158;
        const y = 18 + row * 26;
        return (
          <g key={code}>
            <rect x={x} y={y - 12} width="150" height="22" rx="5"
              fill={SURFACE2} stroke={BORDER} strokeWidth="0.8" />
            <text x={x + 8} y={y + 2} fill={color} fontSize="9" fontWeight="900">{code}</text>
            <text x={x + 38} y={y + 2} fill={TXT4} fontSize="8" fontWeight="500">{full}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function HelpRosterPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Managing Your Roster" backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your roster lives inside each team. Every player you record stats for must be on a team's roster first. This guide covers adding, editing, deactivating, and understanding player positions.
          </p>
        </div>

        <Step number={1} title="Getting to the roster"
          note="Tap Teams in the bottom nav, then tap your team's name. The Team Detail page shows your full roster — active players listed first, sorted by jersey number. Tap any player's row to edit their details." />

        <Step number={2} title="Adding a player">
          <p className="text-sm text-slate-400 leading-relaxed">
            Tap the <span className="text-white font-semibold">+ Add Player</span> button at the bottom of the roster. Fill in:
          </p>
          <div className="mt-3 space-y-2">
            {[
              ['Jersey #', 'Must be unique within the team. Numbers only.'],
              ['Name', 'Use a consistent format (Last, First or First Last) — it appears everywhere stats are displayed.'],
              ['Position', 'Select from OH, OPP, MB, S, L, DS, or RS. See the position guide below.'],
            ].map(([field, desc]) => (
              <div key={field} className="flex gap-2">
                <span className="text-sm font-semibold shrink-0" style={{ color: PRIMARY }}>{field}</span>
                <span className="text-sm text-slate-400">{desc}</span>
              </div>
            ))}
          </div>
        </Step>

        <Step number={3} title="Active vs. inactive players">
          <DiagPlayerCard />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Active players appear in lineup builders and stat tables. Inactive players are hidden from lineups but their historical stats are preserved. When a player quits, graduates, or sits out a season, deactivate them rather than deleting — deleting would orphan all their recorded contacts.
          </p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            To deactivate: tap the player, scroll to the bottom, and tap <span className="text-white font-semibold">Deactivate</span>. Their stats remain in every match they played.
          </p>
        </Step>

        <Step number={4} title="Designating the libero"
          note="The libero is set per-match at match setup, not on the roster — so you can designate a different player in different matches. To make the designation automatic, set a default libero on the team. The app will auto-detect the libero position label 'L' when loading the live match screen and assign the libero box accordingly." />

        <Step number={5} title="Position codes reference">
          <DiagPositions />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Positions affect lineup building and some stat calculations. The libero position (L) unlocks the Libero Box on the live match screen. DS and RS are tracked identically to non-attacking defenders; use them to distinguish serve-receive specialists from blockers.
          </p>
        </Step>

        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips</p>
          {[
            ['Jersey numbers drive identification', 'The app uses jersey number as the visible identifier everywhere — scorecards, PDF exports, and the live court grid. Keep them accurate.'],
            ['Name format matters for exports', 'MaxPreps CSV exports use the player name field directly. Match the format MaxPreps expects for your school to avoid re-mapping after upload.'],
            ['You can edit mid-season', 'Changing a jersey number or name applies retroactively everywhere. Safe to correct typos at any time.'],
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
