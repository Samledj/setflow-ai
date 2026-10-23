/* Only public offline resources are cached. Accounts, API replies and library data are never cached here. */
const CACHE='setflow-public-v1';
const PUBLIC=['/offline.html','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable.png','/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('setflow-public-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{const req=event.request;const url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match('/offline.html')));return;}
 if(PUBLIC.includes(url.pathname))event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));
});
