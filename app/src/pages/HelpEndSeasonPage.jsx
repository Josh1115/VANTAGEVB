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
const DANGER  = '#ef4444';

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

// ── Diagram: End Season button locations ──────────────────────────────────────
function DiagEndSeasonLocations() {
  return (
    <svg viewBox="0 0 320 200" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="16" fill={TXT5} fontSize="7.5" fontWeight="900" letterSpacing="1.5">3 PLACES TO END A SEASON</text>

      {/* --- History Page card --- */}
      <rect x="8" y="24" width="304" height="50" rx="8" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="18" y="40" fill={TXT5} fontSize="7" fontWeight="700" letterSpacing="1">HISTORY PAGE — CURRENT SEASON CARD</text>
      <text x="18" y="54" fill={TXT} fontSize="9" fontWeight="800">2025</text>
      <rect x="44" y="45" width="38" height="13" rx="4" fill="rgba(249,115,22,0.15)" stroke="rgba(249,115,22,0.4)" strokeWidth="1" />
      <text x="63" y="55" fill={PRIMARY} fontSize="7" fontWeight="900" textAnchor="middle">CURRENT</text>
      <rect x="192" y="44" width="108" height="16" rx="4" fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.35)" strokeWidth="1" />
      <text x="246" y="55" fill={RED} fontSize="7.5" fontWeight="700" textAnchor="middle">End Season</text>

      {/* --- Season Detail Page --- */}
      <rect x="8" y="82" width="304" height="50" rx="8" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="18" y="98" fill={TXT5} fontSize="7" fontWeight="700" letterSpacing="1">SEASON DETAIL PAGE — BELOW SCHEDULE</text>
      <text x="18" y="114" fill={TXT4} fontSize="8">Jun 5 · Libertyville</text>
      <rect x="18" y="118" width="4" height="4" rx="1" fill={TXT5} />
      <text x="26" y="124" fill={TXT5} fontSize="7">Scheduled</text>
      <rect x="152" y="110" width="152" height="18" rx="5" fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.35)" strokeWidth="1" />
      <text x="228" y="122" fill={RED} fontSize="8" fontWeight="700" textAnchor="middle">End Season</text>

      {/* --- Team Page seasons tab --- */}
      <rect x="8" y="140" width="304" height="50" rx="8" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="18" y="156" fill={TXT5} fontSize="7" fontWeight="700" letterSpacing="1">TEAM PAGE — SEASONS TAB</text>
      <text x="18" y="172" fill={TXT} fontSize="9" fontWeight="700">2024–25</text>
      <text x="70" y="172" fill={TXT5} fontSize="8">· 18 matches</text>
      <rect x="234" y="163" width="66" height="16" rx="4" fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.35)" strokeWidth="1" />
      <text x="267" y="174" fill={RED} fontSize="7.5" fontWeight="700" textAnchor="middle">End</text>
    </svg>
  );
}

// ── Diagram: Confirm dialog ───────────────────────────────────────────────────
function DiagConfirmDialog() {
  return (
    <svg viewBox="0 0 320 160" className="w-full rounded-xl" style={{ background: 'rgba(0,0,0,0.6)' }}>
      {/* Backdrop hint */}
      <rect x="0" y="0" width="320" height="160" fill="rgba(0,0,0,0.55)" />

      {/* Modal card */}
      <rect x="24" y="20" width="272" height="120" rx="14" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />

      <text x="160" y="48" fill={TXT} fontSize="11" fontWeight="900" textAnchor="middle">End Season?</text>
      <text x="160" y="64" fill={TXT4} fontSize="8" textAnchor="middle">Mark this season as complete.</text>
      <text x="160" y="74" fill={TXT4} fontSize="8" textAnchor="middle">Unplayed matches stay on the schedule</text>
      <text x="160" y="84" fill={TXT4} fontSize="8" textAnchor="middle">but the season will show as Done.</text>

      {/* Cancel */}
      <rect x="36" y="96" width="112" height="30" rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="92" y="115" fill={TXT3} fontSize="9" fontWeight="700" textAnchor="middle">Cancel</text>

      {/* Confirm */}
      <rect x="160" y="96" width="112" height="30" rx="8" fill={DANGER} />
      <text x="216" y="115" fill="#fff" fontSize="9" fontWeight="900" textAnchor="middle">End Season</text>
    </svg>
  );
}

// ── Diagram: Post-season modal ────────────────────────────────────────────────
function DiagPostSeasonModal() {
  return (
    <svg viewBox="0 0 320 230" className="w-full rounded-xl" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <rect x="0" y="0" width="320" height="230" fill="rgba(0,0,0,0.55)" />

      {/* Modal card */}
      <rect x="12" y="10" width="296" height="210" rx="16" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />

      <text x="28" y="36" fill={TXT} fontSize="11" fontWeight="900">Season Complete</text>
      <text x="28" y="50" fill={TXT4} fontSize="8.5">A couple things to wrap up:</text>

      {/* Archive Roster block */}
      <rect x="20" y="60" width="280" height="66" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="34" y="78" fill={TXT} fontSize="9" fontWeight="800">Archive Roster</text>
      <text x="34" y="90" fill={TXT5} fontSize="7.5">Move 12 active players to inactive.</text>
      <text x="34" y="100" fill={TXT5} fontSize="7.5">Players and all their stats are preserved.</text>
      <rect x="34" y="108" width="252" height="12" rx="5" fill={BORDER} />
      <text x="160" y="118" fill={TXT3} fontSize="7.5" fontWeight="700" textAnchor="middle">Archive 12 Players</text>

      {/* Season Details block */}
      <rect x="20" y="134" width="280" height="62" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1" />
      <text x="34" y="152" fill={TXT} fontSize="9" fontWeight="800">Add Season Details</text>
      <text x="34" y="164" fill={TXT5} fontSize="7.5">Log the final W/L record, coach,</text>
      <text x="34" y="174" fill={TXT5} fontSize="7.5">rankings, and playoff finish in History.</text>
      <rect x="34" y="180" width="252" height="12" rx="5" fill={BORDER} />
      <text x="160" y="190" fill={PRIMARY} fontSize="7.5" fontWeight="700" textAnchor="middle">Go to History →</text>

      {/* Done button */}
      <rect x="20" y="204" width="280" height="12" rx="6" fill={PRIMARY} />
      <text x="160" y="214" fill="#000" fontSize="8" fontWeight="900" textAnchor="middle">Done</text>
    </svg>
  );
}

// ── Diagram: Roster archive confirmation ─────────────────────────────────────
function DiagArchivedRoster() {
  return (
    <svg viewBox="0 0 320 130" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="16" fill={TXT5} fontSize="7.5" fontWeight="900" letterSpacing="1.5">AFTER ARCHIVING</text>

      {/* Archived confirmation row */}
      <rect x="8" y="24" width="304" height="36" rx="8" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="26" y="46" fill={EMERALD} fontSize="13" fontWeight="900">✓</text>
      <text x="46" y="46" fill={TXT3} fontSize="9">12 players archived</text>

      {/* Inactive roster rows */}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x="8" y={70 + i * 18} width="304" height="14" rx="4" fill={SURFACE2} stroke={BORDER} strokeWidth="0.5" />
          <circle cx="22" cy={77 + i * 18} r="4" fill={BORDER} />
          <rect x="32" y={73 + i * 18} width="60" height="7" rx="2" fill={BORDER} />
          <rect x="260" y={73 + i * 18} width="40" height="7" rx="2" fill="rgba(100,116,139,0.3)" />
          <text x="281" y={79 + i * 18} fill={TXT5} fontSize="6" fontWeight="700" textAnchor="middle">INACTIVE</text>
        </g>
      ))}
    </svg>
  );
}

// ── Diagram: DONE badge on history card ──────────────────────────────────────
function DiagDoneBadge() {
  return (
    <svg viewBox="0 0 320 90" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <rect x="8" y="8" width="304" height="74" rx="10" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />

      {/* Header */}
      <rect x="8" y="8" width="304" height="28" rx="10" fill={SURFACE} />
      <rect x="8" y="26" width="304" height="10" rx="0" fill={SURFACE} />

      <text x="22" y="27" fill={TXT} fontSize="11" fontWeight="900">2025</text>
      <text x="54" y="27" fill={TXT3} fontSize="9" fontWeight="700">18–6</text>

      {/* DONE badge */}
      <rect x="98" y="18" width="36" height="14" rx="5" fill="rgba(100,116,139,0.2)" stroke={BORDER} strokeWidth="1" />
      <text x="116" y="28" fill={TXT5} fontSize="7" fontWeight="900" textAnchor="middle">DONE</text>

      {/* Auto-filled finish */}
      <text x="22" y="52" fill={TXT5} fontSize="7" fontWeight="700">FINISH</text>
      <text x="60" y="52" fill={TXT3} fontSize="8.5" fontWeight="600">Regional Final</text>

      {/* Coach */}
      <text x="22" y="68" fill={TXT5} fontSize="7" fontWeight="700">HC</text>
      <text x="42" y="68" fill={TXT3} fontSize="8.5">Coach Hollander</text>
      <text x="184" y="68" fill={TXT5} fontSize="7" fontWeight="700">AC</text>
      <text x="200" y="68" fill={TXT3} fontSize="8.5">Coach Smith</text>
    </svg>
  );
}

// ── Diagram: History page details form ───────────────────────────────────────
function DiagHistoryForm() {
  return (
    <svg viewBox="0 0 320 200" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="16" fill={TXT5} fontSize="7.5" fontWeight="900" letterSpacing="1.5">SEASON DETAILS FORM</text>

      {/* Head Coach field */}
      <text x="16" y="32" fill={TXT4} fontSize="7" fontWeight="700">Head Coach</text>
      <rect x="8" y="36" width="148" height="22" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="18" y="51" fill={TXT} fontSize="9">Coach Hollander</text>

      <text x="168" y="32" fill={TXT4} fontSize="7" fontWeight="700">Tenure Year #</text>
      <rect x="164" y="36" width="148" height="22" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="174" y="51" fill={TXT4} fontSize="9">3</text>

      {/* W / L fields */}
      <text x="16" y="74" fill={TXT4} fontSize="7" fontWeight="700">Wins</text>
      <rect x="8" y="78" width="96" height="22" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="18" y="93" fill={EMERALD} fontSize="9" fontWeight="700">18</text>

      <text x="116" y="74" fill={TXT4} fontSize="7" fontWeight="700">Losses</text>
      <rect x="108" y="78" width="96" height="22" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="118" y="93" fill={RED} fontSize="9" fontWeight="700">6</text>

      <text x="216" y="74" fill={TXT4} fontSize="7" fontWeight="700">Games</text>
      <rect x="212" y="78" width="100" height="22" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="222" y="93" fill={TXT4} fontSize="9">24</text>

      {/* Playoff Seed */}
      <text x="16" y="118" fill={TXT4} fontSize="7" fontWeight="700">Our Playoff Seed</text>
      <rect x="8" y="122" width="304" height="22" rx="6" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      <text x="18" y="137" fill={TXT4} fontSize="9">#2</text>

      {/* Finish (auto-filled highlight) */}
      <text x="16" y="162" fill={TXT4} fontSize="7" fontWeight="700">Finish</text>
      <rect x="8" y="166" width="304" height="22" rx="6" fill={SURFACE2} stroke="rgba(249,115,22,0.5)" strokeWidth="1.5" />
      <text x="18" y="181" fill={PRIMARY} fontSize="9" fontWeight="600">Regional Final</text>
      <text x="262" y="181" fill={TXT5} fontSize="7">auto-filled</text>
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function HelpEndSeasonPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="How to End a Season" backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        {/* Intro */}
        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            When your season is over — whether you lost in the playoffs or the year has simply ended — use the End Season feature to officially close it out. This unlocks post-season steps: archiving your roster for the new year and logging final season details in History.
          </p>
        </div>

        {/* Step 1 */}
        <Step number={1} title="Find the End Season button">
          <DiagEndSeasonLocations />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            The button appears in three places — use whichever is most convenient. All three do the same thing.
          </p>
          <div className="space-y-2 mt-3">
            {[
              ['History Page', 'Inside the CURRENT season card at the top of the History tab. Tap the red "End Season" button next to the CURRENT badge.'],
              ['Season Detail Page', 'Scroll to the very bottom of the season schedule. The button sits below the last match entry.'],
              ['Team Page', 'Go to your team → tap the Seasons tab → tap "End" on the row for the current season.'],
            ].map(([place, desc]) => (
              <div key={place} className="flex gap-2">
                <span className="text-sm font-semibold shrink-0 leading-relaxed" style={{ color: PRIMARY }}>{place}</span>
                <span className="text-sm text-slate-400 leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </Step>

        {/* Step 2 */}
        <Step number={2} title="Confirm the action">
          <DiagConfirmDialog />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            A confirmation dialog appears. Tap <span className="text-white font-semibold">End Season</span> to proceed. Any unplayed scheduled matches stay on the schedule — nothing is deleted. The season is simply marked as complete.
          </p>
        </Step>

        {/* Step 3 */}
        <Step number={3} title="Complete the post-season checklist">
          <DiagPostSeasonModal />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            A checklist modal appears with two steps to wrap things up. You can do them in any order or skip them for now — tap <span className="text-white font-semibold">Done</span> to dismiss and come back later.
          </p>
        </Step>

        {/* Step 4 */}
        <Step number={4} title="Archive your roster">
          <DiagArchivedRoster />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Tap <span className="text-white font-semibold">Archive Roster</span> to move all active players to inactive status. This clears the active roster so you can build a fresh one for next season. Every player's stats and history are fully preserved — nothing is lost.
          </p>
          <div className="mt-3 flex gap-2 p-3 rounded-lg bg-slate-800 border border-slate-700">
            <span style={{ color: PRIMARY }} className="text-sm shrink-0">›</span>
            <p className="text-sm text-slate-400">
              Players can be reactivated individually at any time from the Team → Roster tab if someone returns next season.
            </p>
          </div>
        </Step>

        {/* Step 5 */}
        <Step number={5} title="Log your final season details">
          <DiagHistoryForm />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Tap <span className="text-white font-semibold">Go to History →</span> to open the season's edit form. Fill in the head coach, win/loss record, playoff seed, and any rankings. The <span className="font-semibold" style={{ color: PRIMARY }}>Finish</span> field is auto-filled from your last completed playoff match — edit it if needed.
          </p>
        </Step>

        {/* Step 6 */}
        <Step number={6} title="Season is now marked Done">
          <DiagDoneBadge />
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            The season card in History switches from an orange <span className="font-semibold" style={{ color: PRIMARY }}>CURRENT</span> badge to a gray <span className="text-slate-300 font-semibold">DONE</span> badge. Coach win/loss records and program totals update to include this season. Active record glow effects in the Records page turn off.
          </p>
        </Step>

        {/* Tips */}
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips</p>
          {[
            ['You can end a season with unplayed matches', 'If your playoff run ended early, any remaining scheduled matches simply stay on the schedule as unplayed. They won\'t affect records or stats.'],
            ['Playoff finish is inferred automatically', 'The app reads your last completed playoff match and fills in the Finish field — e.g., "Regional Final" if you lost in that round, or "Won Sectional" if you won. You can always override it.'],
            ['Archiving is reversible', 'Archived players are just set to inactive — they still exist with all their stats intact. You can reactivate any player from the Roster tab when they return.'],
            ['Come back later', 'The post-season checklist doesn\'t have to be completed right away. You can dismiss it and return to the History page to fill in details whenever you\'re ready.'],
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
