// Field-level checks for the Setup page: catches typos and missing values while the
// administrator types. (precheck.js handles the bigger "can this ever be scheduled?" maths.)
//
// Returns { settings: {field: msg}, rooms: {rowId: {field: msg}}, teachers, sections, assignments, count }

export const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const isWhole = (v) => v !== '' && v !== null && v !== undefined && Number.isInteger(Number(v))

export function validateSetup(data) {
  const { settings } = data
  const out = { settings: {}, rooms: {}, teachers: {}, sections: {}, assignments: {}, count: 0 }
  const flag = (group, id, field, message) => {
    if (id === null) out[group][field] = message
    else (out[group][id] ||= {})[field] = message
    out.count++
  }

  // --- Settings ---
  if (!settings.days?.length) flag('settings', null, 'days', 'Pick at least one working day.')
  if (!isWhole(settings.periodsPerDay) || settings.periodsPerDay < 1 || settings.periodsPerDay > 12) {
    flag('settings', null, 'periodsPerDay', 'Periods per day must be a whole number from 1 to 12.')
  }
  const periods = Number(settings.periodsPerDay) || 0
  const week = (settings.days?.length || 0) * periods

  // Names must be filled in and unique within each list.
  function checkNames(group, rows) {
    const seen = new Map()
    for (const r of rows) {
      const name = (r.name || '').trim().toLowerCase()
      if (!name) flag(group, r.id, 'name', 'Name is required.')
      else if (seen.has(name)) flag(group, r.id, 'name', 'This name is already used.')
      else seen.set(name, r.id)
    }
  }

  // --- Rooms ---
  checkNames('rooms', data.rooms)
  for (const r of data.rooms) {
    if (!isWhole(r.capacity) || r.capacity < 1) flag('rooms', r.id, 'capacity', 'Enter the number of seats (at least 1).')
    if (r.type !== 'lecture' && r.type !== 'lab') flag('rooms', r.id, 'type', 'Choose lecture or lab.')
  }

  // --- Teachers ---
  checkNames('teachers', data.teachers)
  for (const t of data.teachers) {
    if (t.maxPerDay !== undefined && t.maxPerDay !== '' && (!isWhole(t.maxPerDay) || t.maxPerDay < 1 || t.maxPerDay > periods)) {
      flag('teachers', t.id, 'maxPerDay', `Leave empty, or enter 1 to ${periods}.`)
    }
  }

  // --- Sections ---
  checkNames('sections', data.sections)
  for (const s of data.sections) {
    if (!isWhole(s.size) || s.size < 1) flag('sections', s.id, 'size', 'Enter the number of students (at least 1).')
  }

  // --- Assignments ---
  const sectionIds = new Set(data.sections.map((s) => s.id))
  const teacherIds = new Set(data.teachers.map((t) => t.id))
  const seen = new Set()
  for (const a of data.assignments) {
    if (!sectionIds.has(a.sectionId)) flag('assignments', a.id, 'sectionId', 'Choose a section.')
    if (!teacherIds.has(a.teacherId)) flag('assignments', a.id, 'teacherId', 'Choose a teacher.')
    if (!(a.subject || '').trim()) flag('assignments', a.id, 'subject', 'Subject is required.')
    if (!isWhole(a.hoursPerWeek) || a.hoursPerWeek < 1 || a.hoursPerWeek > week) {
      flag('assignments', a.id, 'hoursPerWeek', `Enter 1 to ${week} periods per week.`)
    } else if (a.kind === 'lab') {
      if (!isWhole(a.labLength) || a.labLength < 2 || a.labLength > periods) {
        flag('assignments', a.id, 'labLength', `A lab lasts 2 to ${periods} periods.`)
      } else if (a.hoursPerWeek % a.labLength !== 0) {
        flag('assignments', a.id, 'hoursPerWeek', `Must be a multiple of the lab length (${a.labLength}).`)
      }
    }
    const key = `${a.sectionId}|${(a.subject || '').trim().toLowerCase()}|${a.kind}`
    if (a.subject && seen.has(key)) flag('assignments', a.id, 'subject', 'This section already has this subject. Combine the hours into one row.')
    seen.add(key)
  }

  return out
}

/** A blank college to start from. */
export function makeBlankCollege() {
  return {
    settings: { collegeName: 'My College', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], periodsPerDay: 7, breakAfterPeriod: 4 },
    rooms: [],
    teachers: [],
    sections: [],
    assignments: [],
  }
}

/** Check that an imported JSON file has the right shape. Returns an error message or null. */
export function checkImportShape(json) {
  if (!json || typeof json !== 'object') return 'The file is not a college data file.'
  if (!json.settings || !Array.isArray(json.settings.days)) return 'The file is missing "settings" with a list of "days".'
  for (const key of ['rooms', 'teachers', 'sections', 'assignments']) {
    if (!Array.isArray(json[key])) return `The file is missing the "${key}" list.`
  }
  return null
}

/** A short unique id for a new row. */
export function newId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
