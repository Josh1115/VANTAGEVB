import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { useTeam, usePlayers, useSeasons } from '../hooks/useTeamData';
import { useUiStore, selectShowToast } from '../store/uiStore';
import { POSITION_KEYS, POSITIONS, TRACKABLE_STATS } from '../constants';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TabBar } from '../components/ui/Tab';
import { LineupForm } from '../components/match/LineupForm';
import { ROMAN } from '../components/court/CourtZonePicker';

const POS_COLOR = { S: 'blue', OH: 'orange', OPP: 'orange', MB: 'green', L: 'gray', DS: 'gray', RS: 'orange' };

function PlayerFormModal({ onClose, teamId, player }) {
  const [name, setName]       = useState(player?.name ?? '');
  const [jersey, setJersey]   = useState(player?.jersey_number ?? '');
  const [position, setPosition] = useState(player?.position ?? 'OH');
  const [secondaryPosition, setSecondaryPosition] = useState(player?.secondary_position ?? '');
  const [isCaptain, setIsCaptain] = useState(player?.is_captain ?? false);
  const [year, setYear] = useState(player?.year ?? '');
  const [heightFt, setHeightFt] = useState(player?.height_ft != null ? String(player.height_ft) : '');
  const [heightIn, setHeightIn] = useState(player?.height_in != null ? String(player.height_in) : '');
  const showToast = useUiStore(selectShowToast);

  const save = async () => {
    if (!name.trim()) return;
    try {
      const hFt = heightFt !== '' ? Number(heightFt) : null;
      const hIn = heightIn !== '' ? Number(heightIn) : null;
      if (player) {
        await db.players.update(player.id, { name: name.trim(), jersey_number: jersey.trim(), position, secondary_position: secondaryPosition || null, is_captain: isCaptain, year: year || null, height_ft: hFt, height_in: hIn });
      } else {
        await db.players.add({ team_id: teamId, name: name.trim(), jersey_number: jersey.trim(), position, secondary_position: secondaryPosition || null, is_captain: isCaptain, year: year || null, height_ft: hFt, height_in: hIn, is_active: true });
      }
      onClose();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  };

  return (
    <Modal
      title={player ? 'Edit Player' : 'Add Player'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Name</label>
          <input
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Emma Johnson"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Jersey #</label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={jersey}
              onChange={(e) => setJersey(e.target.value)}
              placeholder="11"
              maxLength={3}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Position</label>
            <select
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              {POSITION_KEYS.map((p) => (
                <option key={p} value={p}>{p} — {POSITIONS[p]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Secondary Position <span className="text-slate-500">(optional)</span></label>
          <select
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={secondaryPosition}
            onChange={(e) => setSecondaryPosition(e.target.value)}
          >
            <option value="">— None —</option>
            {POSITION_KEYS.filter((p) => p !== position).map((p) => (
              <option key={p} value={p}>{p} — {POSITIONS[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Year <span className="text-slate-500">(optional)</span></label>
          <select
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">— None —</option>
            <option value="Freshman">Freshman</option>
            <option value="Sophomore">Sophomore</option>
            <option value="Junior">Junior</option>
            <option value="Senior">Senior</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Height <span className="text-slate-500">(optional)</span></label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              className="w-20 bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={heightFt}
              onChange={(e) => setHeightFt(e.target.value)}
              placeholder="5"
              min={4}
              max={8}
            />
            <span className="text-slate-400">ft</span>
            <input
              type="number"
              className="w-20 bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={heightIn}
              onChange={(e) => setHeightIn(e.target.value)}
              placeholder="10"
              min={0}
              max={11}
            />
            <span className="text-slate-400">in</span>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-primary"
            checked={isCaptain}
            onChange={(e) => setIsCaptain(e.target.checked)}
          />
          <span className="text-sm text-slate-300">Captain</span>
        </label>
      </div>
    </Modal>
  );
}

function SeasonFormModal({ onClose, teamId, season }) {
  const [name, setName] = useState(season?.name ?? '');
  const [year, setYear] = useState(season?.year ?? new Date().getFullYear());
  const showToast = useUiStore(selectShowToast);

  const save = async () => {
    if (!name.trim()) return;
    try {
      if (season) {
        await db.seasons.update(season.id, { name: name.trim(), year: Number(year) });
      } else {
        await db.seasons.add({ team_id: teamId, name: name.trim(), year: Number(year) });
      }
      onClose();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  };

  return (
    <Modal
      title={season ? 'Edit Season' : 'New Season'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Season Name</label>
          <input
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fall 2025"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Year</label>
          <input
            type="number"
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

const RECORD_TYPES = [
  { value: 'individual_match',  label: 'Individual Match'  },
  { value: 'individual_season', label: 'Individual Season' },
  { value: 'team_match',        label: 'Team Match'        },
  { value: 'team_season',       label: 'Team Season'       },
];

function RecordFormModal({ onClose, teamId, record, type }) {
  const activeType   = record?.type ?? type;
  const isIndividual = activeType === 'individual_match' || activeType === 'individual_season';
  const isMatch      = activeType === 'individual_match' || activeType === 'team_match';
  const isLiveMatch  = activeType === 'individual_match' || activeType === 'team_match';

  // For live-tracked types, stat is a TRACKABLE_STATS key; otherwise free text
  const defaultStat = record?.stat ?? (isLiveMatch ? TRACKABLE_STATS[0].key : '');
  const [stat,        setStat]        = useState(defaultStat);
  const [value,       setValue]       = useState(record?.value        ?? '');
  const [playerName,  setPlayerName]  = useState(record?.player_name  ?? '');
  const [playerId,    setPlayerId]    = useState(record?.player_id     ?? '');
  const [opponent,    setOpponent]    = useState(record?.opponent      ?? '');
  const [date,        setDate]        = useState(record?.date          ?? '');
  const [seasonLabel, setSeasonLabel] = useState(record?.season_label ?? '');
  const [notes,       setNotes]       = useState(record?.notes         ?? '');
  const showToast = useUiStore(selectShowToast);

  const teamPlayers = useLiveQuery(
    () => activeType === 'individual_match'
      ? db.players.where('team_id').equals(teamId).filter((p) => p.is_active).toArray()
      : Promise.resolve([]),
    [teamId, activeType]
  );

  const save = async () => {
    if (!stat || !value.trim()) { showToast('Stat and value are required.', 'error'); return; }
    try {
      const resolvedPlayerId = activeType === 'individual_match' ? (playerId ? Number(playerId) : null) : null;
      // Resolve player_name from player picker if individual_match
      let resolvedPlayerName = playerName.trim() || null;
      if (activeType === 'individual_match' && resolvedPlayerId && teamPlayers) {
        const p = teamPlayers.find((pl) => pl.id === resolvedPlayerId);
        if (p) resolvedPlayerName = p.name;
      }
      const data = {
        team_id:      teamId,
        type:         activeType,
        stat:         stat,
        value:        value.trim(),
        player_name:  isIndividual ? resolvedPlayerName : null,
        player_id:    resolvedPlayerId,
        opponent:     isMatch      ? (opponent.trim()    || null) : null,
        date:         date.trim()         || null,
        season_label: seasonLabel.trim()  || null,
        notes:        notes.trim()        || null,
      };
      if (record) {
        await db.records.update(record.id, data);
      } else {
        await db.records.add(data);
      }
      onClose();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  };

  const typeLabel = RECORD_TYPES.find((t) => t.value === activeType)?.label ?? '';

  return (
    <Modal
      title={`${record ? 'Edit' : 'Add'} ${typeLabel} Record`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Stat</label>
            {isLiveMatch ? (
              <select
                className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
                value={stat}
                onChange={(e) => setStat(e.target.value)}
                autoFocus
              >
                {TRACKABLE_STATS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            ) : (
              <input
                className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
                value={stat}
                onChange={(e) => setStat(e.target.value)}
                placeholder="Kills"
                autoFocus
              />
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Value</label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="22"
            />
          </div>
        </div>
        {activeType === 'individual_match' && (
          <div>
            <label className="block text-sm text-slate-400 mb-1">Player</label>
            <select
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
            >
              <option value="">— Select Player —</option>
              {(teamPlayers ?? []).map((p) => (
                <option key={p.id} value={p.id}>#{p.jersey_number} {p.name}</option>
              ))}
            </select>
          </div>
        )}
        {isIndividual && activeType !== 'individual_match' && (
          <div>
            <label className="block text-sm text-slate-400 mb-1">Player Name</label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Emma Johnson"
            />
          </div>
        )}
        {isMatch && (
          <div>
            <label className="block text-sm text-slate-400 mb-1">Opponent <span className="text-slate-500">(optional)</span></label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Riverside"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Season <span className="text-slate-500">(optional)</span></label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={seasonLabel}
              onChange={(e) => setSeasonLabel(e.target.value)}
              placeholder="Fall 2025"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Date <span className="text-slate-500">(optional)</span></label>
            <input
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="9/14/25"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Notes <span className="text-slate-500">(optional)</span></label>
          <input
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Playoff game"
          />
        </div>
      </div>
    </Modal>
  );
}

function SavedLineupModal({ onClose, teamId, savedLineup, activePlayers }) {
  const [name,          setName]          = useState(savedLineup?.name ?? '');
  const [lineup,        setLineup]        = useState(savedLineup?.serve_order ?? Array(6).fill(''));
  const [slotPositions, setSlotPositions] = useState(savedLineup?.slot_positions ?? Array(6).fill(''));
  const [startZone,     setStartZone]     = useState(savedLineup?.start_zone ?? 1);
  const [liberoId,      setLiberoId]      = useState(savedLineup?.libero_player_id ? String(savedLineup.libero_player_id) : '');
  const showToast = useUiStore(selectShowToast);

  const save = async () => {
    if (!name.trim()) { showToast('Enter a lineup name.', 'error'); return; }
    if (lineup.some((id) => !id)) { showToast('Assign a player to every serve position.', 'error'); return; }
    try {
      const data = {
        team_id:          teamId,
        name:             name.trim(),
        serve_order:      lineup,
        slot_positions:   slotPositions,
        start_zone:       startZone,
        libero_player_id: liberoId ? Number(liberoId) : null,
      };
      if (savedLineup) {
        await db.saved_lineups.update(savedLineup.id, data);
      } else {
        await db.saved_lineups.add(data);
      }
      onClose();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  };

  return (
    <Modal
      title={savedLineup ? 'Edit Lineup' : 'Save Lineup'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Lineup Name</label>
          <input
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Base Rotation, 6-2 Serve Receive"
            autoFocus
          />
        </div>
        <LineupForm
          lineup={lineup}
          setLineup={setLineup}
          slotPositions={slotPositions}
          setSlotPositions={setSlotPositions}
          startZone={startZone}
          setStartZone={setStartZone}
          liberoId={liberoId}
          setLiberoId={setLiberoId}
          players={activePlayers}
        />
      </div>
    </Modal>
  );
}

export function TeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const id = Number(teamId);
  const team    = useTeam(id);
  const players = usePlayers(id);
  const seasons = useSeasons(id);

  // Memoized splits to avoid O(n) filter on every render
  const activePlayers = useMemo(
    () => (players ?? []).filter((p) => p.is_active).sort((a, b) => Number(a.jersey_number) - Number(b.jersey_number)),
    [players]
  );
  const inactivePlayers = useMemo(
    () => (players ?? []).filter((p) => !p.is_active),
    [players]
  );

  const savedLineups = useLiveQuery(
    () => db.saved_lineups.where('team_id').equals(id).toArray(),
    [id]
  );

  const records = useLiveQuery(
    () => db.records.where('team_id').equals(id).toArray(),
    [id]
  );

  const [tab, setTab]             = useState('roster');
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editPlayer, setEditPlayer]           = useState(null);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [editSeason, setEditSeason]           = useState(null);
  const [deletePlayer, setDeletePlayer]       = useState(null);
  const [showLineupModal, setShowLineupModal] = useState(false);
  const [editLineup, setEditLineup]           = useState(null);
  const [deleteLineup, setDeleteLineup]       = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [addRecordType,   setAddRecordType]   = useState(null);
  const [editRecord,      setEditRecord]      = useState(null);
  const [deleteRecord,    setDeleteRecord]    = useState(null);
  const showToast = useUiStore(selectShowToast);

  const removePlayer = async () => {
    try {
      await db.players.update(deletePlayer.id, { is_active: false });
      setDeletePlayer(null);
    } catch (err) {
      showToast(`Remove failed: ${err.message}`, 'error');
    }
  };

  return (
    <div>
      <PageHeader title={team?.name ?? 'Team'} backTo="/teams" />
      {(team?.state || team?.school_year) && (
        <div className="px-4 pb-2 flex gap-2 text-sm text-slate-400">
          {team.state && <span>{team.state}</span>}
          {team.state && team.school_year && <span>·</span>}
          {team.school_year && <span>{team.school_year}</span>}
        </div>
      )}

      <TabBar
        tabs={[
          { value: 'roster',  label: `Roster (${activePlayers.length})` },
          { value: 'lineups', label: 'Lineups' },
          { value: 'seasons', label: 'Seasons' },
          { value: 'records', label: 'Records' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'roster' && (
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-slate-400">{activePlayers.length} active</span>
            <Button size="sm" onClick={() => setShowPlayerModal(true)}>+ Player</Button>
          </div>

          {activePlayers.length === 0 ? (
            <EmptyState
              icon="🏐"
              title="No players yet"
              description="Add players to build the roster"
              action={<Button onClick={() => setShowPlayerModal(true)}>Add Player</Button>}
            />
          ) : (
            <div className="space-y-2">
              {activePlayers.map((player) => (
                <div key={player.id} className="bg-surface rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-mono font-bold text-primary shrink-0">
                    #{player.jersey_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {player.name}
                      {player.is_captain && <span className="ml-1.5 text-xs font-bold text-yellow-400">C</span>}
                    </div>
                    <div className="flex gap-1 flex-wrap items-center">
                      <Badge color={POS_COLOR[player.position] ?? 'gray'}>{player.position}</Badge>
                      {player.secondary_position && (
                        <Badge color={POS_COLOR[player.secondary_position] ?? 'gray'}>{player.secondary_position}</Badge>
                      )}
                      {player.height_ft != null && (
                        <span className="text-xs text-slate-400">{player.height_ft}'{player.height_in != null ? player.height_in : 0}"</span>
                      )}
                      {player.year && <span className="text-xs text-slate-400">{player.year}</span>}
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => setEditPlayer(player)} className="text-slate-400 hover:text-white text-sm">Edit</button>
                    <button onClick={() => setDeletePlayer(player)} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {inactivePlayers.length > 0 && (
            <p className="text-xs text-slate-500 mt-4 text-center">
              {inactivePlayers.length} inactive player{inactivePlayers.length !== 1 ? 's' : ''} hidden
            </p>
          )}
        </div>
      )}

      {tab === 'lineups' && (
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-slate-400">{savedLineups?.length ?? 0} saved</span>
            <Button size="sm" onClick={() => setShowLineupModal(true)}>+ Lineup</Button>
          </div>

          {(savedLineups ?? []).length === 0 ? (
            <EmptyState
              icon="📋"
              title="No saved lineups"
              description="Save a lineup to quickly load it during match or set setup"
              action={<Button onClick={() => setShowLineupModal(true)}>Save Lineup</Button>}
            />
          ) : (
            <div className="space-y-2">
              {savedLineups.map((sl) => {
                const playerMap = Object.fromEntries(activePlayers.map((p) => [String(p.id), p]));
                const libero = sl.libero_player_id ? playerMap[String(sl.libero_player_id)] : null;
                return (
                  <div key={sl.id} className="bg-surface rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{sl.name}</span>
                      <div className="flex gap-3">
                        <button onClick={() => setEditLineup(sl)} className="text-slate-400 hover:text-white text-sm">Edit</button>
                        <button onClick={() => setDeleteLineup(sl)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {sl.serve_order.map((pid, i) => {
                        const p = playerMap[pid];
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-orange-400 font-black w-6 text-right shrink-0">{ROMAN[i]}</span>
                            {p
                              ? <span className="text-slate-200">#{p.jersey_number} {p.name} <span className="text-slate-500">({p.position})</span></span>
                              : <span className="text-slate-600 italic">unassigned</span>
                            }
                          </div>
                        );
                      })}
                      {libero && (
                        <div className="flex items-center gap-2 text-sm mt-1 pt-1 border-t border-slate-700">
                          <span className="text-slate-500 font-semibold w-6 text-right shrink-0">L</span>
                          <span className="text-slate-300">#{libero.jersey_number} {libero.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'seasons' && (
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-slate-400">{seasons?.length ?? 0} seasons</span>
            <Button size="sm" onClick={() => setShowSeasonModal(true)}>+ Season</Button>
          </div>

          {seasons?.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No seasons yet"
              description="Add a season to organize your matches"
              action={<Button onClick={() => setShowSeasonModal(true)}>Add Season</Button>}
            />
          ) : (
            <div className="space-y-2">
              {seasons?.map((season) => (
                <div key={season.id} className="bg-surface rounded-xl flex items-center hover:bg-slate-700 transition-colors">
                  <button
                    onClick={() => navigate(`/seasons/${season.id}`)}
                    className="flex-1 px-4 py-3 text-left flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold">{season.name}</div>
                      <div className="text-sm text-slate-400">{season.year}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditSeason(season)}
                    className="px-3 py-3 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Edit season"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'records' && (
        <div className="p-4 md:p-6 space-y-6">
          {RECORD_TYPES.map(({ value: type, label }) => {
            const typeRecords = (records ?? []).filter((r) => r.type === type);
            return (
              <section key={type}>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">{label}</h2>
                  <Button size="sm" onClick={() => { setAddRecordType(type); setShowRecordModal(true); }}>+ Record</Button>
                </div>
                {typeRecords.length === 0 ? (
                  <p className="text-sm text-slate-600 text-center py-3 bg-surface rounded-xl">No records yet</p>
                ) : (
                  <div className="space-y-2">
                    {typeRecords.map((rec) => (
                      <div key={rec.id} className="bg-surface rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-black text-primary text-xl tabular-nums">{rec.value}</span>
                            <span className="font-semibold text-white">{rec.stat}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs text-slate-400">
                            {rec.player_name  && <span>{rec.player_name}</span>}
                            {rec.opponent     && <span>vs. {rec.opponent}</span>}
                            {rec.season_label && <span>{rec.season_label}</span>}
                            {rec.date         && <span>{rec.date}</span>}
                            {rec.notes        && <span className="text-slate-500 italic">{rec.notes}</span>}
                          </div>
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button onClick={() => setEditRecord(rec)} className="text-slate-400 hover:text-white text-sm">Edit</button>
                          <button onClick={() => setDeleteRecord(rec)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {(showPlayerModal || editPlayer) && (
        <PlayerFormModal
          teamId={id}
          player={editPlayer}
          onClose={() => { setShowPlayerModal(false); setEditPlayer(null); }}
        />
      )}

      {(showSeasonModal || editSeason) && (
        <SeasonFormModal
          teamId={id}
          season={editSeason ?? undefined}
          onClose={() => { setShowSeasonModal(false); setEditSeason(null); }}
        />
      )}

      {(showLineupModal || editLineup) && (
        <SavedLineupModal
          teamId={id}
          savedLineup={editLineup}
          activePlayers={activePlayers}
          onClose={() => { setShowLineupModal(false); setEditLineup(null); }}
        />
      )}

      {deleteLineup && (
        <ConfirmDialog
          title="Delete Lineup"
          message={`Delete "${deleteLineup.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={async () => { await db.saved_lineups.delete(deleteLineup.id); setDeleteLineup(null); }}
          onCancel={() => setDeleteLineup(null)}
        />
      )}

      {deletePlayer && (
        <ConfirmDialog
          title="Remove Player"
          message={`Remove ${deletePlayer.name} from the active roster?`}
          confirmLabel="Remove"
          danger
          onConfirm={removePlayer}
          onCancel={() => setDeletePlayer(null)}
        />
      )}

      {(showRecordModal || editRecord) && (
        <RecordFormModal
          teamId={id}
          record={editRecord}
          type={addRecordType}
          onClose={() => { setShowRecordModal(false); setAddRecordType(null); setEditRecord(null); }}
        />
      )}

      {deleteRecord && (
        <ConfirmDialog
          title="Delete Record"
          message={`Delete this ${deleteRecord.stat} record? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={async () => { await db.records.delete(deleteRecord.id); setDeleteRecord(null); }}
          onCancel={() => setDeleteRecord(null)}
        />
      )}
    </div>
  );
}
