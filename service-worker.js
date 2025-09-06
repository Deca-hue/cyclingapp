const CACHE_NAME = "rideflow-v2-cache-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/app.js",
  "/manifest.json",
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // For navigation requests use network-first to try and get tiles dynamic updates, fallback to cache
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  // For other requests try cache first
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      // Optionally cache fetch responses (be mindful of tile traffic)
      return res;
    })).catch(() => cached)
  );
});
