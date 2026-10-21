import { describe, it, expect } from 'vitest'
import { checkImportShape, makeBlankCollege, validateSetup } from './setupValidation.js'
import { makeImpossibleCollege, makeSampleCollege } from './sampleData.js'
import { tinyCollege } from './testFixtures.js'

describe('setup validation', () => {
  it('finds no typing errors in the sample, impossible and blank colleges', () => {
    expect(validateSetup(makeSampleCollege()).count).toBe(0)
    expect(validateSetup(makeImpossibleCollege()).count).toBe(0)
    expect(validateSetup(makeBlankCollege()).count).toBe(0)
  })

  it('flags empty and duplicate names', () => {
    const data = tinyCollege()
    data.rooms[1].name = 'room 1' // same as "Room 1", ignoring case
    data.teachers[0].name = '  '
    const v = validateSetup(data)
    expect(v.rooms.LB.name).toMatch(/already used/)
    expect(v.teachers.T1.name).toMatch(/required/)
  })

  it('flags bad numbers', () => {
    const data = tinyCollege()
    data.rooms[0].capacity = ''
    data.sections[0].size = 0
    data.assignments[0].hoursPerWeek = 99
    const v = validateSetup(data)
    expect(v.rooms.L1.capacity).toBeDefined()
    expect(v.sections.S1.size).toBeDefined()
    expect(v.assignments.A1.hoursPerWeek).toMatch(/1 to 8/)
  })

  it('flags lab hours that are not a multiple of the lab length', () => {
    const data = tinyCollege()
    data.assignments[2].hoursPerWeek = 3
    expect(validateSetup(data).assignments.A3.hoursPerWeek).toMatch(/multiple of the lab length/)
  })

  it('flags a subject pointing at a deleted teacher or section', () => {
    const data = tinyCollege()
    data.teachers = data.teachers.filter((t) => t.id !== 'T1')
    data.sections = data.sections.filter((s) => s.id !== 'S2')
    const v = validateSetup(data)
    expect(v.assignments.A1.teacherId).toBeDefined()
    expect(v.assignments.A2.sectionId).toBeDefined()
  })

  it('rejects import files with the wrong shape', () => {
    expect(checkImportShape(makeSampleCollege())).toBeNull()
    expect(checkImportShape({ hello: 1 })).toMatch(/settings/)
    expect(checkImportShape({ settings: { days: [] }, rooms: [] })).toMatch(/teachers/)
  })
})
