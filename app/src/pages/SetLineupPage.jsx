import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { useMatchStore } from '../store/matchStore';
import { SET_STATUS, SIDE } from '../constants';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { serveOrderToZone } from '../components/court/CourtZonePicker';
import { LineupForm } from '../components/match/LineupForm';

export function SetLineupPage() {
  const { matchId: matchIdParam } = useParams();
  const navigate      = useNavigate();
  const setLineup     = useMatchStore((s) => s.setLineup);
  const setLibero     = useMatchStore((s) => s.setLibero);
  const storeServeSide = useMatchStore((s) => s.serveSide);

  const [allSets,   setAllSets]   = useState([]);
  const [setId,     setSetId]     = useState(null);
  const [setNumber, setSetNumber] = useState(null);
  const [teamId,    setTeamId]    = useState(null);

  // lineup[i] = playerId string for serve order i+1 (I=0 … VI=5)
  const [lineup,        setLineupState]   = useState(Array(6).fill(''));
  // slotPositions[i] = position label override for serve slot i
  const [slotPositions, setSlotPositions] = useState(Array(6).fill(''));
  const [startZone, setStartZone]  = useState(1);
  const [liberoId,  setLiberoId]   = useState('');
  const [servingSide, setServingSide] = useState(storeServeSide ?? SIDE.US);
  const [saving,    setSaving]     = useState(false);
  const [error,     setError]      = useState('');
  const [loadPickerOpen, setLoadPickerOpen] = useState(false);

  const matchId = parseInt(matchIdParam, 10);

  useEffect(() => {
    if (!matchId) return;
    async function load() {
      const match = await db.matches.get(matchId);
      if (!match) return;

      const season = match.season_id ? await db.seasons.get(match.season_id) : null;
      const team   = season?.team_id  ? await db.teams.get(season.team_id)   : null;
      if (team) setTeamId(team.id);

      const sets = await db.sets.where('match_id').equals(matchId).sortBy('set_number');
      setAllSets(sets);

      const currentSet = sets.find((s) => s.status === SET_STATUS.IN_PROGRESS) ?? sets[sets.length - 1];
      if (!currentSet) return;

      await loadSetData(currentSet);
    }
    load();
  }, [matchId]);

  async function loadSetData(set) {
    setSetId(set.id);
    setSetNumber(set.set_number);

    // Reset form state
    setLineupState(Array(6).fill(''));
    setSlotPositions(Array(6).fill(''));
    setStartZone(1);
    setLiberoId('');

    // Pre-populate form with the existing lineup for this set
    const existingRows = await db.lineups.where('set_id').equals(set.id).toArray();
    if (existingRows.length > 0) {
      const preLineup = Array(6).fill('');
      const prePositions = Array(6).fill('');
      existingRows.forEach((row) => {
        preLineup[row.serve_order - 1] = String(row.player_id);
        prePositions[row.serve_order - 1] = row.position_label ?? '';
      });
      setLineupState(preLineup);
      setSlotPositions(prePositions);
      const firstRow = existingRows.find((r) => r.serve_order === 1);
      if (firstRow) setStartZone(firstRow.position);
    }

    // Pre-populate libero if set
    if (set.libero_player_id) {
      setLiberoId(String(set.libero_player_id));
    }
  }

  const players = useLiveQuery(
    () => teamId
      ? db.players.where('team_id').equals(teamId).filter((p) => p.is_active).toArray()
      : [],
    [teamId]
  );

  const savedLineups = useLiveQuery(
    () => teamId ? db.saved_lineups.where('team_id').equals(teamId).toArray() : [],
    [teamId]
  );

  const applysavedLineup = (sl) => {
    setLineupState(sl.serve_order.map(String));
    setStartZone(sl.start_zone ?? 1);
    setLiberoId(sl.libero_player_id ? String(sl.libero_player_id) : '');
    setSlotPositions(sl.slot_positions ?? Array(6).fill(''));
    setLoadPickerOpen(false);
  };

  const handleConfirm = async () => {
    setError('');
    if (lineup.some((id) => !id)) { setError('Assign a player to every position.'); return; }
    if (!setId) return;

    setSaving(true);
    try {
      // Update set with libero designation
      await db.sets.update(setId, {
        libero_player_id: liberoId ? Number(liberoId) : null,
      });

      // Replace existing lineup rows for this set
      await db.lineups.where('set_id').equals(setId).delete();
      await db.lineups.bulkAdd(
        lineup.map((playerId, i) => ({
          set_id:         setId,
          player_id:      Number(playerId),
          position:       serveOrderToZone(i, startZone),
          serve_order:    i + 1,
          position_label: slotPositions[i] || '',
        }))
      );

      // Update store so live page has the corrected lineup immediately
      const playerObjs = await db.players.bulkGet(lineup.map(Number));
      const storeLineup = lineup
        .map((pid, i) => {
          const p = playerObjs[i];
          return {
            position:      serveOrderToZone(i, startZone),
            serveOrder:    i + 1,
            playerId:      Number(pid),
            playerName:    p?.name ?? '',
            jersey:        p?.jersey_number ?? '',
            positionLabel: slotPositions[i] || p?.position || '',
            year:          p?.year ?? '',
          };
        })
        .sort((a, b) => a.position - b.position);

      setLineup(storeLineup);
      if (liberoId) setLibero(Number(liberoId));
      useMatchStore.setState({ serveSide: servingSide });

      navigate(`/matches/${matchId}/live`);
    } catch (e) {
      setError('Failed to save lineup. Try again.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!setNumber) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading set…</span>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <PageHeader title={`Set ${setNumber} Lineup`} />

      <div className="p-4 md:p-6 space-y-5 max-w-lg mx-auto">

        {/* Set selector — always 3 fixed buttons */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
            Set
          </label>
          <div className="flex gap-2">
            {[1, 2, 3].map((num) => {
              const s = allSets.find((x) => x.set_number === num);
              const isActive = setId === s?.id;
              const exists   = !!s;
              return (
                <button
                  key={num}
                  onClick={() => exists && loadSetData(s)}
                  disabled={!exists}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                    ${isActive
                      ? 'bg-primary text-white border-primary'
                      : exists
                        ? 'bg-surface text-slate-300 border-slate-600 hover:border-slate-400'
                        : 'bg-surface text-slate-600 border-slate-700 cursor-not-allowed'
                    }`}
                >
                  Set {num}
                  {s?.status === SET_STATUS.IN_PROGRESS && (
                    <span className="ml-1 text-[10px] text-emerald-400">●</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Load saved lineup */}
        {(savedLineups ?? []).length > 0 && (
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
              Saved Lineups
            </label>
            {loadPickerOpen ? (
              <div className="space-y-2">
                {savedLineups.map((sl) => (
                  <button
                    key={sl.id}
                    onClick={() => applysavedLineup(sl)}
                    className="w-full text-left bg-surface border border-slate-600 hover:border-primary rounded-lg px-4 py-3 transition-colors"
                  >
                    <span className="font-semibold text-white">{sl.name}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">
                      {sl.serve_order.map((pid) => {
                        const p = (players ?? []).find((pl) => String(pl.id) === String(pid));
                        return p ? `#${p.jersey_number} ${p.name}` : '?';
                      }).join(' · ')}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => setLoadPickerOpen(false)}
                  className="w-full py-2 text-sm text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLoadPickerOpen(true)}
                className="w-full py-2 rounded-lg text-sm font-semibold border border-slate-600 text-slate-300 hover:border-slate-400 bg-surface transition-colors"
              >
                Load Saved Lineup
              </button>
            )}
          </div>
        )}

        <LineupForm
          lineup={lineup}
          setLineup={setLineupState}
          slotPositions={slotPositions}
          setSlotPositions={setSlotPositions}
          startZone={startZone}
          setStartZone={setStartZone}
          liberoId={liberoId}
          setLiberoId={setLiberoId}
          players={players}
        />

        {/* Serve / Serve-Rec */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
            Set {setNumber} Start
          </label>
          <div className="flex gap-2">
            {[SIDE.US, SIDE.THEM].map((side) => (
              <button
                key={side}
                onClick={() => setServingSide(side)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                  ${servingSide === side
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-slate-300 border-slate-600 hover:border-slate-400'
                  }`}
              >
                {side === SIDE.US ? 'Serving' : 'Serve Rec'}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button
          size="lg"
          className="w-full"
          disabled={saving}
          onClick={handleConfirm}
        >
          {saving ? 'Saving…' : 'Save Lineup'}
        </Button>

      </div>
    </div>
  );
}
