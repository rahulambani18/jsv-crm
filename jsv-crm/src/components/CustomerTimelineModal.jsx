import Modal from './Modal.jsx'
import { buildCustomerTimeline } from '../lib/timeline.js'

const TYPE_ICON = {
  Lead: '🎯', Sample: '🧪', Quotation: '📄', Order: '📦',
  Invoice: '🧾', Payment: '💰', Meeting: '🤝', 'Follow-up': '📞',
}

export default function CustomerTimelineModal({ customer, data, onClose }) {
  const events = buildCustomerTimeline(customer.company, data)

  return (
    <Modal title={`${customer.company} — Activity Timeline`} onClose={onClose} footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
      {events.length === 0 ? (
        <p style={{ color: 'var(--ink-500)', fontSize: 13 }}>No activity recorded for this account yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: '60vh', overflowY: 'auto' }}>
          {events.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 2px', borderBottom: i < events.length - 1 ? '1px solid var(--paper-200, #eee)' : 'none' }}>
              <div style={{ fontSize: 18, lineHeight: 1.4 }}>{TYPE_ICON[e.type] || '•'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span className={`pill pill-${e.tone}`} style={{ fontSize: 10.5 }}>{e.type}</span>
                  <span className="cell-mono cell-muted" style={{ fontSize: 11.5 }}>{e.date}</span>
                </div>
                <div className="cell-strong" style={{ marginTop: 4, fontSize: 13 }}>{e.title}</div>
                {e.sub && <div className="cell-muted" style={{ fontSize: 12, marginTop: 2 }}>{e.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
