import { describe, it, expect } from 'vitest'
import { breakPoints, daySchedule, formatRange, formatTime, parseTime, validBreaks } from './time.js'
import { blockIsInvalid, blocksPerDay, stretchesPerDay } from './model.js'

const settings = (breaks, extra = {}) => ({ days: ['Mon'], periodsPerDay: 7, startTime: '09:00', periodMinutes: 50, breaks, ...extra })
const TEA = { id: 'B1', name: 'Tea break', afterPeriod: 2, minutes: 15 }
const LUNCH = { id: 'B2', name: 'Lunch', afterPeriod: 4, minutes: 40 }

describe('clock times', () => {
  it('reads and writes times', () => {
    expect(parseTime('09:30')).toBe(570)
    expect(parseTime('9:05')).toBe(545)
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('nine')).toBeNull()
    expect(formatTime(570)).toBe('9:30 am')
    expect(formatTime(720)).toBe('12:00 pm')
    expect(formatTime(780)).toBe('1:00 pm')
    expect(formatTime(0)).toBe('12:00 am')
    expect(formatRange(540, 590)).toBe('9:00–9:50 am')
    expect(formatRange(710, 760)).toBe('11:50 am–12:40 pm')
  })

  it('works out period times with no breaks', () => {
    const d = daySchedule(settings([]))
    expect(d.periods[0]).toEqual({ start: 540, end: 590 })
    expect(d.periods[6]).toEqual({ start: 840, end: 890 })
    expect(d.dayEnd).toBe(890) // 2:50 pm
  })

  it('pushes later periods back by each break', () => {
    const d = daySchedule(settings([LUNCH, TEA])) // given out of order on purpose
    expect(d.periods[2].start).toBe(540 + 100 + 15) // after tea: 10:55
    expect(d.breaks.map((b) => [b.name, formatTime(b.start), formatTime(b.end)])).toEqual([
      ['Tea break', '10:40 am', '10:55 am'],
      ['Lunch', '12:35 pm', '1:15 pm'],
    ])
    expect(formatTime(d.periods[4].start)).toBe('1:15 pm')
    expect(formatTime(d.dayEnd)).toBe('3:45 pm')
  })

  it('uses 09:00 and 50 minutes when times are missing', () => {
    const d = daySchedule({ days: ['Mon'], periodsPerDay: 2, breaks: [] })
    expect(d.periods).toEqual([{ start: 540, end: 590 }, { start: 590, end: 640 }])
  })
})

describe('breaks', () => {
  it('ignores breaks that do not fit the day', () => {
    const s = settings([TEA, { id: 'x', name: 'Bad', afterPeriod: 7, minutes: 10 }, { id: 'y', name: 'Bad', afterPeriod: 0, minutes: 10 }])
    expect(validBreaks(s).map((b) => b.id)).toEqual(['B1'])
    expect(breakPoints(s)).toEqual([2])
  })

  it('reads old data that only has breakAfterPeriod as one lunch break', () => {
    const old = { days: ['Mon'], periodsPerDay: 7, breakAfterPeriod: 4 }
    expect(breakPoints(old)).toEqual([4])
    expect(validBreaks(old)[0]).toMatchObject({ name: 'Lunch', minutes: 40 })
  })

  it('never lets a block cross any break', () => {
    const s = settings([TEA, LUNCH])
    expect(blockIsInvalid(s, 0, 2)).toBe(false) // P1-P2
    expect(blockIsInvalid(s, 1, 2)).toBe(true) // P2-P3 crosses tea
    expect(blockIsInvalid(s, 2, 2)).toBe(false) // P3-P4
    expect(blockIsInvalid(s, 3, 2)).toBe(true) // P4-P5 crosses lunch
    expect(blockIsInvalid(s, 4, 3)).toBe(false) // P5-P7
    expect(blockIsInvalid(s, 5, 3)).toBe(true) // past the end of the day
  })

  it('with one break, gives exactly the same answers as the old single-break formula', () => {
    // The check used before multiple breaks existed (copied from the old model.js).
    function oldBlockIsInvalid(s, start, length) {
      if (start < 0 || start + length > s.periodsPerDay) return true
      const b = s.breakAfterPeriod
      if (!b || b <= 0 || b >= s.periodsPerDay) return false
      return start < b && start + length > b
    }
    for (let periodsPerDay = 1; periodsPerDay <= 9; periodsPerDay++) {
      for (let b = 0; b <= periodsPerDay; b++) {
        const oldSettings = { periodsPerDay, breakAfterPeriod: b }
        const newSettings = { periodsPerDay, breaks: b ? [{ id: 'L', name: 'Lunch', afterPeriod: b, minutes: 40 }] : [] }
        for (let start = -1; start <= periodsPerDay; start++) {
          for (let length = 1; length <= 4; length++) {
            expect(blockIsInvalid(newSettings, start, length)).toBe(oldBlockIsInvalid(oldSettings, start, length))
          }
        }
      }
    }
  })

  it('counts lab slots per day between breaks', () => {
    const s = settings([TEA, LUNCH])
    expect(stretchesPerDay(s)).toEqual([2, 2, 3])
    expect(blocksPerDay(s, 2)).toBe(3)
    expect(blocksPerDay(s, 3)).toBe(1)
    expect(blocksPerDay(s, 4)).toBe(0)
    expect(blocksPerDay(settings([]), 3)).toBe(2)
  })
})
