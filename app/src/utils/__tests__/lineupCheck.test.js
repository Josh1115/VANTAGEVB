import { describe, it, expect } from 'vitest';
import { findLineupProblem } from '../lineupCheck';

const slot = (id, extra = {}) => ({ playerId: id, playerName: `P${id}`, jersey: String(id), ...extra });

describe('findLineupProblem', () => {
  it('passes a normal lineup', () => {
    expect(findLineupProblem([1, 2, 3, 4, 5, 6].map((i) => slot(i)))).toBeNull();
  });
  it('ignores an empty lineup before the match loads', () => {
    expect(findLineupProblem(Array.from({ length: 6 }, () => slot(null)))).toBeNull();
    expect(findLineupProblem([])).toBeNull();
  });
  it('flags a player on court twice', () => {
    expect(findLineupProblem([1, 2, 3, 4, 5, 5].map((i) => slot(i)))).toEqual({ type: 'duplicate', playerId: 5, name: 'P5', jersey: '5' });
  });
  it('flags a court that is not six spots', () => {
    expect(findLineupProblem([1, 2, 3, 4, 5, 6, 7].map((i) => slot(i)))).toEqual({ type: 'size', count: 7 });
  });
});
