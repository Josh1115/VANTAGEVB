import { describe, it, expect } from 'vitest';
import { titleForGame, seasonTitles } from '../seasonUtils';

const game = (round, us, them, extra = {}) => ({
  status: 'complete', match_type: 'ihsa-playoffs', playoff_round: round,
  our_sets_won: us, opp_sets_won: them, date: '2026-10-30', ...extra,
});

describe('titleForGame', () => {
  it('gives titles for winning a stage final', () => {
    expect(titleForGame('Regional Final', true)).toBe('Regional Champions');
    expect(titleForGame('regional championship', true)).toBe('Regional Champions');
    expect(titleForGame('REGIONAL FINALS', true)).toBe('Regional Champions');
    expect(titleForGame('Sectional Final', true)).toBe('Sectional Champions');
    expect(titleForGame('Section Final', true)).toBe('Sectional Champions');
    expect(titleForGame('Super-Sectional', true)).toBe('Super-Sectional Champions');
    expect(titleForGame('Super Sectional', true)).toBe('Super-Sectional Champions');
  });
  it('gives nothing for losing a stage final', () => {
    expect(titleForGame('Regional Final', false)).toBeNull();
    expect(titleForGame('Sectional Final', false)).toBeNull();
    expect(titleForGame('Super-Sectional', false)).toBeNull();
  });
  it('gives nothing for earlier rounds or bare stage names', () => {
    expect(titleForGame('Regional Semifinal', true)).toBeNull();
    expect(titleForGame('Regional Semi-Final', true)).toBeNull();
    expect(titleForGame('Regional Quarterfinal', true)).toBeNull();
    expect(titleForGame('Sectional Semifinal', true)).toBeNull();
    expect(titleForGame('Regional', true)).toBeNull();
    expect(titleForGame('Sectional', true)).toBeNull();
    expect(titleForGame('State Semifinal', true)).toBeNull();
    expect(titleForGame('', true)).toBeNull();
  });
  it('gives State placements for a win or a loss', () => {
    expect(titleForGame('State Championship', true)).toBe('State Champions');
    expect(titleForGame('State Championship', false)).toBe('State Runner-Up');
    expect(titleForGame('IHSA State Final', true)).toBe('State Champions');
    expect(titleForGame('3rd Place', true)).toBe('State 3rd Place');
    expect(titleForGame('Third Place Match', false)).toBe('State 4th Place');
  });
});

describe('seasonTitles', () => {
  it('adds titles from a playoff run after the typed ones', () => {
    const games = [
      game('Regional Semifinal', 2, 0), game('Regional Final', 2, 1),
      game('Sectional Semifinal', 2, 0), game('Sectional Final', 1, 2),
    ];
    expect(seasonTitles(['Conference Champions'], games)).toEqual(['Conference Champions', 'Regional Champions']);
  });
  it('does not repeat a title the coach already typed', () => {
    expect(seasonTitles(['Regional Champs'], [game('Regional Final', 2, 0)])).toEqual(['Regional Champs']);
    expect(seasonTitles(['IHSA State Runner-Up'], [game('State Championship', 1, 2)])).toEqual(['IHSA State Runner-Up']);
  });
  it('keeps typed titles when there are no games', () => {
    expect(seasonTitles(['Conference Champions'], undefined)).toEqual(['Conference Champions']);
    expect(seasonTitles('Conference Champions', [])).toEqual(['Conference Champions']);
    expect(seasonTitles(null, [])).toEqual([]);
  });
  it('ignores unfinished, non-playoff and unnamed games', () => {
    expect(seasonTitles([], [
      game('Regional Final', 2, 0, { status: 'scheduled' }),
      game('Regional Final', 2, 0, { match_type: 'tourney' }),
      game('', 2, 0),
    ])).toEqual([]);
  });
  it('a full state title run gives every title once', () => {
    const games = [
      game('Regional Final', 2, 0), game('Sectional Final', 2, 0),
      game('Super-Sectional', 2, 1), game('State Semifinal', 2, 0), game('State Championship', 2, 1),
    ];
    expect(seasonTitles([], games)).toEqual([
      'Regional Champions', 'Sectional Champions', 'Super-Sectional Champions', 'State Champions',
    ]);
  });
});
