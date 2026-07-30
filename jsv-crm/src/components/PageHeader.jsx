import { useLocation } from 'react-router-dom'
import Breadcrumb from './Breadcrumb.jsx'

// Auto-derives "Dashboard > This Page" from the current route so every
// page gets a breadcrumb for free. Pass `extraCrumb` (a string, e.g. a
// customer name) to append a third level when drilling into a record,
// or pass `crumbs` directly to fully control the trail.
export default function PageHeader({ title, subtitle, actions, extraCrumb, crumbs, hideBreadcrumb }) {
  const location = useLocation()
  const isDashboard = location.pathname === '/'

  const trail = crumbs || (
    isDashboard
      ? [{ label: 'Dashboard' }]
      : [
          { label: 'Dashboard', to: '/' },
          extraCrumb ? { label: title, to: location.pathname } : { label: title },
          ...(extraCrumb ? [{ label: extraCrumb }] : []),
        ]
  )

  return (
    <div className="page-header-wrap">
      {!hideBreadcrumb && <Breadcrumb items={trail} />}
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  )
}
