// Maps domain status strings to a visual tone consistently across the app.
const STATUS_TONE = {
  // priority
  High: 'red', Medium: 'amber', Low: 'gray',
  // pipeline / lead status
  'New Lead': 'gray', Contacted: 'navy', 'Sample Sent': 'amber',
  'Quotation Sent': 'amber', Negotiation: 'amber', 'Converted Customer': 'teal',
  // samples
  Preparing: 'gray', 'In Transit': 'amber', Delivered: 'teal',
  // quotations
  Draft: 'gray', Sent: 'navy', 'Under Negotiation': 'amber', Accepted: 'teal', Rejected: 'red',
  // orders
  Processing: 'navy', Dispatched: 'amber',
  // payment
  Paid: 'teal', Pending: 'amber', Partial: 'amber',
  // follow-ups
  Today: 'amber', Upcoming: 'navy', Overdue: 'red', Completed: 'teal',
  // products
  Active: 'teal', Inactive: 'gray',
}

export default function Pill({ children, tone }) {
  const resolved = tone || STATUS_TONE[children] || 'gray'
  return <span className={`pill pill-${resolved}`}>{children}</span>
}
