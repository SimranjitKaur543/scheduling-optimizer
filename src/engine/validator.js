// Independent clash checker. It never trusts the solver: it rebuilds every "busy" grid
// from the finished timetable and checks all hard rules from scratch.
//
// result = { placements: [{ assignmentId, day, startPeriod, length, roomId }], unplaced: [{ assignmentId, length, reason }] }

import { blockIsInvalid, indexById, roomTypeFor, sessionLength, unavailableSet } from './model.js'
import { validBreaks } from './time.js'

export const RULES = [
  { id: 'teacher', label: 'No teacher is in two places at once' },
  { id: 'room', label: 'No room is double-booked' },
  { id: 'section', label: 'No section has two classes at once' },
  { id: 'roomType', label: 'Labs are in lab rooms, lectures in lecture rooms' },
  { id: 'capacity', label: 'Every room is big enough for its section' },
  { id: 'availability', label: 'Teachers are never booked when unavailable' },
  { id: 'block', label: 'Labs use consecutive periods and never cross a break' },
  { id: 'complete', label: 'Every subject gets all its weekly hours (or is reported as unplaced)' },
]

export function validateTimetable(data, result) {
  const { settings } = data
  const byId = indexById(data)
  const errors = []
  const add = (rule, message) => errors.push({ rule, message })

  const teacherBusy = new Map()
  const roomBusy = new Map()
  const sectionBusy = new Map()
  const unavailable = Object.fromEntries(data.teachers.map((t) => [t.id, unavailableSet(t)]))
  const dayName = (d) => settings.days[d] ?? `Day ${d + 1}`
  const slotName = (d, p) => `${dayName(d)} period ${p + 1}`

  // Record that `who` is busy at (day, period); report a clash if they already were.
  function occupy(grid, rule, who, label, day, period, what) {
    const key = `${who}|${day}|${period}`
    const other = grid.get(key)
    if (other) add(rule, `${label} is double-booked on ${slotName(day, period)}: ${other} and ${what}.`)
    else grid.set(key, what)
  }

  const placedPeriods = {}

  for (const p of result.placements || []) {
    const a = byId.assignments[p.assignmentId]
    if (!a) {
      add('complete', `A placement refers to an unknown subject (${p.assignmentId}).`)
      continue
    }
    const teacher = byId.teachers[a.teacherId]
    const section = byId.sections[a.sectionId]
    const room = byId.rooms[p.roomId]
    const what = `${a.subject} (${section?.name ?? a.sectionId})`

    if (!room) {
      add('roomType', `${what} is placed in an unknown room (${p.roomId}).`)
      continue
    }
    if (p.day < 0 || p.day >= settings.days.length) {
      add('block', `${what} is placed on a day that does not exist.`)
      continue
    }
    if (p.length !== sessionLength(a)) {
      add('block', `${what} on ${dayName(p.day)} is ${p.length} period(s) long but should be ${sessionLength(a)}.`)
    }
    if (blockIsInvalid(settings, p.startPeriod, p.length)) {
      const crossed = validBreaks(settings).find((b) => p.startPeriod < b.afterPeriod && p.startPeriod + p.length > b.afterPeriod)
      add('block', `${what} on ${slotName(p.day, p.startPeriod)} ${crossed ? `runs across the ${crossed.name || 'break'}` : 'runs past the end of the day'}.`)
    }
    if (room.type !== roomTypeFor(a)) {
      add('roomType', `${what} needs a ${roomTypeFor(a)} room but is in ${room.name} (${room.type}).`)
    }
    if (section && room.capacity < section.size) {
      add('capacity', `${room.name} holds ${room.capacity} but ${section.name} has ${section.size} students.`)
    }

    for (let period = p.startPeriod; period < p.startPeriod + p.length; period++) {
      occupy(teacherBusy, 'teacher', a.teacherId, teacher?.name ?? a.teacherId, p.day, period, what)
      occupy(roomBusy, 'room', p.roomId, room.name, p.day, period, what)
      occupy(sectionBusy, 'section', a.sectionId, section?.name ?? a.sectionId, p.day, period, what)
      if (unavailable[a.teacherId]?.has(`${p.day}-${period}`)) {
        add('availability', `${teacher.name} is unavailable on ${slotName(p.day, period)} but has ${what}.`)
      }
    }
    placedPeriods[a.id] = (placedPeriods[a.id] || 0) + p.length
  }

  // Completeness: placed + reported-unplaced periods must equal the required hours.
  const unplacedPeriods = {}
  for (const u of result.unplaced || []) {
    unplacedPeriods[u.assignmentId] = (unplacedPeriods[u.assignmentId] || 0) + u.length
  }
  for (const a of data.assignments) {
    const placed = placedPeriods[a.id] || 0
    const missing = unplacedPeriods[a.id] || 0
    if (placed + missing !== a.hoursPerWeek) {
      const section = byId.sections[a.sectionId]
      add('complete', `${a.subject} (${section?.name ?? a.sectionId}) needs ${a.hoursPerWeek} periods but has ${placed} placed and ${missing} reported unplaced.`)
    }
  }

  const checks = RULES.map((r) => {
    const count = errors.filter((e) => e.rule === r.id).length
    return { ...r, passed: count === 0, count }
  })
  return { valid: errors.length === 0, errors, checks }
}
