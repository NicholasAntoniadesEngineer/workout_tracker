// Precache the whole app so it opens instantly and fully offline. Bump VERSION whenever
// a listed file changes — activate drops every older cache.
const VERSION="v176";
const CACHE="kingskiln-"+VERSION;
const ASSETS=["./","index.html","styles.css","manifest.webmanifest",
  "js/app.js","js/store.js","js/model.js","js/views.js","js/csv.js","js/charts.js","js/verses.js","js/feasts.js","js/share.js","js/icons.js","js/feedback.js",
  "js/coach.js","js/cues.js","js/reminder.js","js/paths.js","js/lazy.js","js/route.js","js/palette.js","js/db.js","js/dialog.js","js/actions/dialog.js","js/views/welcome.js","js/exporters.js","js/actions/export.js","js/ready.js","js/views/checkin.js","js/actions/checkin.js","js/body.js","js/update.js","js/fuel.js","js/markers.js","js/views/health.js","js/actions/health.js","js/keys.js","js/views/shell.js","js/views/daydetail.js","js/archive.js","js/importers.js","js/actions/importer.js","js/views/importer.js",
  "js/actions/nav.js","js/actions/routines.js","js/actions/days.js","js/actions/share.js",
  "js/actions/data.js","js/actions/log.js",
  "js/views/common.js","js/views/log.js","js/views/home.js","js/views/history.js",
  "js/views/calendar.js","js/views/progress.js","js/views/body.js","js/views/settings.js",
  "js/views/learn.js","js/learn.js","js/health.js","js/library.js","js/world.js","js/world-india.js","js/world-iran.js","js/world-bulgaria.js","js/world-nordic.js","js/world-uk.js","js/world-us.js","js/world-south-africa.js","js/world-australia.js","js/world-ancient.js","js/world-china.js","js/world-east-africa.js","js/world-jamaica.js","js/world-japan.js","js/world-mongolia.js","js/world-cuba.js","js/world-caucasus.js","js/world-mexico.js","js/world-pacific.js","js/world-korea.js","js/world-brazil.js","js/world-turkey.js","js/soviet.js","js/soviet-health.js",
  "js/stack.js","js/views/stack.js","js/actions/stack.js","js/bio.js","js/exinfo.js","js/programme.js","js/cardio.js","js/fit.js","js/sensors.js","js/views/cardio.js","js/actions/cardio.js","js/views/programme.js","js/actions/programme.js","js/exinfo-data.js","js/books.js","js/reader.js","js/films.js","js/videos.js",
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
