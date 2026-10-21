// Demo colleges. Both functions return fresh copies, so callers can edit them freely.

const settings = {
  collegeName: 'Government College of Engineering (Demo)',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  periodsPerDay: 7,
  breakAfterPeriod: 4, // lunch break after the 4th period
}

const rooms = [
  { id: 'R101', name: 'Room 101', type: 'lecture', capacity: 60 },
  { id: 'R102', name: 'Room 102', type: 'lecture', capacity: 60 },
  { id: 'R103', name: 'Room 103', type: 'lecture', capacity: 60 },
  { id: 'R201', name: 'Room 201', type: 'lecture', capacity: 70 },
  { id: 'R202', name: 'Room 202', type: 'lecture', capacity: 70 },
  { id: 'SEM', name: 'Seminar Hall', type: 'lecture', capacity: 80 },
  { id: 'R301', name: 'Room 301', type: 'lecture', capacity: 50 },
  { id: 'LAB1', name: 'Computer Lab 1', type: 'lab', capacity: 70 },
  { id: 'LAB2', name: 'Computer Lab 2', type: 'lab', capacity: 70 },
]

const teachers = [
  { id: 'T1', name: 'Dr. Harpreet Singh', unavailable: [] },
  { id: 'T2', name: 'Prof. Neha Sharma', unavailable: [] },
  // Not available on Fridays.
  { id: 'T3', name: 'Dr. Amandeep Kaur', unavailable: allDay(4) },
  { id: 'T4', name: 'Prof. Rajesh Kumar', unavailable: [] },
  { id: 'T5', name: 'Dr. Simran Gill', unavailable: [] },
  { id: 'T6', name: 'Prof. Vikram Mehta', unavailable: [] },
  { id: 'T7', name: 'Dr. Gurpreet Sandhu', unavailable: [] },
  { id: 'T8', name: 'Prof. Anjali Verma', unavailable: [] },
  { id: 'T9', name: 'Dr. Manpreet Brar', unavailable: [] },
  { id: 'T10', name: 'Prof. Sunil Arora', unavailable: [], maxPerDay: 4 },
  { id: 'T11', name: 'Dr. Kavita Joshi', unavailable: [] },
  // Not available for the first two periods on Monday.
  { id: 'T12', name: 'Prof. Ritu Bansal', unavailable: [{ day: 0, period: 0 }, { day: 0, period: 1 }] },
]

const sections = [
  { id: 'CSE-A', name: 'CSE 3rd Sem A', department: 'CSE', size: 60 },
  { id: 'CSE-B', name: 'CSE 3rd Sem B', department: 'CSE', size: 60 },
  { id: 'ECE-A', name: 'ECE 3rd Sem A', department: 'ECE', size: 55 },
  { id: 'ECE-B', name: 'ECE 3rd Sem B', department: 'ECE', size: 55 },
  { id: 'ME-A', name: 'ME 3rd Sem A', department: 'ME', size: 65 },
  { id: 'ME-B', name: 'ME 3rd Sem B', department: 'ME', size: 65 },
]

// [sectionId, subject, teacherId, hoursPerWeek, kind]
const assignmentRows = [
  ['CSE-A', 'Data Structures', 'T1', 4, 'lecture'],
  ['CSE-A', 'DBMS', 'T2', 4, 'lecture'],
  ['CSE-A', 'Operating Systems', 'T3', 4, 'lecture'],
  ['CSE-A', 'Mathematics III', 'T10', 4, 'lecture'],
  ['CSE-A', 'Communication Skills', 'T12', 3, 'lecture'],
  ['CSE-A', 'Data Structures Lab', 'T1', 2, 'lab'],
  ['CSE-A', 'DBMS Lab', 'T2', 2, 'lab'],

  ['CSE-B', 'Data Structures', 'T1', 4, 'lecture'],
  ['CSE-B', 'DBMS', 'T2', 4, 'lecture'],
  ['CSE-B', 'Operating Systems', 'T3', 4, 'lecture'],
  ['CSE-B', 'Mathematics III', 'T10', 4, 'lecture'],
  ['CSE-B', 'Communication Skills', 'T12', 3, 'lecture'],
  ['CSE-B', 'Data Structures Lab', 'T1', 2, 'lab'],
  ['CSE-B', 'DBMS Lab', 'T3', 2, 'lab'],

  ['ECE-A', 'Signals & Systems', 'T4', 4, 'lecture'],
  ['ECE-A', 'Digital Electronics', 'T5', 4, 'lecture'],
  ['ECE-A', 'Network Theory', 'T6', 4, 'lecture'],
  ['ECE-A', 'Mathematics III', 'T10', 4, 'lecture'],
  ['ECE-A', 'Communication Skills', 'T12', 3, 'lecture'],
  ['ECE-A', 'Digital Electronics Lab', 'T5', 2, 'lab'],

  ['ECE-B', 'Signals & Systems', 'T4', 4, 'lecture'],
  ['ECE-B', 'Digital Electronics', 'T5', 4, 'lecture'],
  ['ECE-B', 'Network Theory', 'T6', 4, 'lecture'],
  ['ECE-B', 'Mathematics III', 'T11', 4, 'lecture'],
  ['ECE-B', 'Communication Skills', 'T12', 3, 'lecture'],
  ['ECE-B', 'Digital Electronics Lab', 'T5', 2, 'lab'],

  ['ME-A', 'Thermodynamics', 'T7', 4, 'lecture'],
  ['ME-A', 'Engineering Mechanics', 'T8', 4, 'lecture'],
  ['ME-A', 'Manufacturing Processes', 'T9', 4, 'lecture'],
  ['ME-A', 'Mathematics III', 'T11', 4, 'lecture'],
  ['ME-A', 'Communication Skills', 'T12', 3, 'lecture'],
  ['ME-A', 'CAD Lab', 'T9', 2, 'lab'],

  ['ME-B', 'Thermodynamics', 'T7', 4, 'lecture'],
  ['ME-B', 'Engineering Mechanics', 'T8', 4, 'lecture'],
  ['ME-B', 'Manufacturing Processes', 'T9', 4, 'lecture'],
  ['ME-B', 'Mathematics III', 'T11', 4, 'lecture'],
  ['ME-B', 'Communication Skills', 'T12', 3, 'lecture'],
  ['ME-B', 'CAD Lab', 'T9', 2, 'lab'],
]

function allDay(day) {
  return Array.from({ length: settings.periodsPerDay }, (_, period) => ({ day, period }))
}

function buildAssignments(rows) {
  return rows.map(([sectionId, subject, teacherId, hoursPerWeek, kind], i) => ({
    id: `A${i + 1}`,
    sectionId,
    subject,
    teacherId,
    hoursPerWeek,
    kind,
    ...(kind === 'lab' ? { labLength: 2 } : {}),
  }))
}

/** A realistic college that can be scheduled with no clashes. */
export function makeSampleCollege() {
  return structuredClone({
    settings,
    rooms,
    teachers,
    sections,
    assignments: buildAssignments(assignmentRows),
  })
}

/**
 * The same college with three real-world problems, to demo the diagnosis:
 * - Prof. Ritu Bansal is on leave Mon–Wed but still has 18 hours to teach.
 * - ME-B has grown to 90 students; the biggest room holds 80.
 * - Computer Lab 2 is closed for repairs, and CSE wants a 3-period project lab for every section.
 */
export function makeImpossibleCollege() {
  const data = makeSampleCollege()
  data.settings.collegeName = 'Demo College (impossible scenario)'

  const ritu = data.teachers.find((t) => t.id === 'T12')
  ritu.unavailable = [0, 1, 2].flatMap((day) =>
    Array.from({ length: data.settings.periodsPerDay }, (_, period) => ({ day, period })),
  )

  data.sections.find((s) => s.id === 'ME-B').size = 90

  data.rooms = data.rooms.filter((r) => r.id !== 'LAB2')

  let next = data.assignments.length + 1
  const projectLabs = [['CSE-A', 'T4'], ['CSE-B', 'T6'], ['ECE-A', 'T7'], ['ECE-B', 'T8'], ['ME-A', 'T11'], ['ME-B', 'T4']]
  for (const [sectionId, teacherId] of projectLabs) {
    data.assignments.push({
      id: `A${next++}`,
      sectionId,
      subject: 'Project Lab',
      teacherId,
      hoursPerWeek: 6,
      kind: 'lab',
      labLength: 3,
    })
  }
  return data
}
