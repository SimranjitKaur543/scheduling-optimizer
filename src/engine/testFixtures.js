// A tiny college used by the tests: 2 days × 4 periods, lunch break after period 2.
// Also the same college in the OLD (version 1) format, and a random college generator for the stress test.

export function tinyCollege() {
  return {
    schemaVersion: 2,
    settings: { days: ['Mon', 'Tue'], periodsPerDay: 4, startTime: '09:00', periodMinutes: 50, breaks: [{ id: 'B1', name: 'Lunch', afterPeriod: 2, minutes: 40 }] },
    rooms: [
      { id: 'L1', name: 'Room 1', type: 'lecture', capacity: 40 },
      { id: 'LB', name: 'Lab', type: 'lab', capacity: 40 },
    ],
    teachers: [
      { id: 'T1', name: 'Teacher One', unavailable: [] },
      { id: 'T2', name: 'Teacher Two', unavailable: [] },
    ],
    sections: [
      { id: 'S1', name: 'Section 1', department: 'X', size: 30 },
      { id: 'S2', name: 'Section 2', department: 'X', size: 30 },
    ],
    assignments: [
      { id: 'A1', sectionId: 'S1', subject: 'Maths', teacherId: 'T1', hoursPerWeek: 2, kind: 'lecture' },
      { id: 'A2', sectionId: 'S2', subject: 'Maths', teacherId: 'T1', hoursPerWeek: 2, kind: 'lecture' },
      { id: 'A3', sectionId: 'S1', subject: 'Physics Lab', teacherId: 'T2', hoursPerWeek: 2, kind: 'lab', labLength: 2 },
    ],
  }
}

/** A hand-made, correct timetable for tinyCollege(). */
export function tinyValidResult() {
  return {
    placements: [
      { assignmentId: 'A1', day: 0, startPeriod: 0, length: 1, roomId: 'L1' },
      { assignmentId: 'A1', day: 1, startPeriod: 0, length: 1, roomId: 'L1' },
      { assignmentId: 'A2', day: 0, startPeriod: 1, length: 1, roomId: 'L1' },
      { assignmentId: 'A2', day: 1, startPeriod: 1, length: 1, roomId: 'L1' },
      { assignmentId: 'A3', day: 0, startPeriod: 2, length: 2, roomId: 'LB' },
    ],
    unplaced: [],
  }
}

/**
 * A random college for the stress test. Some will be easy, some tight, some impossible.
 * `rng` is a function returning numbers in [0, 1).
 */
export function randomCollege(rng) {
  const int = (min, max) => min + Math.floor(rng() * (max - min + 1))
  const pick = (list) => list[Math.floor(rng() * list.length)]
  const times = (n, make) => Array.from({ length: n }, (_, i) => make(i))

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].slice(0, int(4, 6))
  const periodsPerDay = int(5, 8)
  // 0 to 3 breaks at different positions, with random lengths.
  const breakSpots = [...new Set(times(int(0, 3), () => int(1, periodsPerDay - 1)))]
  const settings = {
    days,
    periodsPerDay,
    startTime: pick(['08:30', '09:00', '09:15']),
    periodMinutes: pick([40, 45, 50, 60]),
    breaks: breakSpots.map((afterPeriod, i) => ({ id: `B${i}`, name: `Break ${i + 1}`, afterPeriod, minutes: pick([10, 15, 30, 45]) })),
  }

  const rooms = [
    ...times(int(2, 6), (i) => ({ id: `R${i}`, name: `Room ${i}`, type: 'lecture', capacity: int(30, 80) })),
    ...times(int(0, 2), (i) => ({ id: `LAB${i}`, name: `Lab ${i}`, type: 'lab', capacity: int(30, 80) })),
  ]

  const teachers = times(int(3, 10), (i) => ({
    id: `T${i}`,
    name: `Teacher ${i}`,
    unavailable: times(int(0, 6), () => ({ day: int(0, days.length - 1), period: int(0, periodsPerDay - 1) })),
    ...(rng() < 0.3 ? { maxPerDay: int(2, 5) } : {}),
  }))

  const sections = times(int(1, 6), (i) => ({ id: `S${i}`, name: `Section ${i}`, department: pick(['A', 'B', 'C']), size: int(25, 75) }))

  const assignments = []
  for (const s of sections) {
    const subjectCount = int(2, 6)
    for (let k = 0; k < subjectCount; k++) {
      const isLab = rng() < 0.25
      const labLength = int(2, 3)
      assignments.push({
        id: `A${assignments.length}`,
        sectionId: s.id,
        subject: `Subject ${k}`,
        teacherId: pick(teachers).id,
        hoursPerWeek: isLab ? labLength * int(1, 2) : int(1, 5),
        kind: isLab ? 'lab' : 'lecture',
        ...(isLab ? { labLength } : {}),
      })
    }
  }
  return { schemaVersion: 2, settings, rooms, teachers, sections, assignments }
}

/** tinyCollege() as the version-1 app saved it: no schemaVersion, one break as breakAfterPeriod. */
export function tinyCollegeV1() {
  const data = tinyCollege()
  delete data.schemaVersion
  data.settings = { days: ['Mon', 'Tue'], periodsPerDay: 4, breakAfterPeriod: 2 }
  return data
}
