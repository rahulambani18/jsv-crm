// src/lib/eWayBill.js
//
// !! DEMO ONLY !!
// A real E-Way Bill number is issued by the government's E-Way Bill
// portal (ewaybillgst.gov.in) or a GSP API against it — it's a legal
// requirement for moving goods over ₹50,000 in value and this app has
// no credentials to file one. This generates a placeholder in the
// right shape (12-digit EBN, validity computed the same way the real
// portal computes it) so the workflow is ready to wire up to a real
// API later — see generateMockEwayBill() below for where that call
// would go.

// Same rule the real portal uses: 1 day of validity per 200km
// (regular vehicles), minimum 1 day.
export function computeValidityDays(distanceKm) {
  const km = Number(distanceKm || 0)
  if (km <= 0) return 1
  return Math.max(1, Math.ceil(km / 200))
}

export function addDaysISO(dateStr, days) {
  const d = dateStr ? new Date(dateStr) : new Date()
  return new Date(d.getTime() + days * 86400000).toISOString().slice(0, 10)
}

export function generateMockEwayBillNo() {
  // Real EBNs are 12 digits.
  let out = ''
  for (let i = 0; i < 12; i++) out += Math.floor(Math.random() * 10)
  return out
}

export function generateMockEwayBill({ distanceKm, issueDate } = {}) {
  const validityDays = computeValidityDays(distanceKm)
  return {
    ewayBillNo: generateMockEwayBillNo(),
    ewayValidUpto: addDaysISO(issueDate, validityDays),
  }
}
