import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from '../ui/Drawer';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ResetRotationModal } from './ResetRotationModal';
import { useMatchStore } from '../../store/matchStore';
import { useShallow } from 'zustand/react/shallow';
import { db } from '../../db/schema';
import { SIDE } from '../../constants';
import { STORAGE_KEYS, getBoolStorageDefaultTrue, setBoolStorage } from '../../utils/storage';

const JERSEY_COLORS = [
  { id: 'black',  label: 'Black',  bg: '#111827', border: '#374151' },
  { id: 'white',  label: 'White',  bg: '#f8fafc', border: '#94a3b8' },
  { id: 'gray',   label: 'Gray',   bg: '#94a3b8', border: '#64748b' },
  { id: 'red',    label: 'Red',    bg: '#dc2626', border: '#ef4444' },
  { id: 'orange', label: 'Orange', bg: '#ea580c', border: '#e8530b' },
  { id: 'yellow', label: 'Yellow', bg: '#ca8a04', border: '#eab308' },
  { id: 'green',  label: 'Green',  bg: '#16a34a', border: '#22c55e' },
  { id: 'blue',   label: 'Blue',   bg: '#1d4ed8', border: '#3b82f6' },
  { id: 'purple', label: 'Purple', bg: '#7c3aed', border: '#a855f7' },
  { id: 'pink',   label: 'Pink',   bg: '#db2777', border: '#ec4899' },
];

const COURT_VIEW_OPTIONS = [
  { id: 'smart',  label: 'Smart',  desc: 'Players slide into serve-receive and on-court positions automatically' },
  { id: 'base',   label: 'Base',   desc: 'Serving order until the ball is live, then simple base positions, then back' },
  { id: 'simple', label: 'Simple', desc: 'Players never move — always raw serving order' },
];

// ── Small building blocks for a consistent, card-based menu ──────────────────
function SectionLabel({ children, className = 'text-slate-500' }) {
  return <div className={`px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wider ${className}`}>{children}</div>;
}

// `grow`: on wide screens the card stretches to fill its column (rows share the
// extra height) so the two menu columns end at the same line.
function MenuCard({ title, grow = false, children }) {
  return (
    <div className={grow ? 'md:flex-1 flex flex-col' : ''}>
      <SectionLabel>{title}</SectionLabel>
      <div className={`rounded-xl bg-slate-800/60 border border-slate-700/60 divide-y divide-slate-700/60 overflow-hidden ${grow ? 'md:flex-1 flex flex-col md:[&>*]:flex-1' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function MenuRow({ icon, label, sub, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700/40 active:bg-slate-700/60">
      <span className="w-5 h-5 text-slate-400 shrink-0">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        {sub && <span className="block text-[11px] text-slate-500">{sub}</span>}
      </span>
      <span className="ml-auto text-slate-500">›</span>
    </button>
  );
}

function Switch({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-primary' : 'bg-slate-600'}`}
      aria-checked={on}
      role="switch"
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function ScoreBtn({ onPress, children }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      className="w-9 h-9 rounded-lg bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:brightness-75 select-none"
    >{children}</button>
  );
}

const svg = (d) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">{d}</svg>
);
const ICONS = {
  flag:      svg(<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>),
  clipboard: svg(<><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9z" /><path d="M9 12h6M9 16h4" /></>),
  book:      svg(<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /></>),
  rotate:    svg(<><path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v5h-5" /></>),
};

export function MenuDrawer({
  onClose, flipLayout = false, onFlipLayout,
  courtViewMode = 'smart', onCourtViewMode,
  teamName, opponentName, onEndMatch,
}) {
  // Same setting as Settings → Live Match → Attack Shot Chart; the store reads
  // it at each attack, so turning it off here takes effect on the next attack.
  const [shotChartOn, setShotChartOn] = useState(() => getBoolStorageDefaultTrue(STORAGE_KEYS.ATTACK_SHOT_PROMPT));
  const toggleShotChart = () => {
    const next = !shotChartOn;
    setBoolStorage(STORAGE_KEYS.ATTACK_SHOT_PROMPT, next);
    setShotChartOn(next);
  };
  const {
    matchId, currentSetId, ourScore, oppScore, fudgeScore,
    endSet, resetCurrentSet, resetToRotation,
    teamJerseyColor, liberoJerseyColor, setTeamJerseyColor, setLiberoJerseyColor,
  } = useMatchStore(useShallow((s) => ({
    matchId:              s.matchId,
    currentSetId:         s.currentSetId,
    ourScore:             s.ourScore,
    oppScore:             s.oppScore,
    fudgeScore:           s.fudgeScore,
    endSet:               s.endSet,
    resetCurrentSet:      s.resetCurrentSet,
    resetToRotation:      s.resetToRotation,
    teamJerseyColor:      s.teamJerseyColor,
    liberoJerseyColor:    s.liberoJerseyColor,
    setTeamJerseyColor:   s.setTeamJerseyColor,
    setLiberoJerseyColor: s.setLiberoJerseyColor,
  })));
  const navigate             = useNavigate();

  const [confirmReset,        setConfirmReset]        = useState(false);
  const [confirmMatchSetup,   setConfirmMatchSetup]   = useState(false);
  const [confirmEndSet,       setConfirmEndSet]       = useState(false);
  const [confirmEndMatch,     setConfirmEndMatch]     = useState(false);
  const [resetRotationOpen,   setResetRotationOpen]   = useState(false);
  const [jerseysOpen,         setJerseysOpen]         = useState(false);

  const computeWinner = () => {
    if (ourScore === 0 && oppScore === 0) return null;
    return ourScore >= oppScore ? SIDE.US : SIDE.THEM;
  };

  const handleEndSetConfirmed = async () => {
    await endSet(computeWinner());
    navigate(`/matches/${matchId}/set-lineup`);
  };

  const handleEndMatch = async () => {
    setConfirmEndMatch(false);
    onClose();
    await onEndMatch?.(computeWinner());
  };

  const handleResetConfirmed = async () => {
    await resetCurrentSet();
    setConfirmReset(false);
    onClose();
  };

  const handleMatchSetupConfirmed = async () => {
    // Persist current scores to DB so the set record reflects progress
    if (currentSetId) {
      await db.sets.update(currentSetId, { our_score: ourScore, opp_score: oppScore });
    }
    navigate(`/matches/${matchId}/set-lineup`);
  };

  return (
    <>
      <Drawer title="Match Menu" onClose={onClose}>
        <div className="max-w-4xl mx-auto grid gap-4 md:grid-cols-2">

          {/* ── Left column: score + match actions ── */}
          <div className="flex flex-col gap-4">
            <MenuCard title="Adjust Score">
              {[
                { label: teamName || 'Home', score: ourScore, side: SIDE.US },
                { label: opponentName || 'Away', score: oppScore, side: SIDE.THEM },
              ].map(({ label, score, side }) => (
                <div key={side} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-semibold text-white truncate max-w-[140px]">{label}</span>
                  <div className="flex items-center gap-2">
                    <ScoreBtn onPress={() => fudgeScore(side, -1)}>−</ScoreBtn>
                    <span className="w-8 text-center text-xl font-black text-white tabular-nums">{score}</span>
                    <ScoreBtn onPress={() => fudgeScore(side, +1)}>+</ScoreBtn>
                  </div>
                </div>
              ))}
            </MenuCard>

            <MenuCard title="Match" grow>
              <MenuRow icon={ICONS.flag}     label="End Current Set"   onClick={() => setConfirmEndSet(true)} />
              <MenuRow icon={ICONS.clipboard} label="Match Set Up"     onClick={() => setConfirmMatchSetup(true)} />
              <MenuRow icon={ICONS.rotate}   label="Reset to Rotation" onClick={() => setResetRotationOpen(true)} />
            </MenuCard>


          </div>

          {/* ── Right column: display settings, jerseys, help ── */}
          <div className="flex flex-col gap-4">
            <MenuCard title="Display">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-white">Flip Team Layout</span>
                <Switch on={flipLayout} onToggle={onFlipLayout} />
              </div>
              <div className="px-4 py-3">
                <div className="text-sm font-medium text-white">Court View</div>
                <div className="mt-2 flex gap-1 p-1 rounded-lg bg-slate-900/70">
                  {COURT_VIEW_OPTIONS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => onCourtViewMode?.(id)}
                      aria-pressed={courtViewMode === id}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        courtViewMode === id ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >{label}</button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5">
                  {COURT_VIEW_OPTIONS.find((o) => o.id === courtViewMode)?.desc}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-white">Hitting Spray Chart</span>
                <Switch on={shotChartOn} onToggle={toggleShotChart} />
              </div>
            </MenuCard>

            <MenuCard title="Jerseys">
              <button
                onClick={() => setJerseysOpen((o) => !o)}
                className="w-full flex items-center gap-4 px-4 py-3 text-left"
                aria-expanded={jerseysOpen}
              >
                {[['Team', teamJerseyColor], ['Libero', liberoJerseyColor]].map(([label, id]) => {
                  const c = JERSEY_COLORS.find((j) => j.id === id);
                  return (
                    <span key={label} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: c?.bg ?? 'transparent', borderColor: c?.border ?? '#475569' }} />
                      {label} <span className="text-white font-medium">{c?.label ?? '—'}</span>
                    </span>
                  );
                })}
                <span className={`ml-auto text-slate-500 transition-transform ${jerseysOpen ? 'rotate-90' : ''}`}>›</span>
              </button>
              {jerseysOpen && [
                { label: 'Team', value: teamJerseyColor, onChange: setTeamJerseyColor },
                { label: 'Libero', value: liberoJerseyColor, onChange: setLiberoJerseyColor },
              ].map(({ label, value, onChange }) => (
                <div key={label} className="px-4 py-3">
                  <div className="text-xs text-slate-400 mb-2">{label}</div>
                  <div className="flex flex-wrap gap-2">
                    {JERSEY_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onPointerDown={(e) => { e.preventDefault(); onChange(c.id); }}
                        title={c.label}
                        style={{ backgroundColor: c.bg, borderColor: value === c.id ? '#e8530b' : c.border }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          value === c.id ? 'scale-110 ring-2 ring-primary ring-offset-1 ring-offset-slate-900' : 'hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </MenuCard>

            <MenuCard title="Help" grow>
              <MenuRow
                icon={ICONS.book}
                label="Button Guide"
                sub="Learn every button & indicator"
                onClick={() => { onClose(); navigate('/help/live-match', { state: { fromLive: true } }); }}
              />
            </MenuCard>
          </div>
        </div>

        {/* ── Centered under both columns: actions that can't be undone ── */}
        <div className="max-w-md mx-auto mt-6 pt-4 border-t border-slate-700/60 text-center">
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmReset(true)}
              className="flex-1 py-2.5 rounded-xl border border-red-500/60 text-red-300 text-sm font-semibold hover:bg-red-500/10 active:brightness-90"
            >
              Reset Current Set
            </button>
            <button
              onClick={() => setConfirmEndMatch(true)}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 active:brightness-90"
            >
              End Match
            </button>
          </div>
        </div>
      </Drawer>

      {confirmMatchSetup && (
        <ConfirmDialog
          title="Go to Match Set Up?"
          message="Your current score and rotation state will be saved. You can fix the lineup and return to the match."
          confirmLabel="Go to Set Up"
          onConfirm={handleMatchSetupConfirmed}
          onCancel={() => setConfirmMatchSetup(false)}
        />
      )}

      {confirmEndSet && (
        <ConfirmDialog
          title="End Current Set?"
          message={`${ourScore === 0 && oppScore === 0 ? 'Tie' : 'Final'} score: ${ourScore} – ${oppScore}. This will end the set and take you to the lineup screen for the next set.`}
          confirmLabel="End Set"
          onConfirm={handleEndSetConfirmed}
          onCancel={() => setConfirmEndSet(false)}
        />
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Reset Current Set?"
          message="This will delete all points, contacts, and substitutions for the current set and reset the score to 0–0. This cannot be undone."
          confirmLabel="Reset Set"
          danger
          onConfirm={handleResetConfirmed}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {confirmEndMatch && (
        <ConfirmDialog
          title="End Match?"
          message={`Final score: ${ourScore} – ${oppScore}. This will permanently close the match and take you to the match summary.`}
          confirmLabel="End Match"
          danger
          onConfirm={() => { setConfirmEndMatch(false); handleEndMatch(); }}
          onCancel={() => setConfirmEndMatch(false)}
        />
      )}

      {resetRotationOpen && (
        <ResetRotationModal
          onCancel={() => setResetRotationOpen(false)}
          onConfirm={async (rotNum, serving) => {
            await resetToRotation(rotNum, serving);
            setResetRotationOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
