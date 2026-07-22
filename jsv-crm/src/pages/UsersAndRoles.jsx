import { useEffect, useMemo, useState } from 'react'
import { api, auth, auditLog } from '../lib/api.js'
import { supabase } from '../lib/supabaseClient.js'
import { MODULES } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconUsers } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { showToast } from '../lib/toast.js'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'
import '../styles/users.css'

function emptyUserForm() {
  return { name: '', username: '', password: '', roleId: '' }
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

  const [resetTarget, setResetTarget] = useState(null) // { id, name }
  const [resetPassword, setResetPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(null) // { name, password } — shown after a successful reset
  const [copiedPassword, setCopiedPassword] = useState(false)

  const [permTarget, setPermTarget] = useState(null) // the user whose overrides are being edited
  const [permState, setPermState] = useState({}) // { [moduleKey]: { custom, view, edit, delete } }
  const [savingPerms, setSavingPerms] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    Promise.all([api.users.list(), api.roles.list()]).then(([u, r]) => {
      setUsers(u); setRoles(r); setLoading(false)
    })
  }

  const roleById = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r])), [roles])

  // Audit log — real, permanent, shared across everyone (backed by the
  // audit_log table). Previously this was stored in the browser's
  // localStorage, which meant it only existed on one device, reset on
  // cache clear, and hardcoded the actor's name to "Rahul" regardless
  // of who was actually signed in.
  const [auditEntries, setAuditEntries] = useState([])
  const [auditLoading, setAuditLoading] = useState(true)

  useEffect(() => {
    if (tab !== 'audit') return
    setAuditLoading(true)
    auditLog.list().then(setAuditEntries).finally(() => setAuditLoading(false))
  }, [tab])

  function logAudit(action, detail) {
    auditLog.log(action, detail)
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

  async function handleViewUsername(userId, userName) {
    const u = users.find((u) => u.id === userId)
    const displayUsername = u?.email?.endsWith('@jsv.internal')
      ? u.email.replace('@jsv.internal', '')
      : u?.email || '—'
    alert(
      `Username for ${userName}:\n\n` +
      `${displayUsername}\n\n` +
      `Passwords can't be viewed — use "Reset Password" to set a new one for them.`
    )
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (!resetTarget) return
    setResetError('')
    if (!resetPassword || resetPassword.length < 6) {
      setResetError('Password must be at least 6 characters.')
      return
    }
    setResettingPassword(true)
    try {
      await auth.adminResetPassword(resetTarget.id, resetPassword)
      logAudit('Password reset', resetTarget.name)
      setResetSuccess({ name: resetTarget.name, password: resetPassword })
      setResetTarget(null)
      setResetPassword('')
    } catch (err) {
      setResetError(err.message || 'Could not reset password.')
    } finally {
      setResettingPassword(false)
    }
  }

  async function handleCopyPassword() {
    if (!resetSuccess) return
    try {
      await navigator.clipboard.writeText(resetSuccess.password)
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2000)
    } catch {
      showToast('Could not copy — select and copy the password manually.', 'error')
    }
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

  async function handleUserRoleChange(userId, roleId) {
    await api.users.update(userId, { roleId })
    refresh()
  }

  // Per-user permission overrides — a module starts as "inherited" (grey,
  // showing the role's current value) until the admin flips it to
  // "Custom", at which point it becomes an explicit override for just
  // this person and stops tracking future changes to the role.
  async function openUserPermissions(user) {
    setPermTarget(user)
    const role = roleById[user.roleId]
    const overrides = await api.userPermissions.get(user.id)
    const next = {}
    MODULES.forEach((m) => {
      const roleDefault = role?.permissions?.[m.key] || { view: false, edit: false, delete: false }
      const override = overrides[m.key]
      next[m.key] = override
        ? { custom: true, view: override.view, edit: override.edit, delete: override.delete }
        : { custom: false, view: roleDefault.view, edit: roleDefault.edit, delete: roleDefault.delete }
    })
    setPermState(next)
  }

  function togglePermCustom(moduleKey) {
    setPermState((s) => ({ ...s, [moduleKey]: { ...s[moduleKey], custom: !s[moduleKey].custom } }))
  }

  function updatePermField(moduleKey, field, value) {
    setPermState((s) => {
      const current = s[moduleKey]
      const updated = { ...current, [field]: value }
      if ((field === 'edit' || field === 'delete') && value) updated.view = true
      if (field === 'view' && !value) { updated.edit = false; updated.delete = false }
      return { ...s, [moduleKey]: updated }
    })
  }

  async function handleSavePermissions() {
    if (!permTarget) return
    setSavingPerms(true)
    const overrides = {}
    Object.entries(permState).forEach(([key, v]) => {
      if (v.custom) overrides[key] = { view: v.view, edit: v.edit, delete: v.delete }
    })
    await api.userPermissions.update(permTarget.id, overrides)
    setSavingPerms(false)
    setPermTarget(null)
    showToast(`Custom permissions saved for ${permTarget.name}`)
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
                  <tr className="empty-row"><td colSpan={canEdit ? 6 : 5}>
                    <EmptyState
                      icon="👤"
                      title="No users yet"
                      subtitle="Add teammates and assign them a role to get them into the CRM."
                      actionLabel={canEdit ? 'Add User' : undefined}
                      onAction={canEdit ? () => setShowUserModal(true) : undefined}
                    />
                  </td></tr>
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
                            onClick={() => openUserPermissions(u)}
                            title="Give this person different permissions than the rest of their role"
                          >
                            🔧 Permissions
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11.5 }}
                            onClick={() => handleViewUsername(u.id, u.name)}
                            title="View this person's login username"
                          >
                            👁 View Username
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11.5 }}
                            onClick={() => { setResetTarget({ id: u.id, name: u.name }); setResetPassword(''); setResetError('') }}
                            title="Set a new password for this user"
                          >
                            🔑 Reset Password
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

      {tab === 'audit' && (
        <div className="table-wrap">
          <div className="audit-row audit-header">
            <div>Time</div><div>User</div><div>Action</div><div>Detail</div>
          </div>
          {auditLoading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-300)', fontSize: 13 }}>Loading audit log…</div>
          ) : auditEntries.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-300)', fontSize: 13 }}>
              No audit events yet. Every create, edit, and delete across the CRM will appear here.
            </div>
          ) : auditEntries.map((entry, i) => (
            <div key={i} className="audit-row">
              <div className="cell-mono" style={{ fontSize: 12 }}>{new Date(entry.ts).toLocaleString('en-IN')}</div>
              <div style={{ fontWeight: 600 }}>{entry.user}</div>
              <div><span className="pill pill-navy" style={{ fontSize: 11 }}>{entry.table ? `${entry.action} · ${entry.table}` : entry.action}</span></div>
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

      {resetTarget && (
        <Modal
          title={`Reset Password — ${resetTarget.name}`}
          onClose={() => setResetTarget(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setResetTarget(null)}>Cancel</button>
              <button className="btn btn-primary" form="reset-password-form" type="submit" disabled={resettingPassword}>
                {resettingPassword ? 'Saving…' : 'Set new password'}
              </button>
            </>
          }
        >
          <form id="reset-password-form" onSubmit={handleResetPassword}>
            <div className="field">
              <label>New password</label>
              <input
                type="password"
                required
                minLength={6}
                autoFocus
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
              <p style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 3 }}>
                They'll need this new password the next time they log in. Share it with them securely.
              </p>
            </div>
            {resetError && <p style={{ color: 'var(--red-600)', fontSize: 13, marginTop: 4 }}>{resetError}</p>}
          </form>
        </Modal>
      )}

      {resetSuccess && (
        <Modal
          title={`Password updated — ${resetSuccess.name}`}
          onClose={() => setResetSuccess(null)}
          footer={
            <button className="btn btn-primary" onClick={() => setResetSuccess(null)} style={{ width: '100%', justifyContent: 'center' }}>
              Done
            </button>
          }
        >
          <p style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 0, marginBottom: 12 }}>
            Share this new password with {resetSuccess.name} securely. It won't be shown again once you close this.
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, background: 'var(--paper-50)',
            border: '1px solid var(--paper-200)', borderRadius: 8, padding: '10px 14px', marginBottom: 4,
          }}>
            <span className="cell-mono" style={{ fontSize: 15, fontWeight: 700, flex: 1, letterSpacing: 0.3 }}>
              {resetSuccess.password}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyPassword}>
              {copiedPassword ? '✓ Copied' : '📋 Copy new password'}
            </button>
          </div>
        </Modal>
      )}

      {permTarget && (
        <Modal
          title={`${permTarget.name} — custom permissions`}
          onClose={() => setPermTarget(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPermTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSavePermissions} disabled={savingPerms}>
                {savingPerms ? 'Saving…' : 'Save permissions'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 0, marginBottom: 14 }}>
            By default this person follows their <strong>{roleById[permTarget.roleId]?.name || 'role'}</strong>'s permissions.
            Switch a module to <strong>Custom</strong> to set access just for {permTarget.name} — it'll stop
            following that role's future changes for that module only.
          </p>
          <div className="perm-grid" style={{ gridTemplateColumns: '1fr 70px 70px 70px 70px' }}>
            <div className="perm-grid-header">
              <div>Module</div><div>Custom</div><div>View</div><div>Edit</div><div>Delete</div>
            </div>
            {MODULES.map((m) => {
              const p = permState[m.key] || { custom: false, view: false, edit: false, delete: false }
              return (
                <div className="perm-grid-row module-name" key={m.key}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                  <div>
                    <input type="checkbox" checked={p.custom} onChange={() => togglePermCustom(m.key)} />
                  </div>
                  <div>
                    <input type="checkbox" disabled={!p.custom} checked={p.view}
                      onChange={(e) => updatePermField(m.key, 'view', e.target.checked)} />
                  </div>
                  <div>
                    <input type="checkbox" disabled={!p.custom} checked={p.edit}
                      onChange={(e) => updatePermField(m.key, 'edit', e.target.checked)} />
                  </div>
                  <div>
                    <input type="checkbox" disabled={!p.custom} checked={p.delete}
                      onChange={(e) => updatePermField(m.key, 'delete', e.target.checked)} />
                  </div>
                </div>
              )
            })}
          </div>
        </Modal>
      )}

    </div>
  )
}
