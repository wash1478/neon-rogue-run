const CACHE_NAME = 'neon-rogue-v1';
const FILES = ['index.html','style.css','main.js','manifest.json','assets/player.svg','assets/enemy.svg'];
self.addEventListener('install', evt=>{ evt.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', evt=>{ evt.waitUntil(clients.claim()); });
self.addEventListener('fetch', evt=>{ evt.respondWith(caches.match(evt.request).then(r=>r||fetch(evt.request))); });
