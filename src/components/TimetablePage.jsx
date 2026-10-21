import { useState } from 'react'
import TimetableGrid from './TimetableGrid.jsx'
import UnplacedList from './UnplacedList.jsx'
import { downloadCsv, timetableToCsv } from '../engine/exportCsv.js'

const VIEW_TYPES = [
  { id: 'section', label: 'Section', list: (data) => data.sections },
  { id: 'teacher', label: 'Teacher', list: (data) => data.teachers },
  { id: 'room', label: 'Room', list: (data) => data.rooms },
]

export default function TimetablePage({ data, run, generating, onGenerate }) {
  const [viewType, setViewType] = useState('section')
  const [selected, setSelected] = useState({}) // remembered choice per view type

  if (!run || !run.report.valid) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">{run ? 'The last timetable failed verification' : 'No timetable yet'}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {run ? 'It is hidden so no timetable with clashes is ever shown. Check the Dashboard for details.' : 'Generate one to see it here.'}
        </p>
        <button onClick={onGenerate} disabled={generating} className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {generating ? 'Generating…' : 'Generate timetable'}
        </button>
      </div>
    )
  }

  const type = VIEW_TYPES.find((v) => v.id === viewType)
  const options = type.list(data)
  const entityId = options.some((o) => o.id === selected[viewType]) ? selected[viewType] : options[0]?.id
  const entity = options.find((o) => o.id === entityId)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timetable</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">✓ Verified: 0 clashes</span>
            {data.settings.collegeName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5" role="tablist" aria-label="View by">
            {VIEW_TYPES.map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={viewType === v.id}
                onClick={() => setViewType(v.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${viewType === v.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <select
            value={entityId ?? ''}
            onChange={(e) => setSelected({ ...selected, [viewType]: e.target.value })}
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            aria-label={`Choose ${type.label.toLowerCase()}`}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => downloadCsv(`${(data.settings.collegeName || 'college').replace(/[^\w-]+/g, '-').toLowerCase()}-timetable.csv`, timetableToCsv(data, run.result.placements))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100"
            title="Every class for every section, for Excel or Google Sheets"
          >
            Download CSV
          </button>
          <button onClick={() => window.print()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100" title="Print or save this view as PDF">
            Print / PDF
          </button>
        </div>
      </header>

      {entity ? (
        <>
          <h2 className="text-lg font-semibold">
            {entity.name}
            {viewType === 'room' && <span className="ml-2 text-sm font-normal text-slate-500">({entity.type}, seats {entity.capacity})</span>}
            {viewType === 'section' && <span className="ml-2 text-sm font-normal text-slate-500">({entity.size} students)</span>}
          </h2>
          <TimetableGrid data={data} placements={run.result.placements} viewType={viewType} entityId={entityId} />
        </>
      ) : (
        <p className="text-sm text-slate-600">Nothing to show for this view.</p>
      )}

      {run.result.unplaced.length > 0 && (
        <div className="print:hidden">
          <UnplacedList data={data} unplaced={run.result.unplaced} />
        </div>
      )}
    </div>
  )
}
