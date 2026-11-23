import { reportError } from './errorReporting';

// Turns a raw sync/restore error (browser, Supabase or Dexie wording) into a
// plain-English reason a coach can act on. `prefix` names what failed, e.g.
// 'Sync failed' or 'Cloud restore failed'. Unrecognized errors are reported
// so the real cause still shows up in the crash log.
export function friendlySyncError(e, prefix = 'Sync failed') {
  const msg    = String(e?.message ?? e ?? '');
  const lower  = msg.toLowerCase();
  const name   = String(e?.name ?? '');
  const code   = String(e?.code ?? '');
  const status = Number(e?.status ?? e?.statusCode ?? 0);
  const has    = (...words) => words.some((w) => lower.includes(w));

  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline || has('failed to fetch', 'load failed', 'networkerror', 'network request failed', 'network error')) {
    return `${prefix}: no internet connection. Check your Wi-Fi or cell signal and try again.`;
  }
  if (name === 'QuotaExceededError' || has('quota')) {
    return `${prefix}: this device is out of storage space. Free up space and try again.`;
  }
  if (name === 'DatabaseClosedError' || name === 'InvalidStateError' || has('database has been closed', 'connection is closing')) {
    return `${prefix}: the app's storage closed unexpectedly. Fully close and reopen the app, then try again.`;
  }
  if (has('newer version of the app')) {
    return `${prefix}: your cloud data was saved by a newer version of Vantage. Close and reopen the app to update, then try again.`;
  }
  if (status === 401 || code === 'PGRST301' || has('jwt', 'not signed in', 'invalid token', 'refresh token')) {
    return `${prefix}: you've been signed out. Sign out and back in, then try again.`;
  }
  if (status === 403 || code === '42501' || has('row-level security', 'permission denied')) {
    return `${prefix}: the server wouldn't accept this account's data. Sign out and back in. If it keeps happening, contact support.`;
  }
  if (status === 413 || has('payload too large', 'request entity too large')) {
    return `${prefix}: your data is too large to upload. Contact support.`;
  }
  if (code === '57014' || name === 'AbortError' || has('timeout', 'timed out')) {
    return `${prefix}: the server took too long to answer. Try again in a minute.`;
  }
  if (status >= 500 || has('service unavailable', 'bad gateway', 'internal server error', 'gateway')) {
    return `${prefix}: the cloud server is having problems right now. Try again in a few minutes.`;
  }

  // Vantage's own messages (plan limits, unreadable backup, etc.) are already
  // written for coaches — keep them, just say what failed.
  if (msg && (has('your plan allows', 'upgrade before', 'backup', 'nothing was uploaded', 'too large', 'invalid file'))) {
    return has('failed') ? msg : `${prefix}: ${msg}`;
  }

  reportError({ message: `${prefix}: ${msg || 'unknown error'}`, stack: e?.stack, kind: 'sync-error' });
  return `${prefix} for an unknown reason. Try again. If it keeps happening, contact support.`;
}
