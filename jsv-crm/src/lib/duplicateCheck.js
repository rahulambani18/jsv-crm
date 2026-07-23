// src/lib/duplicateCheck.js
// Lightweight duplicate detection for Leads and Customers — flags a
// likely duplicate by GST number, phone/mobile, or company name so
// multiple reps entering leads/customers don't create messy dupes.
// Comparison is normalized (case-insensitive, digits-only for phone,
// no spaces/uppercase for GST) so trivial formatting differences
// ("+91 98250 11122" vs "9825011122", "ABC Pvt Ltd" vs "abc pvt ltd")
// don't slip past the check.

function normCompany(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function normGST(v) {
  return String(v || '').replace(/\s+/g, '').toUpperCase()
}

function normPhone(v) {
  const digits = String(v || '').replace(/\D/g, '')
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
}

// Checks `form` against one or more existing record lists (e.g. both
// leads and customers, so a new lead that's already a customer gets
// caught too). `excludeId` skips the record being edited so it doesn't
// flag itself. Checks GST first (most specific), then phone, then
// company name — returns the first match found, or null.
//
// recordLists: array of { records, label } — label is used in the
// message, e.g. "customer" or "lead".
export function findDuplicate(form, recordLists, excludeId) {
  const gst = normGST(form.gst)
  const phone = normPhone(form.mobile || form.phone)
  const company = normCompany(form.company)

  for (const { records, label } of recordLists) {
    const others = (records || []).filter((r) => r.id !== excludeId)

    if (gst) {
      const match = others.find((r) => r.gst && normGST(r.gst) === gst)
      if (match) return { field: 'gst', match, label }
    }
  }
  for (const { records, label } of recordLists) {
    const others = (records || []).filter((r) => r.id !== excludeId)
    if (phone && phone.length >= 7) {
      const match = others.find((r) => normPhone(r.mobile || r.phone) === phone)
      if (match) return { field: 'phone', match, label }
    }
  }
  for (const { records, label } of recordLists) {
    const others = (records || []).filter((r) => r.id !== excludeId)
    if (company) {
      const match = others.find((r) => normCompany(r.company) === company)
      if (match) return { field: 'company', match, label }
    }
  }
  return null
}

export function duplicateMessage(dup) {
  if (!dup) return ''
  const name = dup.match.company || dup.match.contact || 'an existing record'
  if (dup.field === 'gst') return `A ${dup.label} with this GST number already exists — ${name}.`
  if (dup.field === 'phone') return `A ${dup.label} with this phone number already exists — ${name}.`
  return `A ${dup.label} named "${name}" already exists.`
}
