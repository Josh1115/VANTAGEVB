import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ResetRotationModal } from './ResetRotationModal';
import { useMatchStore } from '../../store/matchStore';
import { useShallow } from 'zustand/react/shallow';
import { db } from '../../db/schema';
import { SIDE } from '../../constants';

function FamilyFocusLink({ token }) {
  const [copied, setCopied] = useState(false);
  if (!token) return null;
  const url = `${window.location.origin}/fs/${token}`;
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="mb-3 pb-3 border-b border-slate-700">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Family Focus Link
      </div>
      <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2">
        <span className="flex-1 text-xs text-slate-300 truncate select-all">{url}</span>
        <button
          onPointerDown={(e) => { e.preventDefault(); copy(); }}
          className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-md bg-primary/20 text-primary border border-primary/40 active:brightness-75 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

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

export function MenuDrawer({ onClose, flipLayout = false, onFlipLayout, teamName, opponentName }) {
  const {
    matchId, currentSetId, ourScore, oppScore, fudgeScore,
    endSet, endMatch, resetCurrentSet, resetToRotation,
    teamJerseyColor, liberoJerseyColor, setTeamJerseyColor, setLiberoJerseyColor,
    pvToken,
  } = useMatchStore(useShallow((s) => ({
    matchId:              s.matchId,
    currentSetId:         s.currentSetId,
    ourScore:             s.ourScore,
    oppScore:             s.oppScore,
    fudgeScore:           s.fudgeScore,
    endSet:               s.endSet,
    endMatch:             s.endMatch,
    resetCurrentSet:      s.resetCurrentSet,
    resetToRotation:      s.resetToRotation,
    teamJerseyColor:      s.teamJerseyColor,
    liberoJerseyColor:    s.liberoJerseyColor,
    setTeamJerseyColor:   s.setTeamJerseyColor,
    setLiberoJerseyColor: s.setLiberoJerseyColor,
    pvToken:              s._pvToken,
  })));
  const navigate             = useNavigate();

  const [confirmReset,        setConfirmReset]        = useState(false);
  const [confirmMatchSetup,   setConfirmMatchSetup]   = useState(false);
  const [confirmEndSet,       setConfirmEndSet]       = useState(false);
  const [confirmEndMatch,     setConfirmEndMatch]     = useState(false);
  const [resetRotationOpen,   setResetRotationOpen]   = useState(false);

  const computeWinner = () => {
    if (ourScore === 0 && oppScore === 0) return null;
    return ourScore >= oppScore ? SIDE.US : SIDE.THEM;
  };

  const handleEndSetConfirmed = async () => {
    await endSet(computeWinner());
    navigate(`/matches/${matchId}/set-lineup`);
  };

  const handleEndMatch = async () => {
    await endMatch(computeWinner());
    navigate(`/matches/${matchId}/summary`);
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
        <FamilyFocusLink token={pvToken} />

        {/* ── Score Adjustment ── */}
        <div className="mb-3 pb-3 border-b border-slate-700">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Score Adjustment</div>
          {[
            { label: teamName || 'Home', score: ourScore, side: SIDE.US },
            { label: opponentName || 'Away', score: oppScore, side: SIDE.THEM },
          ].map(({ label, score, side }) => (
            <div key={side} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-slate-300 truncate max-w-[120px]">{label}</span>
              <div className="flex items-center gap-2">
                <button
                  onPointerDown={(e) => { e.preventDefault(); fudgeScore(side, -1); }}
                  className="w-8 h-8 rounded-lg bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:brightness-75 select-none"
                >−</button>
                <span className="w-7 text-center text-lg font-black text-white tabular-nums">{score}</span>
                <button
                  onPointerDown={(e) => { e.preventDefault(); fudgeScore(side, +1); }}
                  className="w-8 h-8 rounded-lg bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:brightness-75 select-none"
                >+</button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Jersey Colors ── */}
        <div className="mb-3 pb-3 border-b border-slate-700">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Jersey Colors</div>
          {[
            { label: 'Team Jersey', value: teamJerseyColor, onChange: setTeamJerseyColor },
            { label: 'Libero Jersey', value: liberoJerseyColor, onChange: setLiberoJerseyColor },
          ].map(({ label, value, onChange }) => (
            <div key={label} className="mb-3">
              <div className="text-xs text-slate-400 mb-1.5">{label}</div>
              <div className="flex flex-wrap gap-2">
                {JERSEY_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onPointerDown={(e) => { e.preventDefault(); onChange(c.id); }}
                    title={c.label}
                    style={{
                      backgroundColor: c.bg,
                      borderColor: value === c.id ? '#e8530b' : c.border,
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      value === c.id ? 'scale-125 ring-2 ring-primary ring-offset-1 ring-offset-slate-900' : 'hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Help ── */}
        <button
          onClick={() => { onClose(); navigate('/help/live-match', { state: { fromLive: true } }); }}
          className="w-full flex items-center gap-3 mb-4 px-3 py-2.5 rounded-xl bg-primary/15 border border-primary/40 text-left active:brightness-90"
        >
          <span className="text-lg">📖</span>
          <div>
            <div className="text-sm font-bold text-primary">Live Stat Phase Labels</div>
            <div className="text-xs text-slate-400">New? Learn every button &amp; indicator</div>
          </div>
          <span className="ml-auto text-primary text-lg">›</span>
        </button>

        {/* ── Flip Layout ── */}
        <div className="flex items-center justify-between py-3 mb-3 border-t border-slate-700">
          <div>
            <div className="text-sm font-medium text-white">Flip Team Layout</div>
            <div className="text-xs text-slate-400 mt-0.5">Show your team on the right side</div>
          </div>
          <button
            onClick={onFlipLayout}
            className={`relative w-11 h-6 rounded-full transition-colors ${flipLayout ? 'bg-primary' : 'bg-slate-600'}`}
            aria-checked={flipLayout}
            role="switch"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${flipLayout ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <div className="space-y-3">
          <Button variant="secondary" className="w-full justify-start" onClick={() => setConfirmMatchSetup(true)}>
            Match Set Up
          </Button>
          <Button variant="secondary" className="w-full justify-start" onClick={() => setResetRotationOpen(true)}>
            Reset to Rotation
          </Button>
          <Button variant="secondary" className="w-full justify-start" onClick={() => setConfirmReset(true)}>
            Reset Current Set
          </Button>
          <Button variant="secondary" className="w-full justify-start" onClick={() => setConfirmEndSet(true)}>
            End Current Set
          </Button>
          <Button variant="danger" className="w-full justify-start" onClick={() => setConfirmEndMatch(true)}>
            End Match
          </Button>
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
