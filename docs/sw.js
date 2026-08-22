/* CC Manager Service Worker — v260 */

const CACHE = 'cc-v260';
const CDN_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// v260 — ROOT CAUSE of the third auto-update report: this file's fetch handler
// (see below) used to be "network-first for HTML: always serve the latest code
// from the server." That line, by itself, made the ENTIRE consent-gated update
// system below (waiting-worker, SW_UPDATED popup, "Don't Update") purely
// decorative — because every single page navigation, independent of which SW
// version was "active," fetched and ran whatever HTML was newest on the server
// at that moment. On iOS, backgrounding a standalone PWA (not force-quitting —
// just switching apps and coming back) very often causes WebKit to discard and
// silently reload the WKWebView to reclaim memory. That reload is a fresh
// navigation, which this fetch handler intercepted and served fresh-from-network
// — landing the user on whatever was newest, with no popup, no "Update" tap, and
// with zero regard for a "Don't Update" choice from the previous foreground
// session (which also couldn't have survived anyway — see index.html's
// _updateDismissedThisSession fix in the same deploy). Fixed below: HTML
// navigations are now cache-first, so what's already installed keeps being
// served until the user explicitly taps "Update" (_applyUpdate() in
// index.html, which unregisters + clears caches + reloads — the only path that
// is allowed to change what's cached).
let _wasUpdateInstall = false;

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
  //
  // v260: record whether an existing worker is already active for this scope
  // RIGHT NOW, before anything else happens. This is the only reliable signal
  // that distinguishes the two ways this "install" can fire:
  //   - self.registration.active is set  → an already-active, in-use worker is
  //     being superseded. This is either the browser's own periodic background
  //     update check, or (on iOS) the same thing triggered more eagerly by a
  //     background/foreground cycle. Nothing the user did asked for this.
  //   - self.registration.active is null → a genuinely fresh registration:
  //     either the very first load ever, or the post-_applyUpdate() reload
  //     (which always unregisters everything first, so there is nothing left
  //     to be "active" when the new registration installs). Both cases are
  //     safe to fully activate immediately.
  // See the passivity check in activate() below for how this flag is used.
  _wasUpdateInstall = !!self.registration.active;

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
  // v260: if this activation is superseding an already-active worker that a live
  // session may still be using (_wasUpdateInstall), stay passive — do NOT purge
  // the old cache and do NOT claim clients. This can only happen via the
  // browser's own default "waiting worker activates once it decides to" behavior
  // (see the long comment in install() above), never via anything index.html
  // does explicitly. Purging the old cache here would delete the only copy of
  // the version currently being served, and clients.claim() would immediately
  // hand fresh (uncached-elsewhere) navigations to this new worker — both are
  // exactly the silent-update behavior this fix exists to stop. Any existing
  // open tab simply keeps using its current controller and cache; this worker
  // still becomes "activated" per the spec (unavoidable), but inertly — it will
  // only ever actually take over for a client that has no controller at all,
  // which in practice only happens via the explicit _applyUpdate() unregister
  // path (a fresh registration, not this branch).
  if(_wasUpdateInstall){
    console.log('cc: SW installed alongside an active worker without an explicit "Update" tap — staying passive (not claiming clients, not purging old cache)');
    return;
  }
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
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: 260 }));
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
        // v260: cache-first for HTML — this used to be network-first ("always
        // serve the latest code from the server"), which was the actual root
        // cause of updates applying without an explicit "Update" tap (see the
        // top-of-file comment). Serve whatever this SW already has cached
        // (the version it installed with) so a resumed/reloaded page keeps
        // running the same version until the user explicitly updates. Only
        // fetch from network if nothing is cached yet (first-ever load, or a
        // cache that got cleared) — that fetch also seeds the cache so it
        // sticks from then on.
        return cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request, { cache: 'no-cache' })
            .then(r => {
              if (r && r.ok) cache.put(event.request, r.clone()).catch(() => {});
              return r;
            });
        });
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
