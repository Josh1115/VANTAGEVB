import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { createPortal } from 'react-dom';
import { STORAGE_KEYS, getStorageItem, setStorageItem, getIntStorage, getPlayoffLabel, getBoolStorage, setBoolStorage } from '../utils/storage';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { MATCH_STATUS } from '../constants';
import { fmtDate, fmtHitting, fmtPct, fmtSetScores } from '../stats/formatters';
import { computePlayerStats, computeTeamStats } from '../stats/engine';
import { deleteMatch } from '../stats/queries';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { NetDivider } from '../components/ui/NetDivider';
import { SwipeableMatchCard } from '../components/ui/SwipeableMatchCard';
import { VBPlayerScene } from '../components/ui/VBPlayerScene';
import { CourtWhiteboard } from '../components/match/CourtWhiteboard';
import { Spinner } from '../components/ui/Spinner';

// Converts "HH:MM" (24h) → "H:MM AM/PM"
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// Sort matches by date, breaking same-day ties with match_time ("HH:MM" 24h). No time = sorts last within the day.
function sortByDateTime(a, b) {
  const da    = a.date?.slice(0, 10) ?? '';
  const dateB = b.date?.slice(0, 10) ?? '';
  if (da !== dateB) return da < dateB ? -1 : 1;
  const ta = a.match_time ?? '99:99';
  const tb = b.match_time ?? '99:99';
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

function computeTodayDisplay() {
  const d = new Date();
  const day   = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${day} · ${month} ${d.getDate()}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BALL_TYPES = [
  { type: 'spike',    cls: 'animate-spike-drop',   dur: 1700 },
  { type: 'floater',  cls: 'animate-floater-arc',  dur: 1900 },
  { type: 'ace',      cls: 'animate-ace-serve',    dur: 1400 },
  { type: 'freeball', cls: 'animate-freeball-arc', dur: 2600 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Sub-components ───────────────────────────────────────────────────────────


function SetPips({ ourSets, oppSets }) {
  const our = ourSets ?? 0;
  const opp = oppSets ?? 0;
  if (our + opp === 0) return <span className="text-xs text-slate-500 font-mono">–</span>;
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: our }).map((_, i) => (
        <span key={`o${i}`} className="w-2.5 h-2.5 rounded-full bg-primary" />
      ))}
      {Array.from({ length: opp }).map((_, i) => (
        <span key={`t${i}`} className="w-2.5 h-2.5 rounded-full bg-slate-600" />
      ))}
    </div>
  );
}

// ─── Schedule calendar ────────────────────────────────────────────────────────

function ScheduleCalendar({ matches, navigate, scoreDetail, onDeleteConfirm, openEditMatch, playoffLabel }) {
  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), []); // YYYY-MM-DD local

  const availableMonths = useMemo(() => {
    const set = new Set();
    for (const m of matches) { if (m.date) set.add(m.date.slice(0, 7)); }
    return [...set].sort();
  }, [matches]);

  // null = "use default derived from matches"; set by user navigation
  const [calMonthOverride, setCalMonthOverride] = useState(null);

  // Always resolve to a valid month in availableMonths.
  // If override is set and still valid, use it; otherwise derive from matches.
  const calMonthKey = useMemo(() => {
    if (calMonthOverride && availableMonths.includes(calMonthOverride)) return calMonthOverride;
    if (!availableMonths.length) return today.slice(0, 7);
    // Compare using first 10 chars (YYYY-MM-DD) so ISO timestamps work correctly
    const upcoming = matches.find(m => m.date?.slice(0, 10) >= today && m.status !== MATCH_STATUS.COMPLETE);
    return (upcoming ?? matches[matches.length - 1]).date.slice(0, 7);
  }, [calMonthOverride, availableMonths, matches, today]);

  const [calSelected, setCalSelected] = useState(null);

  const year  = parseInt(calMonthKey.slice(0, 4), 10);
  const month = parseInt(calMonthKey.slice(5, 7), 10) - 1;

  const matchesByDate = useMemo(() => {
    const map = {};
    for (const m of matches) { if (m.date) (map[m.date.slice(0, 10)] ??= []).push(m); }
    return map;
  }, [matches]);

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel  = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const curIdx  = availableMonths.indexOf(calMonthKey);
  const hasPrev = curIdx > 0;
  const hasNext = curIdx < availableMonths.length - 1;

  function goMonth(dir) {
    setCalMonthOverride(availableMonths[curIdx + dir]);
    setCalSelected(null);
  }

  function dotCls(match) {
    if (match.status === MATCH_STATUS.COMPLETE)
      return (match.our_sets_won ?? 0) > (match.opp_sets_won ?? 0) ? 'bg-emerald-500' : 'bg-red-500';
    if (match.status === MATCH_STATUS.IN_PROGRESS) return 'bg-primary';
    if (match.match_type === 'tourney') return 'bg-violet-400';
    return 'bg-orange-400';
  }

  function locLabel(match) {
    if (match.location === 'home') return 'H';
    if (match.location === 'away') return 'A';
    if (match.location === 'neutral') return 'N';
    return '';
  }

  const selectedMatches = calSelected ? (matchesByDate[calSelected] ?? []) : [];
  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="flex flex-col gap-3">
      {/* Month nav */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => goMonth(-1)}
          disabled={!hasPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-25 disabled:pointer-events-none transition-colors"
        >‹</button>
        <span className="text-sm font-bold text-white tracking-wide">{monthLabel}</span>
        <button
          onClick={() => goMonth(1)}
          disabled={!hasNext}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-25 disabled:pointer-events-none transition-colors"
        >›</button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 text-center">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-[10px] font-bold text-slate-500 py-0.5">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`pad${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day     = i + 1;
          const dateStr = `${calMonthKey}-${String(day).padStart(2, '0')}`;
          const dayMatches = matchesByDate[dateStr] ?? [];
          const isToday    = dateStr === today;
          const isSelected = calSelected === dateStr;
          const hasMatch   = dayMatches.length > 0;
          return (
            <button
              key={day}
              onClick={() => hasMatch ? setCalSelected(isSelected ? null : dateStr) : undefined}
              className={`flex flex-col items-center pt-1.5 pb-2 rounded-xl min-h-[46px] transition-colors
                ${isSelected ? 'bg-slate-600' : hasMatch ? 'hover:bg-slate-700/60 active:bg-slate-700' : 'cursor-default'}
                ${isToday && !isSelected ? 'ring-1 ring-inset ring-primary/50' : ''}
              `}
            >
              <span className={`text-sm font-semibold leading-none
                ${isSelected ? 'text-white' : isToday ? 'text-primary' : hasMatch ? 'text-slate-200' : 'text-slate-600'}
              `}>{day}</span>
              {hasMatch && (
                <div className="flex gap-1 mt-1 flex-wrap justify-center">
                  {dayMatches.slice(0, 4).map((m, di) => (
                    <span key={di} className="flex items-center gap-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls(m)}`} />
                      {locLabel(m) && (
                        <span className="text-[8px] font-bold leading-none text-slate-400">{locLabel(m)}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-1 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Win</span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Loss</span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Upcoming</span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />Tourney</span>
      </div>

      {/* Selected day cards */}
      {selectedMatches.length > 0 && (
        <div className="flex flex-col gap-2 pt-3 border-t border-slate-700/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {new Date(calSelected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {selectedMatches.map(match => (
            <SwipeableMatchCard key={match.id} onDeleteConfirm={() => onDeleteConfirm(match)}>
              {match.status === MATCH_STATUS.SCHEDULED ? (
                <div className="w-full bg-surface rounded-xl px-4 py-3 flex items-center justify-between border-l-4 border-transparent">
                  <div>
                    <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                      <span>
                        {match.opponent_name ?? 'vs. Unknown'}
                        {match.match_type === 'ihsa-playoffs' && match.opponent_playoff_seed != null && (
                          <span className="text-slate-400 font-normal"> (#{match.opponent_playoff_seed})</span>
                        )}
                      </span>
                      {match.match_type === 'tourney' && match.tournament_name && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300 uppercase tracking-wide">{match.tournament_name}</span>
                      )}
                      {match.match_type === 'ihsa-playoffs' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-400 uppercase tracking-wide">{match.playoff_round || playoffLabel}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {match.location && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          match.location === 'home' ? 'bg-emerald-900/50 text-emerald-400' :
                          match.location === 'away' ? 'bg-red-900/50 text-red-400' :
                                                      'bg-slate-700 text-slate-400'
                        }`}>
                          {match.location === 'home' ? 'H' : match.location === 'away' ? 'A' : 'N'}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        Scheduled{match.match_time ? ` · ${fmtTime(match.match_time)}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditMatch(match)}
                      className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => navigate(`/matches/new?season=${match.season_id}&match=${match.id}`)}
                      className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-900/40 text-amber-400 hover:bg-amber-900/60 transition-colors"
                    >
                      ▶ Start
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => navigate(
                    match.status === MATCH_STATUS.COMPLETE
                      ? `/matches/${match.id}/summary`
                      : `/matches/${match.id}/live`
                  )}
                  className={`w-full bg-surface p-4 text-left flex items-center justify-between hover:bg-slate-700 rounded-xl transition-colors border-l-4 ${
                    match.status === MATCH_STATUS.COMPLETE
                      ? (match.our_sets_won ?? 0) > (match.opp_sets_won ?? 0) ? 'border-emerald-600' : 'border-red-700'
                      : match.status === MATCH_STATUS.IN_PROGRESS ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <div>
                    <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                      <span>
                        {match.opponent_name ?? 'vs. Unknown'}
                        {match.opponent_maxpreps_rank != null && (
                          <span className="text-slate-400 font-normal"> #{match.opponent_maxpreps_rank}</span>
                        )}
                        {match.match_type === 'ihsa-playoffs' && match.opponent_playoff_seed != null && (
                          <span className="text-slate-400 font-normal"> (#{match.opponent_playoff_seed})</span>
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
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      {match.status === MATCH_STATUS.COMPLETE && (() => {
                        const won = (match.our_sets_won ?? 0) > (match.opp_sets_won ?? 0);
                        return (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${won ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'}`}>
                            {won ? 'W' : 'L'}
                          </span>
                        );
                      })()}
                      {scoreDetail === 'scores' && match.sets?.length
                        ? <span className="text-xs font-mono text-slate-300">{fmtSetScores(match.sets)}</span>
                        : <SetPips ourSets={match.our_sets_won} oppSets={match.opp_sets_won} />
                      }
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${match.status === MATCH_STATUS.IN_PROGRESS ? 'text-primary' : 'text-slate-400'}`}>
                      {match.status === MATCH_STATUS.IN_PROGRESS && (
                        <span className="serve-pulse inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                      {match.status === MATCH_STATUS.IN_PROGRESS ? 'Live' : match.status === MATCH_STATUS.COMPLETE ? 'Final' : 'Setup'}
                    </div>
                  </div>
                </button>
              )}
            </SwipeableMatchCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate();
  const isWin = (match) => (match.our_sets_won ?? 0) > (match.opp_sets_won ?? 0);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [matchView, setMatchView] = useState(() => {
    const v = getStorageItem(STORAGE_KEYS.MATCH_VIEW_DEFAULT, 'closest');
    return v === 'recent' ? 'closest' : v;
  });
  const scoreDetail  = getStorageItem(STORAGE_KEYS.SCORE_DETAIL, 'sets');
  const playoffLabel = getPlayoffLabel();

  // ── Schedule-edit modal state ─────────────────────────────────────────────
  const [schedOpen,      setSchedOpen]      = useState(false);
  const [editMatchId,    setEditMatchId]    = useState(null);
  const [schedOpp,       setSchedOpp]       = useState('');
  const [schedOppAbbr,   setSchedOppAbbr]   = useState('');
  const [schedDate,      setSchedDate]      = useState(() => new Date().toISOString().slice(0, 10));
  const [schedLoc,       setSchedLoc]       = useState('home');
  const [schedConf,      setSchedConf]      = useState('non-con');
  const [schedMatchType,  setSchedMatchType]  = useState('reg-season');
  const [schedTourneyName,  setSchedTourneyName]  = useState('');
  const [schedTourneyRound, setSchedTourneyRound] = useState('pool');
  const [schedPlayoffRound, setSchedPlayoffRound] = useState('');
  const [schedOppRecord,    setSchedOppRecord]    = useState('');
  const [schedOppRank,      setSchedOppRank]      = useState('');
  const [schedOppSeed,      setSchedOppSeed]      = useState('');
  const [schedTime,         setSchedTime]         = useState('');
  const [schedSaving,    setSchedSaving]    = useState(false);
  const [schedError,     setSchedError]     = useState('');

  const [todayDisplay, setTodayDisplay] = useState(computeTodayDisplay);
  useEffect(() => {
    const refresh = () => setTodayDisplay(computeTodayDisplay());
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  const defaultTeamId   = getIntStorage(STORAGE_KEYS.DEFAULT_TEAM_ID);
  const defaultSeasonId = getIntStorage(STORAGE_KEYS.DEFAULT_SEASON_ID);

  const recentMatches = useLiveQuery(async () => {
    let matches;
    if (matchView === 'schedule') {
      const all = defaultSeasonId
        ? await db.matches.where('season_id').equals(defaultSeasonId).toArray()
        : await db.matches.toArray();
      matches = all.sort(sortByDateTime);
    } else {
      const now = Date.now();
      const all = defaultSeasonId
        ? await db.matches.where('season_id').equals(defaultSeasonId).toArray()
        : await db.matches.toArray();
      matches = all
        .sort((a, b) => Math.abs(new Date(a.date) - now) - Math.abs(new Date(b.date) - now))
        .slice(0, 5)
        .sort(sortByDateTime);
    }

    const seasonIds = [...new Set(matches.map((m) => m.season_id).filter(Boolean))];
    const seasons = seasonIds.length ? await db.seasons.bulkGet(seasonIds) : [];
    const seasonMap = Object.fromEntries(seasons.filter(Boolean).map((s) => [s.id, s]));

    const needLookup = matches.filter((m) => !m.opponent_name && m.opponent_id);
    const oppIds = [...new Set(needLookup.map((m) => m.opponent_id))];
    const opps = oppIds.length ? await db.opponents.bulkGet(oppIds) : [];
    const oppMap = Object.fromEntries(opps.filter(Boolean).map((o) => [o.id, o.name]));

    const enriched = matches.map((m) => ({
      ...m,
      season: seasonMap[m.season_id],
      opponent_name: m.opponent_name ?? oppMap[m.opponent_id] ?? null,
    }));

    const active = enriched.find((m) => m.status === MATCH_STATUS.IN_PROGRESS);
    if (active) {
      const currentSet = await db.sets
        .where('match_id').equals(active.id)
        .filter((s) => s.status === 'in_progress')
        .first();
      active.currentSet = currentSet ?? null;
    }

    const completeIds = enriched.filter((m) => m.status === MATCH_STATUS.COMPLETE).map((m) => m.id);
    if (completeIds.length) {
      const allSets = await db.sets.where('match_id').anyOf(completeIds).sortBy('set_number');
      const setsById = {};
      for (const s of allSets) { (setsById[s.match_id] ??= []).push(s); }
      enriched.forEach((m) => { m.sets = setsById[m.id] ?? []; });
    }

    return enriched;
  }, [matchView, defaultSeasonId]);

  const allTimeRecord = useLiveQuery(async () => {
    const all = await db.matches.where('status').equals(MATCH_STATUS.COMPLETE)
      .filter(m => m.match_type !== 'exhibition').toArray();
    const wins = all.filter((m) => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
    return { wins, losses: all.length - wins, total: all.length };
  }, []);

  const seasonRecord = useLiveQuery(async () => {
    if (!defaultTeamId || !defaultSeasonId) return null;
    const [team, season, allSeasonMatches] = await Promise.all([
      db.teams.get(defaultTeamId),
      db.seasons.get(defaultSeasonId),
      db.matches.where('season_id').equals(defaultSeasonId)
        .filter(m => m.match_type !== 'exhibition')
        .toArray(),
    ]);
    const matches = allSeasonMatches.filter(m => m.status === MATCH_STATUS.COMPLETE);
    if (!team || !season) return null;
    const historyEntry = await db.season_history
      .where('team_id').equals(defaultTeamId)
      .filter(h => String(h.year) === (season.name ?? String(season.year)))
      .first();
    const wins   = matches.filter(isWin).length;
    const losses = matches.length - wins;
    const homeW  = matches.filter(m => m.location === 'home'    &&  isWin(m)).length;
    const homeL  = matches.filter(m => m.location === 'home'    && !isWin(m)).length;
    const awayW  = matches.filter(m => m.location === 'away'    &&  isWin(m)).length;
    const awayL  = matches.filter(m => m.location === 'away'    && !isWin(m)).length;
    const neutW  = matches.filter(m => m.location === 'neutral' &&  isWin(m)).length;
    const neutL  = matches.filter(m => m.location === 'neutral' && !isWin(m)).length;
    const confW   = matches.filter(m => m.conference === 'conference' &&  isWin(m)).length;
    const confL   = matches.filter(m => m.conference === 'conference' && !isWin(m)).length;
    const tourneyW = matches.filter(m => m.match_type === 'tourney' &&  isWin(m)).length;
    const tourneyL = matches.filter(m => m.match_type === 'tourney' && !isWin(m)).length;
    const last5  = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const last5W = last5.filter(isWin).length;
    const last5L = last5.length - last5W;
    return {
      teamName:   team.name ?? team.abbreviation ?? 'Team',
      seasonName: season.name ?? String(season.year),
      wins, losses, total: matches.length,
      winPct:  matches.length ? wins / matches.length : null,
      homeW, homeL, awayW, awayL, neutW, neutL, confW, confL, tourneyW, tourneyL, last5W, last5L, last5Count: last5.length,
      hasLocData: (homeW + homeL + awayW + awayL + neutW + neutL) > 0,
      matchProgress: { completed: matches.length, total: allSeasonMatches.length },
      stateRank:        historyEntry?.state_rank         ?? null,
      nationalRank:     historyEntry?.national_rank      ?? null,
      prevStateRank:    historyEntry?.prev_state_rank    ?? null,
      prevNationalRank: historyEntry?.prev_national_rank ?? null,
      teamState:        team.state ?? null,
    };
  }, [defaultTeamId, defaultSeasonId]);

  const nextMatch = useLiveQuery(async () => {
    if (!defaultSeasonId) return null;
    const all = await db.matches.where('season_id').equals(defaultSeasonId).toArray();
    const upcoming = all
      .filter(m => m.status === MATCH_STATUS.SCHEDULED || m.status === MATCH_STATUS.SETUP)
      .sort(sortByDateTime);
    if (!upcoming.length) return null;
    const m = upcoming[0];
    let opponentName = m.opponent_name;
    if (!opponentName && m.opponent_id) {
      const opp = await db.opponents.get(m.opponent_id);
      opponentName = opp?.name ?? null;
    }
    return { ...m, opponent_name: opponentName };
  }, [defaultSeasonId]);

  const setupState = useLiveQuery(async () => {
    const [allTeams, allSeasons, playerCount, matchCount] = await Promise.all([
      db.teams.toArray(),
      db.seasons.toArray(),
      db.players.count(),
      db.matches.count(),
    ]);
    // Auto-set defaults when exactly one team/season exists and no default is saved yet
    if (allTeams.length === 1 && !getIntStorage(STORAGE_KEYS.DEFAULT_TEAM_ID)) {
      setStorageItem(STORAGE_KEYS.DEFAULT_TEAM_ID, allTeams[0].id);
    }
    if (allSeasons.length === 1 && !getIntStorage(STORAGE_KEYS.DEFAULT_SEASON_ID)) {
      setStorageItem(STORAGE_KEYS.DEFAULT_SEASON_ID, allSeasons[0].id);
    }
    return {
      hasTeam:     allTeams.length > 0,
      hasSeason:   allSeasons.length > 0,
      hasPlayers:  playerCount > 0,
      hasSchedule: matchCount > 0,
      firstTeamId:   allTeams[0]?.id ?? null,
      firstSeasonId: allSeasons[0]?.id ?? null,
    };
  }, []);

  const seasonLeaders = useLiveQuery(async () => {
    if (!defaultTeamId || !defaultSeasonId) return null;
    const allMatches = await db.matches
      .where('season_id').equals(defaultSeasonId)
      .filter(m => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition')
      .toArray();
    if (!allMatches.length) return null;
    const matches = [...allMatches].sort(sortByDateTime);
    const lastMatchId = matches[matches.length - 1].id;
    const matchIds = matches.map(m => m.id);
    const [contacts, players] = await Promise.all([
      db.contacts.where('match_id').anyOf(matchIds).toArray(),
      db.players.where('team_id').equals(defaultTeamId).toArray(),
    ]);
    const nameMap = Object.fromEntries(players.map(p => [p.id, p.name ?? `#${p.jersey_number}`]));
    const stats = computePlayerStats(contacts);
    const findLeader = (getValue) => {
      let best = null;
      for (const [id, ps] of Object.entries(stats)) {
        const val = getValue(ps);
        if (val > 0 && (!best || val > best.val)) {
          best = { name: nameMap[id] ?? '—', val, id: Number(id) };
        }
      }
      return best;
    };
    const ts = computeTeamStats(contacts);
    const leaders = {
      kills:   findLeader(ps => (ps.ta  ?? 0) >= 10 ? (ps.k   ?? 0) : 0),
      aces:    findLeader(ps => (ps.sa  ?? 0) >= 10 ? (ps.ace  ?? 0) : 0),
      blocks:  findLeader(ps => (ps.bs ?? 0) + (ps.ba ?? 0) + (ps.be ?? 0) >= 10 ? (ps.bs ?? 0) + (ps.ba ?? 0) : 0),
      digs:    findLeader(ps => (ps.dig ?? 0) >= 10 ? (ps.dig  ?? 0) : 0),
      assists: findLeader(ps => (ps.ast ?? 0) + (ps.bhe ?? 0) >= 10 ? (ps.ast ?? 0) : 0),
      rec:     findLeader(ps => (ps.pa  ?? 0) >= 10 ? (ps.pa   ?? 0) : 0),
      apr:     findLeader(ps => (ps.pa  ?? 0) >= 10 ? (ps.apr  ?? 0) : 0),
    };

    // Deltas: compare current totals against all-except-last-match
    const hasMultiple = matches.length > 1;
    let leaderDeltas = {};
    let teamDeltas = null;
    if (hasMultiple) {
      const prevContacts = contacts.filter(c => c.match_id !== lastMatchId);
      const prevStats = computePlayerStats(prevContacts);
      const prevTs    = computeTeamStats(prevContacts);
      const ld = (key, leaderId, getField) => {
        if (!leaderId) return null;
        return (leaders[key]?.val ?? 0) - (getField(prevStats[leaderId] ?? {}) ?? 0);
      };
      leaderDeltas = {
        kills:   ld('kills',   leaders.kills?.id,   ps => ps.k   ?? 0),
        aces:    ld('aces',    leaders.aces?.id,    ps => ps.ace  ?? 0),
        blocks:  ld('blocks',  leaders.blocks?.id,  ps => (ps.bs ?? 0) + (ps.ba ?? 0)),
        digs:    ld('digs',    leaders.digs?.id,    ps => ps.dig  ?? 0),
        assists: ld('assists', leaders.assists?.id, ps => ps.ast  ?? 0),
        rec:     ld('rec',     leaders.rec?.id,     ps => ps.pa   ?? 0),
        apr:     ld('apr',     leaders.apr?.id,     ps => ps.apr  ?? 0),
      };
      teamDeltas = {
        k:       (ts.k   ?? 0) - (prevTs.k   ?? 0),
        ace:     (ts.ace  ?? 0) - (prevTs.ace  ?? 0),
        blk:     (ts.blk  ?? 0) - (prevTs.blk  ?? 0),
        dig:     (ts.dig  ?? 0) - (prevTs.dig  ?? 0),
        ast:     (ts.ast  ?? 0) - (prevTs.ast  ?? 0),
        rec:     (ts.pa   ?? 0) - (prevTs.pa   ?? 0),
        apr:     (ts.apr     != null && prevTs.apr     != null) ? ts.apr     - prevTs.apr     : null,
        hit_pct: (ts.hit_pct != null && prevTs.hit_pct != null) ? ts.hit_pct - prevTs.hit_pct : null,
        si_pct:  (ts.si_pct  != null && prevTs.si_pct  != null) ? ts.si_pct  - prevTs.si_pct  : null,
        ace_pct: (ts.ace_pct != null && prevTs.ace_pct != null) ? ts.ace_pct - prevTs.ace_pct : null,
      };
    }

    return {
      ...leaders,
      leaderDeltas,
      matchCount: matches.length,
      teamTotals: {
        k:   ts.k,
        ace: ts.ace,
        blk: ts.blk,
        dig: ts.dig,
        ast: ts.ast,
        rec: ts.pa,
        apr: ts.apr,
      },
      teamDeltas,
      teamStats: {
        hit_pct: ts.hit_pct,
        si_pct:  ts.si_pct,
        ace_pct: ts.ace_pct,
      },
    };
  }, [defaultTeamId, defaultSeasonId]);

  // ── Multi-ball system ──────────────────────────────────────────────────────
  const [balls,       setBalls]       = useState([]); // [{ id, type, left }]
  const [netRippling, setNetRippling] = useState(false);

  function fireBall(typeStr, leftPct) {
    const pick = typeStr
      ? (BALL_TYPES.find((b) => b.type === typeStr) ?? BALL_TYPES[0])
      : BALL_TYPES[Math.floor(Math.random() * BALL_TYPES.length)];
    const id   = performance.now() + Math.random();
    const left = leftPct ?? (20 + Math.random() * 60);
    setBalls((prev) => [...prev, { id, type: pick.type, left }]);
    setTimeout(() => setBalls((prev) => prev.filter((b) => b.id !== id)), pick.dur);
  }

  function fireBurst() {
    const positions = [12, 28, 50, 68, 84];
    const shuffled  = [...BALL_TYPES].sort(() => Math.random() - 0.5);
    const count     = 4 + Math.floor(Math.random() * 2); // 4 or 5 balls
    positions.slice(0, count).forEach((pos, i) => {
      setTimeout(() => fireBall(shuffled[i % shuffled.length].type, pos), i * 130);
    });
    setNetRippling(true);
    setTimeout(() => setNetRippling(false), 800);
  }

  // Auto-fire a single ball periodically
  useEffect(() => {
    const trigger = () => fireBall(null, 50);
    const first   = setTimeout(trigger, 2500);
    const interval = setInterval(trigger, 15000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Long-press logo for burst ─────────────────────────────────────────────
  const longPressTimer = useRef(null);
  const isLongPress    = useRef(false);

  function handleLogoPointerDown() {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      fireBurst();
    }, 500);
  }

  function handleLogoPointerUp() {
    clearTimeout(longPressTimer.current);
  }

  function handleLogoClick() {
    if (isLongPress.current) return; // already handled by long-press
    fireBall(null, 50);
    setNetRippling(true);
    setTimeout(() => setNetRippling(false), 450);
  }

  // ── W–L count-up on load ──────────────────────────────────────────────────
  const [displayRecord, setDisplayRecord] = useState({ wins: 0, losses: 0 });
  const recordAnimated = useRef(false);

  useEffect(() => {
    if (!allTimeRecord || allTimeRecord.total === 0) return;
    if (recordAnimated.current) {
      setDisplayRecord({ wins: allTimeRecord.wins, losses: allTimeRecord.losses });
      return;
    }
    recordAnimated.current = true;
    const { wins, losses } = allTimeRecord;
    const steps = 20;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const t = step / steps;
      setDisplayRecord({ wins: Math.round(wins * t), losses: Math.round(losses * t) });
      if (step >= steps) { clearInterval(timer); setDisplayRecord({ wins, losses }); }
    }, 600 / steps);
    return () => clearInterval(timer);
  }, [allTimeRecord]);

  const [displaySeasonRecord, setDisplaySeasonRecord] = useState({ wins: 0, losses: 0 });
  const seasonRecordAnimated = useRef(false);

  useEffect(() => {
    if (!seasonRecord) return;
    if (seasonRecordAnimated.current) {
      setDisplaySeasonRecord({ wins: seasonRecord.wins, losses: seasonRecord.losses });
      return;
    }
    seasonRecordAnimated.current = true;
    const { wins, losses } = seasonRecord;
    const steps = 30;
    let step = 0;
    let cancelled = false;

    // 0–75%: 18ms · 75–95%: 55ms · 95–100%: 130ms
    function tick() {
      if (cancelled) return;
      step++;
      const t = step / steps;
      setDisplaySeasonRecord({ wins: Math.round(wins * t), losses: Math.round(losses * t) });
      if (step >= steps) { setDisplaySeasonRecord({ wins, losses }); return; }
      const delay = t >= 0.95 ? 260 : t >= 0.75 ? 110 : 36;
      setTimeout(tick, delay);
    }

    setTimeout(tick, 18);
    return () => { cancelled = true; };
  }, [seasonRecord]);


  const inProgress    = recentMatches?.find((m) => m.status === MATCH_STATUS.IN_PROGRESS);

  const [storageUsagePct, setStorageUsagePct] = useState(0);
  useEffect(() => {
    if (!navigator.storage?.estimate) return;
    navigator.storage.estimate().then(({ usage = 0, quota = 0 }) => {
      if (quota > 0) setStorageUsagePct(usage / quota);
    });
  }, []);
  const [closestSortAsc, setClosestSortAsc] = useState(
    () => getStorageItem(STORAGE_KEYS.CLOSEST_SORT_ASC, 'true') !== 'false'
  );
  const [guideVisible, setGuideVisible] = useState(() => !getBoolStorage(STORAGE_KEYS.HELP_GUIDE_SEEN));
  const displayMatches = recentMatches ?? [];

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
    if (!schedOpp.trim() || !editMatchId) return;
    setSchedSaving(true);
    setSchedError('');
    try {
      let oppRecord = await db.opponents.where('name').equals(schedOpp.trim()).first();
      if (!oppRecord) {
        const oppId = await db.opponents.add({ name: schedOpp.trim() });
        oppRecord = { id: oppId, name: schedOpp.trim() };
      }
      const fields = {
        opponent_id:   oppRecord.id,
        opponent_name: oppRecord.name,
        opponent_abbr:         schedOppAbbr.trim().toUpperCase() || null,
        opponent_record:       schedOppRecord.trim() || null,
        opponent_maxpreps_rank: schedOppRank !== '' ? parseInt(schedOppRank, 10) : null,
        date:          schedDate ? new Date(schedDate + 'T12:00:00').toISOString() : new Date().toISOString(),
        location:      schedLoc,
        conference:    schedConf,
        match_type:       schedMatchType,
        tournament_name:  schedMatchType === 'tourney' ? schedTourneyName.trim() || null : null,
        tournament_round: schedMatchType === 'tourney' ? schedTourneyRound : null,
        playoff_round:         schedMatchType === 'ihsa-playoffs' ? schedPlayoffRound.trim() || null : null,
        opponent_playoff_seed: schedMatchType === 'ihsa-playoffs' && schedOppSeed !== '' ? parseInt(schedOppSeed, 10) : null,
        match_time:       schedTime || null,
      };
      await db.matches.update(editMatchId, fields);
      resetSchedForm();
    } catch {
      setSchedError('Failed to save. Please try again.');
    } finally {
      setSchedSaving(false);
    }
  }

  function resetSchedForm() {
    setSchedError('');
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

  return (
    <div>
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-bg border-b border-slate-800 px-4 pt-safe pb-10 text-center relative">

        {/* Volleyball net watermark (mesh sways via .net-wave CSS) */}
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden${netRippling ? ' net-ripple' : ''}`}
          aria-hidden="true"
          viewBox="0 0 600 66"
          preserveAspectRatio="xMidYMid slice"
          style={{ opacity: 0.18 }}
        >
          <defs>
            <pattern id="vb-net-mesh" x="0" y="0" width="18" height="10" patternUnits="userSpaceOnUse">
              <path d="M 18 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.65" />
            </pattern>
          </defs>
          <rect x="0" y="30" width="600" height="24" fill="url(#vb-net-mesh)" className="net-wave" />
          <rect x="0" y="25" width="600" height="6" fill="white" />
          <rect x="0" y="54" width="600" height="3" fill="white" />
          {/* Left antenna — full-height rod with alternating red/white stripes */}
          <rect x="44" y="0"  width="3" height="57" fill="white" />
          <rect x="44" y="0"  width="3" height="4"  fill="#ef4444" />
          <rect x="44" y="8"  width="3" height="4"  fill="#ef4444" />
          <rect x="44" y="16" width="3" height="4"  fill="#ef4444" />
          <rect x="44" y="24" width="3" height="4"  fill="#ef4444" />
          <rect x="44" y="32" width="3" height="4"  fill="#ef4444" />
          <rect x="44" y="40" width="3" height="4"  fill="#ef4444" />
          <rect x="44" y="48" width="3" height="4"  fill="#ef4444" />
          {/* Right antenna */}
          <rect x="553" y="0"  width="3" height="57" fill="white" />
          <rect x="553" y="0"  width="3" height="4"  fill="#ef4444" />
          <rect x="553" y="8"  width="3" height="4"  fill="#ef4444" />
          <rect x="553" y="16" width="3" height="4"  fill="#ef4444" />
          <rect x="553" y="24" width="3" height="4"  fill="#ef4444" />
          <rect x="553" y="32" width="3" height="4"  fill="#ef4444" />
          <rect x="553" y="40" width="3" height="4"  fill="#ef4444" />
          <rect x="553" y="48" width="3" height="4"  fill="#ef4444" />
        </svg>

        <VBPlayerScene />

        <div className="absolute inset-0 crt-scanlines pointer-events-none overflow-hidden" aria-hidden="true" />

        {/* Flying balls (supports multiple simultaneous) */}
        {balls.map((ball) => (
          <div
            key={ball.id}
            className="absolute top-0 pointer-events-none z-10"
            style={{ left: `${ball.left}%` }}
            aria-hidden="true"
          >
            <span className={`text-3xl inline-block ${BALL_TYPES.find((b) => b.type === ball.type)?.cls ?? 'animate-spike-drop'}`}>
              🏐
            </span>
          </div>
        ))}

        <h1 className="tracking-wide flex flex-col items-center gap-0.5" style={{ transform: 'translateY(25%)' }}>
          <img
            src="/logo.png"
            alt="VANTAGE"
            className="h-auto mx-auto"
            style={{ width: 'min(62vw, 482px)', transform: 'translateX(-3%)' }}
            onClick={handleLogoClick}
            onPointerDown={handleLogoPointerDown}
            onPointerUp={handleLogoPointerUp}
            onPointerLeave={handleLogoPointerUp}
          />
          <span className="text-[17.5px] font-semibold tracking-[0.22em] text-slate-300 uppercase" style={{ transform: 'translateY(-8px)' }}>
            Immediate Impact Analytics
          </span>
        </h1>

      </header>

      <div className="p-4 md:p-6 space-y-4">

        {/* ── Storage quota warning ── */}
        {storageUsagePct >= 0.9 && (
          <div className="flex items-center gap-3 bg-amber-900/40 border border-amber-600/50 rounded-xl px-4 py-3">
            <span className="text-amber-400 text-lg shrink-0">⚠️</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-300">Storage almost full ({Math.round(storageUsagePct * 100)}%)</p>
              <p className="text-xs text-amber-500 mt-0.5">Export a backup now to avoid losing data. <button onClick={() => navigate('/settings')} className="underline hover:text-amber-300 transition-colors">Go to Settings →</button></p>
            </div>
          </div>
        )}

        {/* ── Active match banner ── */}
        {inProgress && (
          <div className="sonar-ring card-top-glow bg-primary/20 border border-primary rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-primary font-semibold uppercase tracking-wide">Match In Progress</p>
              <p className="font-bold">{inProgress.opponent_name ?? 'Active Match'}</p>
              <div className="flex gap-3 mt-1 text-sm font-mono">
                <span>Sets&nbsp;{inProgress.our_sets_won ?? 0}–{inProgress.opp_sets_won ?? 0}</span>
                <span className="text-slate-400">·</span>
                <span>
                  Set&nbsp;{(inProgress.our_sets_won ?? 0) + (inProgress.opp_sets_won ?? 0) + 1}&nbsp;
                  {inProgress.currentSet?.our_score ?? 0}–{inProgress.currentSet?.opp_score ?? 0}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/matches/${inProgress.id}/live`)}
              className="bg-primary text-white font-bold px-5 py-2.5 rounded-lg text-sm active:scale-95 transition-transform"
            >
              Resume
            </button>
          </div>
        )}

        {/* ── Quick start ── */}
        <div className="flex gap-3">
          {/* New Match */}
          <button
            onClick={() => navigate('/matches/new')}
            className="group flex-1 card-top-glow btn-shimmer bg-primary/90 hover:bg-primary rounded-xl p-4 text-left flex items-center gap-3 transition-[transform,filter,background-color] duration-75 active:scale-[0.97] active:brightness-90 animate-slide-up-fade shadow-lg"
            style={{ animationDelay: '0ms' }}
          >
            <span className="text-4xl inline-block vb-ball-spin">🏐</span>
            <div>
              <div className="font-bold text-base text-white">New Match</div>
              <div className="text-xs text-orange-100/80">Start recording stats</div>
            </div>
          </button>

          {/* New Season */}
          <button
            onClick={() => navigate('/seasons')}
            className="group flex-1 bg-blue-900/80 hover:bg-blue-900 border border-blue-800/60 hover:border-blue-700 rounded-xl p-4 text-left flex items-center gap-3 transition-[transform,background-color,border-color] duration-75 active:scale-[0.97] animate-slide-up-fade"
            style={{ animationDelay: '60ms' }}
          >
            <span className="text-4xl inline-block">📅</span>
            <div>
              <div className="font-bold text-base text-white">New Season</div>
              <div className="text-xs text-blue-200/70">Set up a new season</div>
            </div>
          </button>
        </div>

        {/* ── Season record card (shown when default team + season set) ── */}
        {seasonRecord && (
          <div className="bg-surface rounded-xl overflow-hidden animate-slide-up-fade card-top-glow" style={{ animationDelay: '200ms' }}>
            {/* Header */}
            <div className="px-4 py-2 border-b border-slate-700/60 text-center">
              <div>
                <span
                  className="text-[17.5px] font-black tracking-widest text-white uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  {seasonRecord.teamName}
                </span>
                <span className="text-slate-600 mx-2">·</span>
                <span className="text-[15px] text-slate-400 font-semibold">{seasonRecord.seasonName}</span>
              </div>
              {(seasonRecord.stateRank != null || seasonRecord.nationalRank != null) && (
                <div className="mt-0.5">
                  {seasonRecord.stateRank != null && (
                    <>
                      <span className="text-[15px] font-black text-amber-400 tracking-wide">
                        {seasonRecord.teamState ?? 'STATE'}: #{seasonRecord.stateRank}
                      </span>
                      {seasonRecord.prevStateRank != null && seasonRecord.prevStateRank !== seasonRecord.stateRank && (() => {
                        const delta = seasonRecord.prevStateRank - seasonRecord.stateRank;
                        return (
                          <span className={`text-[12.5px] font-bold ml-1 ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ({delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`})
                          </span>
                        );
                      })()}
                    </>
                  )}
                  {seasonRecord.stateRank != null && seasonRecord.nationalRank != null && (
                    <span className="text-slate-600 mx-2">·</span>
                  )}
                  {seasonRecord.nationalRank != null && (
                    <>
                      <span className="text-[15px] font-black text-amber-400 tracking-wide">NATIONAL: #{seasonRecord.nationalRank}</span>
                      {seasonRecord.prevNationalRank != null && seasonRecord.prevNationalRank !== seasonRecord.nationalRank && (() => {
                        const delta = seasonRecord.prevNationalRank - seasonRecord.nationalRank;
                        return (
                          <span className={`text-[12.5px] font-bold ml-1 ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ({delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`})
                          </span>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* W / L numbers */}
            <div className="grid grid-cols-2 divide-x divide-slate-700/60">
              <button
                className="py-5 text-center hover:bg-emerald-900/20 active:bg-emerald-900/30 transition-colors"
                onClick={() => navigate('/reports?result=win')}
              >
                <div
                  className="text-[90px] font-black text-emerald-400 tabular-nums leading-none tracking-[0.15em] scoreboard-flicker"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  {displaySeasonRecord.wins}
                </div>
                <div className="text-[15px] font-black tracking-[0.2em] text-emerald-700 mt-2">WINS</div>
              </button>
              <button
                className="py-5 text-center hover:bg-red-900/20 active:bg-red-900/30 transition-colors"
                onClick={() => navigate('/reports?result=loss')}
              >
                <div
                  className="text-[90px] font-black text-red-400 tabular-nums leading-none tracking-[0.15em] scoreboard-flicker"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  {displaySeasonRecord.losses}
                </div>
                <div className="text-[15px] font-black tracking-[0.2em] text-red-800 mt-2">LOSSES</div>
              </button>
            </div>

            {/* Stats row */}
            <div className="px-4 py-2.5 border-t border-slate-700/60 flex items-center justify-center gap-3 flex-wrap text-xs">
              {seasonRecord.winPct !== null && (
                <>
                  <span className="font-black text-primary">
                    {Math.round(seasonRecord.winPct * 100)}% WIN
                  </span>
                  {seasonRecord.hasLocData && <span className="text-slate-400 font-black">·</span>}
                </>
              )}
              {seasonRecord.hasLocData && (
                <>
                  {(seasonRecord.homeW + seasonRecord.homeL) > 0 && (
                    <span className="text-white font-semibold">
                      {seasonRecord.homeW}–{seasonRecord.homeL} <span className="text-white">HOME</span>
                    </span>
                  )}
                  {(seasonRecord.awayW + seasonRecord.awayL) > 0 && (
                    <>
                      <span className="text-white font-black">·</span>
                      <span className="text-white font-semibold">
                        {seasonRecord.awayW}–{seasonRecord.awayL} <span className="text-white">AWAY</span>
                      </span>
                    </>
                  )}
                  {(seasonRecord.neutW + seasonRecord.neutL) > 0 && (
                    <>
                      <span className="text-white font-black">·</span>
                      <span className="text-white font-semibold">
                        {seasonRecord.neutW}–{seasonRecord.neutL} <span className="text-white">NEUT</span>
                      </span>
                    </>
                  )}
                  {(seasonRecord.confW + seasonRecord.confL) > 0 && (
                    <>
                      <span className="text-white font-black">·</span>
                      <span className="text-white font-semibold">
                        {seasonRecord.confW}–{seasonRecord.confL} <span className="text-white">CONF</span>
                      </span>
                    </>
                  )}
                  {(seasonRecord.tourneyW + seasonRecord.tourneyL) > 0 && (
                    <>
                      <span className="text-white font-black">·</span>
                      <span className="text-white font-semibold">
                        {seasonRecord.tourneyW}–{seasonRecord.tourneyL} <span className="text-white">TOURN</span>
                      </span>
                    </>
                  )}
                  {seasonRecord.last5Count > 0 && (
                    <>
                      <span className="text-white font-black">·</span>
                      <span className="text-white font-semibold">
                        {seasonRecord.last5W}–{seasonRecord.last5L} <span className="text-white">L{seasonRecord.last5Count}</span>
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Season progress bar */}
            {seasonRecord.matchProgress.total > 0 && (
              <div className="px-4 pt-2 pb-3 border-t border-slate-700/60">
                <div className="flex justify-between text-[10px] font-bold tracking-[0.15em] text-white mb-1.5">
                  <span>SEASON PROGRESS · {Math.round((seasonRecord.matchProgress.completed / seasonRecord.matchProgress.total) * 100)}%</span>
                  <span>{seasonRecord.matchProgress.completed} / {seasonRecord.matchProgress.total}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${(seasonRecord.matchProgress.completed / seasonRecord.matchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Quick team stats strip ── */}
        {seasonLeaders?.teamStats && (
          <div className="grid grid-cols-3 gap-2 animate-slide-up-fade" style={{ animationDelay: '220ms' }}>
            {[
              { label: 'HIT%', val: fmtHitting(seasonLeaders.teamStats.hit_pct), stat: 'hit_pct', deltaVal: seasonLeaders.teamDeltas?.hit_pct, fmt: v => fmtHitting(Math.abs(v)) },
              { label: 'SRV%', val: fmtPct(seasonLeaders.teamStats.si_pct),      stat: 'si_pct',  deltaVal: seasonLeaders.teamDeltas?.si_pct,  fmt: v => fmtPct(Math.abs(v))     },
              { label: 'ACE%', val: fmtPct(seasonLeaders.teamStats.ace_pct),     stat: 'ace_pct', deltaVal: seasonLeaders.teamDeltas?.ace_pct, fmt: v => fmtPct(Math.abs(v))     },
            ].map(({ label, val, stat, deltaVal, fmt }) => (
              <button
                key={label}
                onClick={() => defaultSeasonId && navigate(`/seasons/${defaultSeasonId}/team?stat=${stat}`)}
                disabled={!defaultSeasonId}
                className="bg-surface rounded-xl p-3 text-center active:scale-95 transition-transform disabled:active:scale-100"
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-white">{label}</div>
                <div className="text-xl font-black text-primary tabular-nums mt-0.5">{val}</div>
                {deltaVal != null && deltaVal !== 0 && (
                  <span className={`flex items-center justify-center gap-px text-[8px] font-bold leading-none tabular-nums mt-0.5 ${deltaVal > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {deltaVal > 0 ? '▲' : '▼'}{fmt(deltaVal)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── W–L record strip (fallback when no default season set) ── */}
        {!seasonRecord && allTimeRecord && allTimeRecord.total > 0 && (
          <div className="flex items-center gap-4 px-1 animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-400">{displayRecord.wins}W</span>
              <span className="text-xs font-black px-2 py-0.5 rounded bg-red-900/60 text-red-400">{displayRecord.losses}L</span>
            </div>
            <span className="text-xs text-slate-500">{allTimeRecord.total} match{allTimeRecord.total !== 1 ? 'es' : ''} all time</span>
          </div>
        )}

        {/* ── Season Leaders ── */}
        {(seasonRecord || seasonLeaders) && (() => {
          const LEADERS = [
            { label: 'K',   key: 'kills',   ttKey: 'k'   },
            { label: 'ACE', key: 'aces',    ttKey: 'ace' },
            { label: 'BLK', key: 'blocks',  ttKey: 'blk', fmt: v => Number(v) % 1 === 0 ? String(Math.round(v)) : Number(v).toFixed(1) },
            { label: 'DIG', key: 'digs',    ttKey: 'dig' },
            { label: 'AST', key: 'assists', ttKey: 'ast' },
            { label: 'REC', key: 'rec',     ttKey: 'rec' },
            { label: 'APR', key: 'apr',     ttKey: 'apr', fmt: v => Number(v).toFixed(2), noAvg: true },
          ];
          const tt  = seasonLeaders?.teamTotals;
          const td  = seasonLeaders?.teamDeltas;
          const ld  = seasonLeaders?.leaderDeltas;
          const mc  = seasonLeaders?.matchCount ?? 0;
          const Delta = ({ val, fmt }) => {
            if (val == null) return null;
            const absFormatted = fmt ? fmt(Math.abs(val)) : String(Math.abs(val));
            if (val === 0 || parseFloat(absFormatted) === 0) return (
              <span className="text-[8px] font-bold leading-none tabular-nums text-slate-500">—</span>
            );
            const pos = val > 0;
            return (
              <span className={`flex items-center gap-px text-[8px] font-bold leading-none tabular-nums ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                {pos ? '▲' : '▼'}{absFormatted}
              </span>
            );
          };
          return (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white px-0.5 animate-slide-up-fade" style={{ animationDelay: '250ms' }}>
                Season Leaders{seasonRecord?.seasonName ? <span className="ml-1.5 normal-case font-semibold tracking-normal text-white">· {seasonRecord.seasonName}</span> : ''}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {LEADERS.map(({ label, key, ttKey, fmt }, i) => {
                  const leader = seasonLeaders?.[key];
                  const canNav = leader?.id && defaultTeamId;
                  return (
                    <button
                      key={key}
                      onClick={() => canNav && navigate(`/teams/${defaultTeamId}/players/${leader.id}?season=${defaultSeasonId}&stat=${ttKey}`)}
                      disabled={!canNav}
                      className="bg-surface rounded-xl p-1.5 text-center flex flex-col items-center gap-1 animate-slide-up-fade active:scale-95 transition-transform disabled:active:scale-100"
                      style={{ animationDelay: `${260 + i * 45}ms` }}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">{label}</span>
                      {leader ? (
                        <>
                          <span className="text-xl font-black text-primary tabular-nums leading-none">{fmt ? fmt(leader.val) : leader.val}</span>
                          <Delta val={ld?.[key]} fmt={fmt} />
                          <span className="text-[10px] font-semibold text-slate-300 leading-tight text-center break-words w-full">{leader.name}</span>
                        </>
                      ) : (
                        <span className="text-xl font-black text-slate-600 leading-none">—</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white px-0.5 animate-slide-up-fade" style={{ animationDelay: `${260 + LEADERS.length * 45}ms` }}>Team Totals</p>
              <div className="grid grid-cols-7 gap-1">
                {LEADERS.map(({ label, ttKey, fmt, noAvg }, i) => {
                  const teamVal = tt?.[ttKey];
                  const canNav  = !!defaultSeasonId;
                  const perMatch = !noAvg && teamVal != null && mc > 0
                    ? (teamVal / mc)
                    : null;
                  const fmtPerMatch = perMatch != null
                    ? (perMatch % 1 === 0 ? String(Math.round(perMatch)) : perMatch.toFixed(1))
                    : null;
                  return (
                    <button
                      key={ttKey}
                      onClick={() => canNav && navigate(`/seasons/${defaultSeasonId}/team?stat=${ttKey}`)}
                      disabled={!canNav}
                      className="bg-surface rounded-xl p-1.5 text-center flex flex-col items-center gap-1 animate-slide-up-fade active:scale-95 transition-transform disabled:active:scale-100"
                      style={{ animationDelay: `${320 + LEADERS.length * 45 + i * 45}ms` }}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">{label}</span>
                      <span className="text-xl font-black text-primary tabular-nums leading-none">
                        {teamVal != null ? (fmt ? fmt(teamVal) : teamVal) : '—'}
                      </span>
                      <Delta val={td?.[ttKey]} fmt={fmt} />
                      {fmtPerMatch != null && (
                        <span className="text-[9px] font-semibold text-white leading-none tabular-nums">{fmtPerMatch}<span className="text-white">/MATCH</span></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Opponents + Next Match (side by side) ── */}
        <div className="flex gap-2 animate-slide-up-fade" style={{ animationDelay: '180ms' }}>
          <button
            onClick={() => navigate('/opponents')}
            className={`group card-top-glow bg-blue-800/60 hover:bg-blue-800/80 border border-blue-700/40 hover:border-blue-600/60 rounded-xl p-3 text-left flex items-center gap-2.5 active:scale-[0.97] transition-[transform,background-color,border-color] duration-75 ${nextMatch ? 'flex-1' : 'w-full'}`}
          >
            <span className="text-2xl inline-block transition-transform duration-75 group-active:-translate-y-1 group-active:scale-125">🔭</span>
            <div className="min-w-0">
              <div className="font-semibold text-sm">Opponents</div>
              <div className="text-[11px] text-blue-200/60 truncate">Scouting & history</div>
            </div>
            <span className="text-blue-400/60 ml-auto">›</span>
          </button>

          {nextMatch ? (
            <div
              className="group flex-1 card-top-glow bg-surface rounded-xl p-3 text-left flex items-center gap-2.5 cursor-pointer active:scale-[0.97] transition-transform"
              onClick={() => navigate(`/matches/new?match=${nextMatch.id}`)}
            >
              {(() => {
                const d = nextMatch.date ? new Date(nextMatch.date) : null;
                const mon = d ? d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '—';
                const day = d ? d.getDate() : '—';
                return (
                  <div className="flex-shrink-0 w-9 h-9 rounded-md overflow-hidden border border-slate-600 flex flex-col">
                    <div className="bg-primary text-white text-[8px] font-black tracking-wider text-center leading-none py-0.5">{mon}</div>
                    <div className="flex-1 bg-slate-800 flex items-center justify-center text-sm font-black text-white leading-none tabular-nums">{day}</div>
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 leading-none mb-0.5">Next</div>
                <div className="font-semibold text-sm truncate">
                  {nextMatch.opponent_name ?? 'TBD'}
                  {nextMatch.opponent_maxpreps_rank != null && (
                    <span className="text-slate-400 font-normal"> #{nextMatch.opponent_maxpreps_rank}</span>
                  )}
                  {nextMatch.match_type === 'ihsa-playoffs' && nextMatch.opponent_playoff_seed != null && (
                    <span className="text-slate-400 font-normal"> (#{nextMatch.opponent_playoff_seed})</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {nextMatch.location && (
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase ${
                      nextMatch.location === 'home' ? 'bg-emerald-900/50 text-emerald-400' :
                      nextMatch.location === 'away' ? 'bg-red-900/50 text-red-400' :
                                                      'bg-slate-700 text-slate-400'
                    }`}>
                      {nextMatch.location === 'home' ? 'H' : nextMatch.location === 'away' ? 'A' : 'N'}
                    </span>
                  )}
                  {nextMatch.conference && (
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase ${
                      nextMatch.conference === 'conference' ? 'bg-blue-900/50 text-blue-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {nextMatch.conference === 'conference' ? 'CON' : 'NC'}
                    </span>
                  )}
                  {nextMatch.opponent_record && (
                    <span className="text-[9px] font-semibold text-slate-500">{nextMatch.opponent_record}</span>
                  )}
                  <span className="text-[11px] text-slate-400 truncate">
                    {fmtDate(nextMatch.date)}{nextMatch.match_time ? ` · ${fmtTime(nextMatch.match_time)}` : ''}
                  </span>
                </div>
              </div>
              {nextMatch.status === MATCH_STATUS.SCHEDULED ? (
                <button
                  onClick={(e) => { e.stopPropagation(); openEditMatch(nextMatch); }}
                  className="text-slate-400 hover:text-white px-1.5 py-1 rounded transition-colors text-base leading-none"
                  title="Edit match"
                >
                  ✎
                </button>
              ) : (
                <span className="text-slate-500">›</span>
              )}
            </div>
          ) : null}
        </div>

        <NetDivider />

        {/* ── Recent matches ── */}
        <section className="relative">
          {/* Volleyball court top-down watermark */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 360 200"
            preserveAspectRatio="xMidYMid slice"
            style={{ opacity: 0.04 }}
            aria-hidden="true"
          >
            {/* Court boundary */}
            <rect x="6" y="6" width="348" height="188" fill="none" stroke="white" strokeWidth="2" rx="1" />
            {/* Net — center vertical line */}
            <line x1="180" y1="6"   x2="180" y2="194" stroke="white" strokeWidth="3" />
            {/* Attack lines */}
            <line x1="120" y1="6"   x2="120" y2="194" stroke="white" strokeWidth="1" />
            <line x1="240" y1="6"   x2="240" y2="194" stroke="white" strokeWidth="1" />
            {/* Antenna dots at net top & bottom */}
            <circle cx="180" cy="6"   r="3" fill="white" />
            <circle cx="180" cy="194" r="3" fill="white" />
          </svg>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-1.5">
              Schedule
              {matchView === 'closest' && displayMatches.length > 0 && (
                <button
                  onClick={() => setClosestSortAsc(v => { const next = !v; setStorageItem(STORAGE_KEYS.CLOSEST_SORT_ASC, String(next)); return next; })}
                  className="flex flex-col items-center leading-none text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={closestSortAsc ? 'Sort newest first' : 'Sort oldest first'}
                >
                  <span className={`text-[9px] leading-none ${closestSortAsc ? 'text-slate-400' : 'text-slate-600'}`}>▲</span>
                  <span className={`text-[9px] leading-none ${!closestSortAsc ? 'text-slate-400' : 'text-slate-600'}`}>▼</span>
                </button>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => { setMatchView('closest'); setStorageItem(STORAGE_KEYS.MATCH_VIEW_DEFAULT, 'closest'); }}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${matchView === 'closest' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Closest
                </button>
                <button
                  onClick={() => { setMatchView('schedule'); setStorageItem(STORAGE_KEYS.MATCH_VIEW_DEFAULT, 'schedule'); }}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${matchView === 'schedule' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Schedule
                </button>
              </div>
              {displayMatches.length > 0 && (
                <button onClick={() => navigate(defaultSeasonId ? `/seasons/${defaultSeasonId}` : '/seasons')} className="text-xs text-primary hover:text-orange-300 transition-colors">
                  See all →
                </button>
              )}
            </div>
          </div>

          {recentMatches === undefined && (
            <div className="flex justify-center py-8"><Spinner /></div>
          )}

          {recentMatches !== undefined && displayMatches.length === 0 && (() => {
            const { hasTeam, hasSeason, hasPlayers, hasSchedule, firstTeamId, firstSeasonId } = setupState ?? {};
            const teamRoute   = firstTeamId   ? `/teams/${firstTeamId}`     : '/teams';
            const seasonRoute = firstSeasonId ? `/seasons/${firstSeasonId}` : teamRoute;
            const steps = [
              { label: 'Create a Team',     done: !!hasTeam,     action: () => navigate('/teams'),           hint: 'School, club, or program name'   },
              { label: 'Create a Season',   done: !!hasSeason,   action: () => navigate(teamRoute),          hint: 'Year and season name'             },
              { label: 'Add a Roster',      done: !!hasPlayers,  action: () => navigate(teamRoute),          hint: 'Add players and jersey numbers'   },
              { label: 'Add Your Schedule', done: !!hasSchedule, action: () => navigate(seasonRoute),        hint: 'Add opponents and match dates'    },
              { label: 'Start a Match',     done: false,         action: () => navigate('/matches/new'),     hint: 'Record your first live stats'     },
            ];
            const nextIdx = steps.findIndex(s => !s.done);
            return (
                <div className="bg-surface rounded-xl p-4 space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Getting started</p>

                  {guideVisible && (
                    <div className="flex items-start gap-3 px-3 py-3 mb-3 rounded-xl bg-blue-900/30 border border-blue-700/40">
                      <span className="text-xl shrink-0">📖</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">New to Vantage?</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Follow the steps below to get started!</p>
                      </div>
                      <button
                        onClick={() => { setBoolStorage(STORAGE_KEYS.HELP_GUIDE_SEEN, true); setGuideVisible(false); }}
                        className="text-slate-600 hover:text-slate-400 text-xl leading-none shrink-0 px-1"
                        aria-label="Dismiss"
                      >×</button>
                    </div>
                  )}

                  {steps.map((step, i) => {
                    const isNext = i === nextIdx;
                    const isPast = step.done;
                    return (
                      <button
                        key={step.label}
                        onClick={step.action}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors
                          ${isPast ? 'opacity-50' : isNext ? 'bg-primary/10 hover:bg-primary/20 active:scale-[0.98]' : 'hover:bg-slate-700/50 active:scale-[0.98]'}`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black
                          ${isPast ? 'bg-emerald-600 text-white' : isNext ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'}`}>
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold ${isPast ? 'line-through text-slate-500' : isNext ? 'text-white' : 'text-slate-400'}`}>
                            {step.label}
                          </p>
                          {!isPast && <p className="text-xs text-slate-500">{step.hint}</p>}
                        </div>
                        {isPast ? (
                          <div className="w-5 h-5 rounded border-2 border-emerald-600 bg-emerald-600 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        ) : (
                          <div className={`w-5 h-5 rounded border-2 shrink-0 ${isNext ? 'border-primary' : 'border-slate-600'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
            );
          })()}

          {recentMatches !== undefined && matchView === 'schedule' && displayMatches.length > 0 && (
            <ScheduleCalendar
              matches={displayMatches}
              navigate={navigate}
              scoreDetail={scoreDetail}
              onDeleteConfirm={m => setConfirmDelete(m)}
              openEditMatch={openEditMatch}
              playoffLabel={playoffLabel}
            />
          )}

          {recentMatches !== undefined && matchView !== 'schedule' && (closestSortAsc ? displayMatches : [...displayMatches].reverse()).map((match, idx) => (
            <SwipeableMatchCard
              key={match.id}
              onDeleteConfirm={() => setConfirmDelete(match)}
              animDelay={`${idx * 40}ms`}
            >
              {match.status === MATCH_STATUS.SCHEDULED ? (
                <div className="w-full bg-surface rounded-xl px-4 py-3 flex items-center justify-between border-l-4 border-transparent">
                  <div>
                    <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                      <span>
                        {match.opponent_name ?? 'vs. Unknown'}
                        {match.opponent_maxpreps_rank != null && (
                          <span className="text-slate-400 font-normal"> #{match.opponent_maxpreps_rank}</span>
                        )}
                        {match.match_type === 'ihsa-playoffs' && match.opponent_playoff_seed != null && (
                          <span className="text-slate-400 font-normal"> (#{match.opponent_playoff_seed})</span>
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
                          match.location === 'home'    ? 'bg-emerald-900/50 text-emerald-400' :
                          match.location === 'away'    ? 'bg-red-900/50 text-red-400' :
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
                      <span className="text-xs text-slate-400">
                        {match.season ? `${match.season.name ?? match.season.year} · ` : ''}{fmtDate(match.date)}{match.match_time ? ` · ${fmtTime(match.match_time)}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditMatch(match)}
                      className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => navigate(`/matches/new?season=${match.season_id}&match=${match.id}`)}
                      className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-900/40 text-amber-400 hover:bg-amber-900/60 transition-colors"
                    >
                      ▶ Start
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => navigate(
                    match.status === MATCH_STATUS.COMPLETE
                      ? `/matches/${match.id}/summary`
                      : `/matches/${match.id}/live`
                  )}
                  className={`w-full bg-surface p-4 text-left flex items-center justify-between hover:bg-slate-700 rounded-xl transition-colors border-l-4 ${
                    match.status === MATCH_STATUS.COMPLETE
                      ? (match.our_sets_won ?? 0) > (match.opp_sets_won ?? 0)
                        ? 'border-emerald-600'
                        : 'border-red-700'
                      : match.status === MATCH_STATUS.IN_PROGRESS
                      ? 'border-primary'
                      : 'border-transparent'
                  }`}
                >
                  <div>
                    <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                      <span>
                        {match.opponent_name ?? 'vs. Unknown'}
                        {match.opponent_maxpreps_rank != null && (
                          <span className="text-slate-400 font-normal"> #{match.opponent_maxpreps_rank}</span>
                        )}
                        {match.match_type === 'ihsa-playoffs' && match.opponent_playoff_seed != null && (
                          <span className="text-slate-400 font-normal"> (#{match.opponent_playoff_seed})</span>
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
                          match.location === 'home'    ? 'bg-emerald-900/50 text-emerald-400' :
                          match.location === 'away'    ? 'bg-red-900/50 text-red-400' :
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
                      <span className="text-xs text-slate-400">
                        {match.season ? `${match.season.name ?? match.season.year} · ` : ''}{fmtDate(match.date)}{match.match_time ? ` · ${fmtTime(match.match_time)}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      {match.status === MATCH_STATUS.COMPLETE && (() => {
                        const won = (match.our_sets_won ?? 0) > (match.opp_sets_won ?? 0);
                        return (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${won ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'}`}>
                            {won ? 'W' : 'L'}
                          </span>
                        );
                      })()}
                      {scoreDetail === 'scores' && match.sets?.length
                        ? <span className="text-xs font-mono text-slate-300">{fmtSetScores(match.sets)}</span>
                        : <SetPips ourSets={match.our_sets_won} oppSets={match.opp_sets_won} />
                      }
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${match.status === MATCH_STATUS.IN_PROGRESS ? 'text-primary' : 'text-slate-400'}`}>
                      {match.status === MATCH_STATUS.IN_PROGRESS && (
                        <span className="serve-pulse inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                      {match.status === MATCH_STATUS.IN_PROGRESS ? 'Live'
                        : match.status === MATCH_STATUS.COMPLETE ? 'Final'
                        : 'Setup'}
                    </div>
                  </div>
                </button>
              )}
            </SwipeableMatchCard>
          ))}
        </section>

        <NetDivider />

        {/* ── Tools + Whiteboard (side by side) ── */}
        <div className="flex gap-2 animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
          <button
            onClick={() => navigate('/tools')}
            className="group flex-1 card-top-glow bg-surface rounded-xl p-3 text-left flex items-center gap-2.5 hover:bg-slate-700 active:scale-[0.97] transition-[transform,background-color] duration-75"
          >
            <span className="text-2xl inline-block transition-transform duration-75 group-active:-translate-y-1 group-active:scale-125">🛠️</span>
            <div className="min-w-0">
              <div className="font-semibold text-sm">Tools</div>
              <div className="text-[11px] text-slate-400 truncate">Practice utilities</div>
            </div>
            <span className="text-slate-500 ml-auto">›</span>
          </button>

          <button
            onClick={() => setShowWhiteboard(true)}
            className="group flex-1 card-top-glow bg-surface rounded-xl p-3 text-left flex items-center gap-2.5 hover:bg-slate-700 active:scale-[0.97] transition-[transform,background-color] duration-75"
          >
            <span className="text-2xl inline-block transition-transform duration-75 group-active:-translate-y-1 group-active:scale-125">📋</span>
            <div className="min-w-0">
              <div className="font-semibold text-sm">Whiteboard</div>
              <div className="text-[11px] text-slate-400 truncate">Timeout draw & diagram</div>
            </div>
            <span className="text-slate-500 ml-auto">›</span>
          </button>
        </div>

        <div
          className="text-[11px] font-semibold tracking-[0.18em] text-slate-600 text-center pt-2 pb-1"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          {todayDisplay}
        </div>


        <div className="border-t border-slate-800 mx-4 mb-6 pt-6">
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 font-semibold text-sm transition-all duration-150"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {confirmLogout && (
        <ConfirmDialog
          title="Sign Out"
          message="Are you sure you want to sign out?"
          confirmLabel="Sign Out"
          danger
          onConfirm={async () => { await supabase.auth.signOut(); }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}

      {showWhiteboard && (
        <CourtWhiteboard onClose={() => setShowWhiteboard(false)} />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Match?"
          message={`Delete match vs. ${confirmDelete.opponent_name ?? 'Unknown'}? This will permanently remove all sets, contacts, and stats for this match.`}
          confirmLabel="Delete"
          danger
          onConfirm={async () => {
            await deleteMatch(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* ── Edit Scheduled Match Modal ── */}
      {schedOpen && createPortal(
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={resetSchedForm} />
          <div
            className="fixed z-50 w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto bg-bg rounded-2xl p-6 space-y-4 shadow-2xl"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <h2 className="text-lg font-bold">Edit Scheduled Game</h2>

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

            {/* Opponent record + MaxPreps rank */}
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
                  Record <span className="normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={schedOppRecord}
                  onChange={(e) => setSchedOppRecord(e.target.value)}
                  placeholder="ex: 12-3"
                  className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
                  MaxPreps Rank <span className="normal-case font-normal">(opt)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={schedOppRank}
                  onChange={(e) => setSchedOppRank(e.target.value)}
                  placeholder="ex: 42"
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
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Start Time <span className="normal-case font-normal text-slate-500">(optional)</span></label>
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
                    placeholder="ex: Holiday Classic, IHSA Sectional…"
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

            {/* Playoff Round */}
            {schedMatchType === 'ihsa-playoffs' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Playoff Round</label>
                <input
                  type="text"
                  value={schedPlayoffRound}
                  onChange={(e) => setSchedPlayoffRound(e.target.value)}
                  placeholder="ex: Regional, Sectional, Super-Sectional, State…"
                  className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-slate-500"
                />
              </div>
            )}

            {schedMatchType === 'ihsa-playoffs' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Opponent Playoff Seed</label>
                <input
                  type="number"
                  min="1"
                  value={schedOppSeed}
                  onChange={(e) => setSchedOppSeed(e.target.value)}
                  placeholder="ex: 3"
                  className="w-full bg-surface border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-slate-500"
                />
              </div>
            )}

            {/* Actions */}
            {schedError && (
              <p className="text-sm text-red-400 text-center">{schedError}</p>
            )}
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
        </>,
        document.body
      )}
    </div>
  );
}
