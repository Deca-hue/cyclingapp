const CACHE_NAME = "rideflow-v2";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
  "https://unpkg.com/leaflet/dist/leaflet.css",
  "https://unpkg.com/leaflet/dist/leaflet.js"
];

// Install → cache everything
self.addEventListener("install", e => {
  self.skipWaiting(); // SW will be installed immediately
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
});

// Activate → clear old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Fetch strategy
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Network-first for core files
  if (url.pathname.endsWith("index.html") || url.pathname.endsWith("app.js")) {
    e.respondWith(
      fetch(e.request)
        .then(resp =>
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, resp.clone());
            return resp;
          })
        )
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(caches.match(e.request).then(resp => resp || fetch(e.request)));
});

self.addEventListener("message", e => {
  if (e.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
// --- End of Service Worker ---