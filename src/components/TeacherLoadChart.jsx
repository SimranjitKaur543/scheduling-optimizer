// Horizontal bar chart of periods per week for each teacher (one series, one hue).
// Hover a bar for the day-by-day breakdown; a dashed line marks the average.
export default function TeacherLoadChart({ load, days }) {
  const rows = [...load].sort((a, b) => b.total - a.total)
  const max = Math.max(1, ...rows.map((r) => r.total))
  const avg = rows.length ? rows.reduce((s, r) => s + r.total, 0) / rows.length : 0
  const avgLeft = `${(avg / max) * 100}%`

  return (
    <div>
      <div className="relative">
        {/* Average line, drawn across the bar area only */}
        <div className="pointer-events-none absolute inset-y-0 left-[150px] right-12">
          <div className="absolute inset-y-0 border-l border-dashed border-slate-400" style={{ left: avgLeft }} />
          <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[11px] text-slate-500" style={{ left: avgLeft }}>
            avg {avg.toFixed(1)}
          </span>
        </div>
        <ul className="space-y-1.5 pt-5">
          {rows.map((r) => (
            <li key={r.teacherId} className="group relative flex items-center gap-2 text-sm">
              <span className="w-[142px] shrink-0 truncate text-slate-700" title={r.name}>
                {r.name}
              </span>
              <div className="relative h-6 flex-1">
                <div
                  className="absolute inset-y-1.5 left-0 rounded-r bg-indigo-500 transition-colors group-hover:bg-indigo-700"
                  style={{ width: `${(r.total / max) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-medium tabular-nums text-slate-700">{r.total}</span>

              {/* Hover tooltip */}
              <div className="pointer-events-none absolute left-[150px] top-full z-10 hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg group-hover:block">
                <p className="font-semibold text-slate-900">{r.name}</p>
                <p className="text-slate-600">
                  {r.total} periods / week{r.maxPerDay ? ` · limit ${r.maxPerDay} / day` : ''}
                </p>
                <div className="mt-1 flex gap-2 tabular-nums text-slate-700">
                  {days.map((d, i) => (
                    <span key={d}>
                      {d} <strong>{r.perDay[i]}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-slate-600 hover:text-slate-900">View as table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1 pr-3 font-medium">Teacher</th>
                {days.map((d) => (
                  <th key={d} className="px-2 py-1 text-right font-medium">
                    {d}
                  </th>
                ))}
                <th className="py-1 pl-2 text-right font-medium">Week</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {rows.map((r) => (
                <tr key={r.teacherId}>
                  <td className="py-1 pr-3">{r.name}</td>
                  {r.perDay.map((n, i) => (
                    <td key={i} className="px-2 py-1 text-right">
                      {n}
                    </td>
                  ))}
                  <td className="py-1 pl-2 text-right font-semibold">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
