// Service worker : toute l'application est gardée sur le téléphone et fonctionne hors ligne.
// Changer VERSION à chaque mise à jour pour que le téléphone récupère les nouveaux fichiers.
const VERSION = 'lune-v12';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'styles/main.css',
  'src/main.js', 'src/state.js', 'src/astro.js', 'src/format.js', 'src/moon-renderer.js',
  'src/scrub.js', 'src/timeline.js', 'src/curve.js', 'src/phase-icon.js', 'src/panels.js',
  'src/sky.js', 'src/sky-renderer.js', 'src/nocturlabe.js', 'src/secrets.js', 'src/thoughts.js', 'src/ritual.js', 'src/marginalia.js', 'src/almanac.js', 'src/sun.js', 'src/skymap.js', 'src/atelier.js', 'src/carnet.js',
  'vendor/astronomy.js', 'data/sky.json',
  'textures/moon_color_1k.jpg', 'textures/moon_relief_1k.webp', 'textures/moon_color_4k.jpg', 'textures/moon_relief_4k.webp',
  'fonts/eb-garamond-400-normal.woff2', 'fonts/eb-garamond-500-normal.woff2', 'fonts/eb-garamond-400-italic.woff2',
  'fonts/inter-300-normal.woff2', 'fonts/inter-400-normal.woff2', 'fonts/inter-500-normal.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' : on ignore le cache du navigateur (GitHub le garde 10 min), pour prendre la vraie nouvelle version
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // géocodage : réseau direct
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match('index.html'))),
  );
});
