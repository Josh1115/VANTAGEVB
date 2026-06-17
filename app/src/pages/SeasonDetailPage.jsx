import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { MATCH_STATUS } from '../constants';
import { fmtDate, fmtHitting, fmtPct } from '../stats/formatters';
import { computeMatchStats, computeTeamStats, computePlayerStats } from '../stats/engine';
import { exportMaxPrepsCSV } from '../stats/export';
import { getStorageItem, STORAGE_KEYS, getPlayoffLabel } from '../utils/storage';
import { deleteMatch } from '../stats/queries';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SwipeableMatchCard } from '../components/ui/SwipeableMatchCard';
import { PostSeasonModal } from '../components/shared/PostSeasonModal';
import { applyInferredSeasonFinish } from '../utils/seasonUtils';
import { PvShareSheet } from '../components/parentvantage/PvShareSheet';
import { ScheduleImportModal } from '../components/match/ScheduleImportModal';


export function SeasonDetailPage() {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const id = Number(seasonId);
  const playoffLabel = getPlayoffLabel();

  const data = useLiveQuery(async () => {
    const season = await db.seasons.get(id);
    if (!season) return null;
    const team = await db.teams.get(season.team_id);
    const rawMatches = (await db.matches.where('season_id').equals(id).toArray())
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Join opponent names
    const oppIds = [...new Set(rawMatches.map((m) => m.opponent_id).filter(Boolean))];
    const opps = oppIds.length ? await db.opponents.bulkGet(oppIds) : [];
    const oppMap = Object.fromEntries(opps.filter(Boolean).map((o) => [o.id, o.name]));

    const matches = rawMatches.map((m) => ({
      ...m,
      opponent_name: m.opponent_name ?? oppMap[m.opponent_id] ?? 'Unknown',
    }));

    const players = await db.players.where('team_id').equals(season.team_id).toArray();
    const playerNames   = Object.fromEntries(players.map((p) => [p.id, p.name]));
    const playerJerseys = Object.fromEntries(players.map((p) => [p.id, p.jersey_number ?? '']));

    return { season, team, matches, playerNames, playerJerseys };
  }, [id]);

  const orgLogoDataUrl = useLiveQuery(
    () => data?.team?.org_id ? db.organizations.get(data.team.org_id).then(o => o?.logo_data_url ?? null) : Promise.resolve(null),
    [data?.team?.org_id]
  );

  const historyEntry = useLiveQuery(
    () => data?.season
      ? db.season_history
          .where({ team_id: data.season.team_id, year: String(data.season.year) })
          .first()
      : undefined,
    [data?.season?.team_id, data?.season?.year]
  );

  const seasonStats = useLiveQuery(async () => {
    const season = await db.seasons.get(id);
    if (!season) return null;
    const completedMatches = await db.matches.where('season_id').equals(id)
      .filter((m) => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition')
      .toArray();
    if (!completedMatches.length) return null;
    const matchIds = completedMatches.map((m) => m.id);
    const [contacts, players] = await Promise.all([
      db.contacts.where('match_id').anyOf(matchIds).toArray(),
      db.players.where('team_id').equals(season.team_id).toArray(),
    ]);
    const nameMap = Object.fromEntries(players.map((p) => [p.id, p.name ?? `#${p.jersey_number}`]));
    const ts = computeTeamStats(contacts);
    const ps = computePlayerStats(contacts);
    function findLeader(getValue) {
      let best = null;
      for (const [pid, stat] of Object.entries(ps)) {
        const val = getValue(stat);
        if (val > 0 && (!best || val > best.val))
          best = { name: nameMap[pid] ?? '—', val, id: Number(pid) };
      }
      return best;
    }
    return {
      team: ts,
      teamId: season.team_id,
      leaders: {
        kills:   findLeader(s => (s.ta  ?? 0) >= 10 ? (s.k   ?? 0) : 0),
        aces:    findLeader(s => (s.sa  ?? 0) >= 10 ? (s.ace  ?? 0) : 0),
        blocks:  findLeader(s => (s.bs ?? 0) + (s.ba ?? 0) + (s.be ?? 0) >= 10 ? (s.bs ?? 0) + (s.ba ?? 0) : 0),
        digs:    findLeader(s => (s.dig ?? 0) >= 10 ? (s.dig  ?? 0) : 0),
        assists: findLeader(s => (s.ast ?? 0) + (s.bhe ?? 0) >= 10 ? (s.ast ?? 0) : 0),
        rec:     findLeader(s => (s.pa  ?? 0) >= 10 ? (s.pa   ?? 0) : 0),
        apr:     findLeader(s => (s.pa  ?? 0) >= 10 ? (s.apr  ?? 0) : 0),
      },
    };
  }, [id]);

  // Schedule-game modal state (must be before early return)
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmEndSeason, setConfirmEndSeason] = useState(false);
  const [pvShareMatch, setPvShareMatch] = useState(null);
  const [showPostSeason,   setShowPostSeason]   = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [schedOpen,      setSchedOpen]      = useState(false);
  const [editMatchId,    setEditMatchId]    = useState(null);
  const [schedOpp,       setSchedOpp]       = useState('');
  const [schedOppAbbr,   setSchedOppAbbr]   = useState('');
  const [schedDate,      setSchedDate]      = useState(() => new Date().toISOString().slice(0, 10));
  const [schedLoc,       setSchedLoc]       = useState('home');
  const [schedConf,      setSchedConf]      = useState('non-con');
  const [schedMatchType,    setSchedMatchType]    = useState('reg-season');
  const [schedTourneyName,  setSchedTourneyName]  = useState('');
  const [schedTourneyRound, setSchedTourneyRound] = useState('pool');
  const [schedPlayoffRound, setSchedPlayoffRound] = useState('');
  const [schedOppRecord,    setSchedOppRecord]    = useState('');
  const [schedOppRank,      setSchedOppRank]      = useState('');
  const [schedOppSeed,      setSchedOppSeed]      = useState('');
  const [schedTime,         setSchedTime]         = useState('');
  const [schedSaving,    setSchedSaving]    = useState(false);

  // Auto-sync completed playoff matches into season_history.playoff_rounds.
  // Idempotent: matches already present (by round+opponent) are skipped.
  const syncedMatchIds = useRef(new Set());
  useEffect(() => {
    if (!data) return;
    const { season, matches } = data;

    const ROUND_ORDER = ['regional','sectional','super-sectional','quarterfinal','semifinal','state championship'];

    const completed = matches.filter(
      m => m.status === MATCH_STATUS.COMPLETE && m.match_type === 'ihsa-playoffs'
        && !syncedMatchIds.current.has(m.id)
    );
    if (completed.length === 0) return;

    (async () => {
      const existing = await db.season_history
        .where('team_id').equals(season.team_id)
        .filter(h => String(h.year) === String(season.year))
        .first();

      const existingRounds = existing?.playoff_rounds ?? [];

      const newRounds = completed
        .filter(m => {
          const rName = (m.playoff_round ?? '').trim().toLowerCase();
          const oName = (m.opponent_name ?? '').trim().toLowerCase();
          return !existingRounds.some(
            r => r.round?.trim().toLowerCase() === rName && r.opponent?.trim().toLowerCase() === oName
          );
        })
        .map(m => ({
          round:    m.playoff_round ?? '',
          opponent: m.opponent_name ?? '',
          result:   (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0) ? 'W' : 'L',
          score:    `${m.our_sets_won ?? 0}-${m.opp_sets_won ?? 0}`,
          opp_seed: m.opponent_playoff_seed != null ? String(m.opponent_playoff_seed) : '',
        }));

      if (newRounds.length === 0) {
        completed.forEach(m => syncedMatchIds.current.add(m.id));
        return;
      }

      const merged = [...existingRounds, ...newRounds].sort((a, b) => {
        const ai = ROUND_ORDER.indexOf(a.round?.toLowerCase() ?? '');
        const bi = ROUND_ORDER.indexOf(b.round?.toLowerCase() ?? '');
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

      if (existing) {
        await db.season_history.update(existing.id, { playoff_rounds: merged });
      } else {
        await db.season_history.add({ team_id: season.team_id, year: season.year, playoff_rounds: merged });
      }

      completed.forEach(m => syncedMatchIds.current.add(m.id));
    })();
  }, [data]);

  if (!data) return null;
  const { season, team, matches, playerNames, playerJerseys } = data;

  const classification = season.classification ?? null;
  const classRank      = historyEntry?.class_rank   ?? null;
  const stateRank      = historyEntry?.state_rank    ?? null;
  const nationalRank   = historyEntry?.national_rank ?? null;
  const hasRankings    = classification || classRank != null || stateRank != null || nationalRank != null;

  async function handleMaxPreps(e, matchId) {
    e.stopPropagation();
    const uuid = getStorageItem(STORAGE_KEYS.MAXPREPS_TEAM_ID, '');
    const stats = await computeMatchStats(matchId);
    exportMaxPrepsCSV(stats.players, playerNames, playerJerseys, stats.setsPlayed, uuid, `match-${matchId}-maxpreps.txt`);
  }

  function resetSchedForm() {
    setEditMatchId(null);
    setSchedOpp('');
    setSchedOppAbbr('');
    setSchedDate(new Date().toISOString().slice(0, 10));
    setSchedLoc('home');
    setSchedConf('non-con');
    setSchedMatchType('reg-season');
    setSchedTourneyName('');
    setSchedTourneyRound('pool');
    setSchedPlayoffRound('');
    setSchedOppRecord('');
    setSchedOppRank('');
    setSchedOppSeed('');
    setSchedTime('');
    setSchedOpen(false);
  }

  function openEditMatch(match) {
    setEditMatchId(match.id);
    setSchedOpp(match.opponent_name ?? '');
    setSchedOppAbbr(match.opponent_abbr ?? '');
    setSchedDate(match.date ? match.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setSchedLoc(match.location ?? 'home');
    setSchedConf(match.conference ?? 'non-con');
    setSchedMatchType(match.match_type ?? 'reg-season');
    setSchedTourneyName(match.tournament_name ?? '');
    setSchedTourneyRound(match.tournament_round ?? 'pool');
    setSchedPlayoffRound(match.playoff_round ?? '');
    setSchedOppRecord(match.opponent_record ?? '');
    setSchedOppRank(match.opponent_maxpreps_rank != null ? String(match.opponent_maxpreps_rank) : '');
    setSchedOppSeed(match.opponent_playoff_seed != null ? String(match.opponent_playoff_seed) : '');
    setSchedTime(match.match_time ?? '');
    setSchedOpen(true);
  }

  async function handleScheduleGame() {
    if (!schedOpp.trim()) return;
    setSchedSaving(true);
    try {
      let oppRecord = await db.opponents.where('name').equals(schedOpp.trim()).first();
      if (!oppRecord) {
        const oppId = await db.opponents.add({ name: schedOpp.trim() });
        oppRecord = { id: oppId, name: schedOpp.trim() };
      }
      const fields = {
        opponent_id:   oppRecord.id,
        opponent_name: oppRecord.name,
        opponent_abbr:          schedOppAbbr.trim().toUpperCase() || null,
        opponent_record:        schedOppRecord.trim() || null,
        opponent_maxpreps_rank: schedOppRank !== '' ? parseInt(schedOppRank, 10) : null,
        date:          schedDate ? new Date(schedDate + 'T12:00:00').toISOString() : new Date().toISOString(),
        match_time:    schedTime || null,
        location:      schedLoc,
        conference:    schedConf,
        match_type:       schedMatchType,
        tournament_name:  schedMatchType === 'tourney' ? schedTourneyName.trim() || null : null,
        tournament_round: schedMatchType === 'tourney' ? schedTourneyRound : null,
        playoff_round:         schedMatchType === 'ihsa-playoffs' ? schedPlayoffRound.trim() || null : null,
        opponent_playoff_seed: schedMatchType === 'ihsa-playoffs' && schedOppSeed !== '' ? parseInt(schedOppSeed, 10) : null,
      };
      if (editMatchId) {
        const existing = await db.matches.get(editMatchId);
        await db.matches.update(editMatchId, {
          ...fields,
          pv_token: existing?.pv_token ?? crypto.randomUUID(),
        });
      } else {
        await db.matches.add({ season_id: id, status: MATCH_STATUS.SCHEDULED, pv_token: crypto.randomUUID(), ...fields });
      }
      resetSchedForm();
    } finally {
      setSchedSaving(false);
    }
  }

  const completedNonExhib = matches.filter(
    (m) => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition'
  );
  const wins   = completedNonExhib.filter((m) => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
  const losses = completedNonExhib.filter((m) => (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)).length;

  function splitRecord(arr) {
    const w = arr.filter((m) => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
    const l = arr.filter((m) => (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)).length;
    return { w, l, any: w + l > 0 };
  }
  const homeRec    = splitRecord(completedNonExhib.filter((m) => m.location === 'home'));
  const awayRec    = splitRecord(completedNonExhib.filter((m) => m.location === 'away'));
  const neutRec    = splitRecord(completedNonExhib.filter((m) => m.location === 'neutral'));
  const confRec    = splitRecord(completedNonExhib.filter((m) => m.conference === 'conference'));
  const tourneyRec = splitRecord(completedNonExhib.filter((m) => m.match_type === 'tourney'));
  const last5      = completedNonExhib.slice(0, 5);

  return (
    <div>
      <PageHeader title={season.name ?? String(season.year)} backTo="/seasons" />

      <div className="p-4 md:p-6 space-y-4">
        {/* Season info card */}
        <div className="bg-surface rounded-xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{team?.name ?? '—'}</div>
              <div className="text-sm text-slate-400">{season.year}</div>
            </div>
            {hasRankings && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
                {classification && (
                  <span className="text-sm font-bold text-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1">Class</span>
                    {classification}{classRank ? ` #${classRank}` : ''}
                  </span>
                )}
                {stateRank != null && (
                  <span className="text-sm font-bold text-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1">State</span>
                    #{stateRank}
                  </span>
                )}
                {nationalRank != null && (
                  <span className="text-sm font-bold text-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1">Natl</span>
                    #{nationalRank}
                  </span>
                )}
              </div>
            )}
            {completedNonExhib.length > 0 && (
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-lg">{wins}–{losses}</div>
                <div className="text-xs text-slate-400">W–L</div>
              </div>
            )}
          </div>

          {completedNonExhib.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700/60 flex flex-wrap gap-x-4 gap-y-1.5 items-center justify-center">
              {homeRec.any && (
                <span className="text-xs font-semibold text-slate-300">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1">Home</span>
                  {homeRec.w}–{homeRec.l}
                </span>
              )}
              {awayRec.any && (
                <span className="text-xs font-semibold text-slate-300">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1">Away</span>
                  {awayRec.w}–{awayRec.l}
                </span>
              )}
              {neutRec.any && (
                <span className="text-xs font-semibold text-slate-300">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1">Neut</span>
                  {neutRec.w}–{neutRec.l}
                </span>
              )}
              {confRec.any && (
                <span className="text-xs font-semibold text-slate-300">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1">Conf</span>
                  {confRec.w}–{confRec.l}
                </span>
              )}
              {tourneyRec.any && (
                <span className="text-xs font-semibold text-slate-300">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1">Tourn</span>
                  {tourneyRec.w}–{tourneyRec.l}
                </span>
              )}
              {last5.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-0.5">L5</span>
                  {last5.map((m, i) => {
                    const won = (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0);
                    return (
                      <span key={i} className={`text-[10px] font-black px-1 py-0.5 rounded ${won ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'}`}>
                        {won ? 'W' : 'L'}
                      </span>
                    );
                  })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Season Leaders + Team stat boxes */}
        {seasonStats && (() => {
          const STATS = [
            { label: 'K',   leaderKey: 'kills',   ttKey: 'k',   navKey: 'k'   },
            { label: 'ACE', leaderKey: 'aces',    ttKey: 'ace', navKey: 'ace' },
            { label: 'BLK', leaderKey: 'blocks',  ttKey: 'blk', navKey: 'blk', fmt: v => Number(v) % 1 === 0 ? String(Math.round(v)) : Number(v).toFixed(1) },
            { label: 'DIG', leaderKey: 'digs',    ttKey: 'dig', navKey: 'dig' },
            { label: 'AST', leaderKey: 'assists', ttKey: 'ast', navKey: 'ast' },
            { label: 'REC', leaderKey: 'rec',     ttKey: 'pa',  navKey: 'pa'  },
            { label: 'APR', leaderKey: 'apr',     ttKey: 'apr', navKey: 'apr', fmt: v => Number(v).toFixed(2), noAvg: true },
          ];
          const mc = completedNonExhib.length;
          return (
            <div className="space-y-2">
              {/* Season Leaders */}
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white px-0.5">Season Leaders</p>
              <div className="grid grid-cols-7 gap-2">
                {STATS.map(({ label, leaderKey, navKey, fmt }) => {
                  const leader = seasonStats.leaders[leaderKey];
                  return (
                    <button
                      key={leaderKey}
                      onClick={() => leader?.id && navigate(`/teams/${seasonStats.teamId}/players/${leader.id}?season=${id}&stat=${navKey}`)}
                      disabled={!leader?.id}
                      className="bg-surface rounded-xl p-2 text-center flex flex-col items-center gap-1 active:scale-95 transition-transform disabled:active:scale-100"
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">{label}</span>
                      {leader ? (
                        <>
                          <span className="text-xl font-black text-primary tabular-nums leading-none">{fmt ? fmt(leader.val) : leader.val}</span>
                          <span className="text-[10px] font-semibold text-slate-300 leading-tight text-center break-words w-full">{leader.name}</span>
                        </>
                      ) : (
                        <span className="text-xl font-black text-slate-600 leading-none">—</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Team Totals */}
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white px-0.5">Team Totals</p>
              <div className="grid grid-cols-7 gap-2">
                {STATS.map(({ label, ttKey, fmt, noAvg }) => {
                  const val = seasonStats.team[ttKey];
                  const perMatch = !noAvg && val != null && mc > 0 ? val / mc : null;
                  const fmtPM = perMatch != null
                    ? (perMatch % 1 === 0 ? String(Math.round(perMatch)) : perMatch.toFixed(1))
                    : null;
                  return (
                    <button
                      key={ttKey}
                      onClick={() => navigate(`/seasons/${id}/team?stat=${ttKey}`)}
                      className="bg-surface rounded-xl p-2 text-center flex flex-col items-center gap-1 active:scale-95 transition-transform"
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">{label}</span>
                      <span className="text-xl font-black text-primary tabular-nums leading-none">
                        {val != null ? (fmt ? fmt(val) : val) : '—'}
                      </span>
                      {fmtPM != null && (
                        <span className="text-[9px] font-semibold text-white leading-none tabular-nums">
                          {fmtPM}<span className="text-white">/M</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Percentage boxes */}
              {(seasonStats.team.hit_pct != null || seasonStats.team.si_pct != null || seasonStats.team.ace_pct != null) && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'HIT%', val: fmtHitting(seasonStats.team.hit_pct), stat: 'hit_pct' },
                    { label: 'SRV%', val: fmtPct(seasonStats.team.si_pct),      stat: 'si_pct'  },
                    { label: 'ACE%', val: fmtPct(seasonStats.team.ace_pct),     stat: 'ace_pct' },
                  ].map(({ label, val, stat }) => (
                    <button
                      key={label}
                      onClick={() => navigate(`/seasons/${id}/team?stat=${stat}`)}
                      className="bg-surface rounded-xl p-3 text-center active:scale-95 transition-transform"
                    >
                      <div className="text-[10px] font-black uppercase tracking-wider text-white">{label}</div>
                      <div className="text-xl font-black text-primary tabular-nums mt-0.5">{val}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Tournament Summary — only shown when there are tourney matches */}
        {(() => {
          const tourney = matches.filter(m => m.match_type === 'tourney');
          if (!tourney.length) return null;
          const grouped = {};
          for (const m of tourney) {
            const key = m.tournament_name?.trim() || 'Unnamed Tournament';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(m);
          }
          const groups = Object.entries(grouped).sort((a, b) => {
            const aDate = a[1][0]?.date ?? '';
            const bDate = b[1][0]?.date ?? '';
            return aDate.localeCompare(bDate);
          });
          return (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Tournaments ({groups.length})
              </h2>
              <div className="space-y-3">
                {groups.map(([name, tMatches]) => {
                  const completed = tMatches.filter(m => m.status === MATCH_STATUS.COMPLETE);
                  const wins   = completed.filter(m => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
                  const losses = completed.filter(m => (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)).length;
                  return (
                    <div key={name} className="bg-surface rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white text-sm">{name}</span>
                        {completed.length > 0 && (
                          <span className="text-sm font-mono font-bold">{wins}–{losses}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {tMatches.map(m => {
                          const won  = (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0);
                          const lost = (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0);
                          return (
                            <button
                              key={m.id}
                              onClick={() => m.status === MATCH_STATUS.COMPLETE
                                ? navigate(`/matches/${m.id}/summary`)
                                : m.status === MATCH_STATUS.IN_PROGRESS
                                ? navigate(`/matches/${m.id}/live`)
                                : null
                              }
                              disabled={m.status === MATCH_STATUS.SCHEDULED}
                              className="w-full flex items-center justify-between text-sm px-2 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors disabled:cursor-default disabled:hover:bg-slate-800/50"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {m.status === MATCH_STATUS.COMPLETE && (
                                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${won ? 'bg-emerald-900/60 text-emerald-400' : lost ? 'bg-red-900/60 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                                    {won ? 'W' : 'L'}
                                  </span>
                                )}
                                <span className="text-slate-200 truncate">{m.opponent_name}</span>
                                {m.tournament_round && (
                                  <span className="text-[10px] text-slate-500 capitalize shrink-0">{m.tournament_round}</span>
                                )}
                              </div>
                              <div className="shrink-0 ml-2">
                                {m.status === MATCH_STATUS.COMPLETE && (
                                  <span className="text-xs font-mono text-slate-400">{m.our_sets_won ?? 0}–{m.opp_sets_won ?? 0}</span>
                                )}
                                {m.status === MATCH_STATUS.SCHEDULED && (
                                  <span className="text-[10px] font-semibold text-amber-400">Scheduled</span>
                                )}
                                {m.status === MATCH_STATUS.IN_PROGRESS && (
                                  <span className="text-[10px] font-semibold text-primary">Live</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* Matches */}
        <section>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Matches ({matches.length})
            </h2>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowImport(true)}>Import CSV</Button>
              <Button size="sm" variant="secondary" className="bg-blue-600 border-blue-600 text-white hover:bg-blue-500 hover:border-blue-500" onClick={() => setSchedOpen(true)}>+ Schedule</Button>
            </div>
          </div>

          {matches.length === 0 ? (
            <EmptyState
              icon="🏐"
              title="No matches yet"
              description="Record the first match for this season"
              action={<Button onClick={() => navigate(`/matches/new?season=${id}`)}>New Match</Button>}
            />
          ) : (
            <div className="space-y-2">
              {matches.map((match) => {
                if (match.status === MATCH_STATUS.SCHEDULED) {
                  return (
                    <SwipeableMatchCard
                      key={match.id}
                      onDeleteConfirm={() => setConfirmDelete(match)}
                    >
                      <div className="w-full bg-surface rounded-xl px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                            <span>
                              {match.opponent_name}
                              {match.opponent_maxpreps_rank != null && (
                                <span className="text-slate-400 font-normal"> #{match.opponent_maxpreps_rank}</span>
                              )}
                            </span>
                            {match.match_type === 'tourney' && match.tournament_name && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300 uppercase tracking-wide">{match.tournament_name}</span>
                            )}
                            {match.match_type === 'ihsa-playoffs' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-400 uppercase tracking-wide">{match.playoff_round || playoffLabel}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {match.location && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                match.location === 'home' ? 'bg-emerald-900/50 text-emerald-400' :
                                match.location === 'away' ? 'bg-red-900/50 text-red-400' :
                                                             'bg-slate-700 text-slate-400'
                              }`}>
                                {match.location === 'home' ? 'H' : match.location === 'away' ? 'A' : 'N'}
                              </span>
                            )}
                            {match.conference && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                match.conference === 'conference' ? 'bg-blue-900/50 text-blue-400' : 'bg-slate-700 text-slate-400'
                              }`}>
                                {match.conference === 'conference' ? 'CON' : 'NC'}
                              </span>
                            )}
                            {match.opponent_record && (
                              <span className="text-[10px] font-semibold text-slate-500">{match.opponent_record}</span>
                            )}
                            <span className="text-xs text-slate-400">{fmtDate(match.date)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {match.pv_token && (
                            <button
                              onClick={() => setPvShareMatch(match)}
                              className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                              title="Share on FamilyScope"
                            >
                              FS
                            </button>
                          )}
                          <button
                            onClick={() => openEditMatch(match)}
                            className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => navigate(`/matches/new?season=${id}&match=${match.id}`)}
                            className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-900/40 text-amber-400 hover:bg-amber-900/60 transition-colors"
                          >
                            ▶ Start
                          </button>
                        </div>
                      </div>
                    </SwipeableMatchCard>
                  );
                }
                return (
                  <SwipeableMatchCard
                    key={match.id}
                    onDeleteConfirm={() => setConfirmDelete(match)}
                  >
                  <button
                    onClick={() => navigate(
                      match.status === MATCH_STATUS.COMPLETE
                        ? `/matches/${match.id}/summary`
                        : `/matches/${match.id}/live`
                    )}
                    className="w-full bg-surface rounded-xl px-4 py-3 text-left flex items-center justify-between hover:bg-slate-700 transition-colors"
                  >
                    <div>
                      <div className="font-semibold">
                        {match.opponent_name}
                        {match.opponent_maxpreps_rank != null && (
                          <span className="text-slate-400 font-normal"> #{match.opponent_maxpreps_rank}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {match.location && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            match.location === 'home' ? 'bg-emerald-900/50 text-emerald-400' :
                            match.location === 'away' ? 'bg-red-900/50 text-red-400' :
                                                         'bg-slate-700 text-slate-400'
                          }`}>
                            {match.location === 'home' ? 'H' : match.location === 'away' ? 'A' : 'N'}
                          </span>
                        )}
                        {match.conference && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            match.conference === 'conference' ? 'bg-blue-900/50 text-blue-400' : 'bg-slate-700 text-slate-400'
                          }`}>
                            {match.conference === 'conference' ? 'CON' : 'NC'}
                          </span>
                        )}
                        {match.opponent_record && (
                          <span className="text-[10px] font-semibold text-slate-500">{match.opponent_record}</span>
                        )}
                        <span className="text-xs text-slate-400">{fmtDate(match.date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {match.pv_token && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPvShareMatch(match); }}
                          className="text-xs font-bold px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                          title="Share on FamilyScope"
                        >
                          PV
                        </button>
                      )}
                      {match.status === MATCH_STATUS.COMPLETE && (
                        <button
                          onClick={(e) => handleMaxPreps(e, match.id)}
                          className="text-xs font-bold px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          MaxPreps
                        </button>
                      )}
                      <div className="text-right flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1.5">
                          {match.status === MATCH_STATUS.COMPLETE && (() => {
                            const won = (match.our_sets_won ?? 0) > (match.opp_sets_won ?? 0);
                            return (
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${won ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'}`}>
                                {won ? 'W' : 'L'}
                              </span>
                            );
                          })()}
                          <span className="text-sm font-mono">{match.our_sets_won ?? 0}–{match.opp_sets_won ?? 0}</span>
                        </div>
                        <div className={`text-xs ${match.status === MATCH_STATUS.IN_PROGRESS ? 'text-primary' : 'text-slate-400'}`}>
                          {match.status === MATCH_STATUS.IN_PROGRESS ? 'Live'
                            : match.status === MATCH_STATUS.COMPLETE ? 'Final'
                            : 'Setup'}
                        </div>
                      </div>
                    </div>
                  </button>
                  </SwipeableMatchCard>
                );
              })}
            </div>
          )}
        </section>

        {season.status !== 'ended' && (
          <button
            onClick={() => setConfirmEndSeason(true)}
            className="w-full py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-semibold hover:border-red-700/60 hover:text-red-400 hover:bg-red-900/10 transition-colors"
          >
            End Season
          </button>
        )}
      </div>

      {confirmEndSeason && (
        <ConfirmDialog
          title="End Season?"
          message="Mark this season as complete. Any unplayed scheduled matches will stay on the schedule but the season will show as Done."
          confirmLabel="End Season"
          danger
          onConfirm={async () => {
            await db.seasons.update(id, { status: 'ended' });
            await applyInferredSeasonFinish(id, season.team_id, season.year);
            setConfirmEndSeason(false);
            setShowPostSeason(true);
          }}
          onCancel={() => setConfirmEndSeason(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Match?"
          message={
            confirmDelete.status === MATCH_STATUS.COMPLETE
              ? `Delete completed match vs. ${confirmDelete.opponent_name ?? 'Unknown'}? All recorded stats will be permanently lost.`
              : confirmDelete.status === MATCH_STATUS.IN_PROGRESS
              ? `Delete in-progress match vs. ${confirmDelete.opponent_name ?? 'Unknown'}? All recorded stats will be permanently lost.`
              : `Delete scheduled match vs. ${confirmDelete.opponent_name ?? 'Unknown'}? This cannot be undone.`
          }
          confirmLabel="Delete"
          danger
          onConfirm={async () => {
            await deleteMatch(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showPostSeason && (
        <PostSeasonModal
          teamId={season.team_id}
          year={season.year}
          onClose={() => setShowPostSeason(false)}
        />
      )}

      {pvShareMatch && (
        <PvShareSheet
          match={pvShareMatch}
          teamName={team?.name}
          logoDataUrl={orgLogoDataUrl ?? null}
          onClose={() => setPvShareMatch(null)}
        />
      )}

      {showImport && (
        <ScheduleImportModal
          seasonId={id}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Schedule Game Modal */}
      {schedOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-bg w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold">{editMatchId ? 'Edit Scheduled Game' : 'Schedule Game'}</h2>

            {/* Opponent */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Opponent</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={schedOpp}
                  onChange={(e) => setSchedOpp(e.target.value)}
                  placeholder="Opponent team name"
                  className="flex-1 bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
                  autoFocus
                />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide leading-none">Abbr</span>
                  <input
                    type="text"
                    value={schedOppAbbr}
                    onChange={(e) => setSchedOppAbbr(e.target.value.toUpperCase().slice(0, 3))}
                    placeholder="OPP"
                    maxLength={3}
                    className="w-[56px] bg-surface border border-slate-600 text-white rounded-lg px-2 py-2 text-sm text-center font-bold uppercase tracking-widest focus:outline-none focus:border-primary placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Opponent record + rank */}
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
                  Record <span className="normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={schedOppRecord}
                  onChange={(e) => setSchedOppRecord(e.target.value)}
                  placeholder="e.g. 12-3"
                  className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
                  Rank <span className="normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={schedOppRank}
                  onChange={(e) => setSchedOppRank(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Date + Time */}
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
                  Start Time <span className="normal-case font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Location</label>
              <div className="flex gap-2">
                {['home', 'away', 'neutral'].map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setSchedLoc(loc)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                      ${schedLoc === loc
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface text-slate-300 border-slate-600 hover:border-slate-400'
                      }`}
                  >
                    {loc.charAt(0).toUpperCase() + loc.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Conference */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Opponent Type</label>
              <div className="flex gap-2">
                {[['conference', 'Conference'], ['non-con', 'Non-Con']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSchedConf(val)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                      ${schedConf === val
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface text-slate-300 border-slate-600 hover:border-slate-400'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Match Type */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Match Type</label>
              <div className="flex gap-2">
                {[['reg-season', 'Reg Season'], ['tourney', 'Tourney'], ['ihsa-playoffs', playoffLabel], ['exhibition', 'Exhibition']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSchedMatchType(val)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                      ${schedMatchType === val
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface text-slate-300 border-slate-600 hover:border-slate-400'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tournament Name + Round */}
            {schedMatchType === 'tourney' && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
                    Tournament Name <span className="text-slate-500 normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={schedTourneyName}
                    onChange={(e) => setSchedTourneyName(e.target.value)}
                    placeholder="e.g. Holiday Classic, IHSA Sectional…"
                    className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Round</label>
                  <div className="flex gap-2">
                    {[['pool', 'Pool Play'], ['bracket', 'Bracket / Playoffs']].map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setSchedTourneyRound(val)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                          ${schedTourneyRound === val
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface text-slate-300 border-slate-600 hover:border-slate-400'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Playoff Round + Opponent Seed */}
            {schedMatchType === 'ihsa-playoffs' && (
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Playoff Round</label>
                  <input
                    type="text"
                    value={schedPlayoffRound}
                    onChange={(e) => setSchedPlayoffRound(e.target.value)}
                    placeholder="e.g. Regional, Sectional…"
                    className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-slate-500"
                  />
                </div>
                <div className="w-28 shrink-0">
                  <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
                    Opp Seed <span className="normal-case font-normal">(opt)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={schedOppSeed}
                    onChange={(e) => setSchedOppSeed(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={resetSchedForm}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!schedOpp.trim() || schedSaving}
                onClick={handleScheduleGame}
              >
                {schedSaving ? 'Saving…' : 'Save Game'}
              </Button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
