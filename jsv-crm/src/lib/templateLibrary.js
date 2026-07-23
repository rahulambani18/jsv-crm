// src/lib/templateLibrary.js
// Editable message-template library for the WhatsApp/Email quick-send
// buttons. Ships with a starter set of templates per category (a rep
// can have several: "Standard", "Gentle nudge", "Firm reminder", ...)
// and can add, edit, or delete their own — all before ever sending
// anything. Stored per-browser in localStorage: these are personal
// quick-send drafts, not shared business records, so no backend table
// is needed for them.

const STORAGE_KEY = 'jsv_message_templates_v1'

// Each category lists the {{placeholders}} its templates can use, so
// the template editor can show reps what's available to insert.
export const CATEGORIES = [
  { key: 'quotation', label: 'Quotation Follow-up', vars: ['company', 'contact', 'quoteNo', 'total', 'validUntil'] },
  { key: 'invoice', label: 'Invoice Notice', vars: ['company', 'invoiceNo', 'total', 'dueDate'] },
  { key: 'paymentReminder', label: 'Payment Reminder', vars: ['company', 'outstanding'] },
  { key: 'sample', label: 'Sample Dispatch', vars: ['company', 'contact', 'products', 'courier', 'tracking'] },
  { key: 'followUp', label: 'Follow-up', vars: ['contact', 'lead', 'notes'] },
]

const SIGNOFF = 'Regards,\nJSV Ingredient'

function defaultTemplates() {
  return {
    quotation: [
      {
        id: 'q-default', name: 'Standard',
        subject: 'Quotation {{quoteNo}} from JSV Ingredient',
        body: `Dear {{company}},\n\nPlease find our quotation {{quoteNo}} for {{total}} (valid until {{validUntil}}).\n\nDo let us know if you have any questions.\n\n${SIGNOFF}`,
        whatsapp: "Hi, this is JSV Ingredient. Sharing quotation {{quoteNo}} for {{company}} — total {{total}}, valid until {{validUntil}}. Please let us know if you'd like to proceed.",
      },
      {
        id: 'q-nudge', name: 'Gentle nudge (no reply yet)',
        subject: 'Following up on quotation {{quoteNo}}',
        body: `Dear {{company}},\n\nJust following up on quotation {{quoteNo}} ({{total}}) sent earlier — happy to answer any questions or revise on quantity or pricing.\n\n${SIGNOFF}`,
        whatsapp: 'Hi, following up on quotation {{quoteNo}} for {{company}} — {{total}}, valid until {{validUntil}}. Any questions on our end, happy to help!',
      },
      {
        id: 'q-expiry', name: 'Expiring soon',
        subject: 'Quotation {{quoteNo}} expires soon',
        body: `Dear {{company}},\n\nA quick reminder that quotation {{quoteNo}} for {{total}} is valid until {{validUntil}}. Let us know if you'd like to proceed before it lapses.\n\n${SIGNOFF}`,
        whatsapp: "Hi, quotation {{quoteNo}} ({{total}}) is valid until {{validUntil}} — let us know if you'd like to go ahead before it expires.",
      },
    ],
    invoice: [
      {
        id: 'i-default', name: 'Standard',
        subject: 'Invoice {{invoiceNo}} from JSV Ingredient',
        body: `Dear {{company}},\n\nPlease find attached invoice {{invoiceNo}} for {{total}}, due on {{dueDate}}.\n\n${SIGNOFF}`,
        whatsapp: 'Hi, this is JSV Ingredient. Invoice {{invoiceNo}} for {{total}} is due on {{dueDate}}. Please share payment confirmation once done. Thank you!',
      },
    ],
    paymentReminder: [
      {
        id: 'p-default', name: 'Standard',
        subject: 'Payment reminder — {{company}}',
        body: `Dear {{company}},\n\nThis is a reminder that you have an outstanding balance of {{outstanding}} with us. Kindly arrange payment at your earliest convenience.\n\n${SIGNOFF}`,
        whatsapp: 'Hi, this is JSV Ingredient. Friendly reminder — outstanding balance of {{outstanding}} on your account. Please arrange payment at your convenience. Thank you!',
      },
      {
        id: 'p-firm', name: 'Firm (overdue)',
        subject: 'Overdue payment — {{company}}',
        body: `Dear {{company}},\n\nOur records show an overdue balance of {{outstanding}}. Please arrange payment urgently to avoid any disruption to upcoming orders.\n\n${SIGNOFF}`,
        whatsapp: 'Hi, this is JSV Ingredient. Your balance of {{outstanding}} is now overdue — please arrange payment urgently. Thank you.',
      },
    ],
    sample: [
      {
        id: 's-default', name: 'Standard',
        subject: 'Sample dispatch update — {{company}}',
        body: `Dear {{contact}},\n\nYour sample ({{products}}) has been dispatched via {{courier}}, tracking #{{tracking}}.\n\n${SIGNOFF}`,
        whatsapp: 'Hi, this is JSV Ingredient. Your sample ({{products}}) is on its way via {{courier}} — tracking #{{tracking}}. Let us know once received!',
      },
      {
        id: 's-followup', name: 'Feedback follow-up',
        subject: 'How was the sample — {{company}}?',
        body: `Dear {{contact}},\n\nHope you received the sample ({{products}}) we sent over. Would love to hear your feedback whenever convenient.\n\n${SIGNOFF}`,
        whatsapp: 'Hi {{contact}}, just checking in on the sample ({{products}}) we sent — any feedback so far?',
      },
    ],
    followUp: [
      {
        id: 'f-default', name: 'Standard',
        subject: 'Following up — {{lead}}',
        body: `Dear {{contact}},\n\nFollowing up regarding: {{notes}}.\n\n${SIGNOFF}`,
        whatsapp: 'Hi {{contact}}, this is JSV Ingredient following up on: {{notes}}.',
      },
    ],
  }
}

function load() {
  let saved = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) saved = JSON.parse(raw)
  } catch {
    saved = null
  }
  const defaults = defaultTemplates()
  if (!saved) return defaults
  // Backfill any category missing from an older save (e.g. app updated
  // with a new category since the person last saved their templates).
  CATEGORIES.forEach((c) => {
    if (!Array.isArray(saved[c.key]) || saved[c.key].length === 0) saved[c.key] = defaults[c.key]
  })
  return saved
}

function persist(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // best-effort — quick-send templates are a convenience, not critical data
  }
}

export function getTemplates(category) {
  return load()[category] || []
}

export function saveTemplate(category, template) {
  const all = load()
  const list = all[category] || []
  const idx = list.findIndex((t) => t.id === template.id)
  const withId = { ...template, id: template.id || `${category}-${Date.now()}` }
  if (idx >= 0) list[idx] = withId
  else list.push(withId)
  all[category] = list
  persist(all)
  return withId
}

export function deleteTemplate(category, id) {
  const all = load()
  all[category] = (all[category] || []).filter((t) => t.id !== id)
  persist(all)
}

export function resetCategory(category) {
  const all = load()
  all[category] = defaultTemplates()[category]
  persist(all)
  return all[category]
}

// Replaces {{var}} placeholders with values from vars. Unknown
// placeholders are left as-is rather than blanked, so a typo in a
// custom template is visible instead of silently dropping text.
export function renderTemplate(str, vars = {}) {
  if (!str) return ''
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    const v = vars[key]
    return v === undefined || v === null || v === '' ? match : String(v)
  })
}
