/**
 * Cross-device match identity during sync — the case where several matches
 * share the natural key (season + opponent + date): a tournament's "TBD" slots
 * on one day, or a real doubleheader. The key index must hold every such row and
 * pair incoming games off 1:1, so an extra game scheduled on another device is
 * added rather than folded onto a sibling and lost.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// parseMergePreviewFromData only reads the DB (`.toArray()` per table). Mock it
// with plain arrays the individual tests fill in.
const store = {
  organizations: [],
  teams: [],
  seasons: [],
  matches: [],
  contacts: [],
  tombstones: [],
};
vi.mock('../../db/schema', () => ({
  db: new Proxy({}, {
    get: (_t, table) => ({ toArray: async () => store[table] ?? [] }),
  }),
}));

const {
  parseMergePreviewFromData,
  pickExistingMatch,
  uidClaimedMatchIds,
  indexMatchesByKey,
} = await import('../merge');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ORG    = { id: 1, name: 'Lake Zurich', uid: 'org-1' };
const TEAM   = { id: 1, org_id: 1, name: 'Varsity', gender: 'M', level: 'varsity', uid: 'team-1' };
const SEASON = { id: 1, team_id: 1, year: '2026', uid: 'season-1' };

const match = (o) => ({
  id: 0, uid: null, season_id: 1,
  opponent_name: 'TBD', date: '2026-09-05T12:00:00.000Z',
  match_time: null, tournament_round: 'pool', match_type: 'tourney',
  tournament_name: '2026 Crystal Lake South Tournament',
  status: 'scheduled', our_sets_won: 0, opp_sets_won: 0,
  updated_at: '2026-08-30T02:53:58.973Z', ...o,
});

const backup = (matches) => ({
  version: 1,
  organizations: [ORG], teams: [TEAM], seasons: [SEASON],
  players: [], opponents: [], matches,
  sets: [], rallies: [], contacts: [],
});

beforeEach(() => {
  store.organizations = [ORG];
  store.teams = [TEAM];
  store.seasons = [SEASON];
  store.matches = [];
  store.contacts = [];
  store.tombstones = [];
});

// ── Pure helpers ─────────────────────────────────────────────────────────────

describe('indexMatchesByKey', () => {
  it('groups every row that shares season + opponent + date into one list', () => {
    const rows = [
      match({ id: 1, match_time: '08:00' }),
      match({ id: 2, match_time: '09:00' }),
      match({ id: 3, opponent_name: 'Barrington', date: '2026-09-06T12:00:00.000Z' }),
    ];
    const idx = indexMatchesByKey(rows);
    expect(idx.get('1|tbd|2026-09-05').map(m => m.id)).toEqual([1, 2]);
    expect(idx.get('1|barrington|2026-09-06').map(m => m.id)).toEqual([3]);
  });
});

describe('pickExistingMatch', () => {
  const byUid = new Map([['u1', { id: 1 }]]);
  const byKey = new Map([['k', [{ id: 1 }, { id: 2 }]]]);

  it('matches by uid before natural key', () => {
    expect(pickExistingMatch({ uid: 'u1' }, byUid, byKey, 'k', new Set())).toEqual({ id: 1 });
  });

  it('claims only an unclaimed same-key row', () => {
    const claimed = new Set([1]);
    expect(pickExistingMatch({}, byUid, byKey, 'k', claimed)).toEqual({ id: 2 });
  });

  it('returns undefined when every same-key row is already claimed', () => {
    expect(pickExistingMatch({}, byUid, byKey, 'k', new Set([1, 2]))).toBeUndefined();
  });

  it('returns undefined when the key is unknown', () => {
    expect(pickExistingMatch({}, byUid, byKey, 'nope', new Set())).toBeUndefined();
  });
});

describe('uidClaimedMatchIds', () => {
  it('reserves every local row an incoming match matches by uid', () => {
    const byUid = new Map([['u1', { id: 10 }], ['u2', { id: 20 }]]);
    const claimed = uidClaimedMatchIds(
      [{ uid: 'u1' }, { uid: 'u3' }, { uid: null }],
      byUid,
    );
    expect([...claimed]).toEqual([10]);
  });
});

// ── Preview classification ───────────────────────────────────────────────────

describe('parseMergePreviewFromData — same-key matches', () => {
  it('adds a tournament game scheduled on another device instead of folding it', async () => {
    // Four "TBD" pool/bracket slots on Sep 5, all already synced (shared uids).
    store.matches = [
      match({ id: 1, uid: 'u1', match_time: '08:00' }),
      match({ id: 2, uid: 'u2', match_time: '09:00' }),
      match({ id: 3, uid: 'u3', match_time: '12:00', tournament_round: 'bracket' }),
      match({ id: 4, uid: 'u4', match_time: '13:00', tournament_round: 'bracket' }),
    ];
    // Cloud copy: the same four, plus a fifth 2pm slot added on the iPad.
    const incoming = backup([
      match({ id: 1, uid: 'u1', match_time: '08:00' }),
      match({ id: 2, uid: 'u2', match_time: '09:00' }),
      match({ id: 3, uid: 'u3', match_time: '12:00', tournament_round: 'bracket' }),
      match({ id: 4, uid: 'u4', match_time: '13:00', tournament_round: 'bracket' }),
      match({ id: 5, uid: 'u5', match_time: '14:00', updated_at: '2026-08-30T21:28:28.743Z' }),
    ]);

    const preview = await parseMergePreviewFromData(incoming);

    expect(preview.valid).toBe(true);
    expect(preview.newMatches.map(m => m.id)).toEqual([5]);
    expect(preview.conflicts.map(c => c.importedId).sort()).toEqual([1, 2, 3, 4]);
  });

  it('keeps both halves of a doubleheader recorded on another device', async () => {
    // This device has one game vs Barrington on Sep 5; the other device played
    // (and recorded) both games of the doubleheader. Neither carries a uid this
    // device knows.
    store.matches = [
      match({ id: 1, opponent_name: 'Barrington', tournament_name: null,
              match_type: 'regular', tournament_round: null, status: 'scheduled' }),
    ];
    const incoming = backup([
      match({ id: 7, opponent_name: 'Barrington', tournament_name: null, match_type: 'regular',
              tournament_round: null, status: 'complete', our_sets_won: 2, opp_sets_won: 0,
              updated_at: '2026-08-30T22:00:00.000Z' }),
      match({ id: 8, opponent_name: 'Barrington', tournament_name: null, match_type: 'regular',
              tournament_round: null, status: 'complete', our_sets_won: 2, opp_sets_won: 1,
              updated_at: '2026-08-30T23:30:00.000Z' }),
    ]);

    const preview = await parseMergePreviewFromData(incoming);

    // One pairs with the local row; the other is genuinely new, not dropped.
    expect(preview.conflicts).toHaveLength(1);
    expect(preview.newMatches).toHaveLength(1);
  });

  it('still recognizes a renamed opponent as the same match (no duplicate)', async () => {
    store.matches = [
      match({ id: 1, uid: 'u1', opponent_name: 'Lincoln', tournament_name: null,
              match_type: 'regular', tournament_round: null }),
    ];
    const incoming = backup([
      match({ id: 1, uid: 'u1', opponent_name: 'Lincoln Central', tournament_name: null,
              match_type: 'regular', tournament_round: null,
              updated_at: '2026-08-30T20:00:00.000Z' }),
    ]);

    const preview = await parseMergePreviewFromData(incoming);

    expect(preview.newMatches).toHaveLength(0);
    expect(preview.conflicts.map(c => c.importedId)).toEqual([1]);
  });
});
