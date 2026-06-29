import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import {
  IconGrid, IconUsers, IconClock, IconUserCheck, IconFlask,
  IconFile, IconCart, IconBox, IconChart, IconLogout, IconPanel,
} from './Icons.jsx'
import '../styles/shell.css'

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconGrid },
  { to: '/leads', label: 'Leads', icon: IconUsers },
  { to: '/follow-ups', label: 'Follow-ups', icon: IconClock },
  { to: '/customers', label: 'Customers', icon: IconUserCheck },
  { to: '/samples', label: 'Samples', icon: IconFlask },
  { to: '/quotations', label: 'Quotations', icon: IconFile },
  { to: '/orders', label: 'Orders', icon: IconCart },
  { to: '/products', label: 'Products', icon: IconBox },
  { to: '/reports', label: 'Reports', icon: IconChart },
]

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/leads': 'Leads',
  '/follow-ups': 'Follow-ups',
  '/customers': 'Customers',
  '/samples': 'Samples',
  '/quotations': 'Quotations',
  '/orders': 'Orders',
  '/products': 'Products',
  '/reports': 'Reports',
}

export default function Shell({ children }) {
  const { user, signOut } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'JSV CRM'

  return (
    <div className="shell">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">JSV</div>
          <div className="brand-text">
            <h1>JSV CRM</h1>
            <p>Food Additives &amp; Chemicals</p>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Workspace</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="iso-pill"><span className="dot" /> ISO 9001:2015 Certified</span>
          <div className="user-row">
            <span className="name">{user?.name || user?.full_name || 'Rahul'} (Admin)</span>
            <span className="role">{user?.title || 'Sales Executive'}</span>
          </div>
          <button className="signout-btn" onClick={signOut}>
            <IconLogout /> Sign out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-toggle" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle navigation">
              <IconPanel width={16} height={16} />
            </button>
            JSV CRM
          </div>
          <div className="topbar-right">
            <span className="iso-pill"><span className="dot" /> ISO 9001:2015 Certified</span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
