// src/lib/overdue.js
// Single source of truth for "is this invoice overdue" so Dashboard and
// Payments always agree on the same definition and reference date.

// The app's demo data is pinned to this date (see Dashboard's page header,
// "Thursday, 25 June 2026") rather than the real system clock, so overdue
// checks stay consistent with the rest of the seeded data.
export const APP_TODAY = '2026-06-25'

export function isInvoiceOverdue(invoice, today = APP_TODAY) {
  return !!invoice.dueDate
    && invoice.status !== 'Paid'
    && invoice.status !== 'Cancelled'
    && invoice.dueDate < today
}

export function getOverdueInvoices(invoices, today = APP_TODAY) {
  return (invoices || []).filter((i) => isInvoiceOverdue(i, today))
}

export function daysOverdue(dueDate, today = APP_TODAY) {
  if (!dueDate) return 0
  const ms = new Date(today).getTime() - new Date(dueDate).getTime()
  return Math.max(0, Math.round(ms / 86400000))
}
