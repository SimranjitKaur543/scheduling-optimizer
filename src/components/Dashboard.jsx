import ResultSummary from './ResultSummary.jsx'

export default function Dashboard({ data, check, setupErrorCount, run, generating, onLoadSample, onLoadImpossible, onGenerate, onViewTimetable, onOpenSetup }) {
  const totalPeriods = data.assignments.reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0)
  const labRooms = data.rooms.filter((r) => r.type === 'lab').length
  const isEmpty = data.assignments.length === 0
  const errors = check.issues.filter((i) => i.severity === 'error')
  const warnings = check.issues.filter((i) => i.severity === 'warning')

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data.settings.collegeName || 'Your college'} · {data.settings.days.length} days × {data.settings.periodsPerDay} periods
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onLoadSample} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100">
            Load sample college
          </button>
          <button onClick={onLoadImpossible} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100">
            Load impossible scenario
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Sections" value={data.sections.length} />
        <Stat label="Teachers" value={data.teachers.length} />
        <Stat label="Rooms" value={data.rooms.length} hint={`${labRooms} lab${labRooms === 1 ? '' : 's'}`} />
        <Stat label="Subjects" value={data.assignments.length} />
        <Stat label="Periods to schedule" value={totalPeriods} />
      </section>

      {isEmpty ? (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
          <h2 className="font-semibold text-indigo-950">Get started in 4 steps</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-indigo-950">
            <li>
              <strong>Settings:</strong> working days, periods per day and the lunch break.
            </li>
            <li>
              <strong>Rooms:</strong> classrooms and labs, with seats.
            </li>
            <li>
              <strong>Teachers and sections:</strong> mark when teachers are unavailable.
            </li>
            <li>
              <strong>Subjects:</strong> who teaches what to which section, and how many periods a week.
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={onOpenSetup} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Go to Setup →
            </button>
            <button onClick={onLoadSample} className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-100">
              Or try the sample college
            </button>
          </div>
        </section>
      ) : (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold">Pre-check</h2>
            <p className="mt-1 text-sm text-slate-600">Quick maths checks before generating, so impossible setups are caught early.</p>
          </div>
          <button
            onClick={onGenerate}
            disabled={generating || setupErrorCount > 0}
            className={`shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${
              check.ok ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {generating ? 'Generating…' : check.ok ? 'Generate timetable' : 'Generate anyway (partial)'}
          </button>
        </div>

        {setupErrorCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p>
              ✕ {setupErrorCount === 1 ? '1 field in Setup needs' : `${setupErrorCount} fields in Setup need`} fixing before a timetable can be generated.
            </p>
            <button onClick={onOpenSetup} className="rounded-md bg-white px-3 py-1.5 font-medium text-red-800 shadow-sm hover:bg-red-100">
              Go to Setup →
            </button>
          </div>
        )}

        {check.ok && !warnings.length && setupErrorCount === 0 && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✓ All checks passed. This setup looks schedulable.</p>
        )}
        {(errors.length > 0 || warnings.length > 0) && (
          <ul className="mt-4 space-y-2">
            {[...errors, ...warnings].map((issue, i) => (
              <li
                key={i}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  issue.severity === 'error' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                <p className="font-medium">
                  {issue.severity === 'error' ? '✕ ' : '! '}
                  {issue.message}
                </p>
                <p className="mt-1 opacity-80">Fix: {issue.fix}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {run && !isEmpty && <ResultSummary data={data} run={run} onViewTimetable={onViewTimetable} />}
    </div>
  )
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
