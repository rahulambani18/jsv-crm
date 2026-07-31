import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import StatCard from '../components/StatCard.jsx'
import Pill from '../components/Pill.jsx'
import ExportBar from '../components/ExportBar.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { IconRupee, IconFlame, IconReceipt, IconTrend, IconSearch, IconChevronRight } from '../components/Icons.jsx'
import { buildAgingReport, worstBucket, AGING_BUCKETS } from '../lib/aging.js'
import { APP_TODAY } from '../lib/overdue.js'
import '../styles/components.css'
import ColumnChooser from '../components/ColumnChooser.jsx'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'

const STATUS_LABEL = {
  current: 'Current', due0to30: '0–30 days', due30to60: '30–60 days', due60plus: '60+ days',
}
const STATUS_TONE = {
  current: 'teal', due0to30: 'amber', due30to60: 'amber', due60plus: 'red',
}

const RECONCILIATION_COLUMNS = [
  { key: 'company', label: 'Company' },
  { key: 'invoiceCount', label: 'Open Inv.' },
  { key: 'current', label: 'Current' },
  { key: 'due0to30', label: '0–30 Days' },
  { key: 'due30to60', label: '30–60 Days' },
  { key: 'due60plus', label: '60+ Days' },
  { key: 'agingBar', label: 'Ageing' },
  { key: 'total', label: 'Total Outstanding' },
  { key: 'oldestDueDate', label: 'Oldest Due' },
  { key: 'status', label: 'Status' },
]

function formatINR(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

export default function Reconciliation() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const canView = can('payments', 'view')

  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCols, setVisibleCols] = useState(RECONCILIATION_COLUMNS.map((c) => c.key))
  const [search, setSearch] = usePersistedFilter('jsv_filter_reconciliation_search', undefined, '')
  const [bucketFilter, setBucketFilter] = usePersistedFilter('jsv_filter_reconciliation_bucket', undefined, 'all')

  function loadData(silent = false) {
    if (!canView) { setLoading(false); return }
    if (!silent) setLoading(true)
    Promise.all([api.invoices.list(), api.payments.list(), api.customers.list()]).then(([i, p, c]) => {
      setInvoices(i); setPayments(p); setCustomers(c); setLoading(false)
    })
  }

  useEffect(() => { loadData() }, [canView])
  useAutoRefresh(() => loadData(true), 60000)

  const { rows, totals } = useMemo(() => buildAgingReport(invoices, payments), [invoices, payments])

  const customerByCompany = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.company, c])),
    [customers]
  )

  const filtered = useMemo(() => rows.filter((r) => {
    const matchSearch = !search || r.company.toLowerCase().includes(search.toLowerCase())
    const matchBucket = bucketFilter === 'all' || worstBucket(r) === bucketFilter
    return matchSearch && matchBucket
  }), [rows, search, bucketFilter])

  if (!canView) {
    return <EmptyState icon="🔒" title="No access" subtitle="You don't have permission to view this report." />
  }

  if (loading) return <div className="loading-screen">Loading reconciliation…</div>

  return (
    <div>
      <PageHeader
        title="Payments &amp; Invoices Reconciliation"
        subtitle={`Outstanding balance across ${rows.length} customer${rows.length === 1 ? '' : 's'}, aged as of ${APP_TODAY}.`}
        actions={
          <ExportBar
            title="Aging Report"
            headers={['Company', 'Open Invoices', 'Current', '0-30 Days', '30-60 Days', '60+ Days', 'Total Outstanding', 'Oldest Due Date']}
            rows={filtered.map((r) => [r.company, r.invoiceCount, r.current, r.due0to30, r.due30to60, r.due60plus, r.total, r.oldestDueDate || '—'])}
            count={filtered.length}
          />
        }
      />

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <StatCard icon={IconRupee} tone="blue" label="Total Outstanding" value={formatINR(totals.total)} mono />
        <StatCard icon={IconTrend} tone="teal" label="Current (Not Due)" value={formatINR(totals.current)} mono />
        <StatCard icon={IconReceipt} tone="amber" label="0–30 Days" value={formatINR(totals.due0to30)} mono />
        <StatCard icon={IconReceipt} tone="amber" label="30–60 Days" value={formatINR(totals.due30to60)} mono />
        <StatCard icon={IconFlame} tone="red" label="60+ Days" value={formatINR(totals.due60plus)} mono />
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search company…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={bucketFilter} onChange={(e) => setBucketFilter(e.target.value)}>
          <option value="all">All ageing</option>
          {AGING_BUCKETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
        <ColumnChooser columns={RECONCILIATION_COLUMNS} storageKey="jsv_cols_reconciliation" onChange={setVisibleCols} />
      </div>

      <div className="table-wrap sticky-first-col">
        <table className="data-table">
          <thead>
            <tr>
              {visibleCols.map((key) => (
                <th key={key}>{RECONCILIATION_COLUMNS.find((c) => c.key === key)?.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={visibleCols.length + 1}>
                {rows.length === 0 ? (
                  <EmptyState icon="✅" title="No outstanding balances" subtitle="Every invoice is either fully paid or cancelled." />
                ) : (
                  <EmptyState icon="🔍" title="No customers match your filters" subtitle="Try adjusting your search or ageing filter." />
                )}
              </td></tr>
            ) : filtered.map((r) => {
              const cust = customerByCompany[r.company]
              const status = worstBucket(r)
              const cell = (key) => {
                switch (key) {
                  case 'company': return (
                    <td key={key} className="cell-strong">
                      {r.company}
                      {cust?.city && <div style={{ fontSize: 11.5, color: 'var(--ink-400)', fontWeight: 400 }}>{cust.city}</div>}
                    </td>
                  )
                  case 'invoiceCount': return <td key={key} className="cell-mono">{r.invoiceCount}</td>
                  case 'current': return <td key={key} className="cell-mono">{r.current ? formatINR(r.current) : '—'}</td>
                  case 'due0to30': return <td key={key} className="cell-mono">{r.due0to30 ? formatINR(r.due0to30) : '—'}</td>
                  case 'due30to60': return <td key={key} className="cell-mono">{r.due30to60 ? formatINR(r.due30to60) : '—'}</td>
                  case 'due60plus': return (
                    <td key={key} className="cell-mono" style={r.due60plus ? { color: 'var(--red-600)', fontWeight: 600 } : undefined}>
                      {r.due60plus ? formatINR(r.due60plus) : '—'}
                    </td>
                  )
                  case 'agingBar': return (
                    <td key={key} style={{ minWidth: 100 }}>
                      <div className="aging-bar">
                        {AGING_BUCKETS.map((b) => r[b.key] > 0 && (
                          <span key={b.key} className={`aging-seg aging-${b.key}`} style={{ width: `${(r[b.key] / r.total) * 100}%` }} title={`${b.label}: ${formatINR(r[b.key])}`} />
                        ))}
                      </div>
                    </td>
                  )
                  case 'total': return <td key={key} className="cell-mono cell-strong">{formatINR(r.total)}</td>
                  case 'oldestDueDate': return <td key={key} className="cell-mono" style={{ fontSize: 12 }}>{r.oldestDueDate || '—'}</td>
                  case 'status': return <td key={key}><Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill></td>
                  default: return null
                }
              }
              return (
                <tr key={r.company}>
                  {visibleCols.map((key) => cell(key))}
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="View this customer's invoices"
                      onClick={() => navigate(`/invoices?q=${encodeURIComponent(r.company)}`)}
                    >
                      <IconChevronRight width={14} height={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
