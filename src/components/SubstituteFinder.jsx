import { useState } from 'react'
import { findSubstitutes } from '../engine/score.js'

// "Teacher X is absent on Tuesday: who can cover each of their classes?"
export default function SubstituteFinder({ data, placements }) {
  const [teacherId, setTeacherId] = useState(data.teachers[0]?.id ?? '')
  const [day, setDay] = useState(0)
  const teacher = data.teachers.find((t) => t.id === teacherId)
  const classes = teacher ? findSubstitutes(data, placements, teacherId, day) : []
  const periodLabel = (p) => (p.length > 1 ? `Periods ${p.startPeriod + 1}–${p.startPeriod + p.length}` : `Period ${p.startPeriod + 1}`)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2" aria-label="Absent teacher">
          {data.teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="text-slate-600">is absent on</span>
        <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2" aria-label="Day of absence">
          {data.settings.days.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {teacher && classes.length === 0 && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {teacher.name} has no classes on {data.settings.days[day]}. Nothing to cover.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {classes.map(({ placement, subject, sectionName, roomName, candidates }, i) => (
          <li key={i} className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm">
              <span className="font-semibold">{periodLabel(placement)}</span>
              <span className="text-slate-600">
                {' '}
                · {subject} · {sectionName} · {roomName}
              </span>
            </p>
            {candidates.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {candidates.slice(0, 6).map((c) => (
                  <span
                    key={c.teacherId}
                    className={`rounded-full border px-2.5 py-1 text-xs ${c.sameSubject ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                    title={`${c.dayLoad} period(s) already that day`}
                  >
                    {c.sameSubject && '★ '}
                    {c.name}
                    <span className="ml-1 text-slate-500">({c.dayLoad} that day)</span>
                  </span>
                ))}
                {candidates.length > 6 && <span className="px-1 py-1 text-xs text-slate-500">+{candidates.length - 6} more free</span>}
              </div>
            ) : (
              <p className="mt-2 text-xs font-medium text-red-700">No teacher is free for this class. Consider rescheduling it.</p>
            )}
          </li>
        ))}
      </ul>
      {classes.length > 0 && <p className="mt-3 text-xs text-slate-500">★ already teaches this subject. Others are sorted by lightest load that day.</p>}
    </div>
  )
}
