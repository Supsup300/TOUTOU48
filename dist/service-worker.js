const CACHE = "toutou48-v2-20260920";
const ASSETS = [
  "./", "./index.html", "./styles.css", "./manifest.webmanifest", "./favicon.svg",
  "./assets/dog-breed-portrait-atlas.webp", "./js/main.js", "./js/config.js", "./js/dogs.js",
  "./js/game-engine.js", "./js/save-manager.js", "./js/input-manager.js", "./js/animation-manager.js",
  "./js/audio-manager.js", "./js/ad-manager.js", "./js/achievements.js", "./js/economy.js", "./js/ui-manager.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("activate", (event) => event.waitUntil(
  caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
