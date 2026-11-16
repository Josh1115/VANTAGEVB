import { describe, it, expect } from 'vitest';
import { gradeIndex, nextGrade, gradeForNewSeason } from '../seasonUtils';

describe('grade bump', () => {
  it('recognises grade spellings', () => {
    expect(gradeIndex('Freshman')).toBe(0);
    expect(gradeIndex('so')).toBe(1);
    expect(gradeIndex('JR.')).toBe(2);
    expect(gradeIndex('12th')).toBe(3);
    expect(gradeIndex('16U')).toBe(null);
    expect(gradeIndex('')).toBe(null);
  });
  it('moves up one grade in the same style', () => {
    expect(nextGrade('Freshman')).toBe('Sophomore');
    expect(nextGrade('Junior')).toBe('Senior');
    expect(nextGrade('Jr')).toBe('Sr');
    expect(nextGrade('SO.')).toBe('JR.');
    expect(nextGrade('9')).toBe('10');
    expect(nextGrade('11th')).toBe('12th');
  });
  it('leaves seniors and unknown grades alone', () => {
    expect(nextGrade('Senior')).toBe(null);
    expect(nextGrade('16U')).toBe(null);
    expect(gradeForNewSeason({ year: 'Senior' }, 2027)).toBe('Senior');
    expect(gradeForNewSeason({ year: null }, 2027)).toBe(null);
  });
  it('never bumps the same player twice for one season', () => {
    expect(gradeForNewSeason({ year: 'Junior' }, 2027)).toBe('Senior');
    expect(gradeForNewSeason({ year: 'Senior', grade_year: 2027 }, 2027)).toBe('Senior');
    expect(gradeForNewSeason({ year: 'Sophomore', grade_year: 2026 }, 2027)).toBe('Junior');
  });
});
