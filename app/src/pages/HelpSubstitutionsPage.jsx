import { PageHeader } from '../components/layout/PageHeader';

const BG      = '#000000';
const SURFACE = '#1e293b';
const SURFACE2= '#0f172a';
const BORDER  = '#334155';
const TXT     = '#f8fafc';
const TXT4    = '#94a3b8';
const TXT5    = '#64748b';
const PRIMARY = '#f97316';
const EMERALD = '#34d399';
const BLUE    = '#60a5fa';

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

function DiagActionBar() {
  const btns = ['↺ ROT', '↻ ROT', 'UNDO', 'SUB 2/18', '≡'];
  return (
    <svg viewBox="0 0 320 48" className="w-full rounded-xl" style={{ background: SURFACE2 }}>
      {btns.map((label, i) => {
        const isSub = i === 3;
        const x = 4 + i * 63;
        return (
          <g key={label}>
            <rect x={x} y="6" width="58" height="36" rx="8"
              fill={isSub ? `${PRIMARY}22` : SURFACE}
              stroke={isSub ? PRIMARY : BORDER} strokeWidth={isSub ? 1.5 : 1} />
            <text x={x + 29} y="28" fill={isSub ? PRIMARY : TXT4}
              fontSize={isSub ? 8 : 8} fontWeight={isSub ? '900' : '600'}
              textAnchor="middle">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DiagSubModal() {
  return (
    <svg viewBox="0 0 320 200" className="w-full rounded-xl" style={{ background: SURFACE2 }}>
      <text x="160" y="18" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2" textAnchor="middle">SUBSTITUTION</text>

      {/* Player OUT grid */}
      <text x="16" y="32" fill={BLUE} fontSize="7" fontWeight="900" letterSpacing="1">PLAYER OUT (ON COURT)</text>
      {[
        { pos: 'S4', jersey: '12', name: 'Harris', selected: true  },
        { pos: 'S3', jersey: '7',  name: 'Kim',    selected: false },
        { pos: 'S2', jersey: '4',  name: 'Jones',  selected: false },
        { pos: 'S5', jersey: '9',  name: 'Lee',    selected: false },
        { pos: 'S6', jersey: '1',  name: 'Patel',  selected: false },
        { pos: 'S1', jersey: '3',  name: 'Flores', selected: false },
      ].map(({ pos, jersey, name, selected }, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 8 + col * 102;
        const y = 40 + row * 34;
        return (
          <g key={name}>
            <rect x={x} y={y} width="96" height="28" rx="6"
              fill={selected ? `${BLUE}33` : SURFACE}
              stroke={selected ? BLUE : BORDER} strokeWidth={selected ? 1.5 : 1} />
            <text x={x + 8} y={y + 12} fill={TXT5} fontSize="7">{pos}</text>
            <text x={x + 8} y={y + 23} fill={selected ? TXT : TXT4} fontSize="8.5" fontWeight={selected ? '700' : '500'}>
              #{jersey} {name}
            </text>
          </g>
        );
      })}

      {/* Arrow */}
      <text x="160" y="120" fill={TXT5} fontSize="12" textAnchor="middle">↕</text>

      {/* Player IN */}
      <text x="16" y="136" fill={EMERALD} fontSize="7" fontWeight="900" letterSpacing="1">PLAYER IN (BENCH)</text>
      {[
        { jersey: '15', name: 'Rivera',  selected: true  },
        { jersey: '22', name: 'Nguyen',  selected: false },
        { jersey: '8',  name: 'Torres',  selected: false },
      ].map(({ jersey, name, selected }, i) => {
        const x = 8 + i * 102;
        return (
          <g key={name}>
            <rect x={x} y="142" width="96" height="28" rx="6"
              fill={selected ? `${EMERALD}22` : SURFACE}
              stroke={selected ? EMERALD : BORDER} strokeWidth={selected ? 1.5 : 1} />
            <text x={x + 8} y="161" fill={selected ? TXT : TXT4} fontSize="8.5" fontWeight={selected ? '700' : '500'}>
              #{jersey} {name}
            </text>
          </g>
        );
      })}

      {/* Confirm button */}
      <rect x="8" y="178" width="304" height="18" rx="6" fill={PRIMARY} />
      <text x="160" y="191" fill="black" fontSize="8" fontWeight="900" textAnchor="middle">Confirm Substitution</text>
    </svg>
  );
}

function DiagLiberoBox() {
  return (
    <svg viewBox="0 0 320 64" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="160" y="14" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2" textAnchor="middle">LIBERO BOX (SCORE HEADER — TOP RIGHT)</text>
      <rect x="8" y="22" width="304" height="36" rx="8" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />

      {/* On court indicator */}
      <circle cx="28" cy="40" r="6" fill={EMERALD} />
      <text x="44" y="36" fill={TXT} fontSize="8" fontWeight="700">#3 Patel</text>
      <text x="44" y="48" fill={TXT5} fontSize="7">On Court</text>

      {/* SUB OUT button */}
      <rect x="198" y="28" width="112" height="24" rx="6" fill={`${PRIMARY}22`} stroke={PRIMARY} strokeWidth="1" />
      <text x="254" y="44" fill={PRIMARY} fontSize="8" fontWeight="900" textAnchor="middle">SUB OUT LIBERO</text>
    </svg>
  );
}

export function HelpSubstitutionsPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Substitutions & Lineup Changes" backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            How to make standard substitutions, how the sub counter works, libero swaps, and what happens when a player's sub slot is exhausted. All of this is managed from the live match screen.
          </p>
        </div>

        <Step number={1} title="Opening the substitution panel">
          <DiagActionBar />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            The action bar runs across the bottom of the live match screen. Tap <span className="text-white font-semibold">SUB</span> to open the substitution modal. The counter next to SUB shows how many subs have been used this set out of the maximum (e.g. 2/18).
          </p>
        </Step>

        <Step number={2} title="Making a substitution">
          <DiagSubModal />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            The top grid shows the 6 players currently on court. Tap the player coming <span className="text-white font-semibold">OUT</span> (they highlight blue). The bottom list shows eligible bench players. Tap the player coming <span className="text-white font-semibold">IN</span> (they highlight green). Then tap <span className="text-white font-semibold">Confirm Substitution</span>.
          </p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            The incoming player takes the same court position and rotation slot as the outgoing player. Stats recorded after the sub are attributed to the new player.
          </p>
        </Step>

        <Step number={3} title="Sub limits — NFHS vs. club rules"
          note="The default sub limit is 18 per set, which follows club/collegiate conventions. Strict NFHS (high school) rules allow 12 subs per set. If your league uses 12, this can be changed in Settings → Match Settings → Max Subs Per Set. The counter in the action bar respects whichever limit is configured." />

        <Step number={4} title="Exhausted sub slots"
          note="Once a player has been subbed out, they are marked 'Sub used' and grayed out in the Player OUT grid. This means they can only re-enter the game in the same position they left — the app enforces this by preventing them from being selected as the outgoing player again. If a player shows 'Sub used', plan around it." />

        <Step number={5} title="Libero swaps — free and automatic">
          <DiagLiberoBox />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Libero swaps are handled separately from the sub counter — they are free under both NFHS and club rules and do not count against the 18/12 limit. Use the <span className="text-white font-semibold">Libero Box</span> in the top-right of the score header to swap the libero in or out.
          </p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            The libero box is grayed out when no eligible back-row middle is on court (per NFHS rules). The green dot means the libero is currently on court; gray means they are on the bench. The libero <span className="text-white font-semibold">can</span> serve in the S1 position — no restriction is enforced.
          </p>
        </Step>

        <Step number={6} title="Undoing a substitution"
          note="Tap UNDO in the action bar to reverse the last action, which includes substitutions. UNDO steps back one action at a time, so if a point was scored after the sub, you'll need to undo the point first, then undo the sub." />

        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips</p>
          {[
            ['Subs reset each set', 'The sub counter resets to 0 at the start of every new set. Exhausted player flags also reset — every player is eligible again.'],
            ['Position labels carry over', 'When a sub enters, they inherit the position label (OH, MB, etc.) of the player they replaced. You can edit position labels mid-match by tapping the pencil icon next to a player in the sub modal.'],
            ['Libero auto-swaps on rotation', 'If auto-libero tracking is enabled and the libero is on court when a serve sideout moves them to a front row position, the app will prompt you to swap them out per NFHS rules.'],
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
