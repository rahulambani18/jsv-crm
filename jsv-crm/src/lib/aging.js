// src/lib/aging.js
// Builds a per-customer outstanding-balance report by combining open
// invoices with completed payments, aged into 0-30 / 30-60 / 60+ day
// buckets. This is the reconciliation layer that ties Invoices and
// Payments together — same company-name matching and "Completed
// payments only" rule as credit.js, just broken out by age instead of
// collapsed into a single number.

import { APP_TODAY } from './overdue.js'

export const AGING_BUCKETS = [
  { key: 'current', label: 'Current', tone: 'teal', hint: 'Not yet due' },
  { key: 'due0to30', label: '0–30 days', tone: 'amber', hint: 'Past due date' },
  { key: 'due30to60', label: '30–60 days', tone: 'amber', hint: 'Past due date' },
  { key: 'due60plus', label: '60+ days', tone: 'red', hint: 'Past due date' },
]

// Oldest-first — used to decide which bucket "wins" for a row's status
// pill, and to apply unlinked advance payments against the oldest debt
// first (standard aging-report convention).
const BUCKET_ORDER = ['due60plus', 'due30to60', 'due0to30', 'current']

function daysPastDue(dueDate, today) {
  if (!dueDate) return 0
  return Math.round((new Date(today).getTime() - new Date(dueDate).getTime()) / 86400000)
}

function bucketForDays(days) {
  if (days <= 0) return 'current'
  if (days <= 30) return 'due0to30'
  if (days <= 60) return 'due30to60'
  return 'due60plus'
}

// Returns { rows, totals }
//   rows   — one entry per customer with an open balance, sorted by
//            total outstanding (highest first)
//   totals — the same shape, summed across every customer
export function buildAgingReport(invoices, payments, today = APP_TODAY) {
  const openInvoices = (invoices || []).filter((i) => i.status !== 'Paid' && i.status !== 'Cancelled')
  const completedPayments = (payments || []).filter((p) => p.status === 'Completed')

  // Amount already paid against each specific invoice.
  const paidByInvoice = {}
  completedPayments.forEach((p) => {
    if (p.invoiceId) paidByInvoice[p.invoiceId] = (paidByInvoice[p.invoiceId] || 0) + Number(p.amount || 0)
  })

  // Payments recorded without a linked invoice count as advance credit
  // for that company, same as outstandingForCustomer() in credit.js.
  const advanceByCompany = {}
  completedPayments.forEach((p) => {
    if (!p.invoiceId && p.company) advanceByCompany[p.company] = (advanceByCompany[p.company] || 0) + Number(p.amount || 0)
  })

  const byCompany = {}

  openInvoices.forEach((inv) => {
    if (!inv.company) return
    const paid = paidByInvoice[inv.id] || 0
    const remaining = Math.max(0, Number(inv.total || 0) - paid)
    if (remaining <= 0) return // fully covered by linked payments already

    if (!byCompany[inv.company]) {
      byCompany[inv.company] = {
        company: inv.company, current: 0, due0to30: 0, due30to60: 0, due60plus: 0,
        invoiceCount: 0, oldestDueDate: null, advanceApplied: 0, advanceUnused: 0,
      }
    }
    const row = byCompany[inv.company]
    const bucket = bucketForDays(daysPastDue(inv.dueDate, today))
    row[bucket] += remaining
    row.invoiceCount += 1
    if (inv.dueDate && (!row.oldestDueDate || inv.dueDate < row.oldestDueDate)) row.oldestDueDate = inv.dueDate
  })

  // Apply each company's unlinked advance payments against its oldest
  // outstanding bucket first, then the next-oldest, and so on.
  Object.entries(advanceByCompany).forEach(([company, amount]) => {
    const row = byCompany[company]
    if (!row) return // advance on file but nothing currently owed
    let left = amount
    for (const key of BUCKET_ORDER) {
      if (left <= 0) break
      const take = Math.min(row[key], left)
      row[key] -= take
      left -= take
    }
    row.advanceApplied = amount - left
    row.advanceUnused = left // leftover credit balance, if the advance exceeded what was owed
  })

  const rows = Object.values(byCompany)
    .map((row) => ({ ...row, total: row.current + row.due0to30 + row.due30to60 + row.due60plus }))
    .sort((a, b) => b.total - a.total)

  const totals = rows.reduce((acc, r) => {
    acc.current += r.current; acc.due0to30 += r.due0to30
    acc.due30to60 += r.due30to60; acc.due60plus += r.due60plus
    acc.total += r.total
    return acc
  }, { current: 0, due0to30: 0, due30to60: 0, due60plus: 0, total: 0 })

  return { rows, totals }
}

// Which bucket a row's status pill should reflect — its oldest (most
// severe) non-zero bucket.
export function worstBucket(row) {
  return BUCKET_ORDER.find((key) => row[key] > 0) || 'current'
}
