// src/lib/reportPeriods.js
// Date-range helpers for the Reports page filter bar. Ranges are
// anchored to APP_TODAY (same reference date the rest of the app uses
// for overdue/expiry checks) rather than the real system clock, so
// filtered results stay consistent with the seeded demo data.

import { APP_TODAY } from './overdue.js'

export const REPORT_PERIODS = ['All', 'Today', 'Week', 'Month', 'Quarter', 'Year']

function toISODate(d) {
  return d.toISOString().slice(0, 10)
}

// Returns { start, end } (both inclusive, 'YYYY-MM-DD') for a named
// period, or null for 'All' (no filtering).
export function periodRange(period, today = APP_TODAY) {
  const t = new Date(today)

  if (period === 'Today') {
    return { start: today, end: today }
  }
  if (period === 'Week') {
    const start = new Date(t)
    start.setDate(t.getDate() - 6) // trailing 7-day window including today
    return { start: toISODate(start), end: today }
  }
  if (period === 'Month') {
    const start = new Date(t.getFullYear(), t.getMonth(), 1)
    const end = new Date(t.getFullYear(), t.getMonth() + 1, 0)
    return { start: toISODate(start), end: toISODate(end) }
  }
  if (period === 'Quarter') {
    const qStartMonth = Math.floor(t.getMonth() / 3) * 3
    const start = new Date(t.getFullYear(), qStartMonth, 1)
    const end = new Date(t.getFullYear(), qStartMonth + 3, 0)
    return { start: toISODate(start), end: toISODate(end) }
  }
  if (period === 'Year') {
    return { start: `${t.getFullYear()}-01-01`, end: `${t.getFullYear()}-12-31` }
  }
  return null // 'All'
}

// Records with no usable date are kept rather than excluded — better
// to over-include in a demo/legacy row than to silently drop it from
// every filtered view.
export function isWithinRange(dateStr, range) {
  if (!range) return true
  if (!dateStr) return true
  const d = String(dateStr).slice(0, 10)
  return d >= range.start && d <= range.end
}

export function periodLabel(period) {
  return period === 'All' ? 'All Time' : period
}
