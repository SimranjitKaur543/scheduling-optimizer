// Rooms × days heatmap: how many periods each room is in use (one hue, light = empty, dark = full).

// Full class strings so Tailwind keeps them. Index 0 = unused.
const STEPS = [
  'bg-slate-50 text-slate-400',
  'bg-indigo-100 text-indigo-950',
  'bg-indigo-200 text-indigo-950',
  'bg-indigo-300 text-indigo-950',
  'bg-indigo-500 text-white',
  'bg-indigo-700 text-white',
]

function stepFor(used, periodsPerDay) {
  if (!used) return 0
  return Math.min(STEPS.length - 1, 1 + Math.floor((used / periodsPerDay) * (STEPS.length - 1) - 1e-9))
}

export default function RoomHeatmap({ usage, days, periodsPerDay }) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-separate border-spacing-0.5 text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="w-px whitespace-nowrap py-1 pr-2 text-left font-medium">Room</th>
              {days.map((d) => (
                <th key={d} className="px-1 py-1 font-medium">
                  {d}
                </th>
              ))}
              <th className="w-px whitespace-nowrap py-1 pl-2 text-right font-medium">Week</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((r) => (
              <tr key={r.roomId}>
                <td className="whitespace-nowrap py-0.5 pr-2 text-slate-700">
                  {r.name}
                  {r.type === 'lab' && <span className="ml-1.5 rounded bg-slate-100 px-1 text-[10px] font-semibold uppercase text-slate-500">Lab</span>}
                </td>
                {r.perDay.map((n, i) => (
                  <td
                    key={i}
                    className={`h-9 rounded text-center text-xs font-medium tabular-nums ${STEPS[stepFor(n, periodsPerDay)]}`}
                    title={`${r.name}, ${days[i]}: ${n} of ${periodsPerDay} periods in use`}
                  >
                    {n || '–'}
                  </td>
                ))}
                <td className={`py-0.5 pl-2 text-right text-xs font-semibold tabular-nums ${r.share < 0.25 ? 'text-amber-700' : 'text-slate-700'}`}>
                  {Math.round(r.share * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>Periods in use per day:</span>
        <span className="flex items-center gap-0.5">
          {STEPS.map((s, i) => (
            <span key={i} className={`h-3 w-6 rounded-sm ${s.split(' ')[0]}`} />
          ))}
        </span>
        <span>
          0 → {periodsPerDay}
        </span>
      </div>
    </div>
  )
}
