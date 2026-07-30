import { useState } from 'react'
import Modal from './Modal.jsx'
import { generateMockEwayBill } from '../lib/eWayBill.js'
import { showToast } from '../lib/toast.js'

const TRANSPORT_MODES = ['Road', 'Rail', 'Air', 'Ship']

// Opened from the Invoices row menu. Captures the transport details a
// real E-Way Bill needs, then generates a demo EBN + validity date and
// saves them on the invoice. See src/lib/eWayBill.js for why this is a
// placeholder rather than a real filing.
export default function EWayBillModal({ invoice, onClose, onSave }) {
  const [vehicleNo, setVehicleNo] = useState(invoice.ewayVehicleNo || '')
  const [transporter, setTransporter] = useState(invoice.ewayTransporter || '')
  const [transportMode, setTransportMode] = useState(invoice.ewayTransportMode || 'Road')
  const [distanceKm, setDistanceKm] = useState(invoice.ewayDistanceKm || '')
  const [saving, setSaving] = useState(false)

  const alreadyGenerated = !!invoice.ewayBillNo

  async function handleGenerate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const fields = generateMockEwayBill({ distanceKm, issueDate: invoice.issueDate })
      await onSave({
        ...fields,
        ewayVehicleNo: vehicleNo,
        ewayTransporter: transporter,
        ewayTransportMode: transportMode,
        ewayDistanceKm: distanceKm ? Number(distanceKm) : null,
      })
      showToast(`E-Way Bill generated for ${invoice.invoiceNo}`)
    } catch (err) {
      showToast('Could not generate e-way bill: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`E-Way Bill — ${invoice.invoiceNo}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {!alreadyGenerated && (
            <button className="btn btn-primary" form="eway-form" type="submit" disabled={saving}>
              {saving ? 'Generating…' : 'Generate E-Way Bill'}
            </button>
          )}
        </>
      }
    >
      <div style={{ background: 'var(--amber-50, #fff8e6)', border: '1px solid var(--amber-200, #f3d98b)', borderRadius: 8, padding: '10px 12px', fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
        <strong>Demo mode.</strong> This E-Way Bill number is generated locally for workflow purposes — it is not filed with the government E-Way Bill portal and cannot be used to move goods legally. Connect a GSP API to file a real one.
      </div>

      {alreadyGenerated ? (
        <table className="data-table">
          <tbody>
            <tr><td style={{ fontWeight: 600 }}>E-Way Bill No.</td><td className="cell-mono">{invoice.ewayBillNo}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Valid Upto</td><td className="cell-mono">{invoice.ewayValidUpto}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Vehicle No.</td><td className="cell-mono">{invoice.ewayVehicleNo || '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Transporter</td><td>{invoice.ewayTransporter || '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Mode</td><td>{invoice.ewayTransportMode || '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Distance</td><td className="cell-mono">{invoice.ewayDistanceKm ? `${invoice.ewayDistanceKm} km` : '—'}</td></tr>
          </tbody>
        </table>
      ) : (
        <form id="eway-form" onSubmit={handleGenerate}>
          <div className="field">
            <label>Vehicle number</label>
            <input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} placeholder="e.g. MH04AB1234" />
          </div>
          <div className="field">
            <label>Transporter name</label>
            <input value={transporter} onChange={(e) => setTransporter(e.target.value)} placeholder="e.g. VRL Logistics" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Transport mode</label>
              <select value={transportMode} onChange={(e) => setTransportMode(e.target.value)}>
                {TRANSPORT_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Approx. distance (km)</label>
              <input type="number" min="0" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="e.g. 320" />
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
