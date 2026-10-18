import { describe, it, expect } from 'vitest';
import { groupRoster } from '../rosterGroups';

const P = [
  { id: 'a', jersey_number: '12', position: 'OH', year: 'Junior' },
  { id: 'b', jersey_number: '3',  position: 'S',  year: 'Senior' },
  { id: 'c', jersey_number: '7',  position: 'OH', year: null },
  { id: 'd', jersey_number: '1',  position: null, year: 'Freshman' },
  { id: 'e', jersey_number: '20', position: 'L',  year: 'Senior' },
  { id: 'f', jersey_number: '9',  position: 'RS', year: 'Junior' },
  { id: 'g', jersey_number: '5',  position: 'OPP', year: 'Junior' },
  { id: 'h', jersey_number: '2',  position: 'DS', year: 'Junior' },
];
const ids = g => g.players.map(p => p.id);

describe('groupRoster', () => {
  it('number mode: one group sorted by jersey', () => {
    const g = groupRoster(P, 'number');
    expect(g).toHaveLength(1);
    expect(ids(g[0])).toEqual(['d', 'h', 'b', 'g', 'c', 'f', 'a', 'e']);
  });

  it('position mode: ordered groups, empty skipped, missing → Other last', () => {
    const g = groupRoster(P, 'position');
    expect(g.map(x => x.key)).toEqual(['S', 'OH', 'OPP', 'LDS', 'other']);
    expect(ids(g[1])).toEqual(['c', 'a']);
    expect(ids(g[2])).toEqual(['g', 'f']);   // OPP + RS together
    expect(ids(g[3])).toEqual(['h', 'e']);   // L + DS together
    expect(ids(g[4])).toEqual(['d']);
  });

  it('grade mode: seniors first, missing → No Grade last', () => {
    const g = groupRoster(P, 'grade');
    expect(g.map(x => x.label)).toEqual(['Seniors', 'Juniors', 'Freshmen', 'No Grade']);
    expect(ids(g[0])).toEqual(['b', 'e']);
    expect(ids(g[3])).toEqual(['c']);
  });

  it('handles empty / null input', () => {
    expect(groupRoster(null, 'grade')).toEqual([]);
    expect(groupRoster([], 'number')[0].players).toEqual([]);
  });

  it('does not mutate input', () => {
    const copy = [...P];
    groupRoster(P, 'number');
    expect(P).toEqual(copy);
  });
});
