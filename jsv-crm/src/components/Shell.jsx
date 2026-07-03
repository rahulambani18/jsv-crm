import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import {
  IconGrid, IconUsers, IconClock, IconUserCheck, IconFlask,
  IconFile, IconCart, IconBox, IconChart, IconLogout, IconPanel, IconShield,
} from './Icons.jsx'
import jsvMark from '../assets/jsv-mark.png'
import '../styles/shell.css'

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconGrid, key: 'dashboard' },
  { to: '/leads', label: 'Leads', icon: IconUsers, key: 'leads' },
  { to: '/follow-ups', label: 'Follow-ups', icon: IconClock, key: 'follow_ups' },
  { to: '/customers', label: 'Customers', icon: IconUserCheck, key: 'customers' },
  { to: '/samples', label: 'Samples', icon: IconFlask, key: 'samples' },
  { to: '/quotations', label: 'Quotations', icon: IconFile, key: 'quotations' },
  { to: '/orders', label: 'Orders', icon: IconCart, key: 'orders' },
  { to: '/products', label: 'Products', icon: IconBox, key: 'products' },
  { to: '/reports', label: 'Reports', icon: IconChart, key: 'reports' },
]

const ADMIN_NAV = [
  { to: '/users', label: 'Users & Roles', icon: IconShield, key: 'users' },
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
  '/users': 'Users & Roles',
}

export default function Shell({ children }) {
  const { user, signOut, can } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'JSV CRM'

  const visibleNav = NAV.filter((item) => can(item.key, 'view'))
  const visibleAdminNav = ADMIN_NAV.filter((item) => can(item.key, 'view'))

  return (
    <div className="shell">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src={jsvMark} alt="JSV" style={{ height: 30, width: 'auto', flexShrink: 0 }} />
          <div className="brand-text">
            <h1>JSV CRM</h1>
            <p>Food Additives &amp; Chemicals</p>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Workspace</div>
        </div>
        <nav className="sidebar-nav">
          {visibleNav.map(({ to, label, icon: Icon }) => (
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

          {visibleAdminNav.length > 0 && (
            <>
              <div className="sidebar-label" style={{ marginTop: 14 }}>Administration</div>
              {visibleAdminNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setNavOpen(false)}
                >
                  <Icon />
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <span className="iso-pill"><span className="dot" /> ISO 9001:2015 Certified</span>
          <div className="user-row">
            <span className="name">{user?.name || 'User'} {user?.role ? `(${user.role})` : ''}</span>
            <span className="role">{user?.title || user?.role || ''}</span>
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
