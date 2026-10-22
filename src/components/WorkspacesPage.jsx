import { useRef, useState } from 'react'
import { prepareImport, timetableStatus } from '../engine/workspaces.js'
import { downloadJson, fileSlug } from '../engine/exportCsv.js'

const STATUS = {
  none: { label: 'Not generated yet', className: 'bg-slate-100 text-slate-600' },
  complete: { label: '✓ Timetable ready', className: 'bg-emerald-100 text-emerald-800' },
  partial: { label: '! Partial timetable', className: 'bg-amber-100 text-amber-900' },
}

// "My timetables": every organisation / semester / draft this browser holds.
export default function WorkspacesPage({ store, onOpen, onCreate, onImport, onRename, onDuplicate, onDelete }) {
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState('')
  // Delete asks inside the card (browser pop-ups can be blocked, which silently cancels them).
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)
  const [notice, setNotice] = useState(null) // { kind: 'error' | 'ok', text }
  const fileInput = useRef(null)
  const sorted = [...store.workspaces].sort((a, b) => b.updatedAt - a.updatedAt)

  function startRename(w) {
    setEditingId(w.id)
    setDraftName(w.name)
  }
  function saveRename() {
    if (draftName.trim()) onRename(editingId, draftName.trim())
    setEditingId(null)
  }

  async function importJson(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const imported = prepareImport(JSON.parse(await file.text()))
      if (imported.error) return setNotice({ kind: 'error', text: `${file.name}: ${imported.error}` })
      onImport(imported.data.settings.collegeName || file.name.replace(/\.json$/i, ''), imported.data, imported.warnings)
    } catch {
      setNotice({ kind: 'error', text: `${file.name} is not a valid JSON file.` })
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">My timetables</h1>
        <p className="mt-1 text-sm text-slate-600">
          Keep a separate timetable for every college, department, semester or draft. Each one has its own rooms, teachers and subjects, and its generated
          timetable is saved with it.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CreateButton title="New blank timetable" hint="Start from scratch for your organisation" primary onClick={() => onCreate('blank')} />
        <CreateButton title="Sample college" hint="A ready-made demo with 3 departments" onClick={() => onCreate('sample')} />
        <CreateButton title="Impossible scenario" hint="Demo of how problems are explained" onClick={() => onCreate('impossible')} />
        <CreateButton title="Import JSON" hint="Open a file exported from this app" onClick={() => fileInput.current?.click()} />
        <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={importJson} />
      </section>

      {notice && (
        <p className={`rounded-lg px-4 py-3 text-sm ${notice.kind === 'error' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{notice.text}</p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Saved in this browser ({store.workspaces.length})
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((w) => {
            const status = STATUS[timetableStatus(w)]
            const isActive = w.id === store.activeId
            const d = w.data
            return (
              <li
                key={w.id}
                className={`flex min-w-0 flex-col rounded-xl border bg-white p-4 shadow-sm ${isActive ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  {editingId === w.id ? (
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={saveRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="min-w-0 flex-1 rounded-md border border-indigo-400 px-2 py-1 text-sm font-semibold outline-none ring-2 ring-indigo-100"
                      aria-label="Timetable name"
                    />
                  ) : (
                    <h3 className="min-w-0 truncate font-semibold" title={w.name}>
                      {w.name}
                    </h3>
                  )}
                  {isActive && <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">Open now</span>}
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-600">{d.settings.collegeName || 'No organisation name'}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {d.sections.length} sections · {d.teachers.length} teachers · {d.rooms.length} rooms · {d.assignments.length} subjects
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${status.className}`}>{status.label}</span>
                  <span className="text-slate-400">Edited {new Date(w.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                  <button onClick={() => onOpen(w.id)} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700">
                    Open
                  </button>
                  <SmallButton onClick={() => startRename(w)}>Rename</SmallButton>
                  <SmallButton onClick={() => onDuplicate(w.id)}>Duplicate</SmallButton>
                  <SmallButton onClick={() => downloadJson(`${fileSlug(w.name)}.json`, w.data)}>Export</SmallButton>
                  <SmallButton danger onClick={() => setConfirmingDeleteId(w.id)}>
                    Delete
                  </SmallButton>
                </div>
                {confirmingDeleteId === w.id && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
                    <p className="font-medium">Delete "{w.name}"?</p>
                    <p className="mt-0.5 text-xs">This cannot be undone. Use Export first if you may need it.</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          setConfirmingDeleteId(null)
                          onDelete(w.id)
                        }}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Yes, delete
                      </button>
                      <button onClick={() => setConfirmingDeleteId(null)} className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <p className="text-xs text-slate-500">
        Timetables are saved in this browser only. To use them on another computer, Export a timetable and Import it there.
      </p>
    </div>
  )
}

function CreateButton({ title, hint, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left shadow-sm transition-colors ${
        primary ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
      }`}
    >
      <p className="font-semibold">+ {title}</p>
      <p className={`mt-0.5 text-xs ${primary ? 'text-indigo-100' : 'text-slate-500'}`}>{hint}</p>
    </button>
  )
}

function SmallButton({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-sm font-medium ${danger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}
    >
      {children}
    </button>
  )
}
