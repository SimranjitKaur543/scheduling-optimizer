import { describe, it, expect } from 'vitest'
import { solve, mulberry32 } from './solver.js'
import { validateTimetable } from './validator.js'
import { makeImpossibleCollege, makeSampleCollege } from './sampleData.js'
import { randomCollege, tinyCollege } from './testFixtures.js'

// Fixed seeds and attempt limits keep the tests fast and repeatable.
const run = (data, seed = 1, maxAttempts = 20) => solve(data, { seed, maxAttempts, timeLimitMs: 10_000 })

describe('solver', () => {
  it('schedules the whole sample college with no clashes', () => {
    const data = makeSampleCollege()
    const result = run(data)
    const report = validateTimetable(data, result)
    expect(report.errors).toEqual([])
    expect(result.unplaced).toEqual([])
  })

  it('never books a teacher in two sections at once', () => {
    const data = makeSampleCollege()
    const result = run(data, 7)
    const teacherOf = Object.fromEntries(data.assignments.map((a) => [a.id, a.teacherId]))
    const seen = new Set()
    for (const p of result.placements) {
      for (let period = p.startPeriod; period < p.startPeriod + p.length; period++) {
        const key = `${teacherOf[p.assignmentId]}|${p.day}|${period}`
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    }
  })

  it('gives a teacher unavailable on Monday no Monday classes', () => {
    const data = tinyCollege()
    data.teachers[0].unavailable = [0, 1, 2, 3].map((period) => ({ day: 0, period }))
    data.assignments[0].hoursPerWeek = 1
    data.assignments[1].hoursPerWeek = 1
    const result = run(data)
    const t1Assignments = new Set(['A1', 'A2'])
    expect(result.placements.filter((p) => t1Assignments.has(p.assignmentId) && p.day === 0)).toEqual([])
    expect(result.unplaced).toEqual([])
    expect(validateTimetable(data, result).valid).toBe(true)
  })

  it('shares one lab between three sections without overlap', () => {
    const data = tinyCollege()
    data.sections.push({ id: 'S3', name: 'Section 3', department: 'X', size: 30 })
    data.teachers.push({ id: 'T3', name: 'Teacher Three', unavailable: [] })
    data.assignments.push(
      { id: 'A4', sectionId: 'S2', subject: 'Physics Lab', teacherId: 'T3', hoursPerWeek: 2, kind: 'lab', labLength: 2 },
      { id: 'A5', sectionId: 'S3', subject: 'Physics Lab', teacherId: 'T1', hoursPerWeek: 2, kind: 'lab', labLength: 2 },
    )
    const result = run(data)
    expect(validateTimetable(data, result).errors).toEqual([])
    expect(result.unplaced).toEqual([])
    expect(result.placements.filter((p) => p.roomId === 'LB')).toHaveLength(3)
  })

  it('never lets a lab cross the break or split up', () => {
    const data = makeSampleCollege()
    const result = run(data, 3)
    const { breakAfterPeriod } = data.settings
    for (const p of result.placements.filter((x) => x.length > 1)) {
      const crosses = p.startPeriod < breakAfterPeriod && p.startPeriod + p.length > breakAfterPeriod
      expect(crosses).toBe(false)
    }
  })

  it('reports what it cannot place, with reasons, and keeps the rest clash-free', () => {
    const data = makeImpossibleCollege()
    const result = run(data)
    const report = validateTimetable(data, result)
    expect(report.errors).toEqual([])
    expect(result.unplaced.length).toBeGreaterThan(0)
    for (const u of result.unplaced) expect(u.reason).toMatch(/\w/)
    expect(result.placements.length).toBeGreaterThan(0)
  })

  it('restarts never make the result worse than the first attempt', () => {
    const data = makeSampleCollege()
    const result = run(data, 11, 30)
    expect(result.stats.attempts).toBe(30)
    expect(result.score).toBeLessThanOrEqual(result.stats.firstScore)
  })

  it('stress test: 50 random colleges never produce a clash', () => {
    const rng = mulberry32(2026)
    let fullyPlaced = 0
    for (let i = 0; i < 50; i++) {
      const data = randomCollege(rng)
      const result = run(data, i, 5)
      const report = validateTimetable(data, result)
      expect(report.errors, `college #${i}`).toEqual([])
      if (!result.unplaced.length) fullyPlaced++
    }
    // Sanity check that the generator makes plenty of solvable colleges too.
    expect(fullyPlaced).toBeGreaterThan(10)
  })
})
