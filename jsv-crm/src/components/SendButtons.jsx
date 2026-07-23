import { useState } from 'react'
import { waLink, mailtoLink } from '../lib/messaging.js'
import TemplatePickerModal from './TemplatePickerModal.jsx'

// Small icon-button pair used in table rows across Quotations, Invoices,
// Samples, Follow-ups and Leads.
//
// Preferred usage: pass `category` (one of the keys in
// templateLibrary.js: quotation/invoice/paymentReminder/sample/followUp)
// plus `vars` (the values to fill into that template, e.g. { company,
// quoteNo, total, validUntil }). Clicking either button opens a picker
// so the rep can choose from several saved templates, edit the message,
// and send — or manage the template library itself.
//
// Legacy usage (still supported): pass whatsappMessage/mailSubject/
// mailBody directly and the buttons send that fixed message with no
// picker, exactly as before.
export default function SendButtons({ phone, email, whatsappMessage, mailSubject, mailBody, category, vars, size = 'sm' }) {
  const [open, setOpen] = useState(false)

  if (category) {
    const hasContact = !!(phone || email)
    return (
      <>
        <button
          type="button"
          className={`btn btn-ghost btn-${size}`}
          disabled={!hasContact}
          title={hasContact ? 'Send a message' : 'No phone or email on file'}
          onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        >
          💬
        </button>
        <TemplatePickerModal
          open={open}
          onClose={() => setOpen(false)}
          category={category}
          vars={vars || {}}
          phone={phone}
          email={email}
        />
      </>
    )
  }

  const wa = waLink(phone, whatsappMessage)
  const mail = mailtoLink(email, mailSubject, mailBody)

  return (
    <>
      <button
        type="button"
        className={`btn btn-ghost btn-${size}`}
        disabled={!wa}
        title={wa ? 'Send via WhatsApp' : 'No phone number on file'}
        onClick={(e) => { e.stopPropagation(); if (wa) window.open(wa, '_blank', 'noopener') }}
      >
        💬
      </button>
      <button
        type="button"
        className={`btn btn-ghost btn-${size}`}
        disabled={!mail}
        title={mail ? 'Send via Email' : 'No email on file'}
        onClick={(e) => { e.stopPropagation(); if (mail) window.location.href = mail }}
      >
        ✉️
      </button>
    </>
  )
}
