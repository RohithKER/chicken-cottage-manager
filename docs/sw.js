/* CC Manager Service Worker — v137
   Caches BOTH the HTML page AND the Supabase CDN script so that
   window.location.reload() serves everything instantly from cache
   with zero network dependency. The fresh Supabase client then
   makes brand-new TCP connections which work fine.             */

const CACHE = 'cc-v137';
const CDN_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all([
        cache.add('./').catch(() => {}),
        cache.add('./index.html').catch(() => {}),
        // Pre-cache the Supabase CDN script (no-cors = opaque response, still cacheable)
        fetch(CDN_SUPABASE, { mode: 'no-cors' })
          .then(r => cache.put(CDN_SUPABASE, r))
          .catch(() => {})
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isPage    = event.request.mode === 'navigate';
  const isJsDelivr = url.hostname === 'cdn.jsdelivr.net';

  // Only handle the app page and CDN scripts — let Supabase API calls through
  if (!isPage && !isJsDelivr) return;

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(event.request).then(cached => {
        if (cached) {
          // Serve from cache instantly; update in background
          if (isPage) {
            fetch(event.request)
              .then(r => { if (r && r.ok) cache.put(event.request, r.clone()); })
              .catch(() => {});
          }
          return cached;
        }
        // Not in cache yet — fetch from network and cache
        return fetch(event.request, isJsDelivr ? { mode: 'no-cors' } : undefined)
          .then(response => {
            if (response) {
              cache.put(event.request, response.clone()).catch(() => {});
            }
            return response;
          });
      })
    )
  );
});
