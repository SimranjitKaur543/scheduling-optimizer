// Soft-goal scoring: how GOOD a clash-free timetable is. Lower penalty = better.
// Hard rules are checked separately by validator.js.

import { indexById } from './model.js'

export const PENALTY_WEIGHTS = {
  repeatSubjectDays: 5, // the same subject twice on one day for a section
  teacherOverDailyLimit: 10, // each period beyond a teacher's maxPerDay
  sectionGaps: 2, // idle periods between a section's first and last class of the day
  teacherGaps: 1, // idle periods between a teacher's first and last class of the day
}

export function scoreTimetable(data, result) {
  const byId = indexById(data)
  const sectionSubjectDay = new Map()
  const sectionDay = new Map()
  const teacherDay = new Map()
  const push = (map, key, values) => map.set(key, (map.get(key) || []).concat(values))

  for (const p of result.placements || []) {
    const a = byId.assignments[p.assignmentId]
    if (!a) continue
    const periods = Array.from({ length: p.length }, (_, i) => p.startPeriod + i)
    const k = `${a.sectionId}|${a.subject}|${p.day}`
    sectionSubjectDay.set(k, (sectionSubjectDay.get(k) || 0) + 1)
    push(sectionDay, `${a.sectionId}|${p.day}`, periods)
    push(teacherDay, `${a.teacherId}|${p.day}`, periods)
  }

  const gaps = (map) => {
    let total = 0
    for (const periods of map.values()) {
      total += Math.max(...periods) - Math.min(...periods) + 1 - new Set(periods).size
    }
    return total
  }

  let repeatSubjectDays = 0
  for (const count of sectionSubjectDay.values()) repeatSubjectDays += count - 1

  let teacherOverDailyLimit = 0
  for (const [key, periods] of teacherDay) {
    const max = byId.teachers[key.split('|')[0]]?.maxPerDay
    if (max && periods.length > max) teacherOverDailyLimit += periods.length - max
  }

  const breakdown = {
    repeatSubjectDays,
    teacherOverDailyLimit,
    sectionGaps: gaps(sectionDay),
    teacherGaps: gaps(teacherDay),
  }
  const total = Object.entries(breakdown).reduce((sum, [k, v]) => sum + v * PENALTY_WEIGHTS[k], 0)
  const unplacedPeriods = (result.unplaced || []).reduce((sum, u) => sum + u.length, 0)
  return { total, breakdown, unplacedPeriods }
}

// ---------- Analytics for the Report page ----------

/** Periods each teacher teaches per day and per week. */
export function teacherLoad(data, placements) {
  const byId = indexById(data)
  const days = data.settings.days.length
  const load = Object.fromEntries(data.teachers.map((t) => [t.id, Array(days).fill(0)]))
  for (const p of placements) {
    const a = byId.assignments[p.assignmentId]
    if (a && load[a.teacherId]) load[a.teacherId][p.day] += p.length
  }
  return data.teachers.map((t) => ({
    teacherId: t.id,
    name: t.name,
    maxPerDay: t.maxPerDay || null,
    perDay: load[t.id],
    total: load[t.id].reduce((s, n) => s + n, 0),
  }))
}

/** Periods each room is used per day, and the share of the week it is in use. */
export function roomUsage(data, placements) {
  const days = data.settings.days.length
  const week = days * data.settings.periodsPerDay
  const used = Object.fromEntries(data.rooms.map((r) => [r.id, Array(days).fill(0)]))
  for (const p of placements) if (used[p.roomId]) used[p.roomId][p.day] += p.length
  return data.rooms.map((r) => {
    const total = used[r.id].reduce((s, n) => s + n, 0)
    return { roomId: r.id, name: r.name, type: r.type, perDay: used[r.id], total, share: week ? total / week : 0 }
  })
}

/**
 * A teacher is absent on `day`: for each of their classes that day, list the teachers who are
 * free (not teaching and not unavailable) for the whole class. Teachers who already teach the
 * same subject come first, then those with the lightest load that day.
 */
export function findSubstitutes(data, placements, teacherId, day) {
  const byId = indexById(data)
  const busy = new Set()
  const dayLoad = {}
  for (const p of placements) {
    const a = byId.assignments[p.assignmentId]
    if (!a || p.day !== day) continue
    dayLoad[a.teacherId] = (dayLoad[a.teacherId] || 0) + p.length
    for (let k = p.startPeriod; k < p.startPeriod + p.length; k++) busy.add(`${a.teacherId}|${k}`)
  }
  const subjectsOf = {}
  for (const a of data.assignments) (subjectsOf[a.teacherId] ||= new Set()).add(a.subject.trim().toLowerCase())

  return placements
    .filter((p) => p.day === day && byId.assignments[p.assignmentId]?.teacherId === teacherId)
    .sort((x, y) => x.startPeriod - y.startPeriod)
    .map((p) => {
      const a = byId.assignments[p.assignmentId]
      const subject = a.subject.trim().toLowerCase()
      const candidates = data.teachers
        .filter((t) => t.id !== teacherId)
        .filter((t) => {
          const off = new Set((t.unavailable || []).filter((u) => u.day === day).map((u) => u.period))
          for (let k = p.startPeriod; k < p.startPeriod + p.length; k++) if (busy.has(`${t.id}|${k}`) || off.has(k)) return false
          return true
        })
        .map((t) => ({ teacherId: t.id, name: t.name, sameSubject: !!subjectsOf[t.id]?.has(subject), dayLoad: dayLoad[t.id] || 0 }))
        .sort((x, y) => Number(y.sameSubject) - Number(x.sameSubject) || x.dayLoad - y.dayLoad || x.name.localeCompare(y.name))
      return { placement: p, subject: a.subject, sectionName: byId.sections[a.sectionId]?.name, roomName: byId.rooms[p.roomId]?.name, candidates }
    })
}
