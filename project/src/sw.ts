/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Handle push events
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: { title: string; body: string; url?: string }
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Segundo Cerebro', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: payload.url || '/' },
      requireInteraction: false,
    })
  )
})

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = (event.notification.data?.url as string) || '/'
  // Only allow same-origin paths to prevent open redirect via push payload
  const url = rawUrl.startsWith('/') ? rawUrl : '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin))
        if (existing) return existing.focus()
        return self.clients.openWindow(url)
      })
  )
})
