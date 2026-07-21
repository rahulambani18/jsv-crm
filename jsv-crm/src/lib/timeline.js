// src/lib/timeline.js
// Merges records from every module that references a customer by
// company name into one chronological feed for the account timeline.
// Some record types (leads, quotations) don't store a creation date
// in this schema, so we place them using the closest date field
// available and say so in the label — noted inline below.

function fmtINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

export function buildCustomerTimeline(companyName, data) {
  const { leads = [], samples = [], quotations = [], orders = [], invoices = [], payments = [], meetings = [], followUps = [] } = data
  const events = []

  leads.filter((l) => l.company === companyName).forEach((l) => {
    if (l.nextFollowUp) {
      events.push({
        date: l.nextFollowUp, type: 'Lead', tone: 'navy',
        title: `Lead — ${l.status}`,
        sub: `Est. value ${fmtINR(l.estValue)}${l.priority ? ` · ${l.priority} priority` : ''} (next follow-up date shown — leads have no creation date on file)`,
      })
    }
  })

  samples.filter((s) => s.company === companyName).forEach((s) => {
    events.push({
      date: s.sent, type: 'Sample', tone: 'teal',
      title: `Sample sent — ${s.code}`,
      sub: `${(s.products || []).join(', ') || 'Products'} · ${s.status}${s.tracking && s.tracking !== '—' ? ` · ${s.courier} ${s.tracking}` : ''}`,
    })
  })

  quotations.filter((q) => q.company === companyName).forEach((q) => {
    events.push({
      date: q.validUntil, type: 'Quotation', tone: 'amber',
      title: `Quotation ${q.quoteNo} — ${q.status}`,
      sub: `${fmtINR(q.total)} · ${q.items} item${q.items === 1 ? '' : 's'} (valid-until date shown — quotations have no creation date on file)`,
    })
  })

  orders.filter((o) => o.company === companyName).forEach((o) => {
    events.push({
      date: o.orderDate, type: 'Order', tone: 'navy',
      title: `Order placed — ${o.orderNo}`,
      sub: `${o.status || ''}${o.delivery ? ` · Delivery ${o.delivery}` : ''} · ${o.warehouse || ''}`,
    })
  })

  invoices.filter((i) => i.company === companyName).forEach((i) => {
    events.push({
      date: i.issueDate, type: 'Invoice', tone: 'red',
      title: `Invoice ${i.invoiceNo} raised — ${fmtINR(i.total)}`,
      sub: `Due ${i.dueDate || '—'} · ${i.status}`,
    })
  })

  payments.filter((p) => p.company === companyName).forEach((p) => {
    events.push({
      date: p.date, type: 'Payment', tone: 'teal',
      title: `Payment received — ${fmtINR(p.amount)}`,
      sub: `${p.mode || ''}${p.reference ? ` · Ref ${p.reference}` : ''} · ${p.status}`,
    })
  })

  meetings.filter((m) => m.company === companyName).forEach((m) => {
    events.push({
      date: m.date, type: 'Meeting', tone: 'gray',
      title: `Meeting — ${m.title || m.type}`,
      sub: `${m.type || ''}${m.location ? ` · ${m.location}` : ''} · ${m.status}`,
    })
  })

  followUps.filter((f) => f.lead === companyName).forEach((f) => {
    events.push({
      date: f.date, type: 'Follow-up', tone: 'gray',
      title: `Follow-up — ${f.type}`,
      sub: `${f.notes || ''} · ${f.status}`,
    })
  })

  return events
    .filter((e) => e.date)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
