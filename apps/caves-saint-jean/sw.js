const CACHE = "caves-saint-jean-v40-test-real";
const APP_SHELL = ["./environment.js?v=40", "./cloud-sync-mode40.js?v=24","./loyalty.js?v=24", "./checkout-ui.js?v=39", "./", "./index.html", "./app-mode40.js?v=39", "./storage-bridge-mode40.js?v=24", "./cloud-sync-mode40.js?v=32", "./catalog-photos-mode40.js?v=39", "./barcode-scan-mode40.js?v=31.2", "./presentation.css?v=39", "./presentation-mode40.js?v=37", "./catalog-default.json", "./photos.html", "./photos.html?v=24", "./photos-mode40.js?v=24", "./manifest.webmanifest", "./offline.html", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Une ressource facultative indisponible ne bloque plus la mise à jour PWA.
      const results = await Promise.allSettled(APP_SHELL.map(asset => cache.add(asset)));
      if (!results.some(result => result.status === "fulfilled")) throw new Error("Cache PWA inaccessible");
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  // Le service worker ne doit jamais intercepter les API Supabase, même en lecture.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(response => response || caches.match("./offline.html"))));
    return;
  }
  // JavaScript et styles : réseau d'abord, cache en secours, pour éviter un mélange de versions.
  if (/\.(?:js|css|html)$/.test(url.pathname)) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  })));
});
