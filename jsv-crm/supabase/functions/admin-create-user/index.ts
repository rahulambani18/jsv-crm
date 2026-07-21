// supabase/functions/admin-create-user/index.ts
//
// Lets an Admin (or anyone with "users" → edit permission) create a new
// sales rep / team member account, from inside the CRM.
//
// This MUST run as an Edge Function — never in the browser — because
// calling supabase.auth.signUp() from client-side code logs the CALLING
// browser into the newly created account, silently replacing the admin's
// own session. Using supabase.auth.admin.createUser() with the
// service_role key (available only server-side) creates the account
// without touching any existing session, and also skips the email-
// confirmation step so the new user can log in immediately.
//
// DEPLOY THIS VIA THE SUPABASE DASHBOARD:
//   1. Supabase Dashboard → Edge Functions → Create a new function
//   2. Name it exactly: admin-create-user
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

const DEFAULT_WORKSPACE = '00000000-0000-0000-0000-000000000001'
const DEFAULT_ROLE = '00000000-0000-0000-0000-000000000003'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, fullName, roleId, password } = await req.json()
    if (!email || !fullName || !password || String(password).length < 6) {
      return json({ error: 'Email/username, full name, and a password of at least 6 characters are required.' }, 400)
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
    if (!allowed) return json({ error: 'You do not have permission to create users.' }, 403)

    // Only NOW do we touch the service-role client — and only for the
    // single admin action we already verified is allowed. createUser()
    // (unlike client-side signUp()) does NOT sign the caller's browser
    // into the new account — it just inserts the auth record.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: String(password),
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (createErr) return json({ error: createErr.message }, 400)

    const newUserId = created.user.id
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: newUserId,
      workspace_id: DEFAULT_WORKSPACE,
      full_name: fullName,
      role_id: roleId || DEFAULT_ROLE,
    }, { onConflict: 'id' })
    if (profileErr) return json({ error: profileErr.message }, 400)

    return json({ success: true, userId: newUserId })
  } catch (err) {
    return json({ error: err?.message || 'Unexpected error.' }, 500)
  }
})
