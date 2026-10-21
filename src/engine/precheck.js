// Quick maths checks that run BEFORE the solver. They catch setups that can never be
// scheduled and explain why in plain English, with a suggested fix.
//
// Returns { ok, issues: [{ severity: 'error' | 'warning', message, fix }] }.
// ok is false when any issue is an error.

import { blocksPerDay, periodsPerWeek, roomTypeFor, sessionLength, unavailableSet } from './model.js'

export function precheck(data) {
  const { settings, rooms = [], teachers = [], sections = [], assignments = [] } = data
  const issues = []
  const error = (message, fix) => issues.push({ severity: 'error', message, fix })
  const warning = (message, fix) => issues.push({ severity: 'warning', message, fix })

  const week = periodsPerWeek(settings)
  const teacherById = Object.fromEntries(teachers.map((t) => [t.id, t]))
  const sectionById = Object.fromEntries(sections.map((s) => [s.id, s]))

  // --- Basic setup ---
  if (!settings.days?.length || !settings.periodsPerDay) {
    error('The week has no days or no periods.', 'Set the working days and periods per day in Settings.')
    return { ok: false, issues }
  }
  if (!assignments.length) {
    error('There are no subjects to schedule.', 'In Setup, add rooms, teachers and sections, then add subjects (section + subject + teacher + periods per week).')
  }

  // --- Each assignment makes sense ---
  for (const a of assignments) {
    const name = `${a.subject || 'A subject'} (${sectionById[a.sectionId]?.name ?? a.sectionId})`
    if (!sectionById[a.sectionId]) error(`${name} belongs to a section that does not exist.`, 'Pick an existing section for it.')
    if (!teacherById[a.teacherId]) error(`${name} has no valid teacher.`, 'Pick an existing teacher for it.')
    if (!(a.hoursPerWeek > 0)) error(`${name} has ${a.hoursPerWeek} hours per week.`, 'Give it at least 1 hour per week.')
    if (a.kind === 'lab') {
      const len = sessionLength(a)
      if (a.hoursPerWeek % len !== 0) {
        error(`${name} is ${a.hoursPerWeek} hours but each lab session is ${len} periods, which does not divide evenly.`, `Make the hours a multiple of ${len}.`)
      }
      if (blocksPerDay(settings, len) === 0) {
        error(`${name} needs ${len} periods in a row, but no part of the day is that long without hitting the break.`, 'Shorten the lab or move the break.')
      }
    }
  }

  // --- Teachers: enough available periods? ---
  for (const t of teachers) {
    const hours = assignments.filter((a) => a.teacherId === t.id).reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0)
    if (!hours) continue
    const available = week - unavailableSet(t).size
    if (hours > available) {
      error(`${t.name} must teach ${hours} periods but is only available for ${available}.`, `Reduce their load by ${hours - available} periods, give some classes to another teacher, or reduce their unavailable time.`)
    }
    if (t.maxPerDay && hours > t.maxPerDay * settings.days.length) {
      error(`${t.name} must teach ${hours} periods but their limit is ${t.maxPerDay} per day (${t.maxPerDay * settings.days.length} per week).`, 'Raise their daily limit or reassign some classes.')
    }
  }

  // --- Sections: fit in the week? fit in a room? ---
  for (const s of sections) {
    const own = assignments.filter((a) => a.sectionId === s.id)
    const hours = own.reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0)
    if (hours > week) {
      error(`${s.name} needs ${hours} periods but the week only has ${week}.`, `Remove ${hours - week} periods of subjects, or add more periods per day.`)
    }
    for (const type of new Set(own.map(roomTypeFor))) {
      const fitting = rooms.filter((r) => r.type === type && r.capacity >= s.size)
      if (!fitting.length) {
        const biggest = Math.max(0, ...rooms.filter((r) => r.type === type).map((r) => r.capacity))
        error(`${s.name} has ${s.size} students but the biggest ${type} room holds ${biggest}.`, `Add a bigger ${type} room or split the section.`)
      }
    }
  }

  // --- Rooms: enough room-time for each kind of class? ---
  for (const type of ['lecture', 'lab']) {
    const typeRooms = rooms.filter((r) => r.type === type)
    const typeAssignments = assignments.filter((a) => roomTypeFor(a) === type)
    if (!typeAssignments.length) continue
    if (!typeRooms.length) {
      error(`There are ${type} classes to schedule but no ${type} rooms.`, `Add at least one ${type} room.`)
      continue
    }
    const needed = typeAssignments.reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0)
    const capacity = typeRooms.length * week
    if (needed > capacity) {
      error(`${type === 'lab' ? 'Labs' : 'Lectures'} need ${needed} room-periods but ${typeRooms.length} ${type} room(s) only offer ${capacity}.`, `Add ${Math.ceil((needed - capacity) / week)} more ${type} room(s) or reduce ${type} hours.`)
    }
  }

  // --- Labs: enough unbroken blocks of each length? ---
  const labRooms = rooms.filter((r) => r.type === 'lab')
  const labLengths = new Set(assignments.filter((a) => a.kind === 'lab').map(sessionLength))
  for (const len of labLengths) {
    const sessions = assignments
      .filter((a) => a.kind === 'lab' && sessionLength(a) === len)
      .reduce((sum, a) => sum + Math.floor((a.hoursPerWeek || 0) / len), 0)
    const blocks = labRooms.length * blocksPerDay(settings, len) * settings.days.length
    if (labRooms.length && sessions > blocks) {
      error(`There are ${sessions} lab sessions of ${len} periods, but the lab rooms only have ${blocks} such slots per week.`, `Add ${Math.ceil((sessions - blocks) / (blocksPerDay(settings, len) * settings.days.length))} more lab room(s) or shorten the labs.`)
    }
  }

  // --- Warnings: possible but tight ---
  for (const s of sections) {
    const hours = assignments.filter((a) => a.sectionId === s.id).reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0)
    if (hours <= week && hours > week * 0.9) {
      warning(`${s.name} uses ${hours} of ${week} periods, which leaves very little room to avoid clashes.`, 'Consider reducing hours or adding periods.')
    }
  }

  return { ok: !issues.some((i) => i.severity === 'error'), issues }
}
