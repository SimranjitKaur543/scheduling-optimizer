import { useState } from 'react'
import EditableTable from './EditableTable.jsx'
import AvailabilityGrid from './AvailabilityGrid.jsx'
import { ALL_DAYS, newId } from '../engine/setupValidation.js'
import { downloadJson, fileSlug } from '../engine/exportCsv.js'
import { daySchedule, formatRange, formatTime } from '../engine/time.js'

const TABS = [
  { id: 'settings', label: 'Settings' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'sections', label: 'Sections' },
  { id: 'assignments', label: 'Subjects' },
]

export default function SetupPage({ data, errors, onChange }) {
  const [tab, setTab] = useState('settings')
  const [expandedTeacher, setExpandedTeacher] = useState(null)
  const [sectionFilter, setSectionFilter] = useState('')

  const set = (key, value) => onChange({ ...data, [key]: value })
  const updateRow = (key) => (row) => set(key, data[key].map((r) => (r.id === row.id ? row : r)))
  const countErrors = (group) => Object.values(errors[group] || {}).reduce((n, e) => n + Object.keys(e).length, 0)
  const tabErrors = { settings: Object.keys(errors.settings).length + countErrors('breaks'), rooms: countErrors('rooms'), teachers: countErrors('teachers'), sections: countErrors('sections'), assignments: countErrors('assignments') }

  // Deleting a teacher or section also removes the subjects that depend on it.
  // The table asks first (inside the page) when there are linked subjects.
  function deleteWithSubjects(key, row, field) {
    onChange({ ...data, [key]: data[key].filter((r) => r.id !== row.id), assignments: data.assignments.filter((a) => a[field] !== row.id) })
  }
  function linkedSubjectsWarning(row, field) {
    const linked = data.assignments.filter((a) => a[field] === row.id).length
    return linked ? `${row.name || 'This row'} has ${linked} subject${linked === 1 ? '' : 's'}. Deleting it also deletes ${linked === 1 ? 'that subject' : 'those subjects'}.` : null
  }

  const sectionOptions = data.sections.map((s) => ({ value: s.id, label: s.name || '(unnamed)' }))
  const teacherOptions = data.teachers.map((t) => ({ value: t.id, label: t.name || '(unnamed)' }))
  const shownAssignments = sectionFilter ? data.assignments.filter((a) => a.sectionId === sectionFilter) : data.assignments

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Setup</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter this organisation's week, rooms, teachers, sections and subjects. Changes are saved automatically. To set up a different organisation, create
            a new timetable in My timetables.
          </p>
        </div>
        <button
          onClick={() => downloadJson(`${fileSlug(data.settings.collegeName)}-data.json`, data)}
          className="shrink-0 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100 lg:self-auto"
        >
          Export JSON
        </button>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
            <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{t.id === 'settings' ? '' : data[t.id].length}</span>
            {tabErrors[t.id] > 0 && <span className="rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700">{tabErrors[t.id]} to fix</span>}
          </button>
        ))}
      </div>

      {tab === 'settings' && <SettingsForm data={data} errors={errors.settings} breakErrors={errors.breaks} onChange={onChange} />}

      {tab === 'rooms' && (
        <EditableTable
          rows={data.rooms}
          errors={errors.rooms}
          onRowChange={updateRow('rooms')}
          onDelete={(row) => set('rooms', data.rooms.filter((r) => r.id !== row.id))}
          onAdd={() => set('rooms', [...data.rooms, { id: newId('R'), name: '', type: 'lecture', capacity: 60 }])}
          addLabel="Add room"
          emptyText="No rooms yet. Add classrooms and labs."
          columns={[
            { key: 'name', label: 'Room name', placeholder: 'e.g. Room 101' },
            { key: 'type', label: 'Type', type: 'select', width: 160, options: [{ value: 'lecture', label: 'Lecture room' }, { value: 'lab', label: 'Lab' }] },
            { key: 'capacity', label: 'Seats', type: 'number', min: 1, width: 120 },
          ]}
        />
      )}

      {tab === 'teachers' && (
        <EditableTable
          rows={data.teachers}
          errors={errors.teachers}
          onRowChange={updateRow('teachers')}
          onDelete={(row) => deleteWithSubjects('teachers', row, 'teacherId')}
          deleteWarning={(row) => linkedSubjectsWarning(row, 'teacherId')}
          onAdd={() => set('teachers', [...data.teachers, { id: newId('T'), name: '', unavailable: [] }])}
          addLabel="Add teacher"
          emptyText="No teachers yet."
          renderExpanded={(row) =>
            expandedTeacher === row.id && (
              <AvailabilityGrid settings={data.settings} unavailable={row.unavailable} onChange={(unavailable) => updateRow('teachers')({ ...row, unavailable })} />
            )
          }
          columns={[
            { key: 'name', label: 'Teacher name', placeholder: 'e.g. Dr. Kaur' },
            { key: 'maxPerDay', label: 'Max periods / day', type: 'number', min: 1, placeholder: 'No limit', width: 160 },
            {
              key: 'unavailable',
              label: 'Unavailable',
              type: 'custom',
              width: 200,
              render: (row) => {
                const n = row.unavailable?.length || 0
                return (
                  <button
                    onClick={() => setExpandedTeacher(expandedTeacher === row.id ? null : row.id)}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    {n ? `${n} period${n === 1 ? '' : 's'} off` : 'Always available'} · {expandedTeacher === row.id ? 'Close' : 'Edit'}
                  </button>
                )
              },
            },
          ]}
        />
      )}

      {tab === 'sections' && (
        <EditableTable
          rows={data.sections}
          errors={errors.sections}
          onRowChange={updateRow('sections')}
          onDelete={(row) => deleteWithSubjects('sections', row, 'sectionId')}
          deleteWarning={(row) => linkedSubjectsWarning(row, 'sectionId')}
          onAdd={() => set('sections', [...data.sections, { id: newId('S'), name: '', department: '', size: 60 }])}
          addLabel="Add section"
          emptyText="No sections yet. A section is a group of students who attend classes together."
          columns={[
            { key: 'name', label: 'Section name', placeholder: 'e.g. CSE 3rd Sem A' },
            { key: 'department', label: 'Department', placeholder: 'e.g. CSE', width: 180 },
            { key: 'size', label: 'Students', type: 'number', min: 1, width: 120 },
          ]}
        />
      )}

      {tab === 'assignments' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor="section-filter" className="text-slate-600">
              Show subjects for
            </label>
            <select id="section-filter" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">
              <option value="">All sections</option>
              {sectionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="text-slate-500">
              {shownAssignments.reduce((n, a) => n + (Number(a.hoursPerWeek) || 0), 0)} periods / week
            </span>
          </div>
          <EditableTable
            rows={shownAssignments}
            errors={errors.assignments}
            onRowChange={(row) => {
              // Switching to lab gives a sensible default lab length.
              const next = row.kind === 'lab' && !row.labLength ? { ...row, labLength: 2 } : row
              updateRow('assignments')(next)
            }}
            onDelete={(row) => set('assignments', data.assignments.filter((a) => a.id !== row.id))}
            onAdd={() =>
              set('assignments', [
                ...data.assignments,
                { id: newId('A'), sectionId: sectionFilter || data.sections[0]?.id || '', subject: '', teacherId: data.teachers[0]?.id || '', hoursPerWeek: 4, kind: 'lecture' },
              ])
            }
            addLabel="Add subject"
            emptyText={data.sections.length && data.teachers.length ? 'No subjects yet.' : 'Add sections and teachers first, then their subjects here.'}
            columns={[
              { key: 'sectionId', label: 'Section', type: 'select', options: sectionOptions, width: 170 },
              { key: 'subject', label: 'Subject', placeholder: 'e.g. DBMS' },
              { key: 'teacherId', label: 'Teacher', type: 'select', options: teacherOptions, width: 190 },
              { key: 'kind', label: 'Type', type: 'select', width: 120, options: [{ value: 'lecture', label: 'Lecture' }, { value: 'lab', label: 'Lab' }] },
              { key: 'hoursPerWeek', label: 'Periods / week', type: 'number', min: 1, width: 120 },
              { key: 'labLength', label: 'Lab length', type: 'number', min: 2, width: 110, placeholder: '—', disabled: (row) => row.kind !== 'lab' },
            ]}
          />
        </div>
      )}
    </div>
  )
}

function SettingsForm({ data, errors, breakErrors, onChange }) {
  const { settings } = data
  const setSettings = (patch) => onChange({ ...data, settings: { ...settings, ...patch } })

  // Unavailability is stored by day index, so remap it when the list of days changes.
  function toggleDay(name) {
    const days = ALL_DAYS.filter((d) => (d === name ? !settings.days.includes(d) : settings.days.includes(d)))
    const teachers = data.teachers.map((t) => ({
      ...t,
      unavailable: (t.unavailable || []).map((u) => ({ ...u, day: days.indexOf(settings.days[u.day]) })).filter((u) => u.day >= 0),
    }))
    onChange({ ...data, settings: { ...settings, days }, teachers })
  }

  const periods = Number(settings.periodsPerDay) || 0
  const input = (error) => `mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm ${error ? 'border-red-400' : 'border-slate-300'}`

  return (
    <div className="grid grid-cols-1 gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
      <label className="block text-sm font-medium">
        College name
        <input className={input()} value={settings.collegeName || ''} onChange={(e) => setSettings({ collegeName: e.target.value })} />
      </label>
      <div className="text-sm font-medium">
        Working days
        <div className="mt-1 flex flex-wrap gap-1.5">
          {ALL_DAYS.map((d) => {
            const on = settings.days.includes(d)
            return (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                aria-pressed={on}
                className={`rounded-md border px-3 py-1.5 text-sm ${on ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}
              >
                {d}
              </button>
            )
          })}
        </div>
        {errors.days && <p className="mt-1 text-xs font-normal text-red-600">{errors.days}</p>}
      </div>
      <label className="block text-sm font-medium">
        Periods per day
        <input
          type="number"
          min={1}
          max={12}
          className={input(errors.periodsPerDay)}
          value={settings.periodsPerDay}
          onChange={(e) => setSettings({ periodsPerDay: e.target.value === '' ? '' : Number(e.target.value) })}
        />
        {errors.periodsPerDay && <span className="mt-1 block text-xs font-normal text-red-600">{errors.periodsPerDay}</span>}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          First period starts at
          <input type="time" className={input(errors.startTime)} value={settings.startTime || ''} onChange={(e) => setSettings({ startTime: e.target.value })} />
          {errors.startTime && <span className="mt-1 block text-xs font-normal text-red-600">{errors.startTime}</span>}
        </label>
        <label className="block text-sm font-medium">
          Period length (minutes)
          <input
            type="number"
            min={10}
            max={240}
            className={input(errors.periodMinutes)}
            value={settings.periodMinutes ?? ''}
            onChange={(e) => setSettings({ periodMinutes: e.target.value === '' ? '' : Number(e.target.value) })}
          />
          {errors.periodMinutes && <span className="mt-1 block text-xs font-normal text-red-600">{errors.periodMinutes}</span>}
        </label>
      </div>

      <div className="min-w-0 md:col-span-2">
        <h3 className="text-sm font-medium">Breaks</h3>
        <p className="mb-2 text-xs text-slate-500">
          Breaks sit between periods and apply to the whole college. Labs are never split across a break.
        </p>
        <EditableTable
          rows={settings.breaks || []}
          errors={breakErrors}
          onRowChange={(row) => setSettings({ breaks: settings.breaks.map((b) => (b.id === row.id ? row : b)) })}
          onDelete={(row) => setSettings({ breaks: settings.breaks.filter((b) => b.id !== row.id) })}
          onAdd={() => setSettings({ breaks: [...(settings.breaks || []), { id: newId('B'), name: 'Break', afterPeriod: firstFreeSpot(settings), minutes: 15 }] })}
          addLabel="Add break"
          emptyText="No breaks. Classes run back to back all day."
          columns={[
            { key: 'name', label: 'Break name', placeholder: 'e.g. Lunch' },
            {
              key: 'afterPeriod',
              label: 'Comes after',
              type: 'select',
              width: 170,
              options: Array.from({ length: Math.max(0, periods - 1) }, (_, i) => ({ value: i + 1, label: `Period ${i + 1}` })),
              parse: Number,
            },
            { key: 'minutes', label: 'Minutes', type: 'number', min: 1, max: 240, width: 120 },
          ]}
        />
        <DayPreview settings={settings} />
      </div>
    </div>
  )
}

// First "after period N" without a break yet, for a newly added break.
function firstFreeSpot(settings) {
  const used = new Set((settings.breaks || []).map((b) => Number(b.afterPeriod)))
  for (let n = 1; n < (Number(settings.periodsPerDay) || 0); n++) if (!used.has(n)) return n
  return 1
}

// The day at a glance: every period and break with its clock time.
function DayPreview({ settings }) {
  const { periods, breaks, dayStart, dayEnd } = daySchedule(settings)
  if (!periods.length) return null
  const items = [
    ...periods.map((p, i) => ({ ...p, label: `P${i + 1}`, isBreak: false })),
    ...breaks.map((b) => ({ ...b, label: b.name || 'Break', isBreak: true })),
  ].sort((a, b) => a.start - b.start || Number(a.isBreak) - Number(b.isBreak))
  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-700">
        Your day: {formatTime(dayStart)} to {formatTime(dayEnd)}
      </p>
      <ol className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {items.map((item, i) => (
          <li
            key={i}
            className={`rounded-md border px-2 py-1 ${item.isBreak ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-700'}`}
          >
            <span className="font-semibold">{item.label}</span> {formatRange(item.start, item.end)}
          </li>
        ))}
      </ol>
    </div>
  )
}
