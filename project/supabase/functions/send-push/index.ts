// @ts-ignore
import webpush from 'npm:web-push'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@segundocerebro.app'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

Deno.serve(async (req) => {
  // Protect this endpoint — only allow calls with the CRON_SECRET header
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const provided = req.headers.get('x-cron-secret')
    if (provided !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentHour = now.getHours().toString().padStart(2, '0')
    const currentMinute = now.getMinutes().toString().padStart(2, '0')
    const currentTime = `${currentHour}:${currentMinute}`

    // Compute upper bound of 5-minute window
    const totalMinutes = now.getHours() * 60 + now.getMinutes() + 5
    const upperHour = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
    const upperMinute = (totalMinutes % 60).toString().padStart(2, '0')
    const upperTime = `${upperHour}:${upperMinute}`

    // Get recordatorios due in the current 5-minute window
    const { data: recordatorios, error: recErr } = await supabase
      .from('recordatorios')
      .select('*')
      .eq('activo', true)
      .eq('fecha', today)
      .gte('hora', currentTime)
      .lt('hora', upperTime)

    if (recErr) throw recErr

    if (!recordatorios || recordatorios.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no recordatorios due' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get all push subscriptions
    const { data: subscriptions, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')

    if (subErr) throw subErr

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no subscriptions' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    const errors: string[] = []

    for (const rec of recordatorios) {
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              title: 'Recordatorio',
              body: rec.texto,
              url: '/',
            })
          )
          sent++
        } catch (pushErr) {
          const msg = String(pushErr)
          errors.push(msg)
          // Remove stale subscriptions (410 Gone or 404 Not Found)
          if (msg.includes('410') || msg.includes('404')) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-push error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
