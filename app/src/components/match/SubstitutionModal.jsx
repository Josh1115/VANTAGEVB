import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useMatchStore } from '../../store/matchStore';
import { db } from '../../db/schema';

const POSITION_OPTIONS = ['OH', 'OPP', 'MB', 'S', 'L', 'DS', 'RS'];

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ children, color = 'blue' }) {
  const bar = color === 'amber' ? 'bg-amber-500' : 'bg-blue-500';
  const text = color === 'amber' ? 'text-amber-400' : 'text-blue-400';
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={`w-1 h-4 rounded-full shrink-0 ${bar}`} />
      <span className={`text-xs font-black tracking-widest uppercase ${text}`}>{children}</span>
    </div>
  );
}

// Court tile grid — picks from `slots`, highlights selected, excludes locked ids
function PlayerOutGrid({ slots, selected, onSelect, lockedIds = [], exhaustedIds = [], liberoId, editingPosFor, onEditPos, setPositionLabel, color = 'blue' }) {
  const selBg    = color === 'amber' ? 'bg-amber-500 border-amber-500'       : 'bg-primary border-primary';
  const selText  = color === 'amber' ? 'text-black'                          : 'text-white';
  const selSub   = color === 'amber' ? 'text-amber-900'                      : 'text-blue-200';
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[3, 2, 1, 4, 5, 0].map(i => slots[i]).filter((sl) => sl?.playerId).map((sl) => {
        const isExhausted = exhaustedIds.includes(sl.playerId);
        const isLibero    = sl.playerId === liberoId;
        const isLocked    = lockedIds.includes(sl.playerId);
        const disabled    = isLibero || isLocked;
        const sel         = selected === sl.playerId;
        const editingPos  = editingPosFor === sl.playerId;
        return (
          <div key={sl.playerId} className={`rounded border transition-colors
            ${editingPos
              ? 'col-span-3 bg-slate-800 border-amber-500/60'
              : sel
                ? `${selBg}`
                : disabled
                  ? 'bg-slate-800/40 border-slate-800'
                  : 'bg-slate-700 border-slate-600'
            }`}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => { if (!disabled) onSelect(sl.playerId); }}
                disabled={disabled}
                className={`flex-1 px-2 py-1.5 text-xs font-bold text-left
                  ${disabled ? 'text-slate-600 cursor-not-allowed' : sel ? selText : 'text-slate-200'}`}
              >
                <span className={`block text-[1.3vmin] ${sel ? selSub : 'text-slate-400'}`}>
                  S{sl.position}{sl.positionLabel && !editingPos && ` · ${sl.positionLabel}`}
                </span>
                #{sl.jersey} {sl.playerName}
                {isLocked && <span className="block text-[10px] text-slate-500 mt-0.5">In use</span>}
                {isExhausted && !isLocked && <span className="block text-[10px] text-red-500 font-semibold mt-0.5">Sub used</span>}
              </button>
              {onEditPos && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEditPos(editingPos ? null : sl.playerId); }}
                  className="px-1.5 py-1.5 text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                  title="Edit position"
                >✎</button>
              )}
            </div>
            {editingPos && (
              <div className="flex flex-wrap gap-1 px-2 pb-2">
                {POSITION_OPTIONS.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => { setPositionLabel(sl.playerId, pos); onEditPos(null); }}
                    className={`px-2 py-0.5 rounded text-xs font-bold border transition-colors
                      ${sl.positionLabel === pos
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-amber-400'
                      }`}
                  >{pos}</button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Bench tile grid
function PlayerInGrid({ bench, selected, onSelect, disabled: globalDisabled, subPairs, outSlotIdx, exhaustedIds = [], color = 'blue' }) {
  const selBg   = color === 'amber' ? 'bg-amber-500 border-amber-500 text-black' : 'bg-primary border-primary text-white';
  const pairRing = color === 'amber' ? 'bg-amber-900/30 text-amber-100 border-amber-400 ring-2 ring-amber-400/50 hover:bg-amber-900/50'
                                     : 'bg-emerald-900/30 text-emerald-100 border-emerald-400 ring-2 ring-emerald-400/50 hover:bg-emerald-900/50';
  const retLabel = color === 'amber' ? 'text-amber-400' : 'text-emerald-400';
  if (bench.length === 0) return <p className="text-xs text-slate-500">No bench players available.</p>;
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {bench.map((p) => {
        const isExhausted = exhaustedIds.includes(p.id);
        const sel         = selected === p.id;
        const isPaired    = outSlotIdx !== -1 && subPairs[p.id] === outSlotIdx;
        return (
          <button
            key={p.id}
            onClick={() => { if (!globalDisabled) onSelect(p.id); }}
            disabled={globalDisabled}
            className={`px-2 py-1.5 rounded text-xs font-bold border transition-colors text-left relative
              ${sel
                ? selBg
                : globalDisabled
                  ? 'bg-slate-700 text-slate-400 border-slate-600'
                  : isPaired
                    ? pairRing
                    : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
              }`}
          >
            #{p.jersey_number} {p.name}
            <span className="block text-[1.3vmin] text-slate-400">{p.position}</span>
            {isPaired && <span className={`block text-[10px] font-semibold mt-0.5 ${retLabel}`}>↩ Return</span>}
            {isExhausted && !isPaired && <span className="block text-[10px] text-yellow-500/80 font-semibold mt-0.5">Sub used</span>}
          </button>
        );
      })}
    </div>
  );
}

// Role chip strip
function RoleChips({ value, onChange, color = 'blue' }) {
  const selBg = color === 'amber' ? 'bg-amber-500 text-black border-amber-400' : 'bg-primary text-white border-primary';
  return (
    <div className="flex flex-wrap gap-1.5">
      {POSITION_OPTIONS.map((pos) => (
        <button
          key={pos}
          onClick={() => onChange(pos)}
          className={`px-3 py-1 rounded text-xs font-bold border transition-colors
            ${value === pos ? selBg : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-400'}`}
        >{pos}</button>
      ))}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function SubstitutionModal({ onClose }) {
  const lineup             = useMatchStore((s) => s.lineup);
  const teamId             = useMatchStore((s) => s.teamId);
  const liberoId           = useMatchStore((s) => s.liberoId);
  const subsUsed           = useMatchStore((s) => s.subsUsed);
  const maxSubsPerSet      = useMatchStore((s) => s.maxSubsPerSet);
  const subPairs           = useMatchStore((s) => s.subPairs);
  const exhaustedPlayerIds = useMatchStore((s) => s.exhaustedPlayerIds);
  const substitutePlayer   = useMatchStore((s) => s.substitutePlayer);
  const setPositionLabel   = useMatchStore((s) => s.setPositionLabel);
  const plannedSubs        = useMatchStore((s) => s.plannedSubs);
  const rotationNum        = useMatchStore((s) => s.rotationNum);

  // Sub 1
  const [outPlayerId,   setOutPlayerId]   = useState(null);
  const [inPlayerId,    setInPlayerId]    = useState(null);
  const [roleOverride,  setRoleOverride]  = useState('');
  const [editingPosFor, setEditingPosFor] = useState(null);

  // Sub 2
  const [showSecondSub,  setShowSecondSub]  = useState(false);
  const [outPlayerId2,   setOutPlayerId2]   = useState(null);
  const [inPlayerId2,    setInPlayerId2]    = useState(null);
  const [roleOverride2,  setRoleOverride2]  = useState('');

  const [error, setError] = useState('');

  const roster = useLiveQuery(
    () => teamId ? db.players.where('team_id').equals(teamId).filter((p) => p.is_active).toArray() : [],
    [teamId]
  );

  const subsLeft = maxSubsPerSet - subsUsed;
  const atMax    = subsLeft <= 0;

  const onCourtIds = new Set(lineup.map((sl) => sl.playerId).filter(Boolean));

  // Bench for sub 1: everyone not on court, not libero
  const bench1 = (roster ?? []).filter((p) => !onCourtIds.has(p.id) && p.id !== liberoId);

  // Bench for sub 2: same base, but exclude sub 1's incoming player
  const bench2 = bench1.filter((p) => p.id !== inPlayerId);

  const outSlotIdx1 = outPlayerId  ? lineup.findIndex((sl) => sl.playerId === outPlayerId)  : -1;
  const outSlotIdx2 = outPlayerId2 ? lineup.findIndex((sl) => sl.playerId === outPlayerId2) : -1;

  // Planned sub shortcuts
  const applicablePlannedSubs = useMemo(() => {
    if (!plannedSubs?.length || !roster) return [];
    return plannedSubs
      .filter((ps) => ps.rotation === rotationNum)
      .map((ps) => {
        const outSlot = lineup.find((sl) => sl.serveOrder === ps.player_out_so + 1);
        if (!outSlot?.playerId) return null;
        if (exhaustedPlayerIds.includes(outSlot.playerId)) return null;
        const inPlayer = roster.find((p) => p.id === ps.player_in_id);
        if (!inPlayer || onCourtIds.has(inPlayer.id) || inPlayer.id === liberoId) return null;
        if (exhaustedPlayerIds.includes(inPlayer.id)) return null;
        return { outSlot, inPlayer };
      })
      .filter(Boolean);
  }, [plannedSubs, rotationNum, lineup, exhaustedPlayerIds, roster, onCourtIds, liberoId]);

  // Clear sub-1 bench selection when court selection changes
  useEffect(() => { setInPlayerId(null); setRoleOverride(''); }, [outPlayerId]);
  useEffect(() => { setInPlayerId2(null); setRoleOverride2(''); }, [outPlayerId2]);

  // Pre-fill role from incoming player's roster position
  useEffect(() => {
    if (!inPlayerId || !roster) return;
    setRoleOverride(roster.find((pl) => pl.id === inPlayerId)?.position ?? '');
  }, [inPlayerId, roster]);
  useEffect(() => {
    if (!inPlayerId2 || !roster) return;
    setRoleOverride2(roster.find((pl) => pl.id === inPlayerId2)?.position ?? '');
  }, [inPlayerId2, roster]);

  const pair1Ready = !!outPlayerId && !!inPlayerId;
  const pair2Ready = !!outPlayerId2 && !!inPlayerId2;
  const subsNeeded = showSecondSub ? 2 : 1;
  const confirmDisabled = !pair1Ready || atMax || (showSecondSub && !pair2Ready);

  const handleConfirm = async () => {
    if (!pair1Ready) return;
    const inPlayer1 = bench1.find((p) => p.id === inPlayerId);
    if (!inPlayer1) return;

    const ok1 = await substitutePlayer(outPlayerId, inPlayer1, roleOverride || undefined);
    if (!ok1) { setError('First substitution failed. Check sub limits.'); return; }

    if (showSecondSub && pair2Ready) {
      const inPlayer2 = bench2.find((p) => p.id === inPlayerId2);
      if (!inPlayer2) { setError('Second substitution failed.'); return; }
      const ok2 = await substitutePlayer(outPlayerId2, inPlayer2, roleOverride2 || undefined);
      if (!ok2) { setError('Second substitution failed. Check sub limits.'); return; }
    }

    onClose();
  };

  const confirmLabel = showSecondSub && pair2Ready
    ? `Confirm (2 subs, ${subsLeft - 2} left)`
    : `Confirm Sub (${subsLeft - 1} left)`;

  return (
    <Modal
      title="Substitution"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={confirmDisabled} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">

        {/* ── Planned Sub Shortcuts ── */}
        {applicablePlannedSubs.length > 0 && !atMax && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
              Planned Subs — Rotation {rotationNum}
            </p>
            <div className="space-y-1.5">
              {applicablePlannedSubs.map(({ outSlot, inPlayer }, idx) => (
                <button
                  key={idx}
                  onClick={async () => {
                    const ok = await substitutePlayer(outSlot.playerId, inPlayer, undefined);
                    if (ok) onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/30
                    border border-emerald-700 hover:bg-emerald-900/50 text-left transition-colors"
                >
                  <span className="text-emerald-400 font-semibold text-xs shrink-0">OUT</span>
                  <span className="text-white text-xs font-bold flex-1 truncate">#{outSlot.jersey} {outSlot.playerName}</span>
                  <span className="text-slate-400 text-xs shrink-0">→</span>
                  <span className="text-xs font-bold text-emerald-200 truncate">#{inPlayer.jersey_number} {inPlayer.name}</span>
                </button>
              ))}
            </div>
            <hr className="border-slate-700 mt-3" />
          </div>
        )}

        {atMax && (
          <div className="px-3 py-2 rounded-lg bg-red-950 border border-red-700 text-red-300 text-xs font-semibold text-center">
            Substitution limit reached ({maxSubsPerSet}/{maxSubsPerSet})
          </div>
        )}
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        {/* ══ SUB 1 ══ */}
        <div className="space-y-3">
          <SectionLabel color="blue">Sub 1</SectionLabel>

          <div>
            <p className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">Player Out</p>
            <PlayerOutGrid
              slots={lineup}
              selected={outPlayerId}
              onSelect={(id) => { setOutPlayerId(id); setError(''); setEditingPosFor(null); }}
              lockedIds={outPlayerId2 ? [outPlayerId2] : []}
              exhaustedIds={exhaustedPlayerIds}
              liberoId={liberoId}
              editingPosFor={editingPosFor}
              onEditPos={setEditingPosFor}
              setPositionLabel={setPositionLabel}
              color="blue"
            />
          </div>

          {inPlayerId && (
            <div>
              <p className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                Role this set
                <span className="ml-2 text-slate-600 normal-case font-normal">used for VER position multiplier</span>
              </p>
              <RoleChips value={roleOverride} onChange={setRoleOverride} color="blue" />
            </div>
          )}

          <div>
            <p className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
              Player In
              {!outPlayerId && <span className="ml-2 text-slate-600 normal-case font-normal">← select a player out first</span>}
            </p>
            <PlayerInGrid
              bench={bench1.filter((p) => p.id !== inPlayerId2)}
              selected={inPlayerId}
              onSelect={(id) => { setInPlayerId(id); setError(''); }}
              disabled={!outPlayerId}
              subPairs={subPairs}
              outSlotIdx={outSlotIdx1}
              exhaustedIds={exhaustedPlayerIds}
              color="blue"
            />
          </div>
        </div>

        {/* ── Add 2nd Sub button ── */}
        {!showSecondSub && !atMax && subsLeft >= 2 && (
          <button
            onClick={() => setShowSecondSub(true)}
            className="w-full py-2 rounded-lg border border-dashed border-amber-600/60 text-amber-500
              text-xs font-bold tracking-wide hover:bg-amber-900/20 transition-colors"
          >
            + Add 2nd Sub
          </button>
        )}

        {/* ══ SUB 2 ══ */}
        {showSecondSub && (
          <div className="space-y-3 pt-1 border-t border-slate-700/60">
            <div className="flex items-center justify-between">
              <SectionLabel color="amber">Sub 2</SectionLabel>
              <button
                onClick={() => { setShowSecondSub(false); setOutPlayerId2(null); setInPlayerId2(null); setRoleOverride2(''); }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >✕ Remove</button>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">Player Out</p>
              <PlayerOutGrid
                slots={lineup}
                selected={outPlayerId2}
                onSelect={(id) => { setOutPlayerId2(id); setError(''); }}
                lockedIds={outPlayerId ? [outPlayerId] : []}
                exhaustedIds={exhaustedPlayerIds}
                liberoId={liberoId}
                editingPosFor={null}
                onEditPos={null}
                setPositionLabel={setPositionLabel}
                color="amber"
              />
            </div>

            {inPlayerId2 && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                  Role this set
                  <span className="ml-2 text-slate-600 normal-case font-normal">used for VER position multiplier</span>
                </p>
                <RoleChips value={roleOverride2} onChange={setRoleOverride2} color="amber" />
              </div>
            )}

            <div>
              <p className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                Player In
                {!outPlayerId2 && <span className="ml-2 text-slate-600 normal-case font-normal">← select a player out first</span>}
              </p>
              <PlayerInGrid
                bench={bench2.filter((p) => p.id !== inPlayerId)}
                selected={inPlayerId2}
                onSelect={(id) => { setInPlayerId2(id); setError(''); }}
                disabled={!outPlayerId2}
                subPairs={subPairs}
                outSlotIdx={outSlotIdx2}
                exhaustedIds={exhaustedPlayerIds}
                color="amber"
              />
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
