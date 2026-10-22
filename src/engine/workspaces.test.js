import { describe, it, expect } from 'vitest'
import { duplicateWorkspace, initialStore, makeWorkspace, parseStore, removeWorkspace, timetableStatus } from './workspaces.js'
import { makeSampleCollege } from './sampleData.js'
import { tinyCollege, tinyValidResult } from './testFixtures.js'

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
    const old = JSON.stringify({ data: tinyCollege(), edited: true })
    const store = parseStore(null, old)
    expect(store.workspaces).toHaveLength(1)
    expect(store.workspaces[0].data.sections).toHaveLength(2)
    expect(store.workspaces[0].edited).toBe(true)
  })

  it('survives broken storage and drops broken timetables', () => {
    expect(parseStore('{not json', 'also bad').workspaces).toHaveLength(1)
    const good = makeWorkspace('Good', tinyCollege())
    const store = parseStore(JSON.stringify({ activeId: 'missing', workspaces: [{ id: 'x', name: 'Broken' }, good] }), null)
    expect(store.workspaces.map((w) => w.name)).toEqual(['Good'])
    expect(store.activeId).toBe(good.id)
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
