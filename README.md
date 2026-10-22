# Scheduling Optimizer

**Clash-free college timetables in seconds, for any college.**

Live app: **https://scheduling-optimizer.vercel.app/**

Built for *Scheduling Optimizer: Hackathon 1*, Punjab Jobs AI Bootcamp, J-PAL South Asia.

---

## The problem

Most colleges still build timetables by hand at the start of every semester. Each department has to fit its sections, labs and teachers into the week, and departments compete for shared spaces such as computer labs and seminar halls. The process takes weeks, and the result still has clashes, uneven teaching loads and rooms that sit empty.

**Who it is for:** the timetable coordinator or college administrator. No technical knowledge is needed.

## What it does

0. **My timetables:** keep as many timetables as you need, for any number of colleges, departments, semesters or drafts. Each one has its own setup data, and its generated timetable is saved with it. Create a new one blank, from the sample or from a JSON file; rename, duplicate (for example, copy last semester and edit it), export or delete any of them.
1. **Enter your college:** working days, periods per day, lunch break, rooms (lecture or lab, with seats), teachers (with times they are unavailable and an optional daily limit), sections (with student count) and subjects (section + subject + teacher + periods per week, lecture or lab).
2. **Pre-check:** before generating, quick maths checks catch setups that can never work and explain why in plain English, each with a suggested fix. For example: *"Prof. Ritu Bansal must teach 18 periods but is only available for 14. Fix: reduce their load by 4 periods…"*
3. **Generate:** builds a full weekly timetable in about 1.5 seconds, trying 100+ versions and keeping the best one.
4. **Verify:** an independent checker re-tests the result against every rule and shows **"Verified: 0 clashes"** rule by rule. A timetable that fails is never shown.
5. **View:** see the week by **section, teacher or room**. Labs show as double-height blocks, and the lunch break is marked.
6. **Report:** teacher load chart, room-usage heatmap (spots empty rooms), and a **substitute finder** for absent teachers.
7. **Export:** download the timetable as CSV (Excel / Google Sheets) or print / save it as PDF. Save and load all college data as a JSON file.

### Features at a glance

| Area | Feature |
|---|---|
| Core | Clash-free generation for teachers, rooms, sections and shared labs across departments |
| Core | Labs in lab rooms only, in consecutive periods, never split by the lunch break |
| Core | Room capacity, teacher unavailability, teacher max periods per day |
| Hard cases | Pre-check with plain-English reasons and fixes; partial timetable with a list of every class that could not be placed and *why* |
| Quality | Spreads each subject across the week, balances teacher days, avoids idle gaps; shows how much better the result is than the first attempt |
| Multiple organisations | "My timetables" list: many timetables side by side, each with its own data and saved result; create, open, rename, duplicate, export, delete |
| Usability | Sample college and an "impossible scenario" with one click; editable tables with inline validation; autosave in the browser |
| Report | Teacher load chart, room usage heatmap, under-used room count, substitute finder |
| Export | CSV, print / PDF, JSON import / export |

## Try it in 1 minute

1. Open the live app. A sample college (3 departments, 6 sections, 12 teachers, 7 classrooms, 2 shared computer labs) is already loaded.
2. Click **Generate timetable**. All 130 periods are placed and the badge shows **Verified: 0 clashes**.
3. Click **View timetable**, then switch to **Room → Computer Lab 1** to see CSE, ECE and ME sharing one lab without a single overlap.
4. Open **Report** to see teacher loads, the room heatmap (Room 301 is never used: at 50 seats it is too small for every section) and the substitute finder.
5. Open **My timetables** and click **+ Impossible scenario**: a teacher on leave, a 90-student section, a closed lab and extra project labs. The pre-check lists each problem with a fix, and **Generate anyway** still produces a clash-free partial timetable and explains every class it could not place.
6. Go back to **My timetables**: both timetables are listed with their status, and the sample's timetable is still there (it is saved, even after a page reload). Click **+ New blank timetable** to set up your own organisation in **Setup**.

## How the scheduler works

The scheduler is a **"least options first" greedy algorithm with random restarts**. It does not use AI; it is a puzzle-solving method that is fast, predictable and easy to check.

1. **Split subjects into sessions.** "DBMS, 4 periods a week" becomes 4 one-period sessions. "DBMS Lab, 4 periods, 2 at a time" becomes 2 two-period sessions.
2. **Track who is busy.** Three grids (day × period) record when each **teacher**, **room** and **section** is taken.
3. **Hardest first (the Sudoku trick).** At every step, find the subject whose next session has the *fewest* valid spots left, and place it first. A spot is valid only if, for every period it covers:
   - the teacher is free and available,
   - the section is free,
   - a room of the right type (lecture / lab) with enough seats is free,
   - and a lab does not cross the lunch break.

   Because every placement is checked against all three grids, **a clash cannot be created**.
4. **Pick the best spot.** Among the valid spots, prefer the one that keeps a subject off days it already has, respects the teacher's daily limit, avoids idle gaps, uses the best-fitting room and leans towards earlier periods.
5. **If nothing fits**, that session goes to an **unplaced** list with the most likely reason (for example, no room big enough, the teacher has no free time left, or every lab is booked whenever the teacher and section are both free).
6. **Random restarts.** Repeat the whole process with a different tie-break order for about 1.5 seconds (100+ attempts), and keep the timetable with the fewest unplaced periods and then the lowest quality penalty.

**Quality penalty** (lower is better) = same subject twice in a day × 5 + periods over a teacher's daily limit × 10 + section idle gaps × 2 + teacher idle gaps × 1. On the sample college, restarts typically improve it by 30% or more over the first attempt.

### The rules every timetable must pass

The validator (`src/engine/validator.js`) is written separately from the solver and rebuilds everything from the finished timetable:

1. No teacher is in two places at once.
2. No room is double-booked.
3. No section has two classes at once.
4. Labs are in lab rooms, lectures in lecture rooms.
5. Every room is big enough for its section.
6. Teachers are never booked when unavailable.
7. Labs use consecutive periods and never cross the break.
8. Every subject gets all its weekly periods, or the missing ones are reported as unplaced.

## Run it locally

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/SimranjitKaur543/scheduling-optimizer.git
cd scheduling-optimizer
npm install
npm run dev        # open http://localhost:5173
```

Other commands:

```bash
npm test           # run all tests (Vitest)
npm run build      # production build into dist/
npm run preview    # serve the production build
```

**Deploy:** the live site is on Vercel, connected to this GitHub repository. Every push to `main` redeploys automatically (framework preset: Vite, build command `npm run build`, output `dist`).

## Tests

44 automated tests (`npm test`), all passing:

| File | What it proves |
|---|---|
| `validator.test.js` | The checker catches every kind of problem: teacher, room and section clashes; wrong room type; room too small; unavailable teacher; lab across the break; silently missing hours |
| `precheck.test.js` | Impossible setups are caught with a clear message and fix: overloaded teacher, too many hours for the week, section bigger than every room, not enough lab slots, no lab room |
| `solver.test.js` | The sample college is fully scheduled with no clashes; unavailable teachers are respected; one lab shared by three sections never overlaps; labs never cross the break; the impossible scenario gives a clash-free partial result with reasons; restarts never make things worse; **stress test: 50 randomly generated colleges never produce a single clash** |
| `setupValidation.test.js` | Setup form checks: empty or duplicate names, bad numbers, lab hours that do not divide evenly, subjects pointing at deleted teachers or sections, bad import files |
| `report.test.js` | Teacher load, room usage, substitute finder (never suggests a busy or unavailable teacher) and CSV format |
| `workspaces.test.js` | My timetables: saved timetables and results read back correctly; data from the old one-college version is upgraded; broken storage never crashes the app; duplicates are fully independent; deleting the last timetable leaves a blank one |

## Data format (JSON import / export)

```json
{
  "settings": { "collegeName": "My College", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "periodsPerDay": 7, "breakAfterPeriod": 4 },
  "rooms":    [{ "id": "R101", "name": "Room 101", "type": "lecture", "capacity": 60 }],
  "teachers": [{ "id": "T1", "name": "Dr. Kaur", "unavailable": [{ "day": 4, "period": 0 }], "maxPerDay": 4 }],
  "sections": [{ "id": "CSE-A", "name": "CSE 3rd Sem A", "department": "CSE", "size": 60 }],
  "assignments": [
    { "id": "A1", "sectionId": "CSE-A", "subject": "DBMS", "teacherId": "T1", "hoursPerWeek": 4, "kind": "lecture" },
    { "id": "A2", "sectionId": "CSE-A", "subject": "DBMS Lab", "teacherId": "T1", "hoursPerWeek": 2, "kind": "lab", "labLength": 2 }
  ]
}
```

Days and periods in `unavailable` are 0-based (day 0 = first working day, period 0 = first period). `breakAfterPeriod: 4` means lunch comes after the 4th period.

## Project structure

```
src/
  engine/                 scheduling logic, no UI code (easy to test)
    model.js              shared helpers (sessions, break rules, look-ups)
    sampleData.js         sample college + impossible scenario
    precheck.js           "can this ever work?" checks with fixes
    solver.js             least-options-first greedy + random restarts
    validator.js          independent rule-by-rule clash checker
    score.js              quality penalty, teacher load, room usage, substitute finder
    setupValidation.js    form field checks, blank college, import shape check
    exportCsv.js          CSV and JSON downloads
    workspaces.js         My timetables: many saved timetables, upgrade from old saves
    *.test.js             tests
  components/             React UI: My timetables, Dashboard, Setup, Timetable, Report and their parts
  App.jsx                 page state, autosave, Generate
CLAUDE.md                 project rules and status for Claude Code
```

**Tech stack:** React + Vite, Tailwind CSS, Vitest. There is no backend: everything runs in the browser, and data is saved in the browser's local storage and as JSON files.

## Known limits and next steps

- One teacher per class. Team-taught classes and combined sections (two sections in one hall) are not modelled yet.
- Lab batches (half a section in the lab while the other half has a lecture) are not modelled yet.
- The solver is greedy with restarts, not an exact solver. On very tight setups it can leave a few sessions unplaced that a perfect solver might fit; it always says so, and the timetable it shows is always clash-free.
- No manual drag-and-drop editing of the generated timetable.
- No user accounts yet: timetables are stored in each person's own browser. Anyone can use the site, and each visitor's timetables stay private to their browser, but they do not follow you to another device. Use Export / Import JSON to move them. Accounts with cloud storage (for example, Supabase) are a planned next step.

## Built with Claude Code

The project was planned and built in small, tested stages with Claude Code. See `CLAUDE.md` for the rules and stage-by-stage status. Each stage was committed only after the tests passed.
