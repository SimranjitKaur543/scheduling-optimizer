# CLAUDE.md — Scheduling Optimizer

College timetable generator built for the Punjab Jobs AI Bootcamp hackathon (J-PAL South Asia). Individual project, 120-minute build. It must work for **any college**, not just one.

## Goal

A college administrator enters their setup (days, periods, rooms, teachers, sections, subject assignments), clicks **Generate**, and gets a weekly timetable with **zero clashes**. If a full timetable is impossible, the app explains why in plain English and suggests a fix.

Judging: core functionality (no clashes), usability, design, advanced functionality (hard cases), relevance to real colleges.

## Stack

- React + Vite (JavaScript, not TypeScript)
- Tailwind CSS
- Vitest for tests
- No backend, no database, no login. Data lives in browser `localStorage`, with JSON import/export.
- Deployed on Vercel from GitHub.

## Folder layout

```
src/engine/sampleData.js   demo college (several departments, one shared computer lab)
src/engine/precheck.js     quick maths checks that catch impossible setups before solving
src/engine/solver.js       least-options-first greedy + random restarts
src/engine/workspaces.js   My timetables: many saved timetables per browser
src/engine/validator.js    independent clash checker (never trusts the solver)
src/engine/score.js        soft-goal scoring + analytics (teacher load, room usage)
src/engine/*.test.js       Vitest tests
src/components/            UI components (TimetableGrid, SetupTables, ReportPanel, ...)
src/App.jsx
```

**The engine (`src/engine/`) contains no React or UI code.** It takes plain data in and returns plain data out, so it can be tested on its own.

## Data model

- **settings**: `days` (e.g. Mon–Sat), `periodsPerDay`, `breakAfterPeriod`
- **rooms**: `id`, `name`, `type` (`"lecture"` | `"lab"`), `capacity`
- **teachers**: `id`, `name`, `unavailable` (list of `{day, period}`), optional `maxPerDay`
- **sections**: `id`, `name`, `department`, `size`
- **assignments**: `id`, `sectionId`, `subject`, `teacherId`, `hoursPerWeek`, `kind` (`"lecture"` | `"lab"`), `labLength` (consecutive periods, e.g. 2)
- **timetable output**: list of `{assignmentId, day, startPeriod, length, roomId}` plus `unplaced` (sessions that could not be placed, each with a reason)

## Hard rules (must NEVER be broken)

1. A teacher is in only one place at a time.
2. A room holds only one class at a time (rooms are shared across all departments).
3. A section attends only one class at a time.
4. Labs go in lab rooms, use consecutive periods, and never cross the break.
5. Room capacity ≥ section size.
6. Teacher unavailable slots are respected.
7. Completeness: every assignment gets all its weekly hours, or each missing session is listed in `unplaced` with a reason.

## Soft goals (make a timetable "better", used for scoring)

- Spread a subject across the week (avoid the same subject twice on one day).
- Balance teacher loads and respect `maxPerDay`; avoid idle gaps.
- Use rooms evenly.

## Algorithm

"Least options first" greedy + random restarts (no deep backtracking unless there is spare time):

1. Expand assignments into sessions (4 hours/week → 4 one-period sessions; a lab → one session of `labLength` consecutive periods).
2. Track `teacherBusy`, `roomBusy`, `sectionBusy` grids (day × period). A spot is valid only if teacher, room and section are free for every period it covers, the room type and capacity fit, the teacher is available, and a lab does not cross the break.
3. Loop: pick the unplaced session with the **fewest valid spots** (the Sudoku trick), place it in its best soft-score spot, update the grids. A session with zero spots goes to `unplaced` with a reason.
4. Restart with random tie-breaking until a ~2 second time budget is used; keep the result with the fewest unplaced sessions, then the best soft score.

Impossible cases: run `precheck` first (teacher hours vs available periods, section hours vs week size, lab-periods needed vs lab capacity, section size vs largest room, lab subject with no lab room). Each failure gives a plain-English message and a suggested fix. If the solver still fails, return the best partial timetable plus the `unplaced` list with reasons.

## Features beyond the MVP

- My timetables: many timetables (any organisation, semester or draft) per browser, each with its own data and saved generated result; create blank / from sample / impossible demo / from JSON, open, rename, duplicate, export, delete.
- Demo timetables: "Sample college" (3 departments, 6 sections, ~12 teachers, 7 lecture rooms, 2 shared labs) and "Impossible scenario" (demos the diagnosis), created from My timetables.
- Diagnosis: pre-check failures and unplaced reasons, each with a suggested fix.
- Analytics: teacher load chart and room-usage heatmap.
- Substitute finder: pick a teacher and a day → list which teachers are free in each of their periods.
- Export: CSV download and print/PDF.

## Working rules for Claude

- Work in **small stages**. One stage per request, then run tests, then commit.
- Run `npx vitest run` before every commit and show the output. Do not claim something works without seeing tests pass.
- **Never display a timetable that fails `validator.js`.**
- The validator must be independent of the solver: it rebuilds the busy grids from the final timetable and checks every hard rule from scratch.
- Prioritise a correct generator over visual polish. Do not add AI chat, login, a database or drag-and-drop unless the core is finished and tested.
- Do not mark a feature as done in the README unless it is implemented and working.
- The user is a beginner: explain changes in simple language and keep code readable.
- Commit messages: short and clear, one working step per commit.

## Commands

```
npm install
npm run dev          # local dev server
npx vitest run       # run tests
npm run build        # production build (Vercel runs this)
```

## Status

- Repo: https://github.com/SimranjitKaur543/scheduling-optimizer
- Live: https://scheduling-optimizer.vercel.app/ (Vercel redeploys on every push to `main`)
- Stage 1 done: Vite + React + Tailwind + Vitest setup (placeholder page).
- Stage 2 done: `model.js` helpers, `sampleData.js` (sample + impossible college), `validator.js`, `precheck.js`, tests in `validator.test.js` and `precheck.test.js` (fixtures in `testFixtures.js`).
- Stage 3 done: `solver.js` (least options first + seeded random restarts, busy grids as flat `Uint8Array`s), `score.js` (soft-goal penalties), `solver.test.js` incl. a 50-random-college stress test (`randomCollege` in `testFixtures.js`). 26 tests pass. Sample college: ~130 attempts in 2 s, all placed, penalty 54 → 33.
- Stage 4 done: UI in `src/components/`: `Sidebar`, `Dashboard` (sample + impossible buttons, stats, pre-check with fixes, Generate / "Generate anyway (partial)"), `ResultSummary` (periods placed, attempts, penalty first → best), `VerifiedBadge` (rule-by-rule validator result), `UnplacedList` (missing classes + reasons), `TimetablePage` + `TimetableGrid` (Section/Teacher/Room view, labs as tall cells, break row). Timetable is hidden if validation fails. Checked in browser on desktop and phone width.
- Stage 5 done: `SetupPage` with tabs (Settings / Rooms / Teachers / Sections / Subjects) built on one reusable `EditableTable`; `AvailabilityGrid` (click periods or whole days off); field validation in `engine/setupValidation.js` (+ tests) shown under each field, as "N to fix" on tabs and a sidebar badge; Generate is disabled while setup has errors. Data autosaves to `localStorage` (key `scheduling-optimizer:data:v1`); JSON export/import, Load sample, Start blank. Deleting a teacher/section asks before removing its subjects. Changing working days remaps teacher unavailability. 32 tests pass.
- Stage 6 done: `ReportPage` with summary tiles (busiest/lightest teacher, room time in use, under-used rooms), `TeacherLoadChart` (single-hue bars, average line, hover tooltip, table view), `RoomHeatmap` (rooms × days, one-hue steps + legend), `SubstituteFinder` (absent teacher + day → free teachers per class, same-subject first). Engine: `teacherLoad`, `roomUsage`, `findSubstitutes` in `score.js`; `exportCsv.js` (CSV with BOM for Excel). Timetable page has "Download CSV" and "Print / PDF" (print hides sidebar and controls, landscape). Tests in `report.test.js`; 37 tests pass. Checked in browser on desktop and 375px.
- Demo insight: in the sample, Room 301 (50 seats) is never used because every section has 55+ students; the heatmap shows it.
- Stage 7 done: `README.md` (problem, features, 1-minute walkthrough, algorithm, rules, local setup, tests, JSON format, structure, known limits). Polish: favicon + meta description; blank college shows a "Get started in 4 steps" guide instead of Generate. Live site checked after Stage 6 push: 130/130 placed, verified, Report works.
- Stage 8 done: My timetables. `engine/workspaces.js` (+ `workspaces.test.js`): store `{ activeId, workspaces: [{ id, name, data, result, edited, createdAt, updatedAt }] }` in localStorage key `scheduling-optimizer:workspaces:v2`; the old `scheduling-optimizer:data:v1` save is upgraded automatically. The generated `result` is saved per timetable and re-checked with `validateTimetable` whenever it is shown. `WorkspacesPage` lists cards with status (not generated / ready / partial); the sidebar shows the open timetable with a Switch button. Sample/impossible/blank/import now create a new timetable instead of overwriting (removed from Dashboard and Setup; Setup keeps Export JSON). 44 tests pass. Checked in browser: upgrade from v1, two timetables generated, switch, reload keeps results, rename/duplicate/delete, 375px.
- Known limits (also in README): one teacher per class; no combined sections or lab batches; greedy + restarts, not exact; no drag-and-drop editing; no accounts: timetables stored per browser (accounts with cloud storage, e.g. Supabase, are a possible later phase; would need this file's "no login, no database" rule changed on purpose).
