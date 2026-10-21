// Timetable solver: "least options first" greedy + random restarts.
//
// One attempt:
//   1. Every subject (assignment) has some sessions left to place.
//   2. Find the subject whose next session has the FEWEST valid spots (like Sudoku:
//      fill the hardest square first), and put it in its best spot.
//   3. A spot is valid only if the teacher, the section and a suitable room are all free
//      (and the teacher available) for every period of the session, and a lab does not
//      cross the break. So clashes are impossible by construction.
//   4. If a subject has no valid spot left, its remaining sessions go to `unplaced`
//      with a plain-English reason.
// Restarts: repeat with random tie-breaking until the time or attempt limit is reached,
// and keep the best attempt (fewest unplaced periods, then lowest soft-goal penalty).

import { blockIsInvalid, indexById, roomTypeFor, sessionLength, unavailableSet } from './model.js'
import { scoreTimetable } from './score.js'

/**
 * @param data    college data (settings, rooms, teachers, sections, assignments)
 * @param options { timeLimitMs = 2000, maxAttempts = 300, seed }
 * @returns { placements, unplaced, score, stats: { attempts, timeMs, firstScore, firstUnplaced } }
 */
export function solve(data, options = {}) {
  const { timeLimitMs = 2000, maxAttempts = 300, seed = Date.now() } = options
  const rng = mulberry32(seed)
  const startedAt = Date.now()

  let best = null
  let first = null
  let attempts = 0
  do {
    const result = attempt(data, rng)
    const score = scoreTimetable(data, result)
    result.score = score.total
    result.unplacedPeriods = score.unplacedPeriods
    attempts++
    if (!first) first = result
    if (!best || isBetter(result, best)) best = result
  } while (attempts < maxAttempts && Date.now() - startedAt < timeLimitMs)

  return {
    placements: best.placements,
    unplaced: best.unplaced,
    score: best.score,
    stats: {
      attempts,
      timeMs: Date.now() - startedAt,
      firstScore: first.score,
      firstUnplaced: first.unplacedPeriods,
    },
  }
}

function isBetter(a, b) {
  if (a.unplacedPeriods !== b.unplacedPeriods) return a.unplacedPeriods < b.unplacedPeriods
  return a.score < b.score
}

function attempt(data, rng) {
  const { settings } = data
  const byId = indexById(data)
  const days = settings.days.length
  const periods = settings.periodsPerDay

  // Busy grids. Each is one flat array of 0/1 flags: index = who * W + day * periods + period,
  // where W is the number of periods in a week. (Number arrays are much faster than text keys.)
  const W = days * periods
  const teacherIndex = Object.fromEntries(data.teachers.map((t, i) => [t.id, i]))
  const roomIndex = Object.fromEntries(data.rooms.map((r, i) => [r.id, i]))
  const sectionIndex = Object.fromEntries(data.sections.map((s, i) => [s.id, i]))
  const teacherBusy = new Uint8Array(data.teachers.length * W)
  const roomBusy = new Uint8Array(data.rooms.length * W)
  const sectionBusy = new Uint8Array(data.sections.length * W)
  const unavailable = new Uint8Array(data.teachers.length * W)
  data.teachers.forEach((t, i) => {
    for (const key of unavailableSet(t)) {
      const [day, period] = key.split('-').map(Number)
      if (day < days && period < periods) unavailable[i * W + day * periods + period] = 1
    }
  })
  const teacherDayCount = new Map() // "teacher|day" -> periods taught
  const sectionPeriodsByDay = new Map() // "section|day" -> Set of periods
  const subjectDays = new Set() // "section|subject|day"

  const placements = []
  const unplaced = []
  const remaining = new Map() // assignmentId -> sessions still to place
  const roomsFor = {} // assignmentId -> suitable rooms, smallest first

  for (const a of data.assignments) {
    const length = sessionLength(a)
    const count = Math.floor((a.hoursPerWeek || 0) / length)
    const leftover = (a.hoursPerWeek || 0) - count * length
    if (leftover > 0) {
      unplaced.push({ assignmentId: a.id, length: leftover, reason: `${leftover} hour(s) do not fit into whole ${length}-period lab sessions.` })
    }
    if (count <= 0) continue
    const section = byId.sections[a.sectionId]
    if (!section || !byId.teachers[a.teacherId]) {
      for (let i = 0; i < count; i++) {
        unplaced.push({ assignmentId: a.id, length, reason: 'This subject has a missing section or teacher.' })
      }
      continue
    }
    roomsFor[a.id] = data.rooms
      .filter((r) => r.type === roomTypeFor(a) && r.capacity >= section.size)
      .sort((x, y) => x.capacity - y.capacity)
    remaining.set(a.id, count)
  }

  const teacherFree = (a, day, p) => {
    const i = teacherIndex[a.teacherId] * W + day * periods + p
    return !teacherBusy[i] && !unavailable[i]
  }
  const sectionFree = (a, day, p) => !sectionBusy[sectionIndex[a.sectionId] * W + day * periods + p]
  const roomFree = (roomId, day, p) => !roomBusy[roomIndex[roomId] * W + day * periods + p]

  function everyPeriod(start, length, test) {
    for (let p = start; p < start + length; p++) if (!test(p)) return false
    return true
  }

  // All valid { day, start, room } spots for the next session of assignment a.
  function candidatesFor(a) {
    const length = sessionLength(a)
    const out = []
    for (let day = 0; day < days; day++) {
      for (let start = 0; start + length <= periods; start++) {
        if (blockIsInvalid(settings, start, length)) continue
        if (!everyPeriod(start, length, (p) => teacherFree(a, day, p) && sectionFree(a, day, p))) continue
        for (const room of roomsFor[a.id]) {
          if (everyPeriod(start, length, (p) => roomFree(room.id, day, p))) out.push({ day, start, room })
        }
      }
    }
    return out
  }

  // Soft-goal penalty for putting a session of `a` at this spot (lower is better).
  function penalty(a, { day, start, room }) {
    const length = sessionLength(a)
    let cost = 0
    if (subjectDays.has(`${a.sectionId}|${a.subject}|${day}`)) cost += 8
    const taught = teacherDayCount.get(`${a.teacherId}|${day}`) || 0
    const max = byId.teachers[a.teacherId].maxPerDay
    if (max && taught + length > max) cost += 15
    cost += taught * 0.5 // spread a teacher's load across the week
    const sectionPeriods = sectionPeriodsByDay.get(`${a.sectionId}|${day}`)
    if (sectionPeriods?.size && !sectionPeriods.has(start - 1) && !sectionPeriods.has(start + length)) cost += 1.5 // avoid gaps
    cost += (room.capacity - byId.sections[a.sectionId].size) / 100 // best-fit room
    cost += start * 0.05 // mild preference for earlier periods
    return cost
  }

  function place(a, { day, start, room }) {
    const length = sessionLength(a)
    const sectionKey = `${a.sectionId}|${day}`
    if (!sectionPeriodsByDay.has(sectionKey)) sectionPeriodsByDay.set(sectionKey, new Set())
    for (let p = start; p < start + length; p++) {
      const slot = day * periods + p
      teacherBusy[teacherIndex[a.teacherId] * W + slot] = 1
      roomBusy[roomIndex[room.id] * W + slot] = 1
      sectionBusy[sectionIndex[a.sectionId] * W + slot] = 1
      sectionPeriodsByDay.get(sectionKey).add(p)
    }
    const teacherKey = `${a.teacherId}|${day}`
    teacherDayCount.set(teacherKey, (teacherDayCount.get(teacherKey) || 0) + length)
    subjectDays.add(`${a.sectionId}|${a.subject}|${day}`)
    placements.push({ assignmentId: a.id, day, startPeriod: start, length, roomId: room.id })
  }

  // Why does assignment a have no valid spot? Checked from the most basic cause upwards.
  function diagnose(a) {
    const length = sessionLength(a)
    const teacher = byId.teachers[a.teacherId]
    const section = byId.sections[a.sectionId]
    const type = roomTypeFor(a)
    const block = length > 1 ? `${length} periods in a row` : 'one period'
    if (!roomsFor[a.id].length) {
      return `No ${type} room is big enough for ${section.name} (${section.size} students).`
    }
    let teacherOk = false
    let bothOk = false
    for (let day = 0; day < days; day++) {
      for (let start = 0; start + length <= periods; start++) {
        if (blockIsInvalid(settings, start, length)) continue
        const t = everyPeriod(start, length, (p) => teacherFree(a, day, p))
        teacherOk ||= t
        bothOk ||= t && everyPeriod(start, length, (p) => sectionFree(a, day, p))
      }
    }
    if (!teacherOk) return `${teacher.name} has no free or available time left for ${block}.`
    if (!bothOk) return `${teacher.name} and ${section.name} are never free at the same time for ${block}.`
    return `Every suitable ${type} room is already booked whenever ${teacher.name} and ${section.name} are both free.`
  }

  while (remaining.size) {
    // Pick the assignment with the fewest options (random tie-break).
    let chosen = null
    let chosenOptions = null
    let chosenKey = Infinity
    for (const id of remaining.keys()) {
      const a = byId.assignments[id]
      const options = candidatesFor(a)
      const key = options.length + rng() * 0.9
      if (key < chosenKey) {
        chosen = a
        chosenOptions = options
        chosenKey = key
      }
    }

    if (!chosenOptions.length) {
      const reason = diagnose(chosen)
      for (let i = 0; i < remaining.get(chosen.id); i++) {
        unplaced.push({ assignmentId: chosen.id, length: sessionLength(chosen), reason })
      }
      remaining.delete(chosen.id)
      continue
    }

    let bestSpot = null
    let bestCost = Infinity
    for (const spot of chosenOptions) {
      const cost = penalty(chosen, spot) + rng() * 0.5
      if (cost < bestCost) {
        bestSpot = spot
        bestCost = cost
      }
    }
    place(chosen, bestSpot)

    const left = remaining.get(chosen.id) - 1
    if (left > 0) remaining.set(chosen.id, left)
    else remaining.delete(chosen.id)
  }

  return { placements, unplaced }
}

/** Small seeded random number generator, so tests can repeat the exact same run. */
function mulberry32(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export { mulberry32 }
