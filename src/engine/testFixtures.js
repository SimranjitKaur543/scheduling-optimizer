// A tiny college used by the tests: 2 days × 4 periods, break after period 2.

export function tinyCollege() {
  return {
    settings: { days: ['Mon', 'Tue'], periodsPerDay: 4, breakAfterPeriod: 2 },
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
