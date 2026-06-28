// Supabase Edge Function: send-push
// Triggered via Supabase DB Webhook when a visitor record is inserted (status=pending)
// Sends a push notification to all subscriptions for the target unit's resident

import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL   = Deno.env.get('VAPID_EMAIL')!
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const record = body.record // the new visitors row

    if (!record || record.status !== 'pending') {
      return new Response('skipped', { status: 200 })
    }

    // Fetch push subscriptions for this unit
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?unit=eq.${encodeURIComponent(record.unit)}`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    )
    const subscriptions = await res.json()

    const payload = JSON.stringify({
      title: '🔔 Visitor at Gate',
      body: `${record.visitor_name} (${record.purpose}) is at the gate for Unit ${record.unit}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      data: { url: '/' },
    })

    const results = await Promise.allSettled(
      subscriptions.map((sub: any) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    )

    const failed = results.filter((r) => r.status === 'rejected').length
    return new Response(
      JSON.stringify({ sent: results.length - failed, failed }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
