// Service worker mínimo para que la app sea instalable (PWA).
// Estrategia network-first: usa la red y, si no hay, intenta el caché.

const CACHE = "prode-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Solo GET; el resto (POST/PUT) pasa directo a la red.
  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cachear navegaciones y estáticos para fallback offline
        if (res.ok && (req.mode === "navigate" || req.destination)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
