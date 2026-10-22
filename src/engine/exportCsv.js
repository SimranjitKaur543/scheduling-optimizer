// Turns a timetable into a CSV file that opens cleanly in Excel or Google Sheets.

import { indexById } from './model.js'

const quote = (value) => {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** One row per class: Section, Day, Period(s), Subject, Type, Teacher, Room. Sorted by section, day, period. */
export function timetableToCsv(data, placements) {
  const byId = indexById(data)
  const sectionOrder = Object.fromEntries(data.sections.map((s, i) => [s.id, i]))
  const rows = placements
    .map((p) => ({ p, a: byId.assignments[p.assignmentId] }))
    .filter(({ a }) => a)
    .sort((x, y) => sectionOrder[x.a.sectionId] - sectionOrder[y.a.sectionId] || x.p.day - y.p.day || x.p.startPeriod - y.p.startPeriod)
    .map(({ p, a }) => [
      byId.sections[a.sectionId]?.name,
      data.settings.days[p.day],
      p.length > 1 ? `${p.startPeriod + 1}-${p.startPeriod + p.length}` : `${p.startPeriod + 1}`,
      a.subject,
      a.kind === 'lab' ? 'Lab' : 'Lecture',
      byId.teachers[a.teacherId]?.name,
      byId.rooms[p.roomId]?.name,
    ])
  const header = ['Section', 'Day', 'Period', 'Subject', 'Type', 'Teacher', 'Room']
  return [header, ...rows].map((r) => r.map(quote).join(',')).join('\r\n')
}

/** Ask the browser to save the CSV. The BOM makes Excel read names with special characters correctly. */
export function downloadCsv(filename, csv) {
  downloadBlob(filename, new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
}

/** Ask the browser to save college data as a JSON file (for backup or moving to another computer). */
export function downloadJson(filename, data) {
  downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
}

/** A safe file name from any text, e.g. "GNDEC – Odd Sem" → "gndec-odd-sem". */
export function fileSlug(text) {
  return (text || 'college').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'college'
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
