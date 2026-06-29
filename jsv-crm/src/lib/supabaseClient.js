// src/lib/supabaseClient.js
//
// This file is the ONLY place that needs to change to go from
// "local demo data" to "real hosted Supabase project".
//
// HOW TO GO LIVE (5 minutes):
// 1. Create a free project at https://supabase.com
// 2. Run the SQL in /supabase/schema.sql in the Supabase SQL editor
// 3. Copy your Project URL + anon public key from Settings → API
// 4. Create a `.env` file in the project root with:
//      VITE_SUPABASE_URL=https://xxxx.supabase.co
//      VITE_SUPABASE_ANON_KEY=eyJ...
// 5. Set USE_MOCK = false below.
// That's it — every page already talks to the `db` object exported
// here, so no other file needs to change.

import { createClient } from '@supabase/supabase-js'
import { mockDb } from './mockDb.js'

const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL

export const supabase = USE_MOCK
  ? null
  : createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

export const isMock = USE_MOCK

// `db` is a thin abstraction so pages don't care whether they're
// talking to Supabase or the in-memory mock. Same shape either way.
export const db = USE_MOCK ? mockDb : null // real supabase calls are made directly via `supabase` in lib/api.js
