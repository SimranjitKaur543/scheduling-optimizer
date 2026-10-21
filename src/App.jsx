import { useMemo, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import TimetablePage from './components/TimetablePage.jsx'
import { makeImpossibleCollege, makeSampleCollege } from './engine/sampleData.js'
import { precheck } from './engine/precheck.js'
import { solve } from './engine/solver.js'
import { validateTimetable } from './engine/validator.js'

export default function App() {
  const [data, setData] = useState(makeSampleCollege)
  const [page, setPage] = useState('dashboard')
  const [run, setRun] = useState(null) // { result, report } from the last Generate
  const [generating, setGenerating] = useState(false)
  const check = useMemo(() => precheck(data), [data])

  function loadData(next) {
    setData(next)
    setRun(null)
  }

  function generate() {
    setGenerating(true)
    // Let the "Generating…" state paint before the solver blocks the page for ~1.5 s.
    setTimeout(() => {
      const result = solve(data, { timeLimitMs: 1500 })
      const report = validateTimetable(data, result)
      setRun({ result, report })
      setGenerating(false)
    }, 50)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <Sidebar page={page} onNavigate={setPage} collegeName={data.settings.collegeName} />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-8">
        {page === 'dashboard' && (
          <Dashboard
            data={data}
            check={check}
            run={run}
            generating={generating}
            onLoadSample={() => loadData(makeSampleCollege())}
            onLoadImpossible={() => loadData(makeImpossibleCollege())}
            onGenerate={generate}
            onViewTimetable={() => setPage('timetable')}
          />
        )}
        {page === 'timetable' && (
          <TimetablePage data={data} run={run} generating={generating} onGenerate={generate} />
        )}
      </main>
    </div>
  )
}
