import { describe, it, expect } from 'vitest';
import { nextPlanExpiry } from '../../../../supabase/functions/stripe-webhook/planExpiry';

const now = new Date('2027-01-15T12:00:00Z');

describe('nextPlanExpiry', () => {
  it('adds 6 months onto a plan with time left', () => {
    expect(nextPlanExpiry('2027-02-01T12:00:00Z', now).toISOString()).toBe('2027-08-01T12:00:00.000Z');
  });

  it('starts from today when the plan has already expired', () => {
    expect(nextPlanExpiry('2026-12-01T12:00:00Z', now).toISOString()).toBe('2027-07-15T12:00:00.000Z');
  });

  it('starts from today with no end date', () => {
    expect(nextPlanExpiry(null, now).toISOString()).toBe('2027-07-15T12:00:00.000Z');
    expect(nextPlanExpiry(undefined, now).toISOString()).toBe('2027-07-15T12:00:00.000Z');
  });

  it('does not change the date passed in', () => {
    const before = now.toISOString();
    nextPlanExpiry(null, now);
    expect(now.toISOString()).toBe(before);
  });
});
