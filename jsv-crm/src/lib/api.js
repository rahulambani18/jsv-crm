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
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, title, role_id, roles ( id, name )')
    .eq('id', authUser.id)
    .single()

  let permissions = {}
  if (profile?.role_id) {
    const { data: perms } = await supabase
      .from('role_permissions')
      .select('module_key, can_view, can_edit')
      .eq('role_id', profile.role_id)
    permissions = Object.fromEntries(
      (perms || []).map((p) => [p.module_key, { view: p.can_view, edit: p.can_edit }])
    )
  }

  return {
    id: authUser.id,
    email: authUser.email,
    name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
    title: profile?.title || profile?.roles?.name || 'Sales Executive',
    role: profile?.roles?.name || 'Sales Executive',
    permissions,
  }
}

// NOTE: there is no in-app "sign up" flow for real Supabase mode. The
// first Admin account is created once, manually, via the SQL editor (see
// supabase/schema.sql's "first admin" section) or Supabase's Authentication
// tab — see the README for the exact steps. After that, an Admin invites
// teammates from Users & Roles (see the signUp guard below for why that
// currently needs the teammate to self-register at the login screen).

export const auth = isMock
  ? mockAuth
  : {
      async getUser() {
        const { data } = await supabase.auth.getUser()
        return loadProfileWithRole(data?.user)
      },
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return loadProfileWithRole(data.user)
      },
      // First person to ever sign up becomes Admin of a brand-new
      // workspace. Everyone who signs up afterward joins that same
      // workspace as a Sales Executive by default — an Admin can
      // change their role afterward from Users & Roles.
      // NOTE: Supabase's client-side signUp() always logs the browser in
      // as the newly created user — there is no safe way to "create an
      // account for someone else" from client code without exposing a
      // service-role key in the browser (a real security risk). Inviting
      // teammates therefore needs a small server-side function; until
      // that's set up, this throws a clear message instead of silently
      // signing the admin out of their own session.
      async signUp(email, password, fullName) {
        throw new Error(
          'Adding teammates directly isn\'t wired up yet for the live database — creating a user here would currently log you out of your own account. Ask the new teammate to sign up themselves at the login screen for now; an Admin can then assign their role from this page.'
        )
      },
      async signOut() {
        await supabase.auth.signOut()
        return true
      },
    }

export { isMock }
