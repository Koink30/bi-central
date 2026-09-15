const CACHE='pulse-v3';
const ASSETS=['./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const req=e.request;
  if(req.mode==='navigate'){
    e.respondWith(fetch(req,{cache:'no-store'}).then(resp=>resp).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(req,copy));return resp;})));
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus'in c)return c.focus();}if(clients.openWindow)return clients.openWindow('./');}));});