import { roomUsage, teacherLoad } from '../engine/score.js'
import TeacherLoadChart from './TeacherLoadChart.jsx'
import RoomHeatmap from './RoomHeatmap.jsx'
import SubstituteFinder from './SubstituteFinder.jsx'

export default function ReportPage({ data, run, generating, onGenerate }) {
  if (!run || !run.report.valid) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">No report yet</h1>
        <p className="mt-2 text-sm text-slate-600">Generate a timetable to see teacher loads, room usage and substitutes.</p>
        <button onClick={onGenerate} disabled={generating} className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {generating ? 'Generating…' : 'Generate timetable'}
        </button>
      </div>
    )
  }

  const { placements } = run.result
  const { days, periodsPerDay } = data.settings
  const load = teacherLoad(data, placements).filter((t) => t.total > 0)
  const usage = roomUsage(data, placements)
  const busiest = [...load].sort((a, b) => b.total - a.total)[0]
  const lightest = [...load].sort((a, b) => a.total - b.total)[0]
  const week = days.length * periodsPerDay
  const overallUse = usage.length ? usage.reduce((s, r) => s + r.total, 0) / (usage.length * week) : 0
  const underused = usage.filter((r) => r.share < 0.25)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Report</h1>
        <p className="mt-1 text-sm text-slate-600">How fair and efficient this timetable is, and who can cover an absent teacher.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Busiest teacher" value={busiest ? `${busiest.total} periods` : '–'} hint={busiest?.name} />
        <Tile label="Lightest teacher" value={lightest ? `${lightest.total} periods` : '–'} hint={lightest?.name} />
        <Tile label="Room time in use" value={`${Math.round(overallUse * 100)}%`} hint={`across ${usage.length} rooms`} />
        <Tile
          label="Under-used rooms"
          value={underused.length}
          hint={underused.length ? `in use less than 25% of the week` : 'every room is well used'}
          warn={underused.length > 0}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Teacher load" subtitle="Periods per week. Hover a bar for the daily breakdown.">
          <TeacherLoadChart load={load} days={days} />
        </Card>
        <Card title="Room usage" subtitle="Periods each room is booked, by day. Light cells are empty rooms.">
          <RoomHeatmap usage={usage} days={days} periodsPerDay={periodsPerDay} />
        </Card>
      </div>

      <Card title="Substitute finder" subtitle="Pick an absent teacher and a day to see who is free to cover each of their classes.">
        <SubstituteFinder data={data} placements={placements} />
      </Card>
    </div>
  )
}

function Tile({ label, value, hint, warn }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {warn && <span className="mr-1 text-amber-600" aria-hidden="true">!</span>}
        {value}
      </p>
      {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function Card({ title, subtitle, children }) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}
