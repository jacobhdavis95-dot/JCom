const CACHE = "jcom-v6";
const APP = ["./", "./index.html", "./styles.css?v=6", "./app.js?v=6", "./core.mjs", "./manifest.webmanifest", "./assets/jcom-logo.svg", "./assets/bfs-report-logo.svg"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP))));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => {
    const refreshed = fetch(event.request).then((response) => {
      if (response.ok && new URL(event.request.url).origin === self.location.origin) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => cached);
    return cached || refreshed;
  }));
});
