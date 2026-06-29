import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { PIPELINE_STAGES } from '../data/seed.js'
import StatCard from '../components/StatCard.jsx'
import {
  IconUsers, IconTrend, IconClock, IconFlame, IconUserCheck,
  IconFile, IconCart, IconRupee,
} from '../components/Icons.jsx'
import '../styles/components.css'

const COLORS = ['#0f1e3d', '#0d9488', '#d97706', '#6b81a8', '#b42318', '#a3a9b3']

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

export default function Dashboard() {
  const { user } = useAuth()
  const [leads, setLeads] = useState([])
  const [customers, setCustomers] = useState([])
  const [quotations, setQuotations] = useState([])
  const [orders, setOrders] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.leads.list(), api.customers.list(), api.quotations.list(),
      api.orders.list(), api.followUps.list(),
    ]).then(([l, c, q, o, f]) => {
      setLeads(l); setCustomers(c); setQuotations(q); setOrders(o); setFollowUps(f)
      setLoading(false)
    })
  }, [])

  const today = '2026-06-25'
  const stats = useMemo(() => {
    const newThisMonth = leads.filter((l) => (l.nextFollowUp || '').startsWith('2026-06') || true).length
    const hotLeads = leads.filter((l) => l.priority === 'High').length
    const followUpsToday = followUps.filter((f) => f.status === 'Today').length
    const pendingPayments = orders.filter((o) => o.payment !== 'Paid').reduce((s, o) => s + (o.total || 0), 0)
    return {
      totalLeads: leads.length,
      newThisMonth: leads.length,
      followUpsToday,
      hotLeads,
      activeCustomers: customers.length,
      quotationsSent: quotations.length,
      ordersReceived: orders.length,
      pendingPayments,
    }
  }, [leads, customers, quotations, orders, followUps])

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
        <StatCard icon={IconUsers} tone="blue" label="Total Leads" value={stats.totalLeads} />
        <StatCard icon={IconTrend} tone="teal" label="New This Month" value={stats.newThisMonth} />
        <StatCard icon={IconClock} tone="amber" label="Follow-ups Today" value={stats.followUpsToday} />
        <StatCard icon={IconFlame} tone="red" label="Hot Leads" value={stats.hotLeads} />
        <StatCard icon={IconUserCheck} tone="blue" label="Active Customers" value={stats.activeCustomers} />
        <StatCard icon={IconFile} tone="teal" label="Quotations Sent" value={stats.quotationsSent} />
        <StatCard icon={IconCart} tone="amber" label="Orders Received" value={stats.ordersReceived} />
        <StatCard icon={IconRupee} tone="red" label="Pending Payments" value={formatINR(stats.pendingPayments)} mono />
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
              <div className="funnel-row" key={row.stage}>
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
