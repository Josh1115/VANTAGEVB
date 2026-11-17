import { describe, it, expect } from 'vitest';
import { findCollege, searchColleges, normalizeCollege } from '../collegeLogos';
import list from '../../../public/colleges.json';

describe('college logo lookup', () => {
  it('matches common ways of typing a school', () => {
    expect(findCollege(list, 'Illinois')?.id).toBe(356);
    expect(findCollege(list, 'University of Illinois')?.id).toBe(356);
    expect(findCollege(list, 'illinois fighting illini')?.id).toBe(356);
    expect(findCollege(list, 'Loras College')?.id).toBe(263);
  });
  it('returns nothing for unknown schools', () => {
    expect(findCollege(list, 'Made Up Tech')).toBeNull();
    expect(findCollege(list, '')).toBeNull();
  });
  it('suggests schools that start with the typed text first', () => {
    const r = searchColleges(list, 'wisc');
    expect(r.length).toBeGreaterThan(0);
    expect(normalizeCollege(r[0].d).startsWith('wisc')).toBe(true);
  });
});
