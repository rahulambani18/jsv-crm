// src/lib/messaging.js
// Quick-send helpers — no backend, no API keys. Builds a wa.me link
// (opens WhatsApp Web/App with the message pre-filled) and a mailto
// link (opens the user's default mail client with subject/body
// pre-filled). The person still presses send themselves.

// Normalizes an Indian-style number ("+91 98250 11122", "098250 11122",
// "9825011122") down to the digits-only form wa.me expects, adding the
// 91 country code when it looks like a bare 10-digit mobile number.
export function cleanPhoneForWhatsApp(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  return digits
}

export function waLink(phone, message) {
  const digits = cleanPhoneForWhatsApp(phone)
  if (!digits) return null
  const text = encodeURIComponent(message || '')
  return `https://wa.me/${digits}${text ? `?text=${text}` : ''}`
}

export function mailtoLink(email, subject, body) {
  if (!email) return null
  const params = new URLSearchParams()
  if (subject) params.set('subject', subject)
  if (body) params.set('body', body)
  const qs = params.toString()
  return `mailto:${email}${qs ? `?${qs}` : ''}`
}

function fmtINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

// Pre-written message templates for each record type so the buttons
// work with one click — the person can still edit before sending.
export const templates = {
  quotation: (q) => ({
    subject: `Quotation ${q.quoteNo} from JSV Ingredient`,
    body: `Dear ${q.company},\n\nPlease find our quotation ${q.quoteNo} for ${fmtINR(q.total)} (valid until ${q.validUntil || '—'}).\n\nDo let us know if you have any questions.\n\nRegards,\nJSV Ingredient`,
    whatsapp: `Hi, this is JSV Ingredient. Sharing quotation ${q.quoteNo} for ${q.company} — total ${fmtINR(q.total)}, valid until ${q.validUntil || '—'}. Please let us know if you'd like to proceed.`,
  }),
  invoice: (i) => ({
    subject: `Invoice ${i.invoiceNo} from JSV Ingredient`,
    body: `Dear ${i.company},\n\nPlease find attached invoice ${i.invoiceNo} dated ${i.issueDate} for ${fmtINR(i.total)}, due on ${i.dueDate || '—'}.\n\nRegards,\nJSV Ingredient`,
    whatsapp: `Hi, this is JSV Ingredient. Invoice ${i.invoiceNo} for ${fmtINR(i.total)} is due on ${i.dueDate || '—'}. Please share payment confirmation once done. Thank you!`,
  }),
  sample: (s) => ({
    subject: `Sample dispatch update — ${s.company}`,
    body: `Dear ${s.contact || s.company},\n\nYour sample${(s.products || []).length ? ` (${(s.products || []).join(', ')})` : ''} has been dispatched${s.courier ? ` via ${s.courier}` : ''}${s.tracking ? `, tracking #${s.tracking}` : ''}.\n\nRegards,\nJSV Ingredient`,
    whatsapp: `Hi, this is JSV Ingredient. Your sample${(s.products || []).length ? ` (${(s.products || []).join(', ')})` : ''} is on its way${s.courier ? ` via ${s.courier}` : ''}${s.tracking ? ` — tracking #${s.tracking}` : ''}. Let us know once received!`,
  }),
  followUp: (f) => ({
    subject: `Following up — ${f.lead || ''}`,
    body: `Dear ${f.contact || f.lead || ''},\n\nFollowing up regarding: ${f.notes || 'our recent conversation'}.\n\nRegards,\nJSV Ingredient`,
    whatsapp: `Hi ${f.contact || ''}, this is JSV Ingredient following up on: ${f.notes || 'our recent conversation'}.`,
  }),
  paymentReminder: (customerName, outstanding) => ({
    subject: `Payment reminder — ${customerName}`,
    body: `Dear ${customerName},\n\nThis is a reminder that you have an outstanding balance of ${fmtINR(outstanding)} with us. Kindly arrange payment at your earliest convenience.\n\nRegards,\nJSV Ingredient`,
    whatsapp: `Hi, this is JSV Ingredient. Friendly reminder — outstanding balance of ${fmtINR(outstanding)} on your account. Please arrange payment at your convenience. Thank you!`,
  }),
}
