export const PLAN_MONTHS = 6;

// New end date for a purchase: time still left on a paid plan is kept, and an
// expired plan (or none) starts from today.
export function nextPlanExpiry(currentExpiresAt: string | null | undefined, now: Date = new Date()): Date {
  const current = currentExpiresAt ? new Date(currentExpiresAt) : null;
  const next = new Date(current && current > now ? current : now);
  next.setMonth(next.getMonth() + PLAN_MONTHS);
  return next;
}
