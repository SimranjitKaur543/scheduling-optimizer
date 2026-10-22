// Clock times and breaks. Every part of the app (pre-check, solver, validator, grid,
// CSV) uses these helpers, so they never disagree about where breaks are.
//
// Periods are still numbered 0..periodsPerDay-1 for scheduling. A break sits BETWEEN
// periods: { afterPeriod: 2 } means the break comes after the 2nd period (between
// period index 1 and 2), so no lab may run across it. Times are worked out from
// settings.startTime, settings.periodMinutes and each break's minutes.

export const DEFAULT_START_TIME = '09:00'
export const DEFAULT_PERIOD_MINUTES = 50
export const DEFAULT_LUNCH_MINUTES = 40

/** "09:30" → 570 (minutes after midnight), or null if not a valid HH:MM time. */
export function parseTime(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

/** 570 → "9:30 am", 780 → "1:00 pm" (12-hour display). */
export function formatTime(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const suffix = h < 12 ? 'am' : 'pm'
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${suffix}`
}

/** "9:00–9:50 am", or "11:50 am–12:40 pm" when the two sides differ. */
export function formatRange(start, end) {
  const a = formatTime(start)
  const b = formatTime(end)
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`
}

/**
 * Breaks that fit the day, sorted by position. Old data with only `breakAfterPeriod`
 * (before migration) is read as one lunch break, so nothing ever ignores a break.
 */
export function validBreaks(settings) {
  const periods = Number(settings.periodsPerDay) || 0
  const raw = Array.isArray(settings.breaks)
    ? settings.breaks
    : settings.breakAfterPeriod
      ? [{ id: 'legacy', name: 'Lunch', afterPeriod: settings.breakAfterPeriod, minutes: DEFAULT_LUNCH_MINUTES }]
      : []
  return raw
    .filter((b) => Number.isInteger(Number(b.afterPeriod)) && b.afterPeriod >= 1 && b.afterPeriod < periods)
    .map((b) => ({ ...b, afterPeriod: Number(b.afterPeriod), minutes: Math.max(0, Number(b.minutes) || 0) }))
    .sort((x, y) => x.afterPeriod - y.afterPeriod)
}

/** Period boundaries that have a break, e.g. [2, 4] for breaks after periods 2 and 4. */
export function breakPoints(settings) {
  return [...new Set(validBreaks(settings).map((b) => b.afterPeriod))]
}

/**
 * Start and end time (minutes after midnight) of every period, plus every break.
 * Returns { periods: [{ start, end }], breaks: [{ ...break, start, end }], dayStart, dayEnd }.
 */
export function daySchedule(settings) {
  const startTime = parseTime(settings.startTime) ?? parseTime(DEFAULT_START_TIME)
  const length = Number(settings.periodMinutes) > 0 ? Number(settings.periodMinutes) : DEFAULT_PERIOD_MINUTES
  const breaks = validBreaks(settings)
  const periods = []
  const placedBreaks = []
  let t = startTime
  for (let p = 0; p < (Number(settings.periodsPerDay) || 0); p++) {
    periods.push({ start: t, end: t + length })
    t += length
    for (const b of breaks.filter((x) => x.afterPeriod === p + 1)) {
      placedBreaks.push({ ...b, start: t, end: t + b.minutes })
      t += b.minutes
    }
  }
  return { periods, breaks: placedBreaks, dayStart: startTime, dayEnd: t }
}
