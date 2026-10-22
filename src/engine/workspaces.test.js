import { describe, it, expect } from 'vitest'
import { duplicateWorkspace, initialStore, makeWorkspace, parseStore, prepareImport, removeWorkspace, timetableStatus } from './workspaces.js'
import { makeSampleCollege } from './sampleData.js'
import { tinyCollege, tinyCollegeV1, tinyValidResult } from './testFixtures.js'

describe('workspaces (My timetables)', () => {
  it('starts a first-time visitor with one demo timetable', () => {
    const store = parseStore(null, null)
    expect(store.workspaces).toHaveLength(1)
    expect(store.activeId).toBe(store.workspaces[0].id)
    expect(store.workspaces[0].data.sections.length).toBeGreaterThan(0)
  })

  it('reads back a saved store, including the generated timetable', () => {
    const a = makeWorkspace('College A', tinyCollege())
    a.result = tinyValidResult()
    const b = makeWorkspace('College B', makeSampleCollege())
    const text = JSON.stringify({ activeId: b.id, workspaces: [a, b] })
    const store = parseStore(text, null)
    expect(store.workspaces.map((w) => w.name)).toEqual(['College A', 'College B'])
    expect(store.activeId).toBe(b.id)
    expect(store.workspaces[0].result.placements).toHaveLength(5)
  })

  it('upgrades data saved by the old one-college version', () => {
    const old = JSON.stringify({ data: tinyCollegeV1(), edited: true })
    const store = parseStore(null, old)
    expect(store.workspaces).toHaveLength(1)
    expect(store.workspaces[0].data.sections).toHaveLength(2)
    expect(store.workspaces[0].data.settings.breaks).toHaveLength(1)
    expect(store.workspaces[0].edited).toBe(true)
  })

  it('survives broken storage and keeps unreadable timetables aside instead of deleting them', () => {
    expect(parseStore('{not json', 'also bad').workspaces).toHaveLength(1)
    const good = makeWorkspace('Good', tinyCollege())
    const broken = { id: 'x', name: 'Broken' }
    const future = makeWorkspace('From a newer app', { ...tinyCollege(), schemaVersion: 99 })
    const store = parseStore(JSON.stringify({ activeId: 'missing', workspaces: [broken, good, future] }), null)
    expect(store.workspaces.map((w) => w.name)).toEqual(['Good'])
    expect(store.activeId).toBe(good.id)
    expect(store.unreadable.map((w) => w.name)).toEqual(['Broken', 'From a newer app'])
    // Kept on the next load too.
    expect(parseStore(JSON.stringify(store), null).unreadable).toHaveLength(2)
  })

  it('upgrades old timetables saved in My timetables, with notes for the user', () => {
    const oldWorkspace = makeWorkspace('Old one', tinyCollegeV1())
    oldWorkspace.result = tinyValidResult()
    const store = parseStore(JSON.stringify({ activeId: oldWorkspace.id, workspaces: [oldWorkspace] }), null)
    const w = store.workspaces[0]
    expect(w.data.schemaVersion).toBe(2)
    expect(w.data.settings.breaks[0]).toMatchObject({ name: 'Lunch', afterPeriod: 2 })
    expect(w.result.placements).toHaveLength(5) // the saved timetable is kept
    expect(w.migrationNotes.join(' ')).toMatch(/40 minutes/)
  })

  it('imports old and new JSON files, and refuses bad or newer ones with a reason', () => {
    const fromOld = prepareImport(tinyCollegeV1())
    expect(fromOld.data.settings.breaks[0]).toMatchObject({ name: 'Lunch', afterPeriod: 2, minutes: 40 })
    expect(fromOld.warnings.length).toBeGreaterThan(0)
    const fromNew = prepareImport(tinyCollege())
    expect(fromNew.data).toEqual(tinyCollege())
    expect(fromNew.warnings).toEqual([])
    expect(prepareImport({ hello: 1 }).error).toMatch(/settings/)
    expect(prepareImport({ ...tinyCollege(), schemaVersion: 99 }).error).toMatch(/newer version/)
  })

  it('duplicates into a fully independent copy', () => {
    const original = makeWorkspace('Odd Sem', tinyCollege())
    original.result = tinyValidResult()
    const copy = duplicateWorkspace(original)
    copy.data.rooms[0].name = 'Changed'
    copy.result.placements.pop()
    expect(copy.name).toBe('Odd Sem (copy)')
    expect(copy.id).not.toBe(original.id)
    expect(original.data.rooms[0].name).toBe('Room 1')
    expect(original.result.placements).toHaveLength(5)
  })

  it('removing the open timetable opens another; removing the last starts a blank one', () => {
    const a = makeWorkspace('A', tinyCollege())
    const b = makeWorkspace('B', tinyCollege())
    const afterA = removeWorkspace({ activeId: a.id, workspaces: [a, b] }, a.id)
    expect(afterA.activeId).toBe(b.id)
    const empty = removeWorkspace(afterA, b.id)
    expect(empty.workspaces).toHaveLength(1)
    expect(empty.workspaces[0].data.sections).toEqual([])
  })

  it('reports whether a timetable is generated, complete or partial', () => {
    const w = initialStore().workspaces[0]
    expect(timetableStatus(w)).toBe('none')
    expect(timetableStatus({ ...w, result: { placements: [], unplaced: [] } })).toBe('complete')
    expect(timetableStatus({ ...w, result: { placements: [], unplaced: [{ length: 1 }] } })).toBe('partial')
  })
})
