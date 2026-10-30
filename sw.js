// Service Worker: hält die App-Dateien offline verfügbar. Er speichert nur den App-Code, keine Sammlungsdaten.
const CACHE = "stufen-v2";
// KI-Modell für den neutralen Hintergrund (ca. 100 MB): einmal laden, danach aus dem Cache, auch offline.
const KI_CACHE = "stufen-ki";
const KI_HOST = "staticimgly.com";
const FILES = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "db.js",
  "vendor/background-removal.mjs",
  "manifest.webmanifest",
  "fonts/instrument-serif.woff2",
  "fonts/jetbrains-mono-500.woff2",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== KI_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netz zuerst, damit Updates ankommen; ohne Netz aus dem Cache.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).hostname === KI_HOST) {
    e.respondWith(
      caches.open(KI_CACHE).then((c) =>
        c.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
          if (res.ok) c.put(e.request, res.clone());
          return res;
        })))
    );
    return;
  }
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
