// Upgrades college data saved or exported by older versions of the app.
// Each step moves data up one schemaVersion. Nothing is thrown away: unknown fields are
// kept, and anything that changes meaning is explained in a plain-English warning.
//
// Version 1 (no schemaVersion): one lunch break as settings.breakAfterPeriod.
// Version 2: settings.startTime, settings.periodMinutes and a list of settings.breaks.

import { DEFAULT_LUNCH_MINUTES, DEFAULT_PERIOD_MINUTES, DEFAULT_START_TIME, formatTime, parseTime } from './time.js'

export const CURRENT_SCHEMA_VERSION = 2

/**
 * Returns { data, warnings } on success, or { error } if the data cannot be upgraded
 * (for example it was made by a newer version of the app). The input is never changed.
 */
export function migrateCollegeData(input) {
  if (!input || typeof input !== 'object' || !input.settings) return { error: 'This is not college data from this app.' }
  const version = input.schemaVersion ?? 1
  if (!Number.isInteger(version) || version < 1) return { error: `Unknown data format version "${version}".` }
  if (version > CURRENT_SCHEMA_VERSION) {
    return { error: `This was made by a newer version of Scheduling Optimizer (format ${version}). Open it in the newer version, or update this app.` }
  }

  const data = structuredClone(input)
  const warnings = []
  if (version < 2) upgradeTo2(data, warnings)
  return { data, warnings }
}

function upgradeTo2(data, warnings) {
  const { breakAfterPeriod, ...settings } = data.settings
  const periods = Number(settings.periodsPerDay)
  const breaks = []
  if (Number.isInteger(breakAfterPeriod) && breakAfterPeriod >= 1 && breakAfterPeriod < periods) {
    breaks.push({ id: 'B1', name: 'Lunch', afterPeriod: breakAfterPeriod, minutes: DEFAULT_LUNCH_MINUTES })
    warnings.push(`Your lunch break (after period ${breakAfterPeriod}) now has a length: ${DEFAULT_LUNCH_MINUTES} minutes. You can change it in Setup → Settings.`)
  } else if (breakAfterPeriod !== undefined && breakAfterPeriod !== null && breakAfterPeriod !== 0) {
    // Keep the old value so nothing is lost, but do not guess where the break should go.
    settings.legacyBreakAfterPeriod = breakAfterPeriod
    warnings.push(`The old break setting ("after period ${breakAfterPeriod}") did not fit a ${periods || 0}-period day, so no break was added. Add breaks in Setup → Settings.`)
  }
  if (parseTime(settings.startTime) === null) settings.startTime = DEFAULT_START_TIME
  if (!(Number(settings.periodMinutes) > 0)) settings.periodMinutes = DEFAULT_PERIOD_MINUTES
  warnings.push(
    `Class times now start at ${formatTime(parseTime(settings.startTime))} with ${settings.periodMinutes}-minute periods. Change them in Setup → Settings if your college is different.`,
  )
  data.settings = { ...settings, breaks }
  data.schemaVersion = 2
}
