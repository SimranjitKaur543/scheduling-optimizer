import { describe, it, expect } from 'vitest'
import { findSubstitutes, roomUsage, teacherLoad } from './score.js'
import { timetableToCsv } from './exportCsv.js'
import { tinyCollege, tinyValidResult } from './testFixtures.js'

describe('report analytics', () => {
  it('counts teacher load per day and per week', () => {
    const load = teacherLoad(tinyCollege(), tinyValidResult().placements)
    expect(load.find((t) => t.teacherId === 'T1')).toMatchObject({ perDay: [2, 2], total: 4 })
    expect(load.find((t) => t.teacherId === 'T2')).toMatchObject({ perDay: [2, 0], total: 2 })
  })

  it('counts room usage and the share of the week in use', () => {
    const usage = roomUsage(tinyCollege(), tinyValidResult().placements)
    expect(usage.find((r) => r.roomId === 'L1')).toMatchObject({ perDay: [2, 2], total: 4, share: 0.5 })
    expect(usage.find((r) => r.roomId === 'LB')).toMatchObject({ total: 2, share: 0.25 })
  })

  it('suggests only teachers who are free for the whole class, same-subject teachers first', () => {
    const data = tinyCollege()
    data.teachers.push({ id: 'T3', name: 'Teacher Three', unavailable: [] })
    data.assignments.push({ id: 'A9', sectionId: 'S2', subject: 'Physics Lab', teacherId: 'T3', hoursPerWeek: 2, kind: 'lab', labLength: 2 })
    // T2 (Physics Lab) is absent on Monday; their lab is periods 3-4.
    const [lab] = findSubstitutes(data, tinyValidResult().placements, 'T2', 0)
    expect(lab.subject).toBe('Physics Lab')
    // T1 is free in periods 3-4 on Monday; T3 also teaches Physics Lab, so comes first.
    expect(lab.candidates.map((c) => c.teacherId)).toEqual(['T3', 'T1'])
    expect(lab.candidates[0].sameSubject).toBe(true)
  })

  it('never suggests a teacher who is busy or unavailable', () => {
    const data = tinyCollege()
    data.teachers.push({ id: 'T3', name: 'Teacher Three', unavailable: [{ day: 0, period: 0 }] })
    // T1 is absent Monday; their period-1 class: T2 is free, T3 is unavailable.
    const [first] = findSubstitutes(data, tinyValidResult().placements, 'T1', 0)
    expect(first.candidates.map((c) => c.teacherId)).toEqual(['T2'])
  })
})

describe('CSV export', () => {
  it('writes a header and one sorted row per class, quoting commas', () => {
    const data = tinyCollege()
    data.assignments[0].subject = 'Maths, Part 1'
    const lines = timetableToCsv(data, tinyValidResult().placements).split('\r\n')
    expect(lines[0]).toBe('Section,Day,Period,Subject,Type,Teacher,Room')
    expect(lines).toHaveLength(6)
    expect(lines[1]).toBe('Section 1,Mon,1,"Maths, Part 1",Lecture,Teacher One,Room 1')
    expect(lines[2]).toBe('Section 1,Mon,3-4,Physics Lab,Lab,Teacher Two,Lab')
  })
})
