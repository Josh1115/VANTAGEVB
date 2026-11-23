import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS, getBoolStorage, setBoolStorage } from './storage';

export const SHOT_COLORS = { kill: '#22c55e', error: '#ef4444', attempt: '#94a3b8' };
// Geometry for attack shot charts. The court is drawn sideways: our side on
// the left, net in the middle, their side on the right, with a margin around
// it so out-of-bounds landings can be tapped.
//
// Stored positions are fractions of the court (not the drawing):
//   x: 0 = our end line, 0.5 = net, 1 = their end line
//   y: 0 = top sideline, 1 = bottom sideline (see landingZone for which side is which)
// Values outside 0–1 mean the ball was out.

export const COURT_LEN = 18;  // meters, end line to end line
export const COURT_WID = 9;
export const MARGIN    = 2;   // out-of-bounds room drawn around the court
export const VIEW_W    = COURT_LEN + MARGIN * 2;
export const VIEW_H    = COURT_WID + MARGIN * 2;

// Tap position as a fraction of the drawing (0–1) → court fraction.
export function viewToCourt(fx, fy) {
  return {
    x: round3((fx * VIEW_W - MARGIN) / COURT_LEN),
    y: round3((fy * VIEW_H - MARGIN) / COURT_WID),
  };
}

// Court fraction → drawing units (for SVG).
export function courtToView(x, y) {
  return { vx: MARGIN + x * COURT_LEN, vy: MARGIN + y * COURT_WID };
}

// Opponent rotation zone (1–6) where the ball landed, or null if it's out or
// on our side. Our hitter faces right, so the top of the screen is the
// opponent's right side (zones 2 front / 1 back), the bottom is their left
// (4 front / 5 back). Front and back are equal halves of their side, so the
// front zones extend past the 3 m (10 ft) line.
export function landingZone(x, y) {
  if (x == null || y == null || x < 0.5 || x > 1 || y < 0 || y > 1) return null;
  const front = x < 0.75;
  const lane  = y < 1 / 3 ? 0 : y < 2 / 3 ? 1 : 2;
  return front ? [2, 3, 4][lane] : [1, 6, 5][lane];
}

// Attack contacts that have a recorded shot location.
export function shotContacts(contacts, { playerId = null, playerIds = null, result = null } = {}) {
  return (contacts ?? []).filter((c) =>
    c.action === 'attack' && !c.opponent_contact && c.from_x != null &&
    (playerId == null || c.player_id === playerId) &&
    (playerIds == null || playerIds.has(c.player_id)) &&
    (result == null || c.result === result)
  );
}

// Kills that came off a given setter's assists (assist rows carry kill_contact_id).
export function killsOffSetter(contacts, setterId) {
  const killIds = new Set(
    (contacts ?? [])
      .filter((c) => c.action === 'set' && c.result === 'assist' && c.player_id === setterId && c.kill_contact_id != null)
      .map((c) => c.kill_contact_id)
  );
  return (contacts ?? []).filter((c) => killIds.has(c.id) && c.from_x != null);
}

function round3(n) { return Math.round(n * 1000) / 1000; }

// FLIP: show our team on the right. The court is turned around (like switching
// benches), so stored spots/zones stay correct either way. One shared setting —
// stays flipped (even after closing the app) until FLIP is tapped again.
const FLIP_EVENT = 'vantage-shot-flip';
export function flipTap(fx, fy, flipped) {
  return flipped ? [1 - fx, 1 - fy] : [fx, fy];
}
export function useShotFlip() {
  const [flipped, setFlipped] = useState(() => getBoolStorage(STORAGE_KEYS.ATTACK_SHOT_FLIP));
  useEffect(() => {
    const sync = () => setFlipped(getBoolStorage(STORAGE_KEYS.ATTACK_SHOT_FLIP));
    window.addEventListener(FLIP_EVENT, sync);
    return () => window.removeEventListener(FLIP_EVENT, sync);
  }, []);
  const toggle = useCallback(() => {
    const next = !getBoolStorage(STORAGE_KEYS.ATTACK_SHOT_FLIP);
    setBoolStorage(STORAGE_KEYS.ATTACK_SHOT_FLIP, next);
    window.dispatchEvent(new Event(FLIP_EVENT));
  }, []);
  return [flipped, toggle];
}
