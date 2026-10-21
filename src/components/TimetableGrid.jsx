import { indexById } from '../engine/model.js'

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
  const { days, periodsPerDay, breakAfterPeriod } = data.settings
  const byId = indexById(data)
  const hasBreak = breakAfterPeriod > 0 && breakAfterPeriod < periodsPerDay
  // Grid row for a period: row 1 is the header, and the break gets its own row.
  const rowOf = (p) => 2 + p + (hasBreak && p >= breakAfterPeriod ? 1 : 0)

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
        style={{ gridTemplateColumns: `76px repeat(${days.length}, minmax(100px, 1fr))` }}
      >
        <div className="bg-slate-50" style={{ gridColumn: 1, gridRow: 1 }} />
        {days.map((d, i) => (
          <div key={d} className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600" style={{ gridColumn: i + 2, gridRow: 1 }}>
            {d}
          </div>
        ))}

        {Array.from({ length: periodsPerDay }, (_, p) => (
          <div key={`label-${p}`} className="flex items-center justify-center bg-slate-50 px-1 text-xs font-medium text-slate-500" style={{ gridColumn: 1, gridRow: rowOf(p) }}>
            Period {p + 1}
          </div>
        ))}

        {hasBreak && (
          <div
            className="bg-slate-100 py-1 text-center text-[11px] font-medium uppercase tracking-widest text-slate-500"
            style={{ gridColumn: `1 / span ${days.length + 1}`, gridRow: 2 + breakAfterPeriod }}
          >
            Break
          </div>
        )}

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
