const CACHE='dazz-web-v2';
const FILES=['./','./index.html','./style.css','./replica.css','./replica.js','./assets/camera-sprite-a.png','./assets/camera-sprite-b.png','./assets/camera-sprite-c.png','./assets/camera-sprite-d.png','./app.js','./renderer.js','./storage.js','./assets/demo.svg','./assets/icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dazz-web-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return response;}).catch(()=>caches.match(e.request)));});
