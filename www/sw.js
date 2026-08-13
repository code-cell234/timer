/**
 * StudyPulse — Service Worker
 * Cache-first offline strategy with network fallback.
 * All app shell assets are pre-cached on install.
 */

const CACHE_NAME = 'studypulse-v1';

// All assets to pre-cache (app shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/main.css',
  '/styles/components.css',
  '/styles/views.css',
  '/styles/effects3d.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/audio.js',
  '/js/timer.js',
  '/js/reminders.js',
  '/js/planner.js',
  '/js/flashcards.js',
  '/js/habits.js',
  '/js/analytics.js',
  '/js/tilt3d.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── INSTALL: pre-cache entire app shell ─────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      // Use individual adds so one missing icon doesn't fail everything
      return Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean up old caches ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: cache-first, then network, then offline page ─────
self.addEventListener('fetch', (event) => {
  // Skip non-GET and browser-extension requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Skip Google Fonts (always network — they have their own cache headers)
  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Not in cache — try network and cache the result
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => {
          // Completely offline — return index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
