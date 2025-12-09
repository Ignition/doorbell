// Service Worker for offline caching
const CACHE_NAME = 'doorbell-v2'

// Assets to cache on install - use relative paths from SW scope
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './favicon.svg'
]

// Install: precache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  // Activate immediately
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control of all pages immediately
  self.clients.claim()
})

// Fetch: network-first for navigation, network-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // For navigation requests (HTML), try network first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('./', responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Offline - serve cached index.html for SPA routing
          return caches.match('./').then((cached) => {
            if (cached) return cached
            // Last resort fallback
            return new Response('Offline - please check your connection', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            })
          })
        })
    )
    return
  }

  // For assets (JS, CSS, images), use network-first strategy
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Offline - serve from cache
          return caches.match(request)
        })
    )
  }
})
