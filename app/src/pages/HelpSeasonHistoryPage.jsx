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

function DiagSeasonCard() {
  return (
    <svg viewBox="0 0 320 110" className="w-full rounded-xl" style={{ background: SURFACE }}>
      {/* Season card */}
      <rect x="8" y="8" width="304" height="94" rx="10" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="22" y="26" fill={TXT} fontSize="11" fontWeight="900">2023–24 Season</text>
      <text x="22" y="40" fill={TXT5} fontSize="8">Varsity · Coach Martinez</text>

      {/* Record */}
      <text x="22" y="58" fill={EMERALD} fontSize="18" fontWeight="900">24</text>
      <text x="46" y="58" fill={TXT5} fontSize="14" fontWeight="700">–</text>
      <text x="58" y="58" fill={RED} fontSize="18" fontWeight="900">8</text>
      <text x="80" y="58" fill={TXT5} fontSize="8" fontWeight="600">W–L</text>

      {/* Playoffs badge */}
      <rect x="180" y="44" width="120" height="22" rx="6" fill="rgba(251,191,36,0.12)" stroke="rgba(251,191,36,0.4)" strokeWidth="1" />
      <text x="240" y="58" fill={AMBER} fontSize="8" fontWeight="800" textAnchor="middle">🏆 State Qualifier · #4 Seed</text>

      {/* Playoff rounds */}
      <text x="22" y="78" fill={TXT5} fontSize="7" fontWeight="700" letterSpacing="1">PLAYOFFS</text>
      <text x="22" y="92" fill={EMERALD} fontSize="8" fontWeight="700">W Regional</text>
      <text x="90" y="92" fill={EMERALD} fontSize="8" fontWeight="700">W Sectional</text>
      <text x="168" y="92" fill={RED} fontSize="8" fontWeight="700">L Super-Sect.</text>
      <text x="250" y="92" fill={TXT5} fontSize="8" fontWeight="700">vs. Loyola</text>
    </svg>
  );
}

function DiagPlayoffRound() {
  return (
    <svg viewBox="0 0 320 130" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="16" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="1.5">PLAYOFF ROUND ENTRY</text>

      {/* Round name row */}
      <rect x="8"   y="22" width="186" height="28" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="18"  y="40" fill={TXT4} fontSize="8">Round  (e.g. Regional)</text>
      <rect x="202" y="22" width="50" height="28" rx="6" fill="#14532d" stroke="#22c55e" strokeWidth="1" />
      <text x="227" y="40" fill={EMERALD} fontSize="10" fontWeight="900" textAnchor="middle">W</text>
      <rect x="260" y="22" width="50" height="28" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="285" y="40" fill={TXT5} fontSize="10" fontWeight="900" textAnchor="middle">L</text>

      {/* Opponent row */}
      <rect x="8"   y="58" width="174" height="28" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="18"  y="75" fill={TXT} fontSize="8.5">Lincoln-Way Central</text>
      <text x="18"  y="61" fill={TXT5} fontSize="7" fontWeight="700">Opponent</text>

      <rect x="190" y="58" width="52" height="28" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="216" y="61" fill={TXT5} fontSize="7" fontWeight="700">Seed</text>
      <text x="216" y="75" fill={TXT4} fontSize="8.5" textAnchor="middle">#3</text>

      <rect x="250" y="58" width="60" height="28" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="280" y="61" fill={TXT5} fontSize="7" fontWeight="700">Score</text>
      <text x="280" y="75" fill={EMERALD} fontSize="8.5" textAnchor="middle">2–1</text>

      {/* Add round button */}
      <rect x="8" y="94" width="304" height="28" rx="6" fill="none"
        stroke={BORDER} strokeWidth="1" strokeDasharray="4 3" />
      <text x="160" y="112" fill={TXT5} fontSize="8" textAnchor="middle">+ Add Round</text>
    </svg>
  );
}

export function HelpSeasonHistoryPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Season History & Playoff Entry" backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            The History page is a season-by-season record of your program — win/loss records, playoff runs, coach info, rankings, and conference results. It's where you log past seasons that predate the app and where playoff bracket results get entered after each round.
          </p>
        </div>

        <Step number={1} title="Where to find it"
          note="Tap History in the bottom nav bar. Each row represents one season. Tap a season card to expand it and see the full playoff bracket, record, and notes. Tap the pencil icon on any card to edit it." />

        <Step number={2} title="How seasons get created"
          note="Seasons are created automatically when you start recording matches for a team (via the Seasons tab). The History page pulls from those season records. You can also tap '+ Add Historical Season' to manually log a past season without any match data." />

        <Step number={3} title="What each field means">
          <div className="space-y-2">
            {[
              ['Season Year', 'The school year, e.g. "2023–24". Used as the label everywhere.'],
              ['Record (W–L)', 'Overall win-loss for the season. Auto-populated from match data if matches were recorded; enter manually for historical seasons.'],
              ['Conference', 'Conference record can be entered separately from the overall record.'],
              ['Our Playoff Seed', 'Your team\'s seeding entering the postseason. Shown prominently on the season card.'],
              ['Playoff Result / Notes', 'Free-text field for anything the bracket doesn\'t capture — a state finish, memorable context, or a note for future reference.'],
            ].map(([field, desc]) => (
              <div key={field} className="flex gap-2">
                <span className="text-sm font-semibold shrink-0 leading-relaxed" style={{ color: PRIMARY }}>{field}</span>
                <span className="text-sm text-slate-400 leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </Step>

        <Step number={4} title="Adding playoff rounds">
          <DiagSeasonCard />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Inside the edit window, scroll to the <span className="text-white font-semibold">Playoff Rounds</span> section and tap <span className="text-white font-semibold">+ Add Round</span> for each game. Add rounds in order from earliest to latest (Regional → Sectional → etc.).
          </p>
        </Step>

        <Step number={5} title="Filling in a playoff round">
          <DiagPlayoffRound />
          <div className="space-y-2 mt-3">
            {[
              ['Round', 'The stage name — Regional, Sectional, Super-Sectional, Quarterfinal, Semifinal, State Championship, or any custom label. Suggestions appear as you type.'],
              ['W / L toggle', 'Tap W or L to record the result of that round.'],
              ['Opponent', 'The full school name of the opponent in that round.'],
              ['Seed', 'The opponent\'s seeding (optional). Shown as #3 on the season card.'],
              ['Score', 'Set score in the format 2–1 or 3–0. Shown next to the round label.'],
            ].map(([field, desc]) => (
              <div key={field} className="flex gap-2">
                <span className="text-sm font-semibold shrink-0 leading-relaxed" style={{ color: PRIMARY }}>{field}</span>
                <span className="text-sm text-slate-400 leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </Step>

        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips</p>
          {[
            ['Order rounds top-to-bottom', 'Rounds display in the order they were added — earliest first looks cleanest. If you add them out of order, remove and re-add to fix the sequence.'],
            ['Save before navigating away', 'The edit window has an explicit Save button. Changes are not auto-saved here — tap Save before closing the modal.'],
            ['Historical seasons without match data', 'If you add a historical season manually, the win/loss record and rankings are the only data. Tap + Add Historical Season from the History tab header to start a blank entry.'],
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
