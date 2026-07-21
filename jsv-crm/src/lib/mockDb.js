// src/lib/mockDb.js
// In-memory data store that mimics async DB calls.
// Lets the whole app run and feel real without a hosted backend yet.

import {
  seedProducts, seedLeads, seedCustomers, seedSamples,
  seedQuotations, seedOrders, seedFollowUps, seedRoles, seedUsers,
  seedTasks, seedMeetings, seedDocuments,
  seedInvoices, seedPayments, seedStock, seedStockMovements,
} from '../data/seed.js'

const store = {
  products: [...seedProducts],
  leads: [...seedLeads],
  customers: [...seedCustomers],
  samples: [...seedSamples],
  quotations: [...seedQuotations],
  orders: [...seedOrders],
  followUps: [...seedFollowUps],
  roles: [...seedRoles],
  users: [...seedUsers],
  tasks: [...seedTasks],
  meetings: [...seedMeetings],
  documents: [...seedDocuments],
  invoices: [...seedInvoices],
  payments: [...seedPayments],
  stock: [...seedStock],
  stockMovements: [...seedStockMovements],
}

const delay = (ms = 150) => new Promise((res) => setTimeout(res, ms))

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function table(name) {
  return {
    async list() {
      await delay()
      return [...store[name]]
    },
    async get(id) {
      await delay()
      return store[name].find((r) => r.id === id) || null
    },
    async insert(record) {
      await delay()
      const row = { id: makeId(name.slice(0, 2)), ...record }
      store[name] = [row, ...store[name]]
      return row
    },
    async update(id, patch) {
      await delay()
      store[name] = store[name].map((r) => (r.id === id ? { ...r, ...patch } : r))
      return store[name].find((r) => r.id === id)
    },
    async remove(id) {
      await delay()
      store[name] = store[name].filter((r) => r.id !== id)
      return true
    },
  }
}

export const mockDb = {
  products: table('products'),
  leads: table('leads'),
  customers: table('customers'),
  samples: table('samples'),
  quotations: table('quotations'),
  orders: table('orders'),
  followUps: table('followUps'),
  roles: table('roles'),
  users: table('users'),
  tasks: table('tasks'),
  meetings: table('meetings'),
  documents: table('documents'),
  invoices: table('invoices'),
  payments: table('payments'),
}

// Simple demo auth — accepts any email/password, signs in as the
// first seeded Admin user so the Users & Roles screen has real data
// to show immediately. Session lives in memory for this tab/session.
let currentUser = null

function resolveUserWithRole(userRecord) {
  if (!userRecord) return null
  const role = store.roles.find((r) => r.id === userRecord.roleId)
  return {
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    title: role?.name || 'Sales Executive',
    role: role?.name || 'Sales Executive',
    permissions: role?.permissions || {},
  }
}

export const mockAuth = {
  async getUser() {
    await delay(80)
    return currentUser
  },
  async signIn(email, _password) {
    await delay(300)
    // Match an existing seeded user by email if present, otherwise sign
    // in as the Admin (u1) so the demo always has full access.
    const match = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || store.users[0]
    currentUser = resolveUserWithRole(match)
    return currentUser
  },
  async signUp(email, _password, fullName) {
    await delay(300)
    // In demo mode there's no real invite flow — just add a row to the
    // in-memory users table with the default Sales Executive role.
    const execRole = store.roles.find((r) => r.name === 'Sales Executive')
    const row = { id: makeId('us'), name: fullName || email.split('@')[0], email, roleId: execRole?.id, status: 'Active', lastActive: new Date().toISOString().slice(0, 10) }
    store.users = [row, ...store.users]
    return row
  },
  async signOut() {
    await delay(150)
    currentUser = null
    return true
  },
}
