/* CC Manager Service Worker — v258 */

const CACHE = 'cc-v258';
const CDN_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

self.addEventListener('install', event => {
  // v245: do NOT call self.skipWaiting() here. Unconditional skipWaiting() on
  // install is what let a newly-installed SW become the active controller on
  // its own — independent of anything the page's update popup decides — which
  // is exactly why a full close+reopen of the app silently landed on the new
  // version even when the user had never tapped "Update" (or had tapped
  // "Don't Update"). A worker installed here now correctly sits in the
  // "waiting" state until the page explicitly tells it to proceed (see the
  // 'message' listener below), matching the standard consent-gated PWA update
  // pattern. The app's own "Update" button (_applyUpdate() in index.html)
  // doesn't even need that message — it unregisters this registration
  // entirely and reloads, so the fresh registration that follows has no
  // active worker to wait behind and activates on its own, exactly as before.
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
  // clients.claim() only runs once this worker has actually been allowed to
  // activate — which, now that install() no longer force-skips waiting, only
  // happens via the explicit consent path below (or the browser's own default
  // behaviour of activating a waiting worker once zero clients remain on the
  // old one, e.g. the app was fully closed everywhere — a separate, lower-level
  // browser mechanism this file doesn't control). Once activation legitimately
  // happens, claiming existing clients immediately and notifying them is correct.
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(async () => {
        // Tell all open pages a new version is active. index.html no longer
        // auto-reloads on this message — it only shows the Update/Don't Update
        // popup and waits for the user (see the SW_UPDATED handler there).
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: 258 }));
      })
  );
});

// v245: the ONLY path that may move a waiting worker past skipWaiting. Nothing
// in index.html currently sends this message (the "Update" button uses a more
// thorough unregister+reload approach instead — see the note in install()
// above), but this listener is kept as the correct, spec-standard hook for
// consent-gated activation: a waiting worker only ever skips waiting when
// explicitly told to, never on its own.
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
