const CACHE_NAME = "rideflow-v2";
const CORE_ASSETS = [
  "/",
  "index.html",
  "app.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
  "https://unpkg.com/leaflet/dist/leaflet.css",
  "https://unpkg.com/leaflet/dist/leaflet.js"
];

// Install → cache assets safely
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.allSettled(
        CORE_ASSETS.map(async asset => {
          try {
            const response = await fetch(asset, { cache: "no-cache" });
            if (response.ok) {
              await cache.put(asset, response.clone());
            } else {
              console.warn("[SW] Skipped:", asset, response.status);
            }
          } catch (err) {
            console.warn("[SW] Failed:", asset, err.message);
          }
        })
      );
    })
  );
});

// Activate → clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch → network-first for core, cache-first for others
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  if (url.pathname.endsWith("index.html") || url.pathname.endsWith("app.js")) {
    event.respondWith(
      fetch(event.request)
        .then(resp =>
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, resp.clone());
            return resp;
          })
        )
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

// Listen for skipWaiting trigger
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
