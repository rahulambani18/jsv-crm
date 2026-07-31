// src/lib/paymentAnalytics.js
// Analytics helpers that power the "Payment Analytics" panel on the
// Payments page: mode breakdown (for the pie chart), a 4-bucket aging
// split, an outstanding summary, and the list of partially-paid invoices.
// Kept separate from lib/aging.js (which drives the Reconciliation page
// and uses a current/0-30/30-60/60+ split) since this view intentionally
// uses a plain 0-30 / 31-60 / 61-90 / 90+ split with no "current" bucket.

import { APP_TODAY, daysOverdue } from './overdue.js'

export const PAYMENT_AGING_BUCKETS = [
  { key: 'b0to30', label: '0-30 days' },
  { key: 'b31to60', label: '31-60 days' },
  { key: 'b61to90', label: '61-90 days' },
  { key: 'b90plus', label: '90+ days' },
]

function bucketForDays(days) {
  if (days <= 30) return 'b0to30'
  if (days <= 60) return 'b31to60'
  if (days <= 90) return 'b61to90'
  return 'b90plus'
}

// Amount of *completed* payments received against each invoice, and per
// company (for payments not linked to a specific invoice). Shared by the
// aging, outstanding-summary and partial-payment builders below so they
// all agree on what's already been paid.
function paidAmounts(payments) {
  const completed = (payments || []).filter((p) => p.status === 'Completed')
  const byInvoice = {}
  const byCompany = {}
  completed.forEach((p) => {
    const amt = Number(p.amount || 0)
    if (p.invoiceId) byInvoice[p.invoiceId] = (byInvoice[p.invoiceId] || 0) + amt
    else if (p.company) byCompany[p.company] = (byCompany[p.company] || 0) + amt
  })
  return { byInvoice, byCompany }
}

// Pie-chart-ready breakdown of completed payment amounts by mode, e.g.
// [{ name: 'NEFT', value: 240000 }, ...]. Modes with nothing received
// are left out rather than shown as empty slices.
export function buildPaymentModeBreakdown(payments) {
  const totals = {}
  ;(payments || [])
    .filter((p) => p.status === 'Completed')
    .forEach((p) => {
      const mode = p.mode || 'Other'
      totals[mode] = (totals[mode] || 0) + Number(p.amount || 0)
    })
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// Buckets every open invoice's *remaining* balance by days overdue into
// 0-30 / 31-60 / 61-90 / 90+ (invoices not yet due, or ≤30 days overdue,
// land in the first bucket). Returns [{ bucket, label, amount }].
export function buildPaymentAgingBuckets(invoices, payments, today = APP_TODAY) {
  const { byInvoice } = paidAmounts(payments)
  const totals = { b0to30: 0, b31to60: 0, b61to90: 0, b90plus: 0 }

  ;(invoices || [])
    .filter((i) => i.status !== 'Paid' && i.status !== 'Cancelled')
    .forEach((inv) => {
      const remaining = Math.max(0, Number(inv.total || 0) - (byInvoice[inv.id] || 0))
      if (remaining <= 0) return
      const key = bucketForDays(daysOverdue(inv.dueDate, today))
      totals[key] += remaining
    })

  return PAYMENT_AGING_BUCKETS.map((b) => ({ bucket: b.key, label: b.label, amount: totals[b.key] }))
}

// Headline numbers for the "Outstanding Summary" cards: total still owed
// across open invoices (net of completed payments and unlinked advances),
// how many invoices that spans, and how many days the oldest of them has
// been overdue.
export function buildOutstandingSummary(invoices, payments, today = APP_TODAY) {
  const { byInvoice, byCompany } = paidAmounts(payments)
  const advanceLeft = { ...byCompany }

  const openInvoices = (invoices || []).filter((i) => i.status !== 'Paid' && i.status !== 'Cancelled')
  let totalOutstanding = 0
  let invoiceCount = 0
  let oldestDueDate = null

  openInvoices.forEach((inv) => {
    let remaining = Math.max(0, Number(inv.total || 0) - (byInvoice[inv.id] || 0))
    if (remaining > 0 && inv.company && advanceLeft[inv.company] > 0) {
      const take = Math.min(remaining, advanceLeft[inv.company])
      remaining -= take
      advanceLeft[inv.company] -= take
    }
    if (remaining <= 0) return
    totalOutstanding += remaining
    invoiceCount += 1
    if (inv.dueDate && (!oldestDueDate || inv.dueDate < oldestDueDate)) oldestDueDate = inv.dueDate
  })

  return {
    totalOutstanding,
    invoiceCount,
    oldestDueDate,
    maxDaysOverdue: oldestDueDate ? daysOverdue(oldestDueDate, today) : 0,
  }
}

// Open invoices that have *some* completed payment against them but not
// enough to be marked Paid — e.g. [{ invoice, paid, total, remaining }],
// sorted by remaining balance (highest first).
export function buildPartialPayments(invoices, payments) {
  const { byInvoice } = paidAmounts(payments)
  return (invoices || [])
    .filter((i) => i.status !== 'Paid' && i.status !== 'Cancelled')
    .map((inv) => {
      const paid = byInvoice[inv.id] || 0
      const total = Number(inv.total || 0)
      return { invoice: inv, paid, total, remaining: Math.max(0, total - paid) }
    })
    .filter((r) => r.paid > 0 && r.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
}
