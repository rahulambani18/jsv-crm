// src/lib/api.js
// Every page imports from here, never directly from mockDb or supabaseClient.
// This is what makes swapping backends a one-file change.

import { supabase, isMock, db as mock } from './supabaseClient.js'
import { mockAuth } from './mockDb.js'

const TABLES = ['products', 'leads', 'customers', 'samples', 'quotations', 'orders', 'followUps', 'roles', 'users', 'tasks', 'meetings', 'documents', 'invoices', 'payments', 'expenses']
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
  expenses: 'expenses',
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
      return fromDbShape(data)
    },
    async update(id, patch) {
      const { data, error } = await supabase.from(tableName).update(toDbShape(patch)).eq('id', id).select().single()
      if (error) throw error
      return fromDbShape(data)
    },
    async remove(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw error
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
        (permRows || []).filter((p) => p.role_id === r.id).map((p) => [p.module_key, { view: p.can_view, edit: p.can_edit }])
      ),
    }))
  },
  async insert({ name, isSystem, permissions }) {
    const { data: ws } = await supabase.from('workspaces').select('id').limit(1).single()
    const { data: role, error } = await supabase
      .from('roles').insert({ workspace_id: ws.id, name, is_system: !!isSystem }).select().single()
    if (error) throw error
    const permRows = Object.entries(permissions || {}).map(([key, v]) => ({
      role_id: role.id, module_key: key, can_view: !!v.view, can_edit: !!v.edit,
    }))
    if (permRows.length) await supabase.from('role_permissions').insert(permRows)
    return role
  },
  async update(roleId, { permissions }) {
    if (!permissions) return
    const rows = Object.entries(permissions).map(([key, v]) => ({
      role_id: roleId, module_key: key, can_view: !!v.view, can_edit: !!v.edit,
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
      .select('module_key, can_view, can_edit')
      .eq('role_id', roleId)
    permissions = Object.fromEntries(
      (perms || []).map((p) => [p.module_key, { view: p.can_view, edit: p.can_edit }])
    )
  }

  // Admin always gets full access regardless of permission rows
  const ALL_MODULES = ['dashboard','leads','follow_ups','customers','samples','quotations','orders','products','reports','users','tasks','meetings','documents','invoices','payments','expenses']
  if (roleName === 'Admin') {
    ALL_MODULES.forEach((m) => { permissions[m] = { view: true, edit: true } })
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

      // Sign in supports BOTH email and username
      // If the input doesn't look like an email, we look up the profile
      // by full_name to find the real email first.
      async signIn(emailOrUsername, password) {
        let email = emailOrUsername.trim()

        // If no @ symbol, treat as username — look up email from profiles
        if (!email.includes('@')) {
          const { data: profiles } = await supabase
            .from('profiles_with_email')
            .select('email, full_name')
            .ilike('full_name', email.trim())
            .limit(1)
          if (profiles && profiles.length > 0) {
            email = profiles[0].email
          } else {
            throw new Error(`No user found with username "${emailOrUsername}". Try signing in with your email address instead.`)
          }
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
