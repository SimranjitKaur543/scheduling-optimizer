import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import WorkspacesPage from './components/WorkspacesPage.jsx'
import Dashboard from './components/Dashboard.jsx'
import SetupPage from './components/SetupPage.jsx'
import TimetablePage from './components/TimetablePage.jsx'
import ReportPage from './components/ReportPage.jsx'
import { makeImpossibleCollege, makeSampleCollege } from './engine/sampleData.js'
import { precheck } from './engine/precheck.js'
import { solve } from './engine/solver.js'
import { validateTimetable } from './engine/validator.js'
import { makeBlankCollege, validateSetup } from './engine/setupValidation.js'
import { duplicateWorkspace, makeWorkspace, parseStore, removeWorkspace } from './engine/workspaces.js'

const STORE_KEY = 'scheduling-optimizer:workspaces:v2'
const OLD_KEY = 'scheduling-optimizer:data:v1' // the earlier one-college version; upgraded on first load

function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // storage blocked (private window): start fresh
  }
}

export default function App() {
  const [store, setStore] = useState(() => parseStore(readStorage(STORE_KEY), readStorage(OLD_KEY)))
  const [page, setPage] = useState('dashboard')
  const [generatingId, setGeneratingId] = useState(null)
  const [saveFailed, setSaveFailed] = useState(false)

  const active = store.workspaces.find((w) => w.id === store.activeId)
  const { data } = active
  const generating = generatingId === active.id
  const setupErrors = useMemo(() => validateSetup(data), [data])
  const check = useMemo(() => (setupErrors.count ? { ok: false, issues: [] } : precheck(data)), [data, setupErrors])
  // A saved timetable is always re-checked by the validator before it is shown.
  const run = useMemo(() => (active.result ? { result: active.result, report: validateTimetable(data, active.result) } : null), [active.result, data])

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store))
      setSaveFailed(false)
    } catch {
      setSaveFailed(true) // storage full or blocked: the app still works, but warn the user
    }
  }, [store])

  const updateWorkspace = (id, patch) =>
    setStore((s) => ({ ...s, workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: Date.now() } : w)) }))

  // Any change to the setup makes the old timetable out of date.
  const editData = (next) => updateWorkspace(active.id, { data: next, result: null, edited: true })

  function generate() {
    if (setupErrors.count) return
    const id = active.id
    setGeneratingId(id)
    // Let the "Generating…" state paint before the solver blocks the page for ~1.5 s.
    setTimeout(() => {
      updateWorkspace(id, { result: solve(data, { timeLimitMs: 1500 }) })
      setGeneratingId(null)
    }, 50)
  }

  // ---- My timetables ----
  function addWorkspace(w, nextPage = 'dashboard') {
    setStore((s) => ({ activeId: w.id, workspaces: [...s.workspaces, w] }))
    setPage(nextPage)
  }
  function createWorkspace(kind) {
    if (kind === 'blank') addWorkspace(makeWorkspace('Untitled timetable', makeBlankCollege()), 'setup')
    if (kind === 'sample') addWorkspace(makeWorkspace('Sample college (demo)', makeSampleCollege()))
    if (kind === 'impossible') addWorkspace(makeWorkspace('Impossible scenario (demo)', makeImpossibleCollege()))
  }
  function openWorkspace(id) {
    setStore((s) => ({ ...s, activeId: id }))
    setPage('dashboard')
  }
  function duplicate(id) {
    const original = store.workspaces.find((w) => w.id === id)
    setStore((s) => ({ ...s, workspaces: [...s.workspaces, duplicateWorkspace(original)] }))
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <Sidebar page={page} onNavigate={setPage} workspaceName={active.name} collegeName={data.settings.collegeName} setupErrorCount={setupErrors.count} />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-8 print:p-0">
        {store.unreadable?.length > 0 && (
          <p className="mx-auto mb-4 max-w-6xl rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
            ! {store.unreadable.length} saved timetable{store.unreadable.length === 1 ? '' : 's'} could not be opened (damaged, or made by a newer version
            of this app). {store.unreadable.length === 1 ? 'It is' : 'They are'} kept in this browser and nothing was deleted.
          </p>
        )}
        {saveFailed && (
          <p className="mx-auto mb-4 max-w-6xl rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
            ! This browser is not saving your changes (storage is full or blocked). Use Export JSON in Setup to keep a copy.
          </p>
        )}
        {page === 'workspaces' && (
          <WorkspacesPage
            store={store}
            onOpen={openWorkspace}
            onCreate={createWorkspace}
            onImport={(name, imported, notes) => addWorkspace(makeWorkspace(name, imported, Date.now(), notes))}
            onRename={(id, name) => updateWorkspace(id, { name })}
            onDuplicate={duplicate}
            onDelete={(id) => setStore((s) => removeWorkspace(s, id))}
          />
        )}
        {page === 'dashboard' && (
          <Dashboard
            workspaceName={active.name}
            data={data}
            check={check}
            setupErrorCount={setupErrors.count}
            run={run}
            generating={generating}
            onGenerate={generate}
            onViewTimetable={() => setPage('timetable')}
            onOpenSetup={() => setPage('setup')}
            onOpenWorkspaces={() => setPage('workspaces')}
            onNewSample={() => createWorkspace('sample')}
            migrationNotes={active.migrationNotes}
            onDismissNotes={() => setStore((s) => ({ ...s, workspaces: s.workspaces.map((w) => (w.id === active.id ? { ...w, migrationNotes: [] } : w)) }))}
          />
        )}
        {page === 'setup' && <SetupPage data={data} errors={setupErrors} onChange={editData} />}
        {page === 'timetable' && <TimetablePage data={data} run={run} generating={generating} onGenerate={generate} />}
        {page === 'report' && <ReportPage data={data} run={run} generating={generating} onGenerate={generate} />}
      </main>
    </div>
  )
}
