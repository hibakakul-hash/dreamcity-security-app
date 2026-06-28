import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { phone, password, name, requesterId } = await req.json()
    if (!phone || !password || !name || !requesterId) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: corsHeaders })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify requester is an active admin
    const { data: requester } = await adminClient
      .from('profiles')
      .select('role, is_active, name')
      .eq('id', requesterId)
      .single()

    if (!requester?.is_active || requester.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: corsHeaders })
    }

    // Check max 3 admins
    const { data: existingAdmins } = await adminClient
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)

    if ((existingAdmins?.length || 0) >= 3) {
      return new Response(JSON.stringify({ error: 'Maximum of 3 SuperAdmin accounts allowed' }), { status: 400, headers: corsHeaders })
    }

    const digits = phone.replace(/\D/g, '')
    const email = `${digits}@dreamcity.app`

    // Create the auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'admin', phone: digits },
    })
    if (createError) throw createError

    // Profile is created by the handle_new_user trigger but let's ensure it's active
    await adminClient.from('profiles').update({ is_active: true, is_pending: false }).eq('id', newUser.user.id)

    // Log the action
    await adminClient.from('admin_logs').insert({
      admin_id: requesterId,
      admin_name: requester.name,
      action: 'created_admin',
      target_name: name,
      target_role: 'admin',
      notes: `Phone: +${digits}`,
    })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
