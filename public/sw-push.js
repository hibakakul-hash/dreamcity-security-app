// Push notification handler — runs in the background on device
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Dreamcity Security', {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-96.png',
      data: data.data || {},
      vibrate: [200, 100, 200],
      requireInteraction: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
