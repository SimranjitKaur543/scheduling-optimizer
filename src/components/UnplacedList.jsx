import { indexById } from '../engine/model.js'

// Sessions the solver could not place, grouped by subject, each with the reason.
export default function UnplacedList({ data, unplaced }) {
  const byId = indexById(data)
  const groups = new Map()
  for (const u of unplaced) {
    const key = `${u.assignmentId}|${u.reason}`
    const g = groups.get(key) || { ...u, periods: 0 }
    g.periods += u.length
    groups.set(key, g)
  }
  const total = unplaced.reduce((sum, u) => sum + u.length, 0)

  return (
    <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-amber-900">
        {total} period{total === 1 ? '' : 's'} could not be placed
      </h2>
      <p className="mt-1 text-sm text-slate-600">Everything else is scheduled with no clashes. Here is what is missing and why:</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-4 font-medium">Subject</th>
              <th className="py-2 pr-4 font-medium">Section</th>
              <th className="py-2 pr-4 font-medium">Teacher</th>
              <th className="py-2 pr-4 font-medium">Periods</th>
              <th className="py-2 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...groups.values()].map((g, i) => {
              const a = byId.assignments[g.assignmentId]
              return (
                <tr key={i} className="align-top">
                  <td className="py-2 pr-4 font-medium">{a?.subject}</td>
                  <td className="py-2 pr-4">{byId.sections[a?.sectionId]?.name}</td>
                  <td className="py-2 pr-4">{byId.teachers[a?.teacherId]?.name}</td>
                  <td className="py-2 pr-4 tabular-nums">{g.periods}</td>
                  <td className="py-2 text-slate-700">{g.reason}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
