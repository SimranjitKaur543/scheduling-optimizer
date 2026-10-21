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
