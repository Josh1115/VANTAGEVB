import { describe, it, expect } from 'vitest';
import { computePointPaths } from '../engine';

const r = (n, serve_side, point_winner) => ({ set_id: 1, rally_number: n, serve_side, point_winner });
const c = (n, ts, action, result, opp = false) => ({ set_id: 1, rally_number: n, timestamp: ts, action, result, opponent_contact: opp });

describe('computePointPaths', () => {
  it('classifies serving rallies', () => {
    const rallies = [r(1, 'us', 'us'), r(2, 'us', 'us'), r(3, 'us', 'them'), r(4, 'us', 'them')];
    const contacts = [
      c(1, 1, 'serve', 'ace'),
      c(2, 1, 'serve', 'in'), c(2, 2, 'attack', 'error', true),
      c(3, 1, 'serve', 'error'),
      c(4, 1, 'serve', 'in'), c(4, 2, 'attack', 'kill', true),
    ];
    const { sp, so } = computePointPaths(contacts, rallies);
    expect(sp).toMatchObject({ ace: 0.25, opp_err: 0.25, se: 0.25, opp_kill: 0.25, kill: 0, won_other: 0 });
    expect(so.fbso).toBeNull();
  });

  it('separates first-ball kills from later kills on receive', () => {
    const rallies = [r(1, 'them', 'us'), r(2, 'them', 'us'), r(3, 'them', 'us'), r(4, 'them', 'them'), r(5, 'them', 'them')];
    const contacts = [
      c(1, 1, 'pass', '2'), c(1, 2, 'attack', 'kill'),
      c(2, 1, 'pass', '3'), c(2, 2, 'attack', 'attempt'), c(2, 3, 'dig', 'success'), c(2, 4, 'attack', 'kill'),
      c(3, 1, 'serve', 'error', true),
      c(4, 1, 'pass', '0'),
      c(5, 1, 'pass', '2'), c(5, 2, 'attack', 'error'),
    ];
    const { so } = computePointPaths(contacts, rallies);
    expect(so).toMatchObject({ fbso: 0.2, kill: 0.2, opp_se: 0.2, aced: 0.2, our_err: 0.2, lost_other: 0 });
  });

  it('counts untagged rallies as other', () => {
    const { sp } = computePointPaths([], [r(1, 'us', 'us'), r(2, 'us', 'them')]);
    expect(sp).toMatchObject({ won_other: 0.5, lost_other: 0.5 });
  });
});
