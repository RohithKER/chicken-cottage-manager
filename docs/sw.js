/* CC Manager Service Worker — v130
   Caches the app shell (index.html) so window.location.reload()
   is served instantly from cache with no network needed.
   This lets us reload on iOS PWA resumption without the
   frozen network stack blocking the page load.                */

const CACHE = 'cc-v130';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // Pre-cache the app shell
      cache.addAll(['./', './index.html']).catch(() => {})
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
  // Only intercept navigation requests (the HTML page itself)
  // Let Supabase API, CDN scripts, etc. go straight to network
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(event.request).then(cached => {
        // Always try to fetch a fresh copy in the background
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => null);

        // Serve cache immediately (stale-while-revalidate)
        // If no cache yet, wait for network
        return cached || networkFetch;
      })
    )
  );
});
