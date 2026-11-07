import { describe, it, expect } from 'vitest';
import { matchesLockedForProfile, renewalReminderDays, resolvePlanFromProfile } from '../planLimits';

describe('renewalReminderDays', () => {
  const PAID = 2;
  it('shows from 30 days down to the last day', () => {
    expect(renewalReminderDays(PAID, 30)).toBe(30);
    expect(renewalReminderDays(PAID, 1)).toBe(1);
  });
  it('stays hidden with more than 30 days left', () => {
    expect(renewalReminderDays(PAID, 31)).toBeNull();
  });
  it('stays hidden with no expiry date or after expiry', () => {
    expect(renewalReminderDays(PAID, null)).toBeNull();
  });
  it('stays hidden for trial, master and inactive accounts', () => {
    expect(renewalReminderDays(1, 5)).toBeNull();
    expect(renewalReminderDays(3, 5)).toBeNull();
    expect(renewalReminderDays(0, 5)).toBeNull();
  });
});

const past = '2020-01-01T00:00:00Z';
const future = '2999-01-01T00:00:00Z';

describe('matchesLockedForProfile', () => {
  it('locks an expired paid plan', () => {
    expect(matchesLockedForProfile({ plan: '1_team', plan_expires_at: past })).toBe(true);
  });

  it('locks an inactive plan', () => {
    expect(matchesLockedForProfile({ plan: 'inactive' })).toBe(true);
  });

  it('does not lock a current paid plan', () => {
    expect(matchesLockedForProfile({ plan: '1_team', plan_expires_at: future })).toBe(false);
  });

  it('does not lock a paid plan with no expiry date', () => {
    expect(matchesLockedForProfile({ plan: '2_teams' })).toBe(false);
  });

  it('does not lock a trial', () => {
    expect(matchesLockedForProfile({ plan: 'trial' })).toBe(false);
  });

  it('does not lock a master account, even with an old expiry date', () => {
    expect(matchesLockedForProfile({ plan: 'master', plan_expires_at: past })).toBe(false);
  });

  it('does not lock while the profile is unknown', () => {
    expect(matchesLockedForProfile(null)).toBe(false);
    expect(matchesLockedForProfile(undefined)).toBe(false);
  });

  it('leaves the expired match limit uncapped so sync and restore keep working', () => {
    expect(resolvePlanFromProfile({ plan: '1_team', plan_expires_at: past }).matchLimit).toBe(Infinity);
  });
});
