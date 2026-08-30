// Shows, end to end at the identity layer, why Fix #1 matters:
// a timezone-drifted match date defeats the automatic placeholder cleanup, and
// normalizing the dates (what the v25 migration and every write path now do)
// lets that cleanup work again.
process.env.TZ = 'America/Chicago';

import { describe, it, expect } from 'vitest';
import { planMatchDedup } from '../matchIdentity';
import { normalizeMatchDate } from '../../utils/matchDate';

// One real-world game, two copies:
//  - scheduled ahead of time on a laptop  → date stored as local-noon-in-UTC
//  - quick-started that evening on an iPad → date rolled to the next UTC day
const scheduledPlaceholder = {
  id: 1, uid: 'uid-sched', season_id: 10,
  opponent_name: 'Lincoln', match_time: null, tournament_round: null, match_type: 'regular',
  status: 'scheduled',
  date: '2026-08-25T17:00:00.000Z',
};
const playedMatch = {
  id: 2, uid: 'uid-played', season_id: 10,
  opponent_name: 'Lincoln', match_time: null, tournament_round: null, match_type: 'regular',
  status: 'complete',
  date: '2026-08-26T02:00:00.000Z',
};

const hasStats = (id) => id === 2; // the played match has recorded stats

describe('timezone drift vs. automatic placeholder cleanup', () => {
  it('BEFORE normalizing: the leftover placeholder is NOT cleaned up (the bug)', () => {
    const { deletions } = planMatchDedup([scheduledPlaceholder, playedMatch], hasStats);
    expect(deletions).toHaveLength(0);
  });

  it('AFTER normalizing both dates: the placeholder folds into the played game (the fix)', () => {
    const fixed = [scheduledPlaceholder, playedMatch].map((m) => ({
      ...m,
      date: normalizeMatchDate(m.date),
    }));
    const { deletions } = planMatchDedup(fixed, hasStats);
    expect(deletions).toHaveLength(1);
    expect(deletions[0].loserId).toBe(1);      // the scheduled placeholder
    expect(deletions[0].survivorId).toBe(2);   // the real played game
  });

  it('a real doubleheader (two played games, same day) is still never auto-folded', () => {
    const game1 = { ...playedMatch, id: 2, uid: 'g1', match_time: '17:00', date: normalizeMatchDate('2026-08-25T17:00:00.000Z') };
    const game2 = { ...playedMatch, id: 3, uid: 'g2', match_time: '19:30', date: normalizeMatchDate('2026-08-25T19:30:00.000Z') };
    const { deletions } = planMatchDedup([game1, game2], (id) => id === 2 || id === 3);
    expect(deletions).toHaveLength(0);
  });
});
