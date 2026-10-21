import { describe, it, expect } from 'vitest'
import { precheck } from './precheck.js'
import { tinyCollege } from './testFixtures.js'
import { makeImpossibleCollege, makeSampleCollege } from './sampleData.js'

const errorText = (report) => report.issues.filter((i) => i.severity === 'error').map((i) => i.message).join('\n')

describe('precheck', () => {
  it('passes the sample college', () => {
    const report = precheck(makeSampleCollege())
    expect(errorText(report)).toBe('')
    expect(report.ok).toBe(true)
  })

  it('passes the tiny test college', () => {
    expect(precheck(tinyCollege()).ok).toBe(true)
  })

  it('flags a teacher with more hours than available periods', () => {
    const data = tinyCollege()
    // T1 teaches 4 periods but is unavailable for all of Monday (4 of 8 periods) and Tue period 1.
    data.teachers[0].unavailable = [0, 1, 2, 3].map((p) => ({ day: 0, period: p })).concat([{ day: 1, period: 0 }])
    const report = precheck(data)
    expect(report.ok).toBe(false)
    expect(errorText(report)).toMatch(/Teacher One must teach 4 periods but is only available for 3/)
  })

  it('flags a section that needs more periods than the week has', () => {
    const data = tinyCollege()
    data.assignments[0].hoursPerWeek = 9 // week has 8 periods
    expect(errorText(precheck(data))).toMatch(/Section 1 needs 11 periods but the week only has 8/)
  })

  it('flags a section too big for every room', () => {
    const data = tinyCollege()
    data.sections[1].size = 100
    expect(errorText(precheck(data))).toMatch(/Section 2 has 100 students but the biggest lecture room holds 40/)
  })

  it('flags lab demand greater than lab capacity', () => {
    const data = tinyCollege()
    // 2 days × 2 two-period blocks = 4 lab blocks; ask for 6 lab sessions.
    data.assignments[2].hoursPerWeek = 6
    data.assignments.push({ id: 'A4', sectionId: 'S2', subject: 'Chem Lab', teacherId: 'T1', hoursPerWeek: 6, kind: 'lab', labLength: 2 })
    expect(errorText(precheck(data))).toMatch(/6 lab sessions of 2 periods, but the lab rooms only have 4/)
  })

  it('flags lab classes when there is no lab room', () => {
    const data = tinyCollege()
    data.rooms = data.rooms.filter((r) => r.type !== 'lab')
    expect(errorText(precheck(data))).toMatch(/no lab rooms/)
  })

  it('explains every problem in the impossible scenario, each with a fix', () => {
    const report = precheck(makeImpossibleCollege())
    const text = errorText(report)
    expect(report.ok).toBe(false)
    expect(text).toMatch(/Prof\. Ritu Bansal must teach 18 periods but is only available for 14/)
    expect(text).toMatch(/ME 3rd Sem B has 90 students but the biggest lecture room holds 80/)
    expect(text).toMatch(/lab sessions of 3 periods/)
    expect(report.issues.every((i) => i.fix)).toBe(true)
  })
})
