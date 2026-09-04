// Trial-only "matches ever created" counter.
//
// A trial account's allowance (TRIAL_MATCH_LIMIT) is a whole-account total, and
// it must never be won back by deleting a match — online or offline. We keep a
// per-account tally in localStorage that only ever moves up:
//   • +1 every time this device creates a trial match the server did NOT count
//     (i.e. it was made offline);
//   • raised to the server's number whenever we learn it (profile load or an
//     RPC `used` value), so a reinstalled or second device can't restart at 0.
//
// Paid, master and inactive accounts never touch this — callers gate every use
// behind `plan === 'trial'`.

const KEY_PREFIX = 'vbstat_trial_created_';
const RESET_KEY_PREFIX = 'vbstat_trial_reset_';

function uid() {
  try {
    return localStorage.getItem('vbstat_user_id') || 'anon';
  } catch {
    return 'anon';
  }
}

function storageKey() {
  return `${KEY_PREFIX}${uid()}`;
}

function resetStampKey() {
  return `${RESET_KEY_PREFIX}${uid()}`;
}

function write(n) {
  try {
    localStorage.setItem(storageKey(), String(Math.max(0, Math.floor(n))));
  } catch {
    /* quota exceeded / private mode — online, the server RPC is still the backstop */
  }
}

// Current tally for this account (0 when never set or unreadable).
export function readTrialCreated() {
  try {
    const n = parseInt(localStorage.getItem(storageKey()), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

// Call once after a trial match is successfully created locally *without* a
// server confirmation (offline). Server-confirmed creates use
// raiseTrialCreatedFloor(used) instead, since the server already counted them.
export function noteTrialMatchCreated() {
  write(readTrialCreated() + 1);
}

// Raise the tally to at least `serverValue` (profiles.matches_created, or an RPC
// `used`). Never lowers it.
export function raiseTrialCreatedFloor(serverValue) {
  const s = parseInt(serverValue, 10);
  if (Number.isFinite(s) && s > readTrialCreated()) write(s);
}

// Honor a support-issued reset exactly once per device. When support lowers an
// account's matches_created they also stamp profiles.match_count_reset_at; the
// first time this device sees a stamp newer than the last one it applied, it
// snaps the local tally DOWN to the server's number. This is the only path that
// can lower the tally (short of a full "clear all data").
export function applyServerReset(resetAt, serverValue) {
  if (!resetAt) return;
  const stamp = new Date(resetAt).getTime();
  if (!Number.isFinite(stamp)) return;

  let last = null;
  try {
    last = localStorage.getItem(resetStampKey());
  } catch { /* unreadable — treat as never applied */ }

  const lastStamp = last ? new Date(last).getTime() : 0;
  if (Number.isFinite(lastStamp) && lastStamp >= stamp) return; // already applied

  const s = parseInt(serverValue, 10);
  write(Number.isFinite(s) && s > 0 ? s : 0);
  try {
    localStorage.setItem(resetStampKey(), new Date(stamp).toISOString());
  } catch { /* quota / private mode — will re-apply next load, harmless */ }
}

// Reset to zero. Only for a full "clear all data" wipe, which also zeroes the
// server-side counter.
export function resetTrialCreated() {
  write(0);
  try {
    localStorage.removeItem(resetStampKey());
  } catch { /* ignore */ }
}
