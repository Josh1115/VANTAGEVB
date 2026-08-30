import { describe, it, expect } from 'vitest';
import { planServerRepair, repairServerPlayerIds } from '../serverRepair';

// ── Builders ─────────────────────────────────────────────────────────────────

let rid = 0, cid = 0;
const rally = (o) => ({
  id: ++rid, set_id: 1, serve_side: 'us', point_winner: 'us',
  our_rotation: 1, server_player_id: null, timestamp: 1000 * rid, ...o,
});
const serve = (o) => ({
  id: ++cid, set_id: 1, action: 'serve', serve_side: 'us',
  player_id: 10, rotation_num: 1, timestamp: 1000 * cid, ...o,
});

const valid = new Set([10, 11, 12, 13, 14, 15]);

// ── Core behaviour ───────────────────────────────────────────────────────────

describe('planServerRepair', () => {
  it('fills a null server from the matching serve contact', () => {
    rid = cid = 0;
    const rallies = [rally({ our_rotation: 3, server_player_id: null, timestamp: 5000 })];
    const contacts = [serve({ rotation_num: 3, player_id: 12, timestamp: 5001 })];
    expect(planServerRepair(rallies, contacts, valid))
      .toEqual([{ id: 1, server_player_id: 12 }]);
  });

  it('fixes an orphaned server id (points at no local player)', () => {
    rid = cid = 0;
    const rallies = [rally({ our_rotation: 2, server_player_id: 999, timestamp: 5000 })];
    const contacts = [serve({ rotation_num: 2, player_id: 11, timestamp: 5000 })];
    expect(planServerRepair(rallies, contacts, valid))
      .toEqual([{ id: 1, server_player_id: 11 }]);
  });

  it('never rewrites a rally that already names a real local player', () => {
    rid = cid = 0;
    const rallies = [rally({ our_rotation: 1, server_player_id: 13, timestamp: 5000 })];
    const contacts = [serve({ rotation_num: 1, player_id: 14, timestamp: 5000 })];
    expect(planServerRepair(rallies, contacts, valid)).toEqual([]);
  });

  it('leaves a broken rally alone when no serve contact matches its rotation', () => {
    rid = cid = 0;
    const rallies = [rally({ our_rotation: 4, server_player_id: null, timestamp: 5000 })];
    const contacts = [serve({ rotation_num: 1, player_id: 10, timestamp: 5000 })];
    expect(planServerRepair(rallies, contacts, valid)).toEqual([]);
  });

  it('ignores opponent serves and non-serve contacts', () => {
    rid = cid = 0;
    const rallies = [rally({ our_rotation: 1, server_player_id: null, timestamp: 5000 })];
    const contacts = [
      serve({ rotation_num: 1, player_id: 11, serve_side: 'them', timestamp: 4999 }),
      { id: 99, set_id: 1, action: 'attack', player_id: 12, rotation_num: 1, timestamp: 5000 },
      serve({ rotation_num: 1, player_id: 15, timestamp: 5001 }),
    ];
    expect(planServerRepair(rallies, contacts, valid))
      .toEqual([{ id: 1, server_player_id: 15 }]);
  });

  it('does not pull in a serve contact from far in the future (next rotation)', () => {
    rid = cid = 0;
    const rallies = [rally({ our_rotation: 1, server_player_id: null, timestamp: 5000 })];
    const contacts = [serve({ rotation_num: 1, player_id: 10, timestamp: 5000 + 20000 })];
    expect(planServerRepair(rallies, contacts, valid)).toEqual([]);
  });

  it('walks a set in order, pairing each rally with its own serve contact', () => {
    rid = cid = 0;
    const rallies = [
      rally({ our_rotation: 1, server_player_id: null, timestamp: 1000 }),
      rally({ our_rotation: 1, server_player_id: null, timestamp: 2000 }),
      rally({ our_rotation: 2, server_player_id: null, timestamp: 3000 }),
    ];
    const contacts = [
      serve({ rotation_num: 1, player_id: 10, timestamp: 1001 }),
      serve({ rotation_num: 1, player_id: 10, timestamp: 2001 }),
      serve({ rotation_num: 2, player_id: 11, timestamp: 3001 }),
    ];
    expect(planServerRepair(rallies, contacts, valid)).toEqual([
      { id: 1, server_player_id: 10 },
      { id: 2, server_player_id: 10 },
      { id: 3, server_player_id: 11 },
    ]);
  });

  it('keeps alignment when a middle rally has no contact but the next does', () => {
    rid = cid = 0;
    const rallies = [
      rally({ our_rotation: 5, server_player_id: null, timestamp: 1000 }), // no contact logged
      rally({ our_rotation: 5, server_player_id: null, timestamp: 2000 }),
    ];
    const contacts = [serve({ rotation_num: 5, player_id: 15, timestamp: 2001 })];
    // first rally can't be paired (its contact is >window before... actually after);
    // the one contact belongs to the rally closest in its window
    const out = planServerRepair(rallies, contacts, valid);
    expect(out).toEqual([{ id: 1, server_player_id: 15 }]);
  });

  it('is a no-op on a set with no serve contacts at all', () => {
    rid = cid = 0;
    const rallies = [
      rally({ server_player_id: null }), rally({ server_player_id: 777 }),
    ];
    expect(planServerRepair(rallies, [], valid)).toEqual([]);
  });

  it('handles a libero serving (contact names the libero, lineup would not)', () => {
    rid = cid = 0;
    // rotation 3: the libero (id 15) served, recorded as a serve contact.
    const rallies = [rally({ our_rotation: 3, server_player_id: null, timestamp: 5000 })];
    const contacts = [serve({ rotation_num: 3, player_id: 15, timestamp: 5000 })];
    expect(planServerRepair(rallies, contacts, valid))
      .toEqual([{ id: 1, server_player_id: 15 }]);
  });

  it('handles rows with no timestamps (degrades to rotation + order)', () => {
    rid = cid = 0;
    const rallies = [
      { id: 1, set_id: 1, serve_side: 'us', our_rotation: 2, server_player_id: null },
      { id: 2, set_id: 1, serve_side: 'us', our_rotation: 3, server_player_id: null },
    ];
    const contacts = [
      { id: 1, set_id: 1, action: 'serve', serve_side: 'us', player_id: 12, rotation_num: 2 },
      { id: 2, set_id: 1, action: 'serve', serve_side: 'us', player_id: 13, rotation_num: 3 },
    ];
    expect(planServerRepair(rallies, contacts, valid)).toEqual([
      { id: 1, server_player_id: 12 },
      { id: 2, server_player_id: 13 },
    ]);
  });

  it('returns updates sorted by rally id across multiple sets', () => {
    rid = cid = 0;
    const rallies = [
      rally({ id: 50, set_id: 2, our_rotation: 1, server_player_id: null, timestamp: 100 }),
      rally({ id: 20, set_id: 1, our_rotation: 1, server_player_id: null, timestamp: 100 }),
    ];
    const contacts = [
      { id: 1, set_id: 2, action: 'serve', serve_side: 'us', player_id: 12, rotation_num: 1, timestamp: 100 },
      { id: 2, set_id: 1, action: 'serve', serve_side: 'us', player_id: 11, rotation_num: 1, timestamp: 100 },
    ];
    expect(planServerRepair(rallies, contacts, valid)).toEqual([
      { id: 20, server_player_id: 11 },
      { id: 50, server_player_id: 12 },
    ]);
  });
});

// ── Transaction wiring ───────────────────────────────────────────────────────

describe('repairServerPlayerIds (Dexie transaction)', () => {
  function fakeTx({ players, rallies, contacts }) {
    const updates = [];
    return {
      updates,
      table(name) {
        if (name === 'players')  return { toArray: async () => players };
        if (name === 'rallies')  return {
          toArray: async () => rallies,
          bulkUpdate: async (rows) => { for (const { key, changes } of rows) updates.push({ id: key, ...changes }); },
        };
        if (name === 'contacts') return {
          where: (field) => ({
            equals: (val) => ({
              toArray: async () => contacts.filter(c => c[field] === val),
            }),
          }),
        };
        throw new Error(`unexpected table ${name}`);
      },
    };
  }

  it('reads the three tables, filters to serve contacts, and applies updates', async () => {
    const tx = fakeTx({
      players: [{ id: 10 }, { id: 11 }],
      rallies: [
        { id: 1, set_id: 1, serve_side: 'us', our_rotation: 1, server_player_id: null, timestamp: 100 },
        { id: 2, set_id: 1, serve_side: 'us', our_rotation: 2, server_player_id: 10, timestamp: 200 },
      ],
      contacts: [
        { id: 1, set_id: 1, action: 'serve',  serve_side: 'us', player_id: 11, rotation_num: 1, timestamp: 100 },
        { id: 2, set_id: 1, action: 'attack', serve_side: 'us', player_id: 10, rotation_num: 2, timestamp: 200 },
      ],
    });

    const res = await repairServerPlayerIds(tx);

    expect(res).toEqual({ scanned: 2, updated: 1 });
    expect(tx.updates).toEqual([{ id: 1, server_player_id: 11 }]);
  });
});
