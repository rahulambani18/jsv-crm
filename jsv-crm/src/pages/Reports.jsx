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
import { IconUsers, IconTrend, IconCart, IconRupee } from '../components/Icons.jsx'
import { REPORT_PERIODS, periodRange, isWithinRange, periodLabel } from '../lib/reportPeriods.js'
import { showToast } from '../lib/toast.js'
import '../styles/components.css'

const COLORS = ['#0f1e3d', '#0d9488', '#d97706', '#6b81a8', '#b42318', '#a3a9b3']

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

export default function Reports() {
  const [leads, setLeads] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [period, setPeriod] = useState(REPORT_PERIODS.includes(searchParams.get('period')) ? searchParams.get('period') : 'All')
  const [showShare, setShowShare] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)

  useEffect(() => {
    Promise.all([api.leads.list(), api.orders.list()]).then(([l, o]) => {
      setLeads(l); setOrders(o); setLoading(false)
    })
  }, [])

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
  ], [totalLeads, conversionRate, filteredOrders.length, totalRevenue, funnelData, industryData, warehouseData])

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

  if (loading) return <div className="loading-screen">Loading reports…</div>

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
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard icon={IconUsers} tone="blue" label="Total Leads" value={totalLeads} />
        <StatCard icon={IconTrend} tone="teal" label="Conversion Rate" value={`${conversionRate}%`} />
        <StatCard icon={IconCart} tone="amber" label="Total Orders" value={orders.length} />
        <StatCard icon={IconRupee} tone="blue" label="Total Revenue" value={formatINR(totalRevenue)} mono />
      </div>

      <div className="panel-row">
        <div className="panel">
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

        <div className="panel">
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

        <div className="panel">
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

      <ReportShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        subject={shareSubject}
        message={shareMessage}
      />
    </div>
  )
}
