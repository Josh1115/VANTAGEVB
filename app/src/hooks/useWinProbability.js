import { useMemo } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useShallow } from 'zustand/react/shallow';
import { FORMAT } from '../constants';
import { computePQ, computeSetWinProb, computeMatchWinProb } from '../stats/engine';

export function useWinProbability() {
  const {
    committedRallies,
    ourScore,
    oppScore,
    serveSide,
    ourSetsWon,
    oppSetsWon,
    setNumber,
    format,
  } = useMatchStore(useShallow((s) => ({
    committedRallies: s.committedRallies,
    ourScore:         s.ourScore,
    oppScore:         s.oppScore,
    serveSide:        s.serveSide,
    ourSetsWon:       s.ourSetsWon,
    oppSetsWon:       s.oppSetsWon,
    setNumber:        s.setNumber,
    format:           s.format,
  })));

  return useMemo(() => {
    const setsToWin   = format === FORMAT.BEST_OF_3 ? 2 : 3;
    const decidingSet = format === FORMAT.BEST_OF_3 ? 3 : 5;
    const isDecider   = setNumber === decidingSet;

    const { p, q } = computePQ(committedRallies);

    const setWinProb = computeSetWinProb(p, q, ourScore, oppScore, serveSide, isDecider);

    // pFutureSet: expected win probability starting from 0-0 in a new set
    const pFutureSet = computeSetWinProb(p, q, 0, 0, 'them', false);

    const matchWinProb = computeMatchWinProb(setWinProb, pFutureSet, ourSetsWon, oppSetsWon, setsToWin);

    return { matchWinProb, setWinProb, p, q };
  }, [committedRallies, ourScore, oppScore, serveSide, ourSetsWon, oppSetsWon, setNumber, format]);
}
