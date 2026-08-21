/* CC Manager Service Worker — v237 */

const CACHE = 'cc-v237';
const CDN_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

self.addEventListener('install', event => {
  // Skip waiting immediately so new versions are never blocked behind stale old ones
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all([
        // Force fresh fetch (bypass HTTP cache) so the new SW always caches the latest HTML
        fetch('./', { cache: 'no-cache' }).then(r => { if(r && r.ok) return cache.put('./', r); }).catch(() => {}),
        fetch('./index.html', { cache: 'no-cache' }).then(r => { if(r && r.ok) return cache.put('./index.html', r); }).catch(() => {}),
        cache.add('./manifest.json').catch(() => {}),
        cache.add('./favicon.png').catch(() => {}),
        cache.add('./icon-192.png').catch(() => {}),
        cache.add('./icon-512.png').catch(() => {}),
        fetch(CDN_SUPABASE, { mode: 'no-cors' })
          .then(r => cache.put(CDN_SUPABASE, r))
          .catch(() => {})
      ])
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(async () => {
        // Tell all open pages to reload so they get the fresh HTML immediately
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: 237 }));
      })
  );
});

self.addEventListener('message', event => {
  if(event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isPage     = event.request.mode === 'navigate';
  const isJsDelivr = url.hostname === 'cdn.jsdelivr.net';
  const isAsset    = ['favicon.png','icon-192.png','icon-512.png','manifest.json'].some(
    f => url.pathname.endsWith(f)
  );

  if (!isPage && !isJsDelivr && !isAsset) return;

  event.respondWith(
    caches.open(CACHE).then(cache => {
      if (isPage) {
        // Network-first for HTML: always serve the latest code from the server.
        // Falls back to cache only when completely offline.
        return fetch(event.request, { cache: 'no-cache' })
          .then(r => {
            if (r && r.ok) cache.put(event.request, r.clone()).catch(() => {});
            return r;
          })
          .catch(() => cache.match(event.request));
      }
      // Cache-first for static assets and CDN libraries
      return cache.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request, isJsDelivr ? { mode: 'no-cors' } : undefined)
          .then(response => {
            if (response) cache.put(event.request, response.clone()).catch(() => {});
            return response;
          });
      });
    })
  );
});
