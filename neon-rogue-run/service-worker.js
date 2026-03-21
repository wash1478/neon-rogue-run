const CACHE_NAME = 'neon-rogue-v1';
const FILES = ['index.html','style.css','main.js','manifest.json','assets/player.svg','assets/enemy.svg','offline.html'];
self.addEventListener('install', evt=>{ evt.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', evt=>{ evt.waitUntil(clients.claim()); });
self.addEventListener('fetch', evt=>{
  if(evt.request.mode === 'navigate'){
    evt.respondWith(fetch(evt.request).catch(()=>caches.match('offline.html')));
    return;
  }
  evt.respondWith(caches.match(evt.request).then(r=>r||fetch(evt.request).then(resp=>{ return caches.open(CACHE_NAME).then(cache=>{ cache.put(evt.request, resp.clone()); return resp;});})).catch(()=>caches.match('offline.html')));
});
