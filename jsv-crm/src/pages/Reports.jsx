import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts'
import { api } from '../lib/api.js'
import { PIPELINE_STAGES } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import StatCard from '../components/StatCard.jsx'
import ExportBar from '../components/ExportBar.jsx'
import ReportShareModal from '../components/ReportShareModal.jsx'
import Pill from '../components/Pill.jsx'
import SendButtons from '../components/SendButtons.jsx'
import { IconUsers, IconTrend, IconCart, IconRupee, IconAlertTriangle, IconClock } from '../components/Icons.jsx'
import { REPORT_PERIODS, periodRange, isWithinRange, periodLabel } from '../lib/reportPeriods.js'
import { showToast } from '../lib/toast.js'
import CardSkeleton from '../components/CardSkeleton.jsx'
import ClearFiltersButton from '../components/ClearFiltersButton.jsx'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'
import { useSectionScroll } from '../lib/useSectionScroll.js'
import '../styles/components.css'

const COLORS = ['#0f1e3d', '#0d9488', '#d97706', '#6b81a8', '#b42318', '#a3a9b3']

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

export default function Reports() {
  const [leads, setLeads] = useState([])
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [stock, setStock] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [period, setPeriod, periodMeta] = usePersistedFilter(
    'jsv_filter_reports_period',
    REPORT_PERIODS.includes(searchParams.get('period')) ? searchParams.get('period') : undefined,
    'All'
  )
  const [showShare, setShowShare] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const { sectionRef, scrollTo, flashClass } = useSectionScroll()

  function loadData(silent = false) {
    if (!silent) setLoading(true)
    return Promise.all([
      api.leads.list(), api.orders.list(), api.users.list().catch(() => []),
      api.stock.list().catch(() => []), api.customers.list().catch(() => []),
    ]).then(([l, o, u, st, c]) => {
      setLeads(l); setOrders(o); setUsers(u); setStock(st); setCustomers(c); setLoading(false)
    })
  }

  useEffect(() => { loadData() }, [])
  useAutoRefresh(() => loadData(true), 60000)

  useEffect(() => {
    setSearchParams(period === 'All' ? {} : { period }, { replace: true })
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  const range = useMemo(() => periodRange(period), [period])

  // Orders are filtered by orderDate (a real business date on every
  // record). Leads only get a reliable createdAt from the real
  // Supabase backend — mock/demo leads without one are kept rather
  // than dropped, per isWithinRange's fallback.
  const filteredOrders = useMemo(() => orders.filter((o) => isWithinRange(o.orderDate, range)), [orders, range])
  const filteredLeads = useMemo(() => leads.filter((l) => isWithinRange(l.createdAt, range)), [leads, range])

  const totalLeads = filteredLeads.length
  const converted = filteredLeads.filter((l) => l.status === 'Converted Customer').length
  const conversionRate = totalLeads ? Math.round((converted / totalLeads) * 100) : 0
  const totalRevenue = filteredOrders.reduce((s, o) => s + (o.total || 0), 0)

  const funnelData = useMemo(() => {
    const max = Math.max(1, filteredLeads.length)
    return PIPELINE_STAGES.map((stage, i) => {
      const count = filteredLeads.filter((l) => PIPELINE_STAGES.indexOf(l.status) >= i).length
      return { stage, count, pct: Math.round((count / max) * 100) }
    })
  }, [filteredLeads])

  const revenueByMonth = useMemo(() => {
    const months = ['Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26']
    const byMonth = Object.fromEntries(months.map((m) => [m, 0]))
    orders.forEach((o) => {
      const d = new Date(o.orderDate)
      if (isNaN(d)) return
      const label = d.toLocaleString('en-US', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2)
      if (byMonth[label] !== undefined) byMonth[label] += o.total
    })
    return months.map((m) => ({ month: m, revenue: byMonth[m] }))
  }, [orders])

  const industryData = useMemo(() => {
    const counts = {}
    filteredLeads.forEach((l) => { counts[l.industry] = (counts[l.industry] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredLeads])

  const warehouseData = useMemo(() => {
    const counts = {}
    filteredOrders.forEach((o) => { counts[o.warehouse] = (counts[o.warehouse] || 0) + 1 })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [filteredOrders])

  // Sales revenue split by the rep each order is assigned to (Orders'
  // "Assign to…" bulk action). Orders with no rep set yet are grouped
  // under "Unassigned" rather than dropped, so the total still ties
  // back to Total Revenue above.
  const revenueByRep = useMemo(() => {
    const totals = {}
    filteredOrders.forEach((o) => {
      const rep = o.assignedTo || 'Unassigned'
      totals[rep] = (totals[rep] || 0) + Number(o.total || 0)
    })
    return Object.entries(totals)
      .map(([rep, revenue]) => ({ rep, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [filteredOrders])

  // ---------- Reorder suggestions (demand forecasting) ----------
  // Looks at the last 90 days of dispatched quantity per product across
  // all orders (not just the selected report period — a reorder call
  // needs the real consumption trend, not a filtered slice of it),
  // turns that into an average daily consumption rate, then compares it
  // against total stock on hand right now. A product is flagged once
  // its current stock would run out inside the lead-time buffer below.
  const REORDER_LEAD_DAYS = 30 // how much cover we want left when reordering
  const reorderSuggestions = useMemo(() => {
    const now = new Date()
    const since = new Date(now.getTime() - 90 * 86400000)
    const consumed = {}
    orders.forEach((o) => {
      const d = new Date(o.orderDate)
      if (isNaN(d) || d < since) return
      ;(o.lineItems || []).forEach((li) => {
        if (!li.product) return
        consumed[li.product] = (consumed[li.product] || 0) + (Number(li.qty) || 0)
      })
    })
    const stockByProduct = {}
    stock.forEach((s) => {
      stockByProduct[s.product] = (stockByProduct[s.product] || 0) + (Number(s.qtyOnHand) || 0)
    })
    const allProducts = new Set([...Object.keys(consumed), ...Object.keys(stockByProduct)])
    const rows = [...allProducts].map((product) => {
      const totalConsumed = consumed[product] || 0
      const avgDaily = totalConsumed / 90
      const onHand = stockByProduct[product] || 0
      const daysCover = avgDaily > 0 ? onHand / avgDaily : (onHand > 0 ? Infinity : 0)
      const targetStock = Math.ceil(avgDaily * REORDER_LEAD_DAYS * 1.5)
      const suggestedQty = avgDaily > 0 ? Math.max(0, targetStock - onHand) : 0
      return { product, onHand, avgMonthly: Math.round(avgDaily * 30), daysCover, suggestedQty }
    })
    return rows
      .filter((r) => r.avgMonthly > 0 && r.daysCover < REORDER_LEAD_DAYS)
      .sort((a, b) => a.daysCover - b.daysCover)
      .slice(0, 8)
  }, [orders, stock])

  // ---------- At-risk / churn-risk customers ----------
  // For each company with at least 2 past orders, works out their usual
  // ordering cadence (average gap between consecutive orders) and flags
  // them once the silence since their last order has run well past that
  // — e.g. a customer who ordered roughly monthly and hasn't shown up
  // in ~10 weeks. Single-order customers are skipped: there's no cadence
  // yet to judge them against, so "gone quiet" doesn't apply.
  const atRiskCustomers = useMemo(() => {
    const now = new Date()
    const byCompany = {}
    orders.forEach((o) => {
      const d = new Date(o.orderDate)
      if (isNaN(d) || !o.company) return
      ;(byCompany[o.company] ||= []).push(d)
    })
    const rows = Object.entries(byCompany)
      .filter(([, dates]) => dates.length >= 2)
      .map(([company, dates]) => {
        dates.sort((a, b) => a - b)
        const gaps = []
        for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / 86400000)
        const avgGapDays = gaps.reduce((s, g) => s + g, 0) / gaps.length
        const lastOrder = dates[dates.length - 1]
        const daysSince = (now - lastOrder) / 86400000
        const riskRatio = avgGapDays > 0 ? daysSince / avgGapDays : 0
        return { company, avgGapDays, daysSince, riskRatio, lastOrder }
      })
      // Flag once silence is ~1.8x their normal gap, capped so a
      // customer with a huge natural gap (e.g. seasonal, every 6
      // months) doesn't get flagged after one slightly-late order.
      .filter((r) => r.riskRatio >= 1.8 && r.avgGapDays <= 90)
      .sort((a, b) => b.riskRatio - a.riskRatio)
      .slice(0, 8)
      .map((r) => {
        const customer = customers.find((c) => c.company === r.company)
        return { ...r, customer }
      })
    return rows
  }, [orders, customers])

  // Flat metric list reused by Download PDF / Download Excel (via
  // ExportBar) so the exported file matches what's on screen for the
  // selected period, not just the raw table data.
  const summaryRows = useMemo(() => [
    ['Total Leads', totalLeads],
    ['Conversion Rate', `${conversionRate}%`],
    ['Total Orders', filteredOrders.length],
    ['Total Revenue', formatINR(totalRevenue)],
    ...funnelData.map((f) => [`Pipeline — ${f.stage}`, f.count]),
    ...industryData.map((i) => [`Industry — ${i.name}`, i.value]),
    ...warehouseData.map((w) => [`Warehouse — ${w.name}`, w.count]),
    ...revenueByRep.map((r) => [`Revenue — ${r.rep}`, formatINR(r.revenue)]),
    ...reorderSuggestions.map((r) => [`Reorder — ${r.product}`, `${r.suggestedQty} kg (${Math.floor(r.daysCover)}d cover left)`]),
    ...atRiskCustomers.map((r) => [`At-risk — ${r.company}`, `${Math.floor(r.daysSince)}d since last order (usual ~${Math.round(r.avgGapDays)}d)`]),
  ], [totalLeads, conversionRate, filteredOrders.length, totalRevenue, funnelData, industryData, warehouseData, revenueByRep, reorderSuggestions, atRiskCustomers])

  const shareSubject = `JSV Ingredient — Sales Report (${periodLabel(period)})`
  const shareMessage = useMemo(() => [
    shareSubject,
    `Total Leads: ${totalLeads}`,
    `Conversion Rate: ${conversionRate}%`,
    `Total Orders: ${filteredOrders.length}`,
    `Total Revenue: ${formatINR(totalRevenue)}`,
    `Generated on ${new Date().toLocaleString('en-IN')}`,
  ].join('\n'), [shareSubject, totalLeads, conversionRate, filteredOrders.length, totalRevenue])

  // Encodes this exact filtered view (current URL, period included) as
  // a scannable QR so the report can be pulled up on a phone in one
  // scan instead of retyping the URL.
  async function handleDownloadQR() {
    setQrLoading(true)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('period', period)
      const dataUrl = await QRCode.toDataURL(url.toString(), {
        width: 320, margin: 1, color: { dark: '#0f1e3d', light: '#ffffff' },
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `jsv-report-${period.toLowerCase()}-qr.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      showToast('Could not generate QR code: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setQrLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Reports" subtitle="Lead conversion, sales performance, revenue, industries and orders." />
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel" style={{ padding: '16px 18px' }}>
              <span className="skeleton-cell" style={{ width: '50%', height: 11, marginBottom: 12 }} />
              <span className="skeleton-cell" style={{ width: '70%', height: 20 }} />
            </div>
          ))}
        </div>
        <div className="panel-row" aria-hidden="true">
          <div className="panel">
            <span className="skeleton-cell" style={{ width: '40%', height: 13, marginBottom: 16 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="skeleton-cell" style={{ width: `${50 + (i * 9) % 40}%`, height: 12, marginBottom: 12 }} />
            ))}
          </div>
          <div className="panel">
            <span className="skeleton-cell" style={{ width: '45%', height: 13, marginBottom: 16 }} />
            <span className="skeleton-cell" style={{ width: '100%', height: 200 }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Lead conversion, sales performance, revenue, industries and orders."
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title={`Sales Report — ${periodLabel(period)}`}
              headers={['Metric', 'Value']}
              rows={summaryRows}
              count={summaryRows.length}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowShare(true)}>
              📧 Email / WhatsApp
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownloadQR} disabled={qrLoading}>
              {qrLoading ? 'Generating…' : '▦ Download QR'}
            </button>
          </div>
        }
      />

      <div className="filters-bar">
        {REPORT_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost-light'}`}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
        <ClearFiltersButton filters={[periodMeta]} onClear={() => periodMeta.clear()} />
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard icon={IconUsers} tone="blue" label="Total Leads" value={totalLeads} onClick={() => scrollTo('funnel')} />
        <StatCard icon={IconTrend} tone="teal" label="Conversion Rate" value={`${conversionRate}%`} onClick={() => scrollTo('funnel')} />
        <StatCard icon={IconCart} tone="amber" label="Total Orders" value={orders.length} onClick={() => scrollTo('warehouse')} />
        <StatCard icon={IconRupee} tone="blue" label="Total Revenue" value={formatINR(totalRevenue)} mono onClick={() => scrollTo('revenue')} />
      </div>

      <div className="panel-row">
        <div ref={sectionRef('funnel')} className={`panel ${flashClass('funnel')}`}>
          <p className="panel-title">Lead Conversion Funnel</p>
          <div className="funnel">
            {funnelData.map((row) => (
              <div className="funnel-row" key={row.stage}>
                <div className="funnel-label">{row.stage}</div>
                <div className="funnel-track"><div className="funnel-fill" style={{ width: `${row.pct}%` }} /></div>
                <div className="funnel-count">{row.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div ref={sectionRef('revenue')} className={`panel ${flashClass('revenue')}`}>
          <p className="panel-title">Revenue (Last 7 Months)</p>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-200)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `₹${v / 1000}k`} tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4, fill: '#0d9488' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel-row">
        <div className="panel">
          <p className="panel-title">Industry Distribution</p>
          {industryData.length === 0 ? (
            <p style={{ color: 'var(--ink-300)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No leads yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={industryData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
                  {industryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div ref={sectionRef('warehouse')} className={`panel ${flashClass('warehouse')}`}>
          <p className="panel-title">Orders by Warehouse</p>
          {warehouseData.length === 0 ? (
            <p style={{ color: 'var(--ink-300)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No orders yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={warehouseData} layout="vertical" margin={{ left: 24 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11.5, fill: 'var(--ink-700)' }} axisLine={false} tickLine={false} width={140} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f1e3d" radius={[0, 4, 4, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="panel-row">
        <div className="panel" style={{ flex: '1 1 100%' }}>
          <p className="panel-title">Sales Revenue by Salesperson</p>
          {revenueByRep.length === 0 ? (
            <p style={{ color: 'var(--ink-300)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No orders yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, revenueByRep.length * 42)}>
              <BarChart data={revenueByRep} layout="vertical" margin={{ left: 24 }}>
                <XAxis type="number" tickFormatter={(v) => `₹${v / 1000}k`} tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="rep" tick={{ fontSize: 11.5, fill: 'var(--ink-700)' }} axisLine={false} tickLine={false} width={140} />
                <Tooltip formatter={(v) => formatINR(v)} />
                <Bar dataKey="revenue" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="panel-row">
        <div className="panel">
          <p className="panel-title">
            <IconAlertTriangle width={14} height={14} style={{ verticalAlign: -2, marginRight: 4 }} />
            Reorder Suggestions
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: -8, marginBottom: 12 }}>
            Based on the last 90 days of order demand vs. stock on hand — flags products that'll run out inside a {REORDER_LEAD_DAYS}-day reorder window.
          </p>
          {reorderSuggestions.length === 0 ? (
            <p style={{ color: 'var(--ink-300)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Nothing needs reordering right now.</p>
          ) : (
            <table className="data-table" style={{ fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th>Product</th><th>On Hand</th><th>Avg / mo</th><th>Cover Left</th><th>Suggested Reorder</th>
                </tr>
              </thead>
              <tbody>
                {reorderSuggestions.map((r) => (
                  <tr key={r.product}>
                    <td className="cell-strong">{r.product}</td>
                    <td className="cell-mono">{r.onHand}</td>
                    <td className="cell-mono">{r.avgMonthly}</td>
                    <td>
                      <Pill tone={r.daysCover <= 7 ? 'red' : r.daysCover <= 15 ? 'amber' : 'gray'}>
                        {Number.isFinite(r.daysCover) ? `${Math.floor(r.daysCover)}d` : '—'}
                      </Pill>
                    </td>
                    <td className="cell-mono cell-strong">{r.suggestedQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <p className="panel-title">
            <IconClock width={14} height={14} style={{ verticalAlign: -2, marginRight: 4 }} />
            At-Risk Customers
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: -8, marginBottom: 12 }}>
            Repeat customers who've gone quiet well past their usual ordering rhythm.
          </p>
          {atRiskCustomers.length === 0 ? (
            <p style={{ color: 'var(--ink-300)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No customers look at risk right now.</p>
          ) : (
            <table className="data-table" style={{ fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th>Company</th><th>Usual gap</th><th>Since last order</th><th></th>
                </tr>
              </thead>
              <tbody>
                {atRiskCustomers.map((r) => (
                  <tr key={r.company}>
                    <td className="cell-strong">{r.company}</td>
                    <td className="cell-mono">~{Math.round(r.avgGapDays)}d</td>
                    <td>
                      <Pill tone={r.riskRatio >= 3 ? 'red' : 'amber'}>{Math.floor(r.daysSince)}d</Pill>
                    </td>
                    <td>
                      <SendButtons
                        phone={r.customer?.mobile}
                        email={r.customer?.email}
                        category="followUp"
                        vars={{ contact: r.customer?.contact, lead: r.company, notes: `Hasn't ordered in ${Math.floor(r.daysSince)} days (usual ~${Math.round(r.avgGapDays)}d) — quick check-in.` }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ReportShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        subject={shareSubject}
        message={shareMessage}
      />
    </div>
  )
}
