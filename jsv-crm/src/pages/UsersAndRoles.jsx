import { useEffect, useMemo, useState } from 'react'
import { api, auth } from '../lib/api.js'
import { supabase } from '../lib/supabaseClient.js'
import { MODULES } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconShield, IconUsers, IconKey } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import '../styles/components.css'
import '../styles/users.css'

function emptyUserForm() {
  return { name: '', username: '', password: '', roleId: '' }
}

function emptyRoleForm() {
  return { name: '', basedOn: '' }
}

export default function UsersAndRoles() {
  const { can } = useAuth()
  const canEdit = can('users', 'edit')
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)

  const [showUserModal, setShowUserModal] = useState(false)
  const [userForm, setUserForm] = useState(emptyUserForm())
  const [savingUser, setSavingUser] = useState(false)
  const [userError, setUserError] = useState('')

  const [showRoleModal, setShowRoleModal] = useState(false)
  const [roleForm, setRoleForm] = useState(emptyRoleForm())
  const [savingRole, setSavingRole] = useState(false)

  const [activeRoleId, setActiveRoleId] = useState(null)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    Promise.all([api.users.list(), api.roles.list()]).then(([u, r]) => {
      setUsers(u); setRoles(r); setLoading(false)
      if (!activeRoleId && r.length) setActiveRoleId(r[0].id)
    })
  }

  const roleById = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r])), [roles])
  const activeRole = roleById[activeRoleId]

  // Audit log — stored in localStorage as mock, real version uses a DB table
  const [auditLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jsv_audit') || '[]') } catch { return [] }
  })

  function logAudit(action, detail) {
    const entry = { ts: new Date().toISOString(), action, detail, user: 'Rahul' }
    try {
      const log = JSON.parse(localStorage.getItem('jsv_audit') || '[]')
      log.unshift(entry)
      localStorage.setItem('jsv_audit', JSON.stringify(log.slice(0, 200)))
    } catch {}
  }

  async function handleDeleteUser(userId, userName) {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return
    try {
      // Delete the profile row (auth user stays but loses access)
      await supabase?.from('profiles').delete().eq('id', userId)
      logAudit('User deleted', userName)
      alert(`✅ User "${userName}" removed from the CRM.`)
      refresh()
    } catch (err) {
      alert('Could not delete user: ' + (err.message || 'Unknown error'))
    }
  }

  async function handleViewPassword(userId, userName) {
    const u = users.find((u) => u.id === userId)
    const displayUsername = u?.email?.endsWith('@jsv.internal')
      ? u.email.replace('@jsv.internal', '')
      : u?.email || '—'
    alert(
      `Login credentials for ${userName}:\n\n` +
      `Username: ${displayUsername}\n\n` +
      `⚠️ Passwords are encrypted and cannot be displayed.\n` +
      `To reset their password: go to Supabase → Authentication → Users → select user → Send Recovery Email`
    )
  }

  async function handleDeleteRole(roleId) {
    const role = roleById[roleId]
    if (!role) return
    if (!window.confirm(`Delete role "${role.name}"? Users with this role will lose their assigned role.`)) return
    try {
      await api.roles.remove(roleId)
      logAudit('Role deleted', role.name)
      refresh()
    } catch (err) {
      alert('Could not delete role: ' + (err.message || 'Unknown error'))
    }
  }

  function exportPermissions() {
    if (!activeRole) return
    const rows = [['Module', 'View', 'Edit']]
    MODULES.forEach((m) => {
      const p = activeRole.permissions?.[m.key] || { view: false, edit: false }
      rows.push([m.label, p.view ? 'Yes' : 'No', p.edit ? 'Yes' : 'No'])
    })
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${activeRole.name}_permissions.csv`
    a.click()
  }

  async function handleCreateUser(e) {
    e.preventDefault()
    setSavingUser(true)
    setUserError('')
    try {
      if (!userForm.password || userForm.password.length < 6) {
        throw new Error('Password must be at least 6 characters.')
      }
      await auth.inviteUser(
        userForm.username,   // becomes username@jsv.internal internally
        userForm.name,
        userForm.roleId,
        userForm.password
      )
      setShowUserModal(false)
      setUserForm(emptyUserForm())
      alert(`✅ User "${userForm.name}" created successfully!\n\nThey can now log in with:\nUsername: ${userForm.username}\nPassword: ${userForm.password}`)
      refresh()
    } catch (err) {
      setUserError(err.message || 'Could not create this user.')
    } finally {
      setSavingUser(false)
    }
  }

  async function handleCreateRole(e) {
    e.preventDefault()
    setSavingRole(true)
    const basedOnRole = roleById[roleForm.basedOn]
    const permissions = basedOnRole
      ? basedOnRole.permissions
      : Object.fromEntries(MODULES.map((m) => [m.key, { view: false, edit: false }]))
    await api.roles.insert({ name: roleForm.name, isSystem: false, permissions })
    setSavingRole(false)
    setShowRoleModal(false)
    setRoleForm(emptyRoleForm())
    refresh()
  }

  async function togglePermission(roleId, moduleKey, field) {
    const role = roleById[roleId]
    if (!role || (role.isSystem && role.name === 'Admin')) return
    const current = role.permissions?.[moduleKey] || { view: false, edit: false, delete: false }
    const nextValue = !current[field]
    const updatedPerm = { ...current, [field]: nextValue }
    // Turning on edit/delete implies view
    if ((field === 'edit' || field === 'delete') && nextValue) updatedPerm.view = true
    // Turning off view implies off for edit and delete too
    if (field === 'view' && !nextValue) { updatedPerm.edit = false; updatedPerm.delete = false }
    const permissions = { ...role.permissions, [moduleKey]: updatedPerm }
    await api.roles.update(roleId, { permissions })
    refresh()
  }

  async function handleUserRoleChange(userId, roleId) {
    await api.users.update(userId, { roleId })
    refresh()
  }

  if (loading) return <div className="loading-screen">Loading users &amp; roles…</div>

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Manage your team's access — who can view and who can make changes."
      />

      <div className="roles-tabs">
        <button className={`roles-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          <IconUsers width={14} height={14} style={{ marginRight: 6, verticalAlign: -2 }} /> Users
        </button>
        <button className={`roles-tab ${tab === 'roles' ? 'active' : ''}`} onClick={() => setTab('roles')}>
          <IconShield width={14} height={14} style={{ marginRight: 6, verticalAlign: -2 }} /> Roles &amp; Permissions
        </button>
        <button className={`roles-tab ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>
          📋 Audit Log
        </button>
      </div>

      {tab === 'users' && (
        <>
          <PageHeader
            title=""
            subtitle={`${users.length} user${users.length === 1 ? '' : 's'} in your workspace`}
            actions={
              canEdit && (
                <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
                  <IconPlus width={15} height={15} /> Add User
                </button>
              )
            }
          />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email / Username</th><th>Role</th><th>Status</th><th>Last Active</th>{canEdit && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr className="empty-row"><td colSpan={canEdit ? 6 : 5}>No users yet.</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-strong">
                      {canEdit ? (
                        <input
                          defaultValue={u.name}
                          onBlur={(e) => { if (e.target.value !== u.name) api.users.update(u.id, { name: e.target.value }).then(refresh) }}
                          style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: 13.5, width: '100%', outline: 'none', cursor: 'text' }}
                          title="Click to edit name"
                        />
                      ) : u.name}
                    </td>
                    <td className="cell-mono" style={{ fontSize: 12 }}>
                      {/* Show username (strip @jsv.internal) or real email */}
                      {u.email?.endsWith('@jsv.internal')
                        ? u.email.replace('@jsv.internal', '')
                        : u.email}
                    </td>
                    <td>
                      {canEdit ? (
                        <select value={u.roleId || ''} onChange={(e) => handleUserRoleChange(u.id, e.target.value)} style={{ fontSize: 12.5, padding: '5px 8px' }}>
                          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      ) : (
                        <Pill tone="navy">{roleById[u.roleId]?.name || '—'}</Pill>
                      )}
                    </td>
                    <td><Pill tone="teal">{u.status || 'Active'}</Pill></td>
                    <td className="cell-mono">{u.lastActive || '—'}</td>
                    {canEdit && (
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11.5 }}
                            onClick={() => handleViewPassword(u.id, u.name)}
                            title="View login credentials"
                          >
                            👁 Credentials
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-danger"
                            style={{ fontSize: 11.5 }}
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Delete this user"
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'roles' && (
        <div className="panel-row" style={{ gridTemplateColumns: '280px 1fr' }}>
          <div>
            {roles.map((r) => (
              <div
                key={r.id}
                className="role-pill-row"
                style={{ cursor: 'pointer', borderColor: activeRoleId === r.id ? 'var(--navy-700)' : 'var(--paper-200)' }}
                onClick={() => setActiveRoleId(r.id)}
              >
                <div className="role-meta">
                  <div className="role-badge-icon"><IconKey width={15} height={15} /></div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>
                      {users.filter((u) => u.roleId === r.id).length} user{users.filter((u) => u.roleId === r.id).length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                {r.isSystem && <span className="pill pill-gray">System</span>}
              </div>
            ))}
            {canEdit && (
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => setShowRoleModal(true)}>
                <IconPlus width={14} height={14} /> New role
              </button>
            )}
          </div>

          <div>
            {activeRole && (
              <>
                <p className="panel-title" style={{ marginBottom: 4 }}>{activeRole.name} permissions</p>
                <p style={{ fontSize: 12.5, color: 'var(--ink-500)', marginBottom: 14 }}>
                  {activeRole.name === 'Admin'
                    ? 'Admins always have full view and edit access to every module.'
                    : 'Toggle what this role can view and edit, module by module.'}
                </p>
                {activeRole && canEdit && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={exportPermissions}>
                      📥 Export Permissions CSV
                    </button>
                  </div>
                )}
                <div className="perm-grid" style={{ gridTemplateColumns: '1fr 80px 80px 80px' }}>
                  <div className="perm-grid-header">
                    <div>Module</div><div>View</div><div>Edit</div><div>Delete</div>
                  </div>
                  {MODULES.map((m) => {
                    const perm = activeRole.permissions?.[m.key] || { view: false, edit: false, delete: false }
                    const locked = activeRole.name === 'Admin'
                    return (
                      <div className="perm-grid-row module-name" key={m.key}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                        <div>
                          <input type="checkbox" checked={locked || !!perm.view} disabled={!canEdit || locked}
                            onChange={() => togglePermission(activeRole.id, m.key, 'view')} />
                        </div>
                        <div>
                          <input type="checkbox" checked={locked || !!perm.edit} disabled={!canEdit || locked}
                            onChange={() => togglePermission(activeRole.id, m.key, 'edit')} />
                        </div>
                        <div>
                          <input type="checkbox" checked={locked || !!perm.delete} disabled={!canEdit || locked}
                            onChange={() => togglePermission(activeRole.id, m.key, 'delete')} />
                        </div>
                      </div>
                    )
                  })}
                  {canEdit && !activeRole?.isSystem && (
                    <div className="perm-grid-row" style={{ display: 'flex', padding: '10px 16px' }}>
                      <button
                        className="btn btn-ghost btn-sm btn-danger"
                        style={{ fontSize: 12 }}
                        onClick={() => handleDeleteRole(activeRole.id)}
                      >
                        🗑 Delete this role
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="table-wrap">
          <div className="audit-row audit-header">
            <div>Time</div><div>User</div><div>Action</div><div>Detail</div>
          </div>
          {auditLog.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-300)', fontSize: 13 }}>
              No audit events yet. Role changes and deletions will appear here.
            </div>
          ) : auditLog.map((entry, i) => (
            <div key={i} className="audit-row">
              <div className="cell-mono" style={{ fontSize: 12 }}>{new Date(entry.ts).toLocaleString('en-IN')}</div>
              <div style={{ fontWeight: 600 }}>{entry.user}</div>
              <div><span className="pill pill-navy" style={{ fontSize: 11 }}>{entry.action}</span></div>
              <div style={{ color: 'var(--ink-500)', fontSize: 12.5 }}>{entry.detail}</div>
            </div>
          ))}
        </div>
      )}

      {showUserModal && (
        <Modal
          title="Add User"
          onClose={() => setShowUserModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="user-form" type="submit" disabled={savingUser}>
                {savingUser ? 'Adding…' : 'Add user'}
              </button>
            </>
          }
        >
          <form id="user-form" onSubmit={handleCreateUser}>
            <div className="field">
              <label>Full name</label>
              <input required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="e.g. Priya Shah" />
            </div>
            <div className="field">
              <label>Username</label>
              <input required value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} placeholder="e.g. priya.shah (used to log in)" />
              <p style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 3 }}>No spaces. This is what they type at the login screen.</p>
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" required minLength={6} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Minimum 6 characters" />
            </div>
            <div className="field">
              <label>Role</label>
              <select required value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}>
                <option value="" disabled>Select role…</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {userError && <p style={{ color: 'var(--red-600)', fontSize: 13, marginTop: 4 }}>{userError}</p>}
          </form>
        </Modal>
      )}

      {showRoleModal && (
        <Modal
          title="New Role"
          onClose={() => setShowRoleModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="role-form" type="submit" disabled={savingRole}>
                {savingRole ? 'Creating…' : 'Create role'}
              </button>
            </>
          }
        >
          <form id="role-form" onSubmit={handleCreateRole}>
            <div className="field">
              <label>Role name</label>
              <input required value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g. Warehouse Manager" />
            </div>
            <div className="field">
              <label>Start from permissions of…</label>
              <select value={roleForm.basedOn} onChange={(e) => setRoleForm({ ...roleForm, basedOn: e.target.value })}>
                <option value="">Blank (no access)</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
