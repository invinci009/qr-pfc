// ReviewPulse PWA Service Worker
const CACHE_VERSION = 'rp-v3'
const STATIC_CACHE = `rp-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `rp-dynamic-${CACHE_VERSION}`

const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png',
  '/icons/apple-touch-icon.png',
]

// Install Event: Pre-cache static shell & offline fallback
self.addEventListener('install', (event) => {
  // If running on localhost/dev, do not install/cache
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    self.skipWaiting()
    return
  }

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS)
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache error:', err)
      })
  )
})

// Activate Event: Clear outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        // If on localhost, wipe ALL caches and unregister
        if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
          return Promise.all(keys.map((key) => caches.delete(key))).then(() =>
            self.registration.unregister()
          )
        }
        return Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key))
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch Strategy:
// CRITICAL RULES FOR HIGH PERFORMANCE:
// 1. Never intercept non-GET requests (POST, PUT, PATCH, DELETE must go straight to network)
// 2. Never intercept cross-origin requests (Supabase, Google Reviews, analytics)
// 3. Never intercept API, Auth, or Next.js internal/static compilation chunks
self.addEventListener('fetch', (event) => {
  // Never intercept anything on localhost/development
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    return
  }

  const { request } = event

  // Only handle GET requests
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  // Only handle same-origin requests (DO NOT intercept Supabase or third-party origins)
  if (url.origin !== self.location.origin) {
    return
  }

  // Bypass API, auth, and Next.js internal chunks completely
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.includes('turbopack')
  ) {
    return
  }

  // Handle Navigation Requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(async () => {
          // Check dynamic cache first
          const cachedResponse = await caches.match(request)
          if (cachedResponse) {
            return cachedResponse
          }
          // Fall back to offline page
          const offlinePage = await caches.match('/offline')
          return (
            offlinePage ||
            new Response('You are currently offline. Please check your connection.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          )
        })
    )
    return
  }

  // Handle Static Assets (/icons/, images, fonts) — NOT /_next/ (Next.js handles its own caching)
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone()
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, clone)
              })
            }
            return networkResponse
          })
          .catch(() => cached || Response.error())
      })
    )
    return
  }

  // Default: Network with Cache Fallback for static GETs
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// Web Push Notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json()
      const title = data.title || 'ReviewPulse'
      const options = {
        body: data.body || 'New guest feedback received!',
        icon: data.icon || '/icons/icon-192x192.png',
        badge: '/icons/favicon-32x32.png',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/dashboard',
        },
      }
      event.waitUntil(self.registration.showNotification(title, options))
    } catch {
      event.waitUntil(
        self.registration.showNotification('ReviewPulse', {
          body: event.data.text(),
          icon: '/icons/icon-192x192.png',
        })
      )
    }
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Message handler for manual skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
