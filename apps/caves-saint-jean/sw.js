const CACHE = "caves-saint-jean-v24.3";
const APP_SHELL = ["./loyalty.js?v=24", "./checkout-ui.js?v=24", "./", "./index.html", "./app.js?v=24.1", "./storage-bridge.js?v=24", "./cloud-sync.js?v=24", "./catalog-photos.js?v=24", "./presentation.css?v=24.4", "./presentation.js?v=24", "./catalog-default.json", "./photos.html", "./photos.html?v=24", "./photos.js?v=24", "./manifest.webmanifest", "./offline.html", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(response => response || caches.match("./offline.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  })));
});
