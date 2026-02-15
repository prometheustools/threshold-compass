const CACHE_NAME = 'threshold-compass-v2'
const ASSETS_TO_PRECACHE = [
  '/',
  '/settle',
  '/settle/breathe',
  '/settle/ground',
  '/settle/guide',
  '/content/breathing-patterns.json',
  '/content/what-is-happening.json',
  '/icon-192.png',
  '/icon-512.png',
  // Add other critical static assets here
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching assets:', ASSETS_TO_PRECACHE)
      return cache.addAll(ASSETS_TO_PRECACHE)
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
          return null
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Cache-first for static assets (e.g., /settle pages, content JSON, icons)
  // This includes internal Next.js static assets (_next/static)
  if (
    request.destination === 'document' || // HTML requests (pages)
    request.destination === 'script' || // JS files
    request.destination === 'style' || // CSS files
    request.destination === 'image' || // Images
    url.pathname.includes('/content/') || // Our JSON content
    url.pathname.includes('/_next/static/') // Next.js static assets
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone())
            return networkResponse
          })
        }).catch(() => {
          // Fallback for offline if network fails and not in cache
          // For now, no specific offline page, just return undefined/error
          console.log('[Service Worker] Fetch failed for cache-first asset:', request.url)
          return new Response(null, { status: 503, statusText: 'Service Unavailable (Offline)' })
        })
      })
    )
    return
  }

  // Network-first for API calls (e.g., /api/)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone())
            return networkResponse
          })
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(request)
        })
    )
    return
  }

  // For all other requests, default to network-only or browser default behavior
  event.respondWith(fetch(request))
})
