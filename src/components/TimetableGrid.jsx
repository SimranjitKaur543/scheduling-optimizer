import { indexById } from '../engine/model.js'
import { daySchedule, formatRange } from '../engine/time.js'

// Full class strings (not built from parts) so Tailwind keeps them in the build.
const COLORS = [
  'bg-sky-100 border-sky-300 text-sky-950',
  'bg-violet-100 border-violet-300 text-violet-950',
  'bg-emerald-100 border-emerald-300 text-emerald-950',
  'bg-amber-100 border-amber-300 text-amber-950',
  'bg-rose-100 border-rose-300 text-rose-950',
  'bg-teal-100 border-teal-300 text-teal-950',
  'bg-indigo-100 border-indigo-300 text-indigo-950',
  'bg-lime-100 border-lime-300 text-lime-950',
  'bg-orange-100 border-orange-300 text-orange-950',
  'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-950',
  'bg-cyan-100 border-cyan-300 text-cyan-950',
  'bg-yellow-100 border-yellow-300 text-yellow-950',
]

function colorFor(subject) {
  let h = 0
  for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

/**
 * Weekly grid for one section, teacher or room.
 * viewType: 'section' | 'teacher' | 'room'; entityId: that thing's id.
 */
export default function TimetableGrid({ data, placements, viewType, entityId }) {
  const { days, periodsPerDay } = data.settings
  const byId = indexById(data)
  const schedule = daySchedule(data.settings)
  // Grid rows: row 1 is the header, then each period, with a thin row for every break after it.
  // Labs never cross a break, so a lab's periods are always on neighbouring rows.
  const periodRow = []
  const breakRows = []
  let row = 2
  for (let p = 0; p < periodsPerDay; p++) {
    periodRow[p] = row++
    for (const b of schedule.breaks.filter((x) => x.afterPeriod === p + 1)) breakRows.push({ ...b, row: row++ })
  }
  const rowOf = (p) => periodRow[p]

  const mine = placements.filter((p) => {
    const a = byId.assignments[p.assignmentId]
    if (viewType === 'section') return a.sectionId === entityId
    if (viewType === 'teacher') return a.teacherId === entityId
    return p.roomId === entityId
  })

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:shadow-none">
      <div
        className="grid min-w-[640px] gap-px bg-slate-200"
        style={{ gridTemplateColumns: `96px repeat(${days.length}, minmax(100px, 1fr))` }}
      >
        <div className="bg-slate-50" style={{ gridColumn: 1, gridRow: 1 }} />
        {days.map((d, i) => (
          <div key={d} className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600" style={{ gridColumn: i + 2, gridRow: 1 }}>
            {d}
          </div>
        ))}

        {Array.from({ length: periodsPerDay }, (_, p) => (
          <div
            key={`label-${p}`}
            className="flex flex-col items-center justify-center bg-slate-50 px-1 text-center text-xs font-medium text-slate-600"
            style={{ gridColumn: 1, gridRow: rowOf(p) }}
          >
            <span>Period {p + 1}</span>
            {schedule.periods[p] && (
              <span className="mt-0.5 text-[10px] font-normal tabular-nums text-slate-500">{formatRange(schedule.periods[p].start, schedule.periods[p].end)}</span>
            )}
          </div>
        ))}

        {breakRows.map((b) => (
          <div
            key={`break-${b.id}`}
            className="bg-amber-50 py-1 text-center text-[11px] font-medium text-amber-900"
            style={{ gridColumn: `1 / span ${days.length + 1}`, gridRow: b.row }}
          >
            <span className="uppercase tracking-widest">{b.name || 'Break'}</span>
            <span className="ml-2 font-normal tabular-nums">
              {formatRange(b.start, b.end)} · {b.minutes} min
            </span>
          </div>
        ))}

        {/* Empty background cells, so free periods still show grid lines. */}
        {days.map((_, d) =>
          Array.from({ length: periodsPerDay }, (_, p) => (
            <div key={`bg-${d}-${p}`} className="min-h-[64px] bg-white" style={{ gridColumn: d + 2, gridRow: rowOf(p) }} />
          )),
        )}

        {mine.map((p, i) => {
          const a = byId.assignments[p.assignmentId]
          const section = byId.sections[a.sectionId]
          const teacher = byId.teachers[a.teacherId]
          const room = byId.rooms[p.roomId]
          const details =
            viewType === 'section' ? [teacher?.name, room?.name] : viewType === 'teacher' ? [section?.name, room?.name] : [section?.name, teacher?.name]
          return (
            <div
              key={i}
              className={`m-0.5 flex flex-col rounded-md border-l-4 px-2 py-1.5 text-xs ${colorFor(a.subject)}`}
              style={{ gridColumn: p.day + 2, gridRow: `${rowOf(p.startPeriod)} / span ${p.length}` }}
            >
              <span className="font-semibold leading-tight">{a.subject}</span>
              {a.kind === 'lab' && <span className="mt-0.5 w-fit rounded bg-white/60 px-1 text-[10px] font-semibold uppercase">Lab · {p.length} periods</span>}
              {details.map((t, k) => (
                <span key={k} className="mt-0.5 leading-tight opacity-80">
                  {t}
                </span>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
