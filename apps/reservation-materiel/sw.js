const CACHE = "reservation-materiel-v22";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./cloud-config.js?v=22", "./cloud-sync.js?v=22", "./offline.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then(r => {
      const cp = r.clone();
      if (r.ok) caches.open(CACHE).then(c => c.put(e.request, cp));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./offline.html"))));
    return;
  }
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
});
