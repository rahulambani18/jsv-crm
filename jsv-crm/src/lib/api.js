// src/lib/api.js
// Every page imports from here, never directly from mockDb or supabaseClient.
// This is what makes swapping backends a one-file change.

import { supabase, isMock, db as mock } from './supabaseClient.js'
import { mockAuth } from './mockDb.js'

const TABLES = ['products', 'leads', 'customers', 'samples', 'quotations', 'orders', 'followUps', 'roles', 'users', 'tasks', 'meetings', 'documents', 'invoices', 'payments', 'stock', 'stockMovements', 'warehouses']
const SQL_TABLE_NAME = {
  products: 'products',
  leads: 'leads',
  customers: 'customers',
  samples: 'samples',
  quotations: 'quotations',
  orders: 'orders',
  followUps: 'follow_ups',
  roles: 'roles',
  users: 'profiles',
  tasks: 'tasks',
  meetings: 'meetings',
  documents: 'documents',
  invoices: 'invoices',
  payments: 'payments',
  stock: 'stock',
  stockMovements: 'stock_movements',
  warehouses: 'warehouses',
}

// Pages write/read plain camelCase fields (estValue, nextFollowUp,
// unitPrice, ...) since that's natural JS and matches the in-memory
// mock store exactly. Postgres columns are snake_case (est_value,
// next_follow_up, unit_price, ...). These two helpers convert between
// the two automatically so no page needs to know the database's column
// naming — only top-level keys are converted; values (including nested
// objects/arrays like line_items' JSON contents) are left untouched.
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
}
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}
function toDbShape(obj) {
  if (!obj || typeof obj !== 'object') return obj
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [camelToSnake(k), v]))
}
function fromDbShape(obj) {
  if (!obj || typeof obj !== 'object') return obj
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [snakeToCamel(k), v]))
}

const DEFAULT_WORKSPACE = '00000000-0000-0000-0000-000000000001'

const MODULE_LABEL = {
  products: 'Product', leads: 'Lead', customers: 'Customer', samples: 'Sample',
  quotations: 'Quotation', orders: 'Order', followUps: 'Follow-up', tasks: 'Task',
  meetings: 'Meeting', documents: 'Document', invoices: 'Invoice', payments: 'Payment',
  stock: 'Stock', stockMovements: 'Stock Movement', warehouses: 'Warehouse',
}

function pickLabel(record) {
  if (!record) return ''
  const candidates = [record.company, record.name, record.title, record.orderNo, record.invoiceNo, record.quoteNo, record.paymentNo, record.code, record.fullName]
  return String(candidates.find((v) => v) || record.id || '').slice(0, 200)
}

// Writes one row to audit_log so Users & Roles -> Audit Log shows a
// real, shared, permanent record of who changed what. Never blocks or
// fails the actual save — logging is best-effort.
async function logAuditEntry(tableName, action, record) {
  if (isMock) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('audit_log').insert({
      workspace_id: DEFAULT_WORKSPACE,
      actor_email: user?.email || 'Unknown',
      table_name: MODULE_LABEL[tableName] || tableName,
      action,
      record_label: pickLabel(record),
    })
  } catch {
    // audit logging must never break the real operation
  }
}

function makeRealTable(name) {
  const tableName = SQL_TABLE_NAME[name]
  return {
    async list() {
      const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data.map(fromDbShape)
    },
    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single()
      if (error) throw error
      return fromDbShape(data)
    },
    async insert(record) {
      // Always inject workspace_id so records are properly scoped
      const withWorkspace = { workspaceId: DEFAULT_WORKSPACE, ...record }
      const { data, error } = await supabase.from(tableName).insert(toDbShape(withWorkspace)).select().single()
      if (error) throw error
      logAuditEntry(name, 'Created', record)
      return fromDbShape(data)
    },
    async update(id, patch) {
      const { data, error } = await supabase.from(tableName).update(toDbShape(patch)).eq('id', id).select().single()
      if (error) throw error
      logAuditEntry(name, 'Updated', patch)
      return fromDbShape(data)
    },
    async remove(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw error
      logAuditEntry(name, 'Deleted', { id })
      return true
    },
  }
}

const realRolesTable = {
  async list() {
    const { data: roleRows, error } = await supabase.from('roles').select('*')
    if (error) throw error
    const { data: permRows } = await supabase.from('role_permissions').select('*')
    return roleRows.map((r) => ({
      id: r.id,
      name: r.name,
      isSystem: r.is_system,
      permissions: Object.fromEntries(
        (permRows || []).filter((p) => p.role_id === r.id).map((p) => [p.module_key, { view: p.can_view, edit: p.can_edit, delete: p.can_delete }])
      ),
    }))
  },
  async insert({ name, isSystem, permissions }) {
    const { data: ws } = await supabase.from('workspaces').select('id').limit(1).single()
    const { data: role, error } = await supabase
      .from('roles').insert({ workspace_id: ws.id, name, is_system: !!isSystem }).select().single()
    if (error) throw error
    const permRows = Object.entries(permissions || {}).map(([key, v]) => ({
      role_id: role.id, module_key: key, can_view: !!v.view, can_edit: !!v.edit, can_delete: !!v.delete,
    }))
    if (permRows.length) await supabase.from('role_permissions').insert(permRows)
    return role
  },
  async update(roleId, { permissions }) {
    if (!permissions) return
    const rows = Object.entries(permissions).map(([key, v]) => ({
      role_id: roleId, module_key: key, can_view: !!v.view, can_edit: !!v.edit, can_delete: !!v.delete,
    }))
    await supabase.from('role_permissions').upsert(rows, { onConflict: 'role_id,module_key' })
  },
}

// `profiles` only stores full_name/role_id — email lives on auth.users,
// which the client can't query directly (admin-only table). We read it
// instead from the `profiles_with_email` view (created in schema.sql as
// a security_invoker view, so it still respects each table's RLS) so the
// Users & Roles page can show email.
const realUsersTable = {
  async list() {
    const { data, error } = await supabase.from('profiles_with_email').select('*')
    if (error) throw error
    return data.map((p) => ({
      id: p.id, name: p.full_name, email: p.email, roleId: p.role_id,
      status: 'Active', lastActive: p.created_at?.slice(0, 10),
    }))
  },
  async update(id, patch) {
    const dbPatch = {}
    if (patch.roleId !== undefined) dbPatch.role_id = patch.roleId
    if (patch.name !== undefined) dbPatch.full_name = patch.name
    const { error } = await supabase.from('profiles').update(dbPatch).eq('id', id)
    if (error) throw error
    return { id, ...patch }
  },
}

export const api = Object.fromEntries(
  TABLES.map((t) => [t, isMock ? mock[t] : makeRealTable(t)])
)
if (!isMock) {
  api.roles = realRolesTable
  api.users = realUsersTable
}

// Real, permanent, shared Audit Log — replaces the old localStorage-based
// version that only existed in one browser and hardcoded the actor's name.
export const auditLog = {
  async list(limit = 300) {
    if (isMock) return []
    const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return data.map((r) => ({ ts: r.created_at, user: r.actor_email, action: r.action, detail: r.record_label, table: r.table_name }))
  },
  // For actions outside the standard tables (user deletion, password
  // resets, role deletion) — same underlying log, called directly.
  async log(action, detail, category = 'Users & Roles') {
    if (isMock) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('audit_log').insert({
        workspace_id: '00000000-0000-0000-0000-000000000001',
        actor_email: user?.email || 'Unknown',
        table_name: category,
        action,
        record_label: String(detail || '').slice(0, 200),
      })
    } catch {
      // best-effort
    }
  },
}

// File attachments — uploads to a public Supabase Storage bucket named
// "attachments" (create it once in Supabase Dashboard → Storage) and
// returns a public URL to save alongside the record (e.g. Documents.url).
// In demo/mock mode there's no real storage, so we just fabricate a
// local object URL so the UI still works for preview purposes.
export const storage = {
  async uploadFile(file, folder = 'documents') {
    if (isMock) {
      return { url: URL.createObjectURL(file), path: file.name, name: file.name, size: file.size }
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const path = `${folder}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from('attachments').upload(path, file, { upsert: false })
    if (error) throw new Error(error.message || 'Upload failed.')
    const { data } = supabase.storage.from('attachments').getPublicUrl(path)
    return { url: data.publicUrl, path, name: file.name, size: file.size }
  },
}

// Shape both mock and real auth identically: { id, email, name, title,
// role, permissions } — pages and AuthContext never need to branch on
// which backend is active.
async function loadProfileWithRole(authUser) {
  if (!authUser) return null

  // Two separate queries — avoids FK join naming issues in Supabase
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, title, role_id')
    .eq('id', authUser.id)
    .single()

  // Auto-create profile if missing
  if (error || !profile) {
    try {
      await supabase.from('profiles').insert({
        id: authUser.id,
        workspace_id: '00000000-0000-0000-0000-000000000001',
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        role_id: '00000000-0000-0000-0000-000000000003',
      })
    } catch {}
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('id, full_name, title, role_id')
      .eq('id', authUser.id)
      .single()
    return buildUserObject(authUser, newProfile)
  }

  return buildUserObject(authUser, profile)
}

async function buildUserObject(authUser, profile) {
  const roleId = profile?.role_id
  let roleName = 'Sales Executive'
  let permissions = {}

  if (roleId) {
    // Fetch role name separately
    const { data: roleRow } = await supabase
      .from('roles')
      .select('name')
      .eq('id', roleId)
      .single()
    if (roleRow?.name) roleName = roleRow.name

    // Fetch permissions
    const { data: perms } = await supabase
      .from('role_permissions')
      .select('module_key, can_view, can_edit, can_delete')
      .eq('role_id', roleId)
    permissions = Object.fromEntries(
      (perms || []).map((p) => [p.module_key, { view: p.can_view, edit: p.can_edit, delete: p.can_delete }])
    )
  }

  // Admin always gets full access regardless of permission rows
  const ALL_MODULES = ['dashboard','leads','follow_ups','customers','samples','quotations','orders','inventory','products','reports','users','tasks','meetings','documents','invoices','payments']
  if (roleName === 'Admin') {
    ALL_MODULES.forEach((m) => { permissions[m] = { view: true, edit: true, delete: true } })
  }

  return {
    id: authUser.id,
    email: authUser.email,
    name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
    title: roleName,
    role: roleName,
    permissions,
  }
}

export const auth = isMock
  ? mockAuth
  : {
      async getUser() {
        const { data } = await supabase.auth.getUser()
        return loadProfileWithRole(data?.user)
      },

      // Sign in supports BOTH email and username.
      // When an admin creates a user with a username (no @), inviteUser
      // stores them internally as "<username>@jsv.internal". So signing
      // back in with that same username must reconstruct that exact
      // internal email — not look up by the person's display name,
      // which was the bug here (a username like "ashishvalia41" was
      // being matched against full_name "Ashish Valia" and never found).
      async signIn(emailOrUsername, password) {
        let email = emailOrUsername.trim()

        if (!email.includes('@')) {
          const internalEmail = `${email.toLowerCase().replace(/\s+/g, '.')}@jsv.internal`
          const attempt = await supabase.auth.signInWithPassword({ email: internalEmail, password })
          if (!attempt.error) return loadProfileWithRole(attempt.data.user)

          // Fallback: maybe they typed their display name instead of username
          const { data: profiles } = await supabase
            .from('profiles_with_email')
            .select('email, full_name')
            .ilike('full_name', email)
            .limit(1)
          if (profiles && profiles.length > 0) {
            const { data, error } = await supabase.auth.signInWithPassword({ email: profiles[0].email, password })
            if (error) throw error
            return loadProfileWithRole(data.user)
          }
          throw new Error(`No user found with username "${emailOrUsername}". Try signing in with your email address instead.`)
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return loadProfileWithRole(data.user)
      },

      // Admin creates a new user directly with username + password.
      // We generate a unique email internally (username@jsv.internal) since
      // Supabase auth requires an email — but login works with just username.
      async inviteUser(email, fullName, roleId, password) {
        // Convert username to internal email if no @ present
        const internalEmail = email.includes('@') ? email : `${email.toLowerCase().replace(/\s+/g, '.')}@jsv.internal`

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: internalEmail,
          password: password,
          options: { data: { full_name: fullName } }
        })
        if (signUpError) throw signUpError

        if (signUpData?.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            workspace_id: '00000000-0000-0000-0000-000000000001',
            full_name: fullName,
            role_id: roleId || '00000000-0000-0000-0000-000000000003',
          }, { onConflict: 'id' })
          if (profileError) throw profileError
        }

        return { success: true }
      },

      async signOut() {
        await supabase.auth.signOut()
        return true
      },

      // Resets another user's password. Runs through the admin-reset-password
      // Edge Function, which checks the caller's permission server-side and
      // uses the service_role key — neither of which ever touches the browser.
      async adminResetPassword(userId, newPassword) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Your session has expired. Please log in again.')

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId, newPassword }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'Could not reset password.')
        return true
      },
    }

export { isMock }
