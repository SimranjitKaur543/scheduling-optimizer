// Shared helpers used by the pre-check, solver and validator.
// Days and periods are 0-based indexes: day 0 = settings.days[0], period 0 = first period.

import { breakPoints } from './time.js'

/** Total teaching periods in one week. */
export function periodsPerWeek(settings) {
  return settings.days.length * settings.periodsPerDay
}

/**
 * True if a block of `length` periods starting at `start` runs past the end of the day
 * or across ANY break. A break after period N sits between period index N-1 and N.
 */
export function blockIsInvalid(settings, start, length) {
  if (start < 0 || start + length > settings.periodsPerDay) return true
  return breakPoints(settings).some((b) => start < b && start + length > b)
}

/** The unbroken stretches of a day between breaks, as lengths in periods, e.g. [2, 2, 3]. */
export function stretchesPerDay(settings) {
  const edges = [0, ...breakPoints(settings), settings.periodsPerDay]
  return edges.slice(1).map((edge, i) => edge - edges[i])
}

/** Number of non-overlapping blocks of `length` periods that fit in one day without crossing a break. */
export function blocksPerDay(settings, length) {
  return stretchesPerDay(settings).reduce((sum, stretch) => sum + Math.floor(stretch / length), 0)
}

/** Length in periods of one session of this assignment. */
export function sessionLength(assignment) {
  return assignment.kind === 'lab' ? assignment.labLength || 2 : 1
}

/** Room type an assignment needs. */
export function roomTypeFor(assignment) {
  return assignment.kind === 'lab' ? 'lab' : 'lecture'
}

/**
 * Split assignments into individual sessions to place.
 * A 4-hour lecture becomes 4 sessions of length 1; a 4-hour lab with labLength 2 becomes 2 sessions of length 2.
 */
export function expandSessions(assignments) {
  const sessions = []
  for (const a of assignments) {
    const length = sessionLength(a)
    const count = Math.floor(a.hoursPerWeek / length)
    for (let i = 0; i < count; i++) {
      sessions.push({ id: `${a.id}#${i + 1}`, assignmentId: a.id, length })
    }
  }
  return sessions
}

/** Set of "day-period" keys a teacher cannot teach in. */
export function unavailableSet(teacher) {
  return new Set((teacher.unavailable || []).map((u) => `${u.day}-${u.period}`))
}

/** Look-up maps by id, so code can write byId.teachers[id]. */
export function indexById(data) {
  const toMap = (list) => Object.fromEntries((list || []).map((x) => [x.id, x]))
  return {
    rooms: toMap(data.rooms),
    teachers: toMap(data.teachers),
    sections: toMap(data.sections),
    assignments: toMap(data.assignments),
  }
}
