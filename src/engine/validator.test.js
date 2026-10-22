import { describe, it, expect } from 'vitest'
import { validateTimetable } from './validator.js'
import { tinyCollege, tinyValidResult } from './testFixtures.js'

// Helper: the set of rules that failed.
const failedRules = (report) => new Set(report.errors.map((e) => e.rule))

describe('validator', () => {
  it('accepts a correct timetable', () => {
    const report = validateTimetable(tinyCollege(), tinyValidResult())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
    expect(report.checks.every((c) => c.passed)).toBe(true)
  })

  it('catches a teacher in two places at once', () => {
    const data = tinyCollege()
    data.rooms.push({ id: 'L2', name: 'Room 2', type: 'lecture', capacity: 40 })
    const result = tinyValidResult()
    // Move S2's Maths to the same slot as S1's Maths, in another room: same teacher T1.
    result.placements[2] = { assignmentId: 'A2', day: 0, startPeriod: 0, length: 1, roomId: 'L2' }
    const report = validateTimetable(data, result)
    expect(report.valid).toBe(false)
    expect(failedRules(report)).toContain('teacher')
  })

  it('catches a double-booked room', () => {
    const data = tinyCollege()
    data.assignments[1].teacherId = 'T2' // different teacher, so only the room clashes
    const result = tinyValidResult()
    result.placements[2] = { assignmentId: 'A2', day: 0, startPeriod: 0, length: 1, roomId: 'L1' }
    const report = validateTimetable(data, result)
    expect(failedRules(report)).toEqual(new Set(['room']))
  })

  it('catches a section with two classes at once', () => {
    const result = tinyValidResult()
    // S1's lab moved on top of S1's Maths on Monday period 1 (lab rooms differ, teachers differ).
    result.placements[4] = { assignmentId: 'A3', day: 1, startPeriod: 0, length: 2, roomId: 'LB' }
    const report = validateTimetable(tinyCollege(), result)
    expect(failedRules(report)).toContain('section')
  })

  it('catches a lab placed in a lecture room', () => {
    const result = tinyValidResult()
    result.placements[4] = { assignmentId: 'A3', day: 1, startPeriod: 2, length: 2, roomId: 'L1' }
    expect(failedRules(validateTimetable(tinyCollege(), result))).toContain('roomType')
  })

  it('catches a room that is too small', () => {
    const data = tinyCollege()
    data.sections[0].size = 45
    expect(failedRules(validateTimetable(data, tinyValidResult()))).toContain('capacity')
  })

  it('catches a teacher booked while unavailable', () => {
    const data = tinyCollege()
    data.teachers[0].unavailable = [{ day: 0, period: 0 }]
    expect(failedRules(validateTimetable(data, tinyValidResult()))).toEqual(new Set(['availability']))
  })

  it('catches a lab that crosses the break', () => {
    const result = tinyValidResult()
    result.placements[4] = { assignmentId: 'A3', day: 1, startPeriod: 1, length: 2, roomId: 'LB' }
    expect(failedRules(validateTimetable(tinyCollege(), result))).toContain('block')
  })

  it('catches a lab across any one of several breaks, and names that break', () => {
    const data = tinyCollege()
    data.settings.breaks.push({ id: 'B2', name: 'Tea break', afterPeriod: 3, minutes: 15 })
    const result = tinyValidResult()
    // The lab is in periods 3-4, which now straddle the tea break after period 3.
    const report = validateTimetable(data, result)
    expect(failedRules(report)).toEqual(new Set(['block']))
    expect(report.errors[0].message).toMatch(/runs across the Tea break/)
  })

  it('catches missing hours that are not reported as unplaced', () => {
    const result = tinyValidResult()
    result.placements.pop() // drop the lab silently
    expect(failedRules(validateTimetable(tinyCollege(), result))).toEqual(new Set(['complete']))
  })

  it('accepts missing hours when they are honestly reported as unplaced', () => {
    const result = tinyValidResult()
    result.placements.pop()
    result.unplaced.push({ assignmentId: 'A3', length: 2, reason: 'No free lab slot' })
    expect(validateTimetable(tinyCollege(), result).valid).toBe(true)
  })
})
