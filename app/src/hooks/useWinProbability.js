import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMatchStore } from '../store/matchStore';
import { useShallow } from 'zustand/react/shallow';
import { FORMAT, MATCH_STATUS } from '../constants';
import { computePQ, computeSetWinProb, computeMatchWinProb } from '../stats/engine';
import { getRalliesForMatches } from '../stats/queries';
import { db } from '../db/schema';

// Shared hook — queries completed season matches (excluding matchId) and returns
// { p, q } derived from their rally data. Used as a prior when in-match sample is small.
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
    return computePQ(rallies);
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

    // Current match rates, falling back to season history, then hardcoded constants
    const { p, q } = computePQ(committedRallies, historicalPQ?.p, historicalPQ?.q);

    const setWinProb   = computeSetWinProb(p, q, ourScore, oppScore, serveSide, isDecider);
    const pFutureSet   = computeSetWinProb(p, q, 0, 0, 'them', false);
    const matchWinProb = computeMatchWinProb(setWinProb, pFutureSet, ourSetsWon, oppSetsWon, setsToWin);

    return { matchWinProb, setWinProb, p, q };
  }, [committedRallies, historicalPQ, ourScore, oppScore, serveSide, ourSetsWon, oppSetsWon, setNumber, format]);
}
