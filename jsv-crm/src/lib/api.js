// src/lib/api.js
// Every page imports from here, never directly from mockDb or supabaseClient.
// This is what makes swapping backends a one-file change.

import { supabase, isMock, db as mock } from './supabaseClient.js'
import { mockAuth } from './mockDb.js'

const TABLES = ['products', 'leads', 'customers', 'samples', 'quotations', 'orders', 'followUps']
const SQL_TABLE_NAME = {
  products: 'products',
  leads: 'leads',
  customers: 'customers',
  samples: 'samples',
  quotations: 'quotations',
  orders: 'orders',
  followUps: 'follow_ups',
}

function makeRealTable(name) {
  const tableName = SQL_TABLE_NAME[name]
  return {
    async list() {
      const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
    async insert(record) {
      const { data, error } = await supabase.from(tableName).insert(record).select().single()
      if (error) throw error
      return data
    },
    async update(id, patch) {
      const { data, error } = await supabase.from(tableName).update(patch).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    async remove(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw error
      return true
    },
  }
}

export const api = Object.fromEntries(
  TABLES.map((t) => [t, isMock ? mock[t] : makeRealTable(t)])
)

export const auth = isMock
  ? mockAuth
  : {
      async getUser() {
        const { data } = await supabase.auth.getUser()
        return data?.user || null
      },
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return data.user
      },
      async signOut() {
        await supabase.auth.signOut()
        return true
      },
    }

export { isMock }
