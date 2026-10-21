import VerifiedBadge from './VerifiedBadge.jsx'
import UnplacedList from './UnplacedList.jsx'

// Shown on the dashboard after Generate: verification, completeness and optimization results.
export default function ResultSummary({ data, run, onViewTimetable }) {
  const { result, report } = run
  const total = data.assignments.reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0)
  const placed = result.placements.reduce((sum, p) => sum + p.length, 0)
  const { attempts, timeMs, firstScore } = result.stats
  const improvement = firstScore > 0 ? Math.round(((firstScore - result.score) / firstScore) * 100) : 0

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <VerifiedBadge report={report} />

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Result</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <Row label="Periods placed">
              <span className={placed === total ? 'text-emerald-700' : 'text-amber-700'}>
                {placed} / {total}
              </span>
            </Row>
            <Row label="Timetables tried">{attempts} in {(timeMs / 1000).toFixed(1)} s</Row>
            <Row label="Quality penalty (lower is better)">
              {firstScore} → <strong>{result.score}</strong>
              {improvement > 0 && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">{improvement}% better</span>}
            </Row>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Penalty counts the same subject twice in a day, teachers over their daily limit, and idle gaps for sections and teachers.
          </p>
          {report.valid && (
            <button onClick={onViewTimetable} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              View timetable →
            </button>
          )}
        </div>
      </div>

      {result.unplaced.length > 0 && <UnplacedList data={data} unplaced={result.unplaced} />}
    </section>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-slate-600">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  )
}
