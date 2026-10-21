// Shows the independent validator's verdict, rule by rule.
export default function VerifiedBadge({ report }) {
  const clashes = report.errors.length
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${report.valid ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-bold text-white ${report.valid ? 'bg-emerald-600' : 'bg-red-600'}`}
          aria-hidden="true"
        >
          {report.valid ? '✓' : '✕'}
        </span>
        <div>
          <h2 className={`font-semibold ${report.valid ? 'text-emerald-900' : 'text-red-900'}`}>
            {report.valid ? 'Verified: 0 clashes' : `${clashes} problem${clashes === 1 ? '' : 's'} found. Timetable hidden.`}
          </h2>
          <p className={`text-xs ${report.valid ? 'text-emerald-800' : 'text-red-800'}`}>Checked independently of the generator, rule by rule.</p>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm">
        {report.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            <span className={c.passed ? 'text-emerald-600' : 'text-red-600'} aria-hidden="true">
              {c.passed ? '✓' : '✕'}
            </span>
            <span className={c.passed ? 'text-slate-700' : 'font-medium text-red-900'}>
              {c.label}
              {!c.passed && ` (${c.count})`}
            </span>
          </li>
        ))}
      </ul>
      {!report.valid && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-red-900">
          {report.errors.slice(0, 5).map((e, i) => (
            <li key={i}>{e.message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
