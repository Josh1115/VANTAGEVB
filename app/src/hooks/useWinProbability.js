import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMatchStore } from '../store/matchStore';
import { useShallow } from 'zustand/react/shallow';
import { FORMAT, MATCH_STATUS } from '../constants';
import {
  computePQ, computeRotationPQ, computeRotationStats,
  computeSetWinProb, computeSetWinProbRotation, computeMatchWinProb,
} from '../stats/engine';
import { getRalliesForMatches } from '../stats/queries';
import { db } from '../db/schema';

// Queries completed season matches (excluding current) and returns Bayesian priors:
// { p, q } — global blended rates, and rotationStats — per-rotation counts from
// season history used to seed the per-rotation Bayesian prior.
export function useHistoricalPQ(matchId) {
  return useLiveQuery(async () => {
    if (!matchId) return null;
    const match = await db.matches.get(matchId);
    if (!match?.season_id) return null;
    const seasonMatches = await db.matches
      .where('season_id').equals(match.season_id)
      .filter((m) => m.id !== matchId && m.status === MATCH_STATUS.COMPLETE)
      .toArray();
    if (!seasonMatches.length) return null;
    const rallies = await getRalliesForMatches(seasonMatches.map((m) => m.id));
    if (!rallies.length) return null;
    const { p, q } = computePQ(rallies);
    return { p, q, rotationStats: computeRotationStats(rallies) };
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

    // Bayesian-blended global rates (season prior + current-set evidence)
    const { p, q } = computePQ(committedRallies, historicalPQ?.p, historicalPQ?.q);

    // Determine current rotation from the last committed rally.
    // Rotation advances when we sideout (win on their serve).
    const lastRally = committedRallies[committedRallies.length - 1];
    let currentRotation = lastRally?.our_rotation ?? 1;
    if (lastRally?.point_winner === 'us' && lastRally?.serve_side === 'them') {
      currentRotation = (currentRotation % 6) + 1;
    }

    // Per-rotation Bayesian rates — season prior blended with live-set rallies.
    // Falls back to flat p,q model when no season rotation history exists.
    const rotationRates = historicalPQ?.rotationStats
      ? computeRotationPQ(historicalPQ.rotationStats, committedRallies, p, q)
      : null;

    // Current set: use rotation-aware model when rotation data is available
    const setWinProb = rotationRates
      ? computeSetWinProbRotation(rotationRates, ourScore, oppScore, currentRotation, serveSide, isDecider)
      : computeSetWinProb(p, q, ourScore, oppScore, serveSide, isDecider);

    // Future sets: use global blended rates (rotation unknown for future sets)
    const pFutureSet   = computeSetWinProb(p, q, 0, 0, 'them', false);
    const matchWinProb = computeMatchWinProb(setWinProb, pFutureSet, ourSetsWon, oppSetsWon, setsToWin);

    return { matchWinProb, setWinProb, p, q };
  }, [committedRallies, historicalPQ, ourScore, oppScore, serveSide, ourSetsWon, oppSetsWon, setNumber, format]);
}
