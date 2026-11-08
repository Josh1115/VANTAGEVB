import { describe, it, expect } from 'vitest';
import { nextPlanExpiry, refundedPlanExpiry } from '../../../../supabase/functions/stripe-webhook/planExpiry';

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

describe('refundedPlanExpiry', () => {
  it('takes 6 months off an early renewal, keeping the earlier paid time', () => {
    expect(refundedPlanExpiry('2027-08-01T12:00:00Z', now).toISOString()).toBe('2027-02-01T12:00:00.000Z');
  });

  it('returns null when the refund leaves no time', () => {
    expect(refundedPlanExpiry('2027-02-01T12:00:00Z', now)).toBeNull();
  });

  it('returns null with no end date', () => {
    expect(refundedPlanExpiry(null, now)).toBeNull();
    expect(refundedPlanExpiry(undefined, now)).toBeNull();
  });

  it('undoes a renewal made through nextPlanExpiry', () => {
    const renewed = nextPlanExpiry('2027-02-01T12:00:00Z', now);
    expect(refundedPlanExpiry(renewed.toISOString(), now).toISOString()).toBe('2027-02-01T12:00:00.000Z');
  });
});
