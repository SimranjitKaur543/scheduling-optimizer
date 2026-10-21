// Clickable day × period grid for marking when a teacher is NOT available.
export default function AvailabilityGrid({ settings, unavailable = [], onChange }) {
  const blocked = new Set(unavailable.map((u) => `${u.day}-${u.period}`))
  const periods = Array.from({ length: settings.periodsPerDay }, (_, p) => p)

  function toggle(day, period) {
    const key = `${day}-${period}`
    onChange(blocked.has(key) ? unavailable.filter((u) => `${u.day}-${u.period}` !== key) : [...unavailable, { day, period }])
  }
  function toggleDay(day) {
    const allBlocked = periods.every((p) => blocked.has(`${day}-${p}`))
    const others = unavailable.filter((u) => u.day !== day)
    onChange(allBlocked ? others : [...others, ...periods.map((period) => ({ day, period }))])
  }

  return (
    <div>
      <p className="mb-2 text-xs text-slate-600">
        Click a period to mark the teacher <strong className="text-red-700">unavailable</strong>. Click a day name to toggle the whole day.
      </p>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th />
              {periods.map((p) => (
                <th key={p} className="px-1 pb-1 font-medium text-slate-500">
                  P{p + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {settings.days.map((d, day) => (
              <tr key={d}>
                <th className="pr-2 text-left">
                  <button onClick={() => toggleDay(day)} className="rounded px-1 py-0.5 font-medium text-slate-700 hover:bg-slate-200">
                    {d}
                  </button>
                </th>
                {periods.map((period) => {
                  const off = blocked.has(`${day}-${period}`)
                  return (
                    <td key={period} className="p-0.5">
                      <button
                        onClick={() => toggle(day, period)}
                        aria-pressed={off}
                        aria-label={`${d} period ${period + 1}: ${off ? 'unavailable' : 'available'}`}
                        className={`h-7 w-9 rounded border text-[11px] font-medium ${
                          off ? 'border-red-300 bg-red-100 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {off ? 'Off' : '✓'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
