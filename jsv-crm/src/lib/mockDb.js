// src/lib/mockDb.js
// In-memory data store that mimics async DB calls.
// Lets the whole app run and feel real without a hosted backend yet.

import {
  seedProducts, seedLeads, seedCustomers, seedSamples,
  seedQuotations, seedOrders, seedFollowUps,
} from '../data/seed.js'

const store = {
  products: [...seedProducts],
  leads: [...seedLeads],
  customers: [...seedCustomers],
  samples: [...seedSamples],
  quotations: [...seedQuotations],
  orders: [...seedOrders],
  followUps: [...seedFollowUps],
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
}

// Simple demo auth — accepts any email/password, persists "session" in memory.
let currentUser = null

export const mockAuth = {
  async getUser() {
    await delay(80)
    return currentUser
  },
  async signIn(email, _password) {
    await delay(300)
    currentUser = { id: 'u1', email, name: 'Rahul', role: 'Admin', title: 'Sales Executive' }
    return currentUser
  },
  async signOut() {
    await delay(150)
    currentUser = null
    return true
  },
}
