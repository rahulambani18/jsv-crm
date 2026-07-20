// src/lib/credit.js
// Outstanding-balance math shared between Customers and Orders.
// Invoices link to a customer by company name (not customerId), same
// as the rest of the app, so we match on that.

export function outstandingForCustomer(companyName, invoices, payments) {
  if (!companyName) return 0
  const unpaidInvoices = invoices.filter(
    (i) => i.company === companyName && i.status !== 'Paid' && i.status !== 'Cancelled'
  )
  const totalInvoiced = unpaidInvoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const unpaidIds = new Set(unpaidInvoices.map((i) => i.id))

  const completedPayments = payments.filter((p) => p.status === 'Completed' && p.company === companyName)
  // Payments against one of those still-open invoices…
  const appliedToInvoices = completedPayments
    .filter((p) => p.invoiceId && unpaidIds.has(p.invoiceId))
    .reduce((s, p) => s + Number(p.amount || 0), 0)
  // …plus advance/unlinked payments, which also reduce what's owed.
  const unlinked = completedPayments
    .filter((p) => !p.invoiceId)
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  return Math.max(0, totalInvoiced - appliedToInvoices - unlinked)
}
