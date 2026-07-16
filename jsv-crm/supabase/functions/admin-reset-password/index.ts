// supabase/functions/admin-reset-password/index.ts
//
// Lets an Admin (or anyone with "users" → edit permission) set a new
// password for another user, from inside the CRM.
//
// This MUST run as an Edge Function — never in the browser — because it
// needs the Supabase service_role key, which can bypass all security
// rules. That key is never sent to this function by the frontend; it's
// injected automatically by Supabase into every Edge Function's
// environment, so it never touches client-side code.
//
// DEPLOY THIS VIA THE SUPABASE DASHBOARD:
//   1. Supabase Dashboard → Edge Functions → Create a new function
//   2. Name it exactly: admin-reset-password
//   3. Paste this file's contents in as the function code
//   4. Deploy
// No extra environment variables need to be set — SUPABASE_URL,
// SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically to every Edge Function.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId, newPassword } = await req.json()
    if (!userId || !newPassword || String(newPassword).length < 6) {
      return json({ error: 'A target userId and a password of at least 6 characters are required.' }, 400)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header.' }, 401)

    // Client scoped to the CALLER's own session — used only to verify
    // who is calling and what permissions they have. Cannot bypass RLS.
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: callerErr } = await supabaseUser.auth.getUser()
    if (callerErr || !caller) return json({ error: 'Invalid or expired session. Please log in again.' }, 401)

    // Confirm caller is an Admin OR has explicit "users" edit permission.
    const { data: profile } = await supabaseUser
      .from('profiles').select('role_id').eq('id', caller.id).single()

    let allowed = false
    if (profile?.role_id) {
      const { data: role } = await supabaseUser
        .from('roles').select('name').eq('id', profile.role_id).single()
      if (role?.name === 'Admin') allowed = true

      if (!allowed) {
        const { data: perm } = await supabaseUser
          .from('role_permissions').select('can_edit')
          .eq('role_id', profile.role_id).eq('module_key', 'users').single()
        if (perm?.can_edit) allowed = true
      }
    }
    if (!allowed) return json({ error: 'You do not have permission to reset passwords.' }, 403)

    // Only NOW do we touch the service-role client — and only for the
    // single admin action we already verified is allowed.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: String(newPassword) })
    if (updateErr) return json({ error: updateErr.message }, 400)

    return json({ success: true })
  } catch (err) {
    return json({ error: err?.message || 'Unexpected error.' }, 500)
  }
})
