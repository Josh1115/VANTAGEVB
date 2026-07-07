import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMatchStore } from '../store/matchStore';
import { useShallow } from 'zustand/react/shallow';
import { FORMAT, MATCH_STATUS } from '../constants';
import {
  computePQ, computeSetWinProbUncertain, computeMatchWinProb,
  calibrateMatchWinProb, calibrateSetWinProb,
} from '../stats/engine';
import { getRalliesForMatches } from '../stats/queries';
import { db } from '../db/schema';

// Queries completed season matches (excluding current) and returns Bayesian
// priors: { p, q } — global blended rates used as the season prior.
export function useHistoricalPQ(matchId) {
  return useLiveQuery(async () => {
    if (!matchId) return null;
    const match = await db.matches.get(matchId);
    if (!match?.season_id) return null;

    // Load season history, H2H matches, and current match completed sets in parallel
    const [seasonMatches, h2hMatches, completedSets] = await Promise.all([
      db.matches
        .where('season_id').equals(match.season_id)
        .filter((m) => m.id !== matchId && m.status === MATCH_STATUS.COMPLETE)
        .toArray(),
      match.opponent_id
        ? db.matches
            .where('opponent_id').equals(match.opponent_id)
            .filter((m) => m.id !== matchId && m.status === MATCH_STATUS.COMPLETE)
            .toArray()
        : Promise.resolve([]),
      db.sets
        .where('match_id').equals(matchId)
        .filter((s) => s.status === 'complete')
        .toArray(),
    ]);

    const [seasonRallies, currentMatchRallies] = await Promise.all([
      getRalliesForMatches(seasonMatches.map((m) => m.id)),
      completedSets.length
        ? db.rallies.where('set_id').anyOf(completedSets.map((s) => s.id)).toArray()
        : Promise.resolve([]),
    ]);

    // Layer 1: season rates as Bayesian baseline (falls back to global defaults if empty)
    const { p: seasonP, q: seasonQ } = computePQ(seasonRallies);

    // Layer 2: H2H evidence tightens prior toward opponent-specific performance.
    // Exclude matches already counted in seasonRallies to avoid double-counting rallies
    // from H2H games played in the current season.
    const seasonMatchIds = new Set(seasonMatches.map((m) => m.id));
    const uniqueH2hMatches = h2hMatches.filter((m) => !seasonMatchIds.has(m.id));
    let p = seasonP, q = seasonQ;
    if (uniqueH2hMatches.length) {
      const h2hRallies = await getRalliesForMatches(uniqueH2hMatches.map((m) => m.id));
      if (h2hRallies.length) ({ p, q } = computePQ(h2hRallies, seasonP, seasonQ));
    }

    return { p, q, currentMatchRallies };
  }, [matchId]);
}

export function useWinProbability() {
  const {
    matchId,
    committedRallies,
    ourScore,
    oppScore,
    serveSide,
    ourSetsWon,
    oppSetsWon,
    setNumber,
    format,
  } = useMatchStore(useShallow((s) => ({
    matchId:          s.matchId,
    committedRallies: s.committedRallies,
    ourScore:         s.ourScore,
    oppScore:         s.oppScore,
    serveSide:        s.serveSide,
    ourSetsWon:       s.ourSetsWon,
    oppSetsWon:       s.oppSetsWon,
    setNumber:        s.setNumber,
    format:           s.format,
  })));

  const historicalPQ = useHistoricalPQ(matchId);

  return useMemo(() => {
    const setsToWin   = format === FORMAT.BEST_OF_3 ? 2 : 3;
    const decidingSet = format === FORMAT.BEST_OF_3 ? 3 : 5;
    const isDecider   = setNumber === decidingSet;

    // [#1] Recency-weighted p/q for current set — recent rallies count more (alpha=0.93),
    // so momentum shifts register faster without discarding the season prior entirely.
    // pAlpha/pBeta/qAlpha/qBeta carry how *sure* this estimate is, not just its mean —
    // computeSetWinProbUncertain uses that spread instead of treating a shaky
    // early-season/new-opponent guess as fact (see engine.js for why).
    const { p, q, pAlpha, pBeta, qAlpha, qBeta } = computePQ(committedRallies, historicalPQ?.p, historicalPQ?.q, 0.93);

    // [#2] Match-level p/q for future-set projection: blend all completed-set rallies
    // from this match (equal weight) with the current set. This makes future-set win%
    // reflect how the team is actually performing today, not just the season average.
    const allMatchRallies = [...(historicalPQ?.currentMatchRallies ?? []), ...committedRallies];
    const {
      pAlpha: matchPAlpha, pBeta: matchPBeta, qAlpha: matchQAlpha, qBeta: matchQBeta,
    } = computePQ(allMatchRallies, historicalPQ?.p, historicalPQ?.q);

    const setWinProb = computeSetWinProbUncertain(pAlpha, pBeta, qAlpha, qBeta, ourScore, oppScore, serveSide, isDecider);

    // [#2] Future sets use match-level rates — today's performance is stronger evidence
    // for upcoming sets than the season average alone.
    const pFutureSet   = computeSetWinProbUncertain(matchPAlpha, matchPBeta, matchQAlpha, matchQBeta, 0, 0, 'them', false);
    const matchWinProb = computeMatchWinProb(setWinProb, pFutureSet, ourSetsWon, oppSetsWon, setsToWin);

    return {
      matchWinProb: calibrateMatchWinProb(matchWinProb),
      setWinProb:   calibrateSetWinProb(setWinProb),
      p, q,
    };
  }, [committedRallies, historicalPQ, ourScore, oppScore, serveSide, ourSetsWon, oppSetsWon, setNumber, format]);
}
