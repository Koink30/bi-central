const CACHE = "caves-saint-jean-v33-mobile-home";
const APP_SHELL = ["./loyalty.js?v=24", "./checkout-ui.js?v=24", "./", "./index.html", "./app.js?v=33", "./storage-bridge.js?v=24", "./cloud-sync.js?v=32", "./catalog-photos.js?v=24", "./barcode-scan.js?v=31.2", "./presentation.css?v=33", "./presentation.js?v=33", "./catalog-default.json", "./photos.html", "./photos.html?v=24", "./photos.js?v=24", "./manifest.webmanifest", "./offline.html", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

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
