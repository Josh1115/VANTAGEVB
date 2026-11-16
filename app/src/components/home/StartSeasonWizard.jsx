import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { STORAGE_KEYS, setStorageItem, getIntStorage } from '../../utils/storage';
import { useUiStore, selectShowToast } from '../../store/uiStore';
import {
  snapshotSeasonRoster, applyInferredSeasonFinish, isSeniorYear, gradeForNewSeason,
} from '../../utils/seasonUtils';

const GENDERS = [['F', 'Girls'], ['M', 'Boys'], ['Mixed', 'Mixed']];
const LEVEL_ORDER = ['varsity', 'jv', 'frosh', 'freshman'];
const levelRank = (l) => { const i = LEVEL_ORDER.indexOf(String(l ?? '').toLowerCase()); return i === -1 ? 99 : i; };

// Name the new season like the last one: "2026 Varsity" → "2027 Varsity".
function nextSeasonName(last, newYear) {
  const old = String(last?.name ?? '');
  if (last?.year != null && old.includes(String(last.year))) return old.replace(String(last.year), String(newYear));
  return `${newYear} Season`;
}

// Start New Season: finish the dashboard's open season → pick gender → pick level (team) → end the open season →
// choose returning players (grades move up) → create the new season.
export function StartSeasonWizard({ onClose, onDone }) {
  const navigate  = useNavigate();
  const showToast = useUiStore(selectShowToast);
  const [step, setStep]       = useState('start');
  // The season the dashboard is showing. If it's still open, finishing it comes first.
  const [currentSeasonId] = useState(() => getIntStorage(STORAGE_KEYS.DEFAULT_SEASON_ID));
  const current = useLiveQuery(async () => {
    const season = currentSeasonId ? await db.seasons.get(currentSeasonId) : null;
    if (!season) return { season: null, teamName: null };
    const t = await db.teams.get(season.team_id);
    return { season, teamName: t?.name ?? null };
  }, [currentSeasonId]);
  const [gender, setGender]   = useState(null);
  const [teamId, setTeamId]   = useState(null);
  const [year, setYear]       = useState('');
  const [checked, setChecked] = useState(null); // Set of player ids, filled on the roster step
  const [busy, setBusy]       = useState(false);

  const teams = useLiveQuery(async () => {
    const [ts, ss] = await Promise.all([db.teams.toArray(), db.seasons.toArray()]);
    return ts.map(t => {
      const own = ss.filter(s => s.team_id === t.id);
      const latest = own.length ? own.reduce((a, b) => (Number(b.year) > Number(a.year) ? b : a)) : null;
      return { ...t, latest, years: own.map(s => Number(s.year)) };
    });
  }, []);

  const team = teams?.find(t => t.id === teamId) ?? null;
  const genderTeams = useMemo(
    () => (teams ?? []).filter(t => (t.gender ?? null) === gender).sort((a, b) => levelRank(a.level) - levelRank(b.level)),
    [teams, gender],
  );
  const shownGenders = GENDERS.filter(([g]) => g !== 'Mixed' || (teams ?? []).some(t => t.gender === 'Mixed'));

  // Last season's roster: active players, anyone in its saved roster snapshot,
  // and anyone who recorded a stat in its matches (covers players archived by
  // the old "archive everyone" button). Duplicate copies of a player show once.
  const rosterInfo = useLiveQuery(async () => {
    if (!team) return { list: [], total: 0 };
    const snap = new Set(team.latest?.roster_uids ?? []);
    const all = (await db.players.where('team_id').equals(team.id).toArray()).filter(p => !p.removed);
    let statIds = new Set();
    if (team.latest) {
      const matchIds = (await db.matches.where('season_id').equals(team.latest.id).toArray()).map(m => m.id);
      if (matchIds.length) {
        const contacts = await db.contacts.where('match_id').anyOf(matchIds).toArray();
        statIds = new Set(contacts.map(c => c.player_id).filter(Boolean));
      }
    }
    const seen = new Set();
    const list = [];
    for (const p of all) {
      if (!(p.is_active !== false || (p.uid && snap.has(p.uid)) || statIds.has(p.id))) continue;
      const keys = [p.uid && `uid:${p.uid}`, p.name?.trim() && `name:${p.name.trim().toLowerCase()}`].filter(Boolean);
      if (keys.some(k => seen.has(k))) continue;
      keys.forEach(k => seen.add(k));
      list.push(p);
    }
    list.sort((a, b) => Number(a.jersey_number) - Number(b.jersey_number));
    return { list, total: all.length, seniorsAll: all.filter(p => isSeniorYear(p.year)).length };
  }, [team?.id, team?.latest?.id]);
  const players   = rosterInfo?.list;
  const returning = (players ?? []).filter(p => !isSeniorYear(p.year));
  const seniors   = (players ?? []).filter(p => isSeniorYear(p.year) && p.is_active !== false);
  const newYear   = Number(year);
  const yearTaken = team?.years.includes(newYear);

  function pickGender(g) {
    setGender(g);
    const first = (teams ?? []).filter(t => (t.gender ?? null) === g).sort((a, b) => levelRank(a.level) - levelRank(b.level))[0];
    pickTeam(first ?? null);
    setStep('level');
  }
  function pickTeam(t) {
    setTeamId(t?.id ?? null);
    setChecked(null);
    const base = t?.latest?.year != null ? Number(t.latest.year) + 1 : new Date().getFullYear();
    setYear(String(base));
  }
  function goNextFromLevel() {
    if (!team || !newYear || yearTaken) return;
    if (team.latest && team.latest.status !== 'ended') setStep('end');
    else setStep('roster');
  }
  async function endOldSeason(s = team.latest, next = 'roster') {
    setBusy(true);
    try {
      await snapshotSeasonRoster(s.id, s.team_id);
      await db.seasons.update(s.id, { status: 'ended' });
      await applyInferredSeasonFinish(s.id, s.team_id, s.year);
      setStep(next);
    } catch (err) {
      showToast(`Could not end season: ${err.message}`, 'error');
    } finally { setBusy(false); }
  }
  const isChecked = (id) => (checked ?? new Set(returning.map(p => p.id))).has(id);
  function toggle(id) {
    const next = new Set(checked ?? returning.map(p => p.id));
    next.has(id) ? next.delete(id) : next.add(id);
    setChecked(next);
  }

  async function create() {
    setBusy(true);
    try {
      const last = team.latest;
      // Plan every player change first, and save each player's before-values on the
      // season so deleting this season can undo the grade bumps and roster moves.
      const updates = [];
      for (const p of returning) {
        if (isChecked(p.id)) updates.push([p, { year: gradeForNewSeason(p, newYear), grade_year: newYear, is_active: true, jersey_number: '' }]); // new numbers entered by hand
        else if (p.is_active !== false) updates.push([p, { is_active: false }]);
      }
      for (const p of seniors) updates.push([p, { is_active: false }]);
      const before = updates.map(([p]) => ({
        id: p.id, uid: p.uid ?? null, year: p.year ?? null, grade_year: p.grade_year ?? null, is_active: p.is_active !== false, jersey_number: p.jersey_number ?? null,
      }));
      let seasonId;
      await db.transaction('rw', db.seasons, db.players, async () => {
        seasonId = await db.seasons.add({
          team_id: team.id,
          name: nextSeasonName(last, newYear),
          year: newYear,
          classification: last?.classification ?? null,
          class_rank: null,
          new_season_changes: { players: before },
        });
        for (const [p, upd] of updates) await db.players.update(p.id, upd);
      });
      setStorageItem(STORAGE_KEYS.DEFAULT_TEAM_ID, team.id);
      setStorageItem(STORAGE_KEYS.DEFAULT_SEASON_ID, seasonId);
      showToast(`${newYear} season started`, 'success');
      onDone?.();
    } catch (err) {
      showToast(`Could not start season: ${err.message}`, 'error');
      setBusy(false);
    }
  }

  const rowBtn = (active) => `w-full text-left rounded-xl px-3 py-2.5 border transition-colors ${active ? 'border-primary bg-primary/15 text-white' : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500'}`;

  return (
    <Modal title="Start New Season" onClose={onClose}>
      {teams === undefined || current === undefined ? null : step === 'start' && current.season && current.season.status !== 'ended' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            Before starting a new season, let's finish your{' '}
            <span className="font-bold text-white">{current.season.year}{current.teamName ? ` ${current.teamName}` : ''}</span> season.
          </p>
          <div className="rounded-lg bg-slate-800/60 px-3 py-2.5 text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-white">Finishing a season:</p>
            <p>• Marks it complete. It shows as finished on the History page.</p>
            <p>• Saves this season's roster and records your playoff finish and any title banner.</p>
            <p>• Keeps every match and stat. Nothing is deleted.</p>
          </div>
          <p className="text-sm text-slate-300">Ready to finish the {current.season.year} season?</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={onClose}>Not Yet</Button>
            <Button className="flex-1" disabled={busy} onClick={() => endOldSeason(current.season, 'gender')}>
              {busy ? 'Finishing…' : `Finish ${current.season.year} Season`}
            </Button>
          </div>
        </div>
      ) : step === 'gender' || step === 'start' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">Which program is this season for?</p>
          <div className="grid grid-cols-2 gap-2">
            {shownGenders.map(([g, label]) => (
              <button key={g} onClick={() => pickGender(g)} className={rowBtn(false) + ' text-center font-bold'}>{label}</button>
            ))}
          </div>
        </div>
      ) : step === 'level' ? (
        <div className="space-y-3">
          {genderTeams.length === 0 ? (
            <p className="text-sm text-slate-400">No {GENDERS.find(([g]) => g === gender)?.[1].toLowerCase()} teams in Vantage yet.</p>
          ) : (
            <>
              <p className="text-sm text-slate-400">Continue which team?</p>
              <div className="space-y-2">
                {genderTeams.map(t => (
                  <button key={t.id} onClick={() => pickTeam(t)} className={rowBtn(t.id === teamId)}>
                    <div className="font-semibold text-sm">{t.name ?? 'Team'}</div>
                    <div className="text-xs text-slate-400">{t.latest ? `Last season: ${t.latest.year}` : 'No seasons yet'}</div>
                  </button>
                ))}
              </div>
              <label className="block text-xs text-slate-400">
                New season year
                <input
                  type="number" inputMode="numeric" value={year} onChange={e => setYear(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white"
                />
              </label>
              {yearTaken && <p className="text-xs text-amber-400">This team already has a {newYear} season.</p>}
            </>
          )}
          <button onClick={() => navigate('/teams')} className="text-xs font-semibold text-primary">+ New level (create a team)</button>
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setStep('gender')}>Back</Button>
            <Button className="flex-1" disabled={!team || !newYear || yearTaken} onClick={goNextFromLevel}>Next</Button>
          </div>
        </div>
      ) : step === 'end' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            Your <span className="font-bold text-white">{team.latest.year}</span> season for {team.name} is still open.
            End it first so it gets its banner, roster snapshot and playoff finish.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setStep('level')}>Back</Button>
            <Button className="flex-1" disabled={busy} onClick={() => endOldSeason()}>{busy ? 'Ending…' : `End ${team.latest.year} Season`}</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Returning players for {newYear}. Uncheck anyone who isn't coming back. Grades move up one year, and last season's jersey numbers are cleared so you can enter new ones.
          </p>
          {returning.length === 0 ? (
            <p className="text-sm text-slate-500">
              No freshmen, sophomores or juniors on last season's roster.
              {rosterInfo && ` (${rosterInfo.total} player${rosterInfo.total !== 1 ? 's' : ''} on this team: ${rosterInfo.seniorsAll} senior${rosterInfo.seniorsAll !== 1 ? 's' : ''}, ${rosterInfo.total - rosterInfo.seniorsAll - returning.length} archived with no stats last season.)`}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {returning.map(p => {
                const to = gradeForNewSeason(p, newYear);
                return (
                  <label key={p.id} className="flex items-center gap-3 rounded-lg bg-slate-800/60 px-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={isChecked(p.id)} onChange={() => toggle(p.id)} className="accent-[#e8530b] w-4 h-4" />
                    <span className="flex-1 min-w-0 text-sm text-white truncate">
                      {p.name}
                    </span>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {p.year ? (to !== p.year ? `${p.year} → ${to}` : p.year) : 'No grade'}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {seniors.length > 0 && (
            <p className="text-xs text-slate-500">{seniors.length} senior{seniors.length !== 1 ? 's' : ''} will graduate off the active roster (stats are kept).</p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setStep('level')} disabled={busy}>Back</Button>
            <Button className="flex-1" disabled={busy} onClick={create}>{busy ? 'Starting…' : `Start ${newYear} Season`}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
