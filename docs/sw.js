/* CC Manager Service Worker — v292 */

const CACHE = 'cc-v292';
const CDN_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// v260 — ROOT CAUSE of the third auto-update report: this file's fetch handler
// (see below) used to be "network-first for HTML: always serve the latest code
// from the server." That line, by itself, made the ENTIRE consent-gated update
// system below (waiting-worker, SW_UPDATED popup, "Don't Update") purely
// decorative — because every single page navigation, independent of which SW
// version was "active," fetched and ran whatever HTML was newest on the server
// at that moment. Fixed in v260: HTML navigations became cache-first, so what's
// already installed keeps being served until the user explicitly taps "Update"
// (_applyUpdate() in index.html, which unregisters + clears caches + reloads).
//
// v262 — a FOURTH report, specifically: force-quitting the app from the app
// switcher and reopening it still silently landed on a new version, with no
// popup. Root cause: install() below used to precache './' and './index.html'
// into this worker's own CACHE unconditionally, on every install — including an
// install that is only a background candidate (the browser's own periodic SW
// update check installing a new worker behind an already-active one, which
// _wasUpdateInstall detects). By the time that candidate worker later became
// active — which happens automatically, per spec, once every client of the old
// worker closes, i.e. EXACTLY a force-quit — it already had the new HTML fully
// cached and ready. v260's passivity check in activate() only skips claiming
// EXISTING clients and purging the old cache; it does nothing to stop a BRAND
// NEW navigation (the reopened app, with no prior controller at all) from being
// handed to this now-active worker, whose cache-first fetch handler then served
// the new content immediately — no popup, no "Update" tap, ever.
//
// Fixed below: an install that supersedes an already-active worker
// (_wasUpdateInstall) no longer precaches the app shell at all — only the
// version-agnostic static assets (icons/manifest/jsdelivr) get cached, which
// carry no update-consent risk. So even if this worker becomes active via the
// browser's own force-quit-triggered promotion, its own cache has nothing to
// serve for './'/'./index.html'. The fetch handler's fallback (see below) then
// searches OTHER still-present cc-v* caches — which activate() deliberately
// never purges in this same branch — for the most recent one that a genuinely
// consented install DID populate, and serves that instead of touching the
// network. The result: reopening after a force-quit keeps showing whatever
// version the user last explicitly updated to, while index.html's existing
// boot-time version check (Supabase app_settings poll, unrelated to any of
// this) independently shows the same Update/Don't Update popup it always
// would have shown mid-session — just triggered on launch instead.
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
  // See the passivity check in activate() below, and the precache gate below,
  // for how this flag is used.
  _wasUpdateInstall = !!self.registration.active;

  event.waitUntil(
    caches.open(CACHE).then(cache => {
      // Static assets carry no update-consent risk (they're not "the app
      // version" the popup/consent system cares about) — always safe to cache,
      // regardless of which install branch this is.
      const staticAssets = Promise.all([
        cache.add('./manifest.json').catch(() => {}),
        cache.add('./favicon.png').catch(() => {}),
        cache.add('./icon-192.png').catch(() => {}),
        cache.add('./icon-512.png').catch(() => {}),
        fetch(CDN_SUPABASE, { mode: 'no-cors' })
          .then(r => cache.put(CDN_SUPABASE, r))
          .catch(() => {})
      ]);

      if(_wasUpdateInstall){
        // v262: do NOT precache the app shell here — see the top-of-file
        // comment. This worker's CACHE is deliberately left with no './' or
        // './index.html' entry, so even if it silently becomes active later
        // (force-quit), it has nothing of its own to serve and the fetch
        // handler below falls back to the last cache a consented install did
        // populate, instead of fetching fresh (unconsented) network content.
        console.log('cc: SW install superseding an active worker without an explicit "Update" tap — app shell NOT precached');
        return staticAssets;
      }

      // Genuinely fresh registration (first-ever load, or the post-
      // _applyUpdate() reload) — safe to fully precache immediately.
      return Promise.all([
        staticAssets,
        fetch('./', { cache: 'no-cache' }).then(r => { if(r && r.ok) return cache.put('./', r); }).catch(() => {}),
        fetch('./index.html', { cache: 'no-cache' }).then(r => { if(r && r.ok) return cache.put('./index.html', r); }).catch(() => {})
      ]);
    })
  );
});

self.addEventListener('activate', event => {
  // v260: if this activation is superseding an already-active worker that a live
  // session may still be using (_wasUpdateInstall), stay passive — do NOT purge
  // the old cache and do NOT claim clients. This can only happen via the
  // browser's own default "waiting worker activates once it decides to" behavior
  // (see the long comment in install() above), never via anything index.html
  // does explicitly. Purging the old cache here would delete the only copy of
  // the version currently being served — and, as of v262, would also destroy
  // the exact fallback content the fetch handler below relies on when THIS
  // worker's own (deliberately app-shell-less) cache misses. clients.claim()
  // would immediately hand fresh navigations to this new worker, which is fine
  // now that its cache has nothing to silently serve, but skipping it keeps an
  // already-open session fully undisturbed too — belt and suspenders. This
  // worker still becomes "activated" per the spec (unavoidable), but inertly.
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
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: 279 }));
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

// v262: search every OTHER cc-vNNN cache (highest version number first) for a
// still-present copy of this request, skipping this worker's own (possibly
// app-shell-less) CACHE. Only caches populated by a genuinely consented
// install() ever get an entry for './'/'./index.html' (see install() above),
// so the highest-numbered hit here is exactly "the version the user last
// explicitly updated to" — never something installed silently in the
// background. activate()'s passivity branch is what guarantees these older
// caches are still around to find.
async function _serveLastConsented(request){
  let names;
  try{ names = await caches.keys(); }catch(e){ return null; }
  names = names.filter(k => k !== CACHE && /^cc-v\d+$/.test(k));
  // v265: fixed off-by-one — "cc-v" is 4 chars (c,c,-,v), so the version
  // number starts at index 4, not 5. The old .slice(5) dropped the leading
  // digit of the version (e.g. "cc-v262".slice(5) === "62", not "262"),
  // which happened to not affect any pair tested so far (same leading
  // digit) but would misorder e.g. v199 vs v200.
  names.sort((a, b) => Number(b.slice(4)) - Number(a.slice(4)));
  for(const name of names){
    try{
      const c = await caches.open(name);
      const hit = await c.match(request);
      if(hit) return hit;
    }catch(e){ /* keep trying other caches */ }
  }
  return null;
}

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
        // v260: cache-first for HTML — see the top-of-file comment for why.
        // v262: on a miss in THIS worker's own cache (expected for a worker that
        // was silently installed without consent and then activated anyway —
        // see install()), fall back to the last cache a consented install
        // actually populated (_serveLastConsented) before ever touching the
        // network. Network is the last resort, only for a true first-ever load
        // with nothing cached anywhere.
        return cache.match(event.request).then(async cached => {
          if (cached) return cached;
          const fallback = await _serveLastConsented(event.request);
          if (fallback) return fallback;
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
