import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import Shell from './components/Shell.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leads from './pages/Leads.jsx'
import FollowUps from './pages/FollowUps.jsx'
import Customers from './pages/Customers.jsx'
import Samples from './pages/Samples.jsx'
import Quotations from './pages/Quotations.jsx'
import Orders from './pages/Orders.jsx'
import Products from './pages/Products.jsx'
import Reports from './pages/Reports.jsx'
import UsersAndRoles from './pages/UsersAndRoles.jsx'
import Tasks from './pages/Tasks.jsx'
import Meetings from './pages/Meetings.jsx'
import Documents from './pages/Documents.jsx'
import Invoices from './pages/Invoices.jsx'
import Payments from './pages/Payments.jsx'
import ToastStack from './components/ToastStack.jsx'
import './styles/components.css'

function Protected({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="loading-screen">Loading…</div>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Shell>{children}</Shell>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <div className="loading-screen">Loading…</div> : user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/leads" element={<Protected><Leads /></Protected>} />
      <Route path="/follow-ups" element={<Protected><FollowUps /></Protected>} />
      <Route path="/customers" element={<Protected><Customers /></Protected>} />
      <Route path="/samples" element={<Protected><Samples /></Protected>} />
      <Route path="/quotations" element={<Protected><Quotations /></Protected>} />
      <Route path="/orders" element={<Protected><Orders /></Protected>} />
      <Route path="/products" element={<Protected><Products /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/tasks" element={<Protected><Tasks /></Protected>} />
      <Route path="/meetings" element={<Protected><Meetings /></Protected>} />
      <Route path="/documents" element={<Protected><Documents /></Protected>} />
      <Route path="/invoices" element={<Protected><Invoices /></Protected>} />
      <Route path="/payments" element={<Protected><Payments /></Protected>} />
      <Route path="/users" element={<Protected><UsersAndRoles /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <ToastStack />
    </AuthProvider>
  )
}
