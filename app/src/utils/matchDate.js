// A match's `date` is a CALENDAR DAY, not a moment in time. It is stored as an
// ISO timestamp string (so every existing read path — new Date(date), sortBy,
// fmtDate — keeps working unchanged), but the time component is ALWAYS literal
// noon UTC: "2026-08-25T12:00:00.000Z".
//
// Why: the old code built `date` with `new Date(localString).toISOString()`,
// which bakes in the device's UTC offset. The same game then got a different
// day string on devices in different timezones — or rolled to the next day when
// quick-started in the evening — and cloud sync (which identifies a match by
// `opponent | date.slice(0,10)`) split one real game into two.
//
// Noon UTC lands on the same calendar day for every timezone the app's coaches
// are in (US, roughly UTC-4 to UTC-10), so `date.slice(0,10)` is now identical
// on every device for the same game. The clock time a coach types goes in the
// separate `match_time` field — never here.

const pad = (n) => String(n).padStart(2, '0');

// "2026-08-25" (or any string starting with YYYY-MM-DD) → noon-UTC ISO for that
// day. Empty / unparseable input falls back to today (local calendar day).
export function matchDateISO(dateInput) {
  if (!dateInput) return todayMatchDateISO();
  const day = String(dateInput).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return todayMatchDateISO();
  return `${day}T12:00:00.000Z`;
}

// The device's LOCAL calendar day as "YYYY-MM-DD". Must be local, not UTC: an
// 8pm game in US Central must not roll to tomorrow just because it's past 6pm.
export function todayLocalDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayMatchDateISO() {
  return `${todayLocalDateStr()}T12:00:00.000Z`;
}

// The day portion of a stored `date`, for identity / display / comparison.
// Mirrors the `day()` helper in stats/matchIdentity.js.
export function matchDay(iso) {
  return (iso ?? '').slice(0, 10);
}

// Migration helper (schema v25). Given a legacy `date` — an ISO timestamp that
// may carry a timezone-shifted clock time — return the noon-UTC value for the
// calendar day the coach actually meant. The day is recovered by reading the
// stored timestamp in THIS device's local timezone, which is how it was
// entered (a coach types a local date, or quick-starts while physically present
// in local time). Unparseable input is returned unchanged.
//
// Idempotent for the app's user base: re-running it on an already-normalized
// "…T12:00:00.000Z" value yields the same string, because noon UTC reads as the
// same local calendar day (early morning) across every US timezone.
export function normalizeMatchDate(dateInput) {
  if (!dateInput) return dateInput;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return dateInput;
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${day}T12:00:00.000Z`;
}
