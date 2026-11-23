import { describe, it, expect, vi } from 'vitest';
vi.mock('../errorReporting', () => ({ reportError: vi.fn() }));
import { friendlySyncError } from '../syncErrorMessage';
import { reportError } from '../errorReporting';

const err = (message, extra = {}) => Object.assign(new Error(message), extra);

describe('friendlySyncError', () => {
  it('no internet (Chrome + Safari wording)', () => {
    expect(friendlySyncError(new TypeError('Failed to fetch'))).toMatch(/^Sync failed: no internet/);
    expect(friendlySyncError(new TypeError('Load failed'))).toMatch(/no internet/);
  });
  it('signed out', () => {
    expect(friendlySyncError(err('JWT expired', { code: 'PGRST301' }))).toMatch(/signed out/);
    expect(friendlySyncError(err('Not signed in'))).toMatch(/signed out/);
  });
  it('server refused account', () => {
    expect(friendlySyncError(err('new row violates row-level security policy for table "backups"', { code: '42501' }))).toMatch(/wouldn't accept/);
  });
  it('timeout, server down, too big', () => {
    expect(friendlySyncError(err('canceling statement due to statement timeout', { code: '57014' }))).toMatch(/too long/);
    expect(friendlySyncError(err('Service Unavailable', { status: 503 }))).toMatch(/server is having problems/);
    expect(friendlySyncError(err('Payload too large', { status: 413 }))).toMatch(/too large to upload/);
  });
  it('device storage problems', () => {
    expect(friendlySyncError(err('x', { name: 'QuotaExceededError' }))).toMatch(/out of storage/);
    expect(friendlySyncError(err('Database has been closed', { name: 'DatabaseClosedError' }))).toMatch(/closed unexpectedly/);
  });
  it('newer app version', () => {
    expect(friendlySyncError(err('This backup was created with a newer version of the app (v9). Please update.'))).toMatch(/newer version of Vantage/);
  });
  it('keeps Vantage messages, adds prefix only when needed', () => {
    expect(friendlySyncError(err('Cloud backup has 3 active teams but your plan allows 1. Upgrade before restoring.'), 'Cloud restore failed'))
      .toBe('Cloud restore failed: Cloud backup has 3 active teams but your plan allows 1. Upgrade before restoring.');
    const own = 'Cloud sync failed (bad data) — nothing was uploaded. Try again, or contact support if this keeps happening.';
    expect(friendlySyncError(err(own))).toBe(own);
  });
  it('unknown errors get a plain message and are reported', () => {
    expect(friendlySyncError(err('weird thing xyz'))).toBe('Sync failed for an unknown reason. Try again. If it keeps happening, contact support.');
    expect(reportError).toHaveBeenCalled();
  });
});
