import { describe, it, expect } from 'vitest';
import { viewToCourt, courtToView, landingZone, shotContacts, killsOffSetter, VIEW_W, VIEW_H, MARGIN, COURT_LEN, COURT_WID } from '../attackShot';

describe('attack shot geometry', () => {
  it('maps drawing taps to court fractions (and back)', () => {
    expect(viewToCourt(MARGIN / VIEW_W, MARGIN / VIEW_H)).toEqual({ x: 0, y: 0 });
    expect(viewToCourt((MARGIN + COURT_LEN) / VIEW_W, (MARGIN + COURT_WID) / VIEW_H)).toEqual({ x: 1, y: 1 });
    expect(viewToCourt(0, 0).x).toBeLessThan(0); // tap in the out-of-bounds margin
    expect(courtToView(0.5, 0.5)).toEqual({ vx: MARGIN + 9, vy: MARGIN + 4.5 });
  });
  it('works out the opponent zone where the ball landed', () => {
    expect(landingZone(0.55, 0.1)).toBe(2);   // near net, top
    expect(landingZone(0.55, 0.5)).toBe(3);
    expect(landingZone(0.55, 0.9)).toBe(4);
    expect(landingZone(0.7, 0.5)).toBe(3);    // past the 10 ft line is still front
    expect(landingZone(0.9, 0.1)).toBe(1);    // deep, top
    expect(landingZone(0.9, 0.5)).toBe(6);
    expect(landingZone(0.9, 0.9)).toBe(5);
    expect(landingZone(1.1, 0.5)).toBeNull(); // long = out
    expect(landingZone(0.3, 0.5)).toBeNull(); // our side
  });
});

describe('shot filtering', () => {
  const contacts = [
    { id: 1, action: 'attack', result: 'kill',    player_id: 7, from_x: .3, from_y: .2, court_x: .8, court_y: .5 },
    { id: 2, action: 'attack', result: 'attempt', player_id: 8, from_x: .3, from_y: .5 },
    { id: 3, action: 'attack', result: 'error',   player_id: 7 },                     // no location
    { id: 4, action: 'set',    result: 'assist',  player_id: 9, kill_contact_id: 1 },
    { id: 5, action: 'attack', result: 'kill',    player_id: 7, from_x: .4, from_y: .1, opponent_contact: true },
  ];
  it('keeps only our attacks that have a location', () => {
    expect(shotContacts(contacts).map((c) => c.id)).toEqual([1, 2]);
    expect(shotContacts(contacts, { playerId: 7 }).map((c) => c.id)).toEqual([1]);
  });
  it("finds kills off a setter's assists", () => {
    expect(killsOffSetter(contacts, 9).map((c) => c.id)).toEqual([1]);
    expect(killsOffSetter(contacts, 8)).toEqual([]);
  });
});

describe('flip', () => {
  it('turns a tap around when our side is shown on the right', async () => {
    const { flipTap } = await import('../attackShot');
    expect(flipTap(0.2, 0.3, false)).toEqual([0.2, 0.3]);
    const [fx, fy] = flipTap(0.2, 0.3, true);
    expect(fx).toBeCloseTo(0.8); expect(fy).toBeCloseTo(0.7);
  });
});
