// Precache the whole app so it opens instantly and fully offline. Bump VERSION whenever
// a listed file changes — activate drops every older cache.
const VERSION="v10";
const CACHE="kingskiln-"+VERSION;
const ASSETS=["./","index.html","styles.css","manifest.webmanifest",
  "js/app.js","js/store.js","js/model.js","js/views.js","js/csv.js","js/charts.js","js/verses.js",
  "js/views/common.js","js/views/log.js","js/views/home.js","js/views/history.js",
  "js/views/calendar.js","js/views/progress.js","js/views/body.js","js/views/settings.js",
  "icons/icon-180.png","icons/icon-192.png","icons/icon-512.png","icons/icon-512-maskable.png"];

// Precache with cache:"reload" so a new version always fetches fresh files, never a stale
// copy the browser's HTTP cache is still holding — otherwise old CSS/JS can bake into a new
// cache and the app updates unevenly.
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE)
    .then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:"reload"}))))
    .then(()=>self.skipWaiting()));
});

self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});

// Cache first, so every load is instant — refreshed from the network in the background,
// so the next load picks up a deploy without this one ever waiting on it.
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(caches.match(e.request).then(hit=>{
    const fresh=fetch(e.request).then(res=>{
      if(res&&res.ok){
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy));
      }
      return res;
    }).catch(()=>hit);
    return hit||fresh;
  }));
});
