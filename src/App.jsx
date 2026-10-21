import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import SetupPage from './components/SetupPage.jsx'
import TimetablePage from './components/TimetablePage.jsx'
import { makeImpossibleCollege, makeSampleCollege } from './engine/sampleData.js'
import { precheck } from './engine/precheck.js'
import { solve } from './engine/solver.js'
import { validateTimetable } from './engine/validator.js'
import { checkImportShape, validateSetup } from './engine/setupValidation.js'

const STORAGE_KEY = 'scheduling-optimizer:data:v1'

// Saved data from this browser, or the sample college the first time.
function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && !checkImportShape(saved.data)) return saved
  } catch {
    // Storage blocked or corrupted: fall back to the sample.
  }
  return { data: makeSampleCollege(), edited: false }
}

export default function App() {
  const [initial] = useState(loadSaved)
  const [data, setData] = useState(initial.data)
  const [edited, setEdited] = useState(initial.edited) // true once the user has typed their own changes
  const [page, setPage] = useState('dashboard')
  const [run, setRun] = useState(null) // { result, report } from the last Generate
  const [generating, setGenerating] = useState(false)
  const setupErrors = useMemo(() => validateSetup(data), [data])
  const check = useMemo(() => (setupErrors.count ? { ok: false, issues: [] } : precheck(data)), [data, setupErrors])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, edited }))
    } catch {
      // Storage unavailable (private window): the app still works, it just won't remember.
    }
  }, [data, edited])

  // Any change makes the old timetable out of date.
  function editData(next) {
    setData(next)
    setEdited(true)
    setRun(null)
  }

  function replaceData(next, { askFirst = false } = {}) {
    if (askFirst && edited && !window.confirm('Replace your edited data? Export it first from Setup if you want to keep it.')) return
    setData(next)
    setEdited(false)
    setRun(null)
  }

  function generate() {
    if (setupErrors.count) return
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
      <Sidebar page={page} onNavigate={setPage} collegeName={data.settings.collegeName} setupErrorCount={setupErrors.count} />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-8">
        {page === 'dashboard' && (
          <Dashboard
            data={data}
            check={check}
            setupErrorCount={setupErrors.count}
            run={run}
            generating={generating}
            onLoadSample={() => replaceData(makeSampleCollege(), { askFirst: true })}
            onLoadImpossible={() => replaceData(makeImpossibleCollege(), { askFirst: true })}
            onGenerate={generate}
            onViewTimetable={() => setPage('timetable')}
            onOpenSetup={() => setPage('setup')}
          />
        )}
        {page === 'setup' && <SetupPage data={data} errors={setupErrors} onChange={editData} onReplace={(next) => replaceData(next)} />}
        {page === 'timetable' && <TimetablePage data={data} run={run} generating={generating} onGenerate={generate} />}
      </main>
    </div>
  )
}
