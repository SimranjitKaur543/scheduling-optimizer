import { describe, it, expect } from 'vitest'
import { CURRENT_SCHEMA_VERSION, migrateCollegeData } from './migrate.js'
import { solve } from './solver.js'
import { validateTimetable } from './validator.js'
import { makeSampleCollege } from './sampleData.js'
import { tinyCollege, tinyCollegeV1, tinyValidResult } from './testFixtures.js'

// The sample college as the old (version 1) app saved it: one lunch break after period 4.
function sampleCollegeV1() {
  const data = makeSampleCollege()
  delete data.schemaVersion
  const { startTime, periodMinutes, breaks, ...rest } = data.settings
  data.settings = { ...rest, breakAfterPeriod: 4 }
  return data
}

describe('migration v1 → v2', () => {
  it('turns the old lunch setting into a 40-minute Lunch break with default times', () => {
    const { data, warnings } = migrateCollegeData(tinyCollegeV1())
    expect(data.schemaVersion).toBe(2)
    expect(data.settings.breaks).toEqual([{ id: 'B1', name: 'Lunch', afterPeriod: 2, minutes: 40 }])
    expect(data.settings.startTime).toBe('09:00')
    expect(data.settings.periodMinutes).toBe(50)
    expect('breakAfterPeriod' in data.settings).toBe(false)
    expect(warnings.join(' ')).toMatch(/40 minutes/)
    expect(warnings.join(' ')).toMatch(/9:00 am with 50-minute periods/)
  })

  it('never changes the data it was given', () => {
    const old = tinyCollegeV1()
    const copy = structuredClone(old)
    migrateCollegeData(old)
    expect(old).toEqual(copy)
  })

  it('keeps everything else, including fields it does not know', () => {
    const old = tinyCollegeV1()
    old.settings.collegeName = 'GNDEC'
    old.customNote = 'kept'
    old.teachers[0].phone = '12345'
    const { data } = migrateCollegeData(old)
    expect(data.settings.collegeName).toBe('GNDEC')
    expect(data.customNote).toBe('kept')
    expect(data.teachers[0].phone).toBe('12345')
    expect(data.assignments).toEqual(old.assignments)
  })

  it('adds no break when the old one was "no break" (0 or missing)', () => {
    for (const value of [0, undefined]) {
      const old = tinyCollegeV1()
      old.settings.breakAfterPeriod = value
      const { data, warnings } = migrateCollegeData(old)
      expect(data.settings.breaks).toEqual([])
      expect(warnings.join(' ')).not.toMatch(/did not fit/)
    }
  })

  it('keeps an old break that does not fit, and warns instead of guessing', () => {
    const old = tinyCollegeV1()
    old.settings.breakAfterPeriod = 9 // the day only has 4 periods
    const { data, warnings } = migrateCollegeData(old)
    expect(data.settings.breaks).toEqual([])
    expect(data.settings.legacyBreakAfterPeriod).toBe(9)
    expect(warnings.join(' ')).toMatch(/did not fit a 4-period day/)
  })

  it('leaves current data alone (running it twice changes nothing)', () => {
    const once = migrateCollegeData(tinyCollegeV1()).data
    const twice = migrateCollegeData(once)
    expect(twice.data).toEqual(once)
    expect(twice.warnings).toEqual([])
    expect(migrateCollegeData(tinyCollege()).data).toEqual(tinyCollege())
  })

  it('refuses data from a newer version instead of half-reading it', () => {
    const future = { ...tinyCollege(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 }
    expect(migrateCollegeData(future).error).toMatch(/newer version/)
    expect(migrateCollegeData(null).error).toBeDefined()
    expect(migrateCollegeData({ hello: 1 }).error).toBeDefined()
  })

  it('an old saved timetable is still valid after migration', () => {
    const { data } = migrateCollegeData(tinyCollegeV1())
    expect(validateTimetable(data, tinyValidResult()).valid).toBe(true)
  })

  it('gives IDENTICAL timetables before and after migration (same random seed)', () => {
    const old = sampleCollegeV1()
    const { data } = migrateCollegeData(old)
    const before = solve(old, { seed: 42, maxAttempts: 10, timeLimitMs: 10_000 })
    const after = solve(data, { seed: 42, maxAttempts: 10, timeLimitMs: 10_000 })
    expect(after.placements).toEqual(before.placements)
    expect(after.unplaced).toEqual(before.unplaced)
    expect(after.score).toBe(before.score)
  })
})
