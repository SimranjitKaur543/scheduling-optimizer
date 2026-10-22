// "My timetables": one browser can hold many timetables, each for any organisation.
// A store looks like { activeId, workspaces: [workspace] } and is saved as JSON in localStorage.
// Each workspace keeps its setup data AND its last generated timetable, so results survive a reload.
// Plain functions only (no localStorage here), so they can be tested.

import { checkImportShape, makeBlankCollege, newId } from './setupValidation.js'
import { makeSampleCollege } from './sampleData.js'

export function makeWorkspace(name, data, now = Date.now()) {
  return { id: newId('W'), name, data, result: null, edited: false, createdAt: now, updatedAt: now }
}

/** What a first-time visitor sees: one demo timetable. */
export function initialStore() {
  const w = makeWorkspace('Sample college (demo)', makeSampleCollege())
  return { activeId: w.id, workspaces: [w] }
}

function isWorkspace(w) {
  return w && typeof w.id === 'string' && typeof w.name === 'string' && !checkImportShape(w.data)
}

/**
 * Turn what is in storage back into a store.
 * Tries the current format first, then upgrades the old single-college format, and
 * falls back to a fresh start if both are missing or broken.
 */
export function parseStore(storeText, oldSingleCollegeText) {
  try {
    const s = JSON.parse(storeText)
    if (s && Array.isArray(s.workspaces)) {
      const workspaces = s.workspaces.filter(isWorkspace)
      if (workspaces.length) {
        const activeId = workspaces.some((w) => w.id === s.activeId) ? s.activeId : workspaces[0].id
        return { activeId, workspaces }
      }
    }
  } catch {
    // fall through
  }
  try {
    const old = JSON.parse(oldSingleCollegeText)
    if (old && !checkImportShape(old.data)) {
      const w = makeWorkspace(old.data.settings.collegeName || 'My timetable', old.data)
      w.edited = !!old.edited
      return { activeId: w.id, workspaces: [w] }
    }
  } catch {
    // fall through
  }
  return initialStore()
}

/** A full, independent copy (editing the copy never changes the original). */
export function duplicateWorkspace(w, now = Date.now()) {
  return {
    ...makeWorkspace(`${w.name} (copy)`, structuredClone(w.data), now),
    result: w.result ? structuredClone(w.result) : null,
    edited: w.edited,
  }
}

/** Remove a timetable. If it was the last one, start a blank one so the app always has something open. */
export function removeWorkspace(store, id) {
  const workspaces = store.workspaces.filter((w) => w.id !== id)
  if (!workspaces.length) {
    const w = makeWorkspace('My timetable', makeBlankCollege())
    return { activeId: w.id, workspaces: [w] }
  }
  return { activeId: store.activeId === id ? workspaces[0].id : store.activeId, workspaces }
}

/** 'none' | 'complete' | 'partial', for the status chip on each card. */
export function timetableStatus(w) {
  if (!w.result) return 'none'
  return w.result.unplaced?.length ? 'partial' : 'complete'
}
