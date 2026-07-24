import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { PIPELINE_STAGES } from '../data/seed.js'
import { APP_TODAY, getOverdueInvoices, daysOverdue } from '../lib/overdue.js'
import { getExpiringStock, expiryStatus, daysToExpiry } from '../lib/expiry.js'
import StatCard from '../components/StatCard.jsx'
import Pill from '../components/Pill.jsx'
import {
  IconUsers, IconTrend, IconClock, IconFlame, IconUserCheck,
  IconFile, IconCart, IconRupee, IconBox, IconReceipt, IconChevronRight,
} from '../components/Icons.jsx'
import '../styles/components.css'

const COLORS = ['#0f1e3d', '#0d9488', '#d97706', '#6b81a8', '#b42318', '#a3a9b3']

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [customers, setCustomers] = useState([])
  const [quotations, setQuotations] = useState([])
  const [orders, setOrders] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [invoices, setInvoices] = useState([])
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.leads.list(), api.customers.list(), api.quotations.list(),
      api.orders.list(), api.followUps.list(), api.invoices.list(), api.stock.list(),
    ]).then(([l, c, q, o, f, inv, st]) => {
      setLeads(l); setCustomers(c); setQuotations(q); setOrders(o); setFollowUps(f)
      setInvoices(inv); setStock(st)
      setLoading(false)
    })
  }, [])

  const today = APP_TODAY
  const overdueInvoices = useMemo(() => getOverdueInvoices(invoices, today), [invoices, today])
  const stats = useMemo(() => {
    const newThisMonth = leads.filter((l) => (l.nextFollowUp || '').startsWith('2026-06') || true).length
    const hotLeads = leads.filter((l) => l.priority === 'High').length
    const followUpsToday = followUps.filter((f) => f.status === 'Today').length
    const pendingPayments = orders.filter((o) => o.payment !== 'Paid').reduce((s, o) => s + (o.total || 0), 0)
    const overdueAmount = overdueInvoices.reduce((s, i) => s + Number(i.total || 0), 0)
    return {
      totalLeads: leads.length,
      newThisMonth: leads.length,
      followUpsToday,
      hotLeads,
      activeCustomers: customers.length,
      quotationsSent: quotations.length,
      ordersReceived: orders.length,
      pendingPayments,
      overdueCount: overdueInvoices.length,
      overdueAmount,
    }
  }, [leads, customers, quotations, orders, followUps, overdueInvoices])

  const funnelData = useMemo(() => {
    // Stage 0 ("New Lead") always has the highest count, since every later
    // stage is a subset of leads that progressed at least that far.
    const max = Math.max(1, leads.length)
    return PIPELINE_STAGES.map((stage, i) => {
      const count = leads.filter((l) => PIPELINE_STAGES.indexOf(l.status) >= i).length
      return { stage, count, pct: Math.round((count / max) * 100) }
    })
  }, [leads])

  const industryData = useMemo(() => {
    const counts = {}
    leads.forEach((l) => { counts[l.industry] = (counts[l.industry] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [leads])

  // "Attention needed" — the handful of things across other modules that
  // are actionable right now, surfaced here so the day can start from one
  // screen instead of clicking into Follow-ups / Inventory / Invoices to
  // find out what's overdue.
  const attention = useMemo(() => {
    const overdueFollowUps = followUps
      .filter((f) => f.status === 'Overdue')
      .map((f) => ({
        key: `f-${f.id}`, tone: 'red', icon: IconClock,
        title: f.lead || f.contact || 'Follow-up',
        detail: f.notes || 'Overdue follow-up',
        route: '/follow-ups',
      }))

    const lowStock = stock
      .filter((s) => Number(s.reorderLevel) > 0 && Number(s.qtyOnHand) <= Number(s.reorderLevel))
      .map((s) => ({
        key: `s-${s.id}`, tone: s.qtyOnHand === 0 ? 'red' : 'amber', icon: IconBox,
        title: s.product,
        detail: `${s.qtyOnHand} ${s.unit} left at ${s.warehouse} (reorder at ${s.reorderLevel})`,
        route: '/inventory',
      }))

    const overdueInvoiceAlerts = overdueInvoices.map((i) => ({
      key: `i-${i.id}`, tone: 'red', icon: IconReceipt,
      title: i.company,
      detail: `${i.invoiceNo} · ${formatINR(i.total)} · ${daysOverdue(i.dueDate, today)} day${daysOverdue(i.dueDate, today) === 1 ? '' : 's'} overdue (due ${i.dueDate})`,
      route: '/invoices',
    }))

    return [...overdueFollowUps, ...overdueInvoiceAlerts, ...lowStock]
  }, [followUps, stock, overdueInvoices, today])

  // Dedicated warehouse widgets — Low Stock and Expiry Products — so
  // the day can start from the Dashboard without a trip to Inventory.
  const lowStockItems = useMemo(() => {
    return stock
      .filter((s) => Number(s.reorderLevel) > 0 && Number(s.qtyOnHand) <= Number(s.reorderLevel))
      .sort((a, b) => Number(a.qtyOnHand) - Number(b.qtyOnHand))
  }, [stock])

  const expiringItems = useMemo(() => getExpiringStock(stock, today), [stock, today])

  if (loading) return <div className="loading-screen">Loading dashboard…</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Welcome back, {user?.name || 'Rahul'}</h2>
          <p>Your sales pipeline · Thursday, 25 June 2026</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon={IconUsers} tone="blue" label="Total Leads" value={stats.totalLeads} onClick={() => navigate('/leads')} />
        <StatCard icon={IconTrend} tone="teal" label="New This Month" value={stats.newThisMonth} onClick={() => navigate('/leads')} />
        <StatCard icon={IconClock} tone="amber" label="Follow-ups Today" value={stats.followUpsToday} onClick={() => navigate('/follow-ups')} />
        <StatCard icon={IconFlame} tone="red" label="Hot Leads" value={stats.hotLeads} onClick={() => navigate('/leads?priority=High')} />
        <StatCard icon={IconUserCheck} tone="blue" label="Active Customers" value={stats.activeCustomers} onClick={() => navigate('/customers')} />
        <StatCard icon={IconFile} tone="teal" label="Quotations Sent" value={stats.quotationsSent} onClick={() => navigate('/quotations')} />
        <StatCard icon={IconCart} tone="blue" label="Orders Received" value={stats.ordersReceived} onClick={() => navigate('/orders')} />
        <StatCard icon={IconRupee} tone="red" label="Pending Payments" value={formatINR(stats.pendingPayments)} mono onClick={() => navigate('/orders?payment=Pending')} />
        <StatCard icon={IconReceipt} tone="red" label="Overdue Invoices" value={`${stats.overdueCount} · ${formatINR(stats.overdueAmount)}`} mono onClick={() => navigate('/invoices?overdue=1')} />
      </div>

      {attention.length > 0 && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <p className="panel-title">Attention Needed ({attention.length})</p>
          <div className="attention-list">
            {attention.map((a) => (
              <button
                key={a.key}
                className="attention-row"
                onClick={() => navigate(a.route)}
              >
                <span className={`attention-icon ${a.tone}`}><a.icon /></span>
                <span className="attention-text">
                  <span className="attention-title">{a.title}</span>
                  <span className="attention-detail">{a.detail}</span>
                </span>
                <Pill tone={a.tone}>{a.tone === 'red' ? 'Urgent' : 'Attention'}</Pill>
                <IconChevronRight />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="panel-row">
        <div className="panel">
          <p className="panel-title">Low Stock {lowStockItems.length > 0 && `(${lowStockItems.length})`}</p>
          {lowStockItems.length === 0 ? (
            <p style={{ color: 'var(--ink-300)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Everything is above its reorder level.</p>
          ) : (
            <div className="attention-list">
              {lowStockItems.map((s) => (
                <button
                  key={s.id}
                  className="attention-row"
                  onClick={() => navigate('/inventory')}
                >
                  <span className={`attention-icon ${s.qtyOnHand === 0 ? 'red' : 'amber'}`}><IconBox /></span>
                  <span className="attention-text">
                    <span className="attention-title">{s.product}</span>
                    <span className="attention-detail">{Number(s.qtyOnHand).toLocaleString('en-IN')} {s.unit} · {s.warehouse}</span>
                  </span>
                  <span style={{ flex: '0 0 auto', fontSize: 15 }}>{s.qtyOnHand === 0 ? '🚫' : '⚠️'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <p className="panel-title">Expiry Products {expiringItems.length > 0 && `(${expiringItems.length})`}</p>
          {expiringItems.length === 0 ? (
            <p style={{ color: 'var(--ink-300)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No batches expired or expiring soon.</p>
          ) : (
            <div className="attention-list">
              {expiringItems.map((s) => {
                const expired = expiryStatus(s, today) === 'Expired'
                const days = daysToExpiry(s.expiryDate, today)
                return (
                  <button
                    key={s.id}
                    className="attention-row"
                    onClick={() => navigate('/inventory')}
                  >
                    <span className={`attention-icon ${expired ? 'red' : 'amber'}`}><IconClock /></span>
                    <span className="attention-text">
                      <span className="attention-title">{s.product}</span>
                      <span className="attention-detail">
                        {Number(s.qtyOnHand).toLocaleString('en-IN')} {s.unit} · {s.warehouse} · {expired ? `expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago` : `expires in ${days} day${days === 1 ? '' : 's'}`}
                      </span>
                    </span>
                    <span style={{ flex: '0 0 auto', fontSize: 15 }}>⚠️</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="panel-row">
        <div className="panel">
          <p className="panel-title">Lead Source Analysis</p>
          {industryData.length === 0 ? (
            <p style={{ color: 'var(--ink-300)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No leads yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={industryData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                  {industryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel">
          <p className="panel-title">Pipeline by Status</p>
          <div className="funnel">
            {funnelData.map((row) => (
              <div
                className="funnel-row clickable"
                key={row.stage}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/leads?status=${encodeURIComponent(row.stage)}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/leads?status=${encodeURIComponent(row.stage)}`) } }}
              >
                <div className="funnel-label">{row.stage}</div>
                <div className="funnel-track">
                  <div className="funnel-fill" style={{ width: `${row.pct}%` }} />
                </div>
                <div className="funnel-count">{row.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
