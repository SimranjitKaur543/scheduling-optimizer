// "My timetables": one browser can hold many timetables, each for any organisation.
// A store looks like { activeId, workspaces: [workspace] } and is saved as JSON in localStorage.
// Each workspace keeps its setup data AND its last generated timetable, so results survive a reload.
// Plain functions only (no localStorage here), so they can be tested.

import { checkImportShape, makeBlankCollege, newId } from './setupValidation.js'
import { makeSampleCollege } from './sampleData.js'
import { migrateCollegeData } from './migrate.js'

/** migrationNotes: plain-English messages from upgrading old data, shown once on the Dashboard. */
export function makeWorkspace(name, data, now = Date.now(), migrationNotes = []) {
  return { id: newId('W'), name, data, result: null, edited: false, createdAt: now, updatedAt: now, migrationNotes }
}

/** What a first-time visitor sees: one demo timetable. */
export function initialStore() {
  const w = makeWorkspace('Sample college (demo)', makeSampleCollege())
  return { activeId: w.id, workspaces: [w], unreadable: [] }
}

/**
 * Upgrade one saved timetable to the current data format.
 * Returns the upgraded workspace, or null if it cannot be read (it is then kept aside, never deleted).
 */
function upgradeWorkspace(w) {
  if (!w || typeof w.id !== 'string' || typeof w.name !== 'string' || checkImportShape(w.data)) return null
  const migrated = migrateCollegeData(w.data)
  if (migrated.error) return null
  return { ...w, data: migrated.data, migrationNotes: [...(w.migrationNotes || []), ...migrated.warnings] }
}

/**
 * Turn what is in storage back into a store.
 * Tries the current format first, then upgrades the old single-college format, and
 * falls back to a fresh start if both are missing or broken.
 * Saved timetables that cannot be read (damaged, or from a newer app version) go into
 * `unreadable` so they stay in storage and the user is told, instead of being deleted.
 */
export function parseStore(storeText, oldSingleCollegeText) {
  try {
    const s = JSON.parse(storeText)
    if (s && Array.isArray(s.workspaces)) {
      const workspaces = []
      const unreadable = [...(Array.isArray(s.unreadable) ? s.unreadable : [])]
      for (const raw of s.workspaces) {
        const w = upgradeWorkspace(raw)
        if (w) workspaces.push(w)
        else unreadable.push(raw)
      }
      if (workspaces.length) {
        const activeId = workspaces.some((w) => w.id === s.activeId) ? s.activeId : workspaces[0].id
        return { activeId, workspaces, unreadable }
      }
      if (unreadable.length) return { ...initialStore(), unreadable }
    }
  } catch {
    // fall through
  }
  try {
    const old = JSON.parse(oldSingleCollegeText)
    const migrated = old && !checkImportShape(old.data) ? migrateCollegeData(old.data) : null
    if (migrated?.data) {
      const w = makeWorkspace(migrated.data.settings.collegeName || 'My timetable', migrated.data, Date.now(), migrated.warnings)
      w.edited = !!old.edited
      return { activeId: w.id, workspaces: [w], unreadable: [] }
    }
  } catch {
    // fall through
  }
  return initialStore()
}

/**
 * Check and upgrade an imported JSON file.
 * Returns { data, warnings } ready for a new timetable, or { error } with a plain-English reason.
 */
export function prepareImport(json) {
  const problem = checkImportShape(json)
  if (problem) return { error: problem }
  return migrateCollegeData(json)
}

/** A full, independent copy (editing the copy never changes the original). */
export function duplicateWorkspace(w, now = Date.now()) {
  return {
    ...makeWorkspace(`${w.name} (copy)`, structuredClone(w.data), now), // the copy starts with no migration notes
    result: w.result ? structuredClone(w.result) : null,
    edited: w.edited,
  }
}

/** Remove a timetable. If it was the last one, start a blank one so the app always has something open. */
export function removeWorkspace(store, id) {
  const workspaces = store.workspaces.filter((w) => w.id !== id)
  if (!workspaces.length) {
    const w = makeWorkspace('My timetable', makeBlankCollege())
    return { ...store, activeId: w.id, workspaces: [w] }
  }
  return { ...store, activeId: store.activeId === id ? workspaces[0].id : store.activeId, workspaces }
}

/** 'none' | 'complete' | 'partial', for the status chip on each card. */
export function timetableStatus(w) {
  if (!w.result) return 'none'
  return w.result.unplaced?.length ? 'partial' : 'complete'
}
