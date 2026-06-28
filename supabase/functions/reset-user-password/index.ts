import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { targetUserId, requesterId } = await req.json()
    if (!targetUserId || !requesterId) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: corsHeaders })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify requester exists and has the right role
    const { data: requester } = await adminClient
      .from('profiles')
      .select('role, unit, is_active')
      .eq('id', requesterId)
      .single()

    if (!requester?.is_active || !['household_admin', 'admin'].includes(requester.role)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: corsHeaders })
    }

    // Verify target user exists and is in the same unit (for household_admin)
    const { data: target } = await adminClient
      .from('profiles')
      .select('unit, role, name')
      .eq('id', targetUserId)
      .single()

    if (!target) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders })
    }

    if (requester.role === 'household_admin') {
      if (target.unit !== requester.unit) {
        return new Response(JSON.stringify({ error: 'Cannot reset password for a different unit' }), { status: 403, headers: corsHeaders })
      }
      // HA cannot reset another HA or admin
      if (target.role === 'household_admin' || target.role === 'admin') {
        return new Response(JSON.stringify({ error: 'Cannot reset password for this role' }), { status: 403, headers: corsHeaders })
      }
    }

    // Generate a random 8-char temp password
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    const tempPassword = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

    // Update the user's password via admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: tempPassword,
    })
    if (updateError) throw updateError

    // Flag the account to force password change on next login
    await adminClient.from('profiles').update({ must_change_password: true }).eq('id', targetUserId)

    return new Response(JSON.stringify({ tempPassword }), { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
