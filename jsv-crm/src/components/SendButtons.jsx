import { waLink, mailtoLink } from '../lib/messaging.js'

// Small icon-button pair used in table rows across Quotations, Invoices,
// Samples, Follow-ups and Customers. Opens WhatsApp Web/App or the
// person's mail client with the message pre-filled — nothing is sent
// automatically, no backend involved.
export default function SendButtons({ phone, email, whatsappMessage, mailSubject, mailBody, size = 'sm' }) {
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
