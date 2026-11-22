// L'horloge centrale : un seul instant choisi, partagé par tous les écrans
// (Lune aujourd'hui, Soleil et carte du ciel demain).

const DAY = 86400000;
const listeners = new Set();
let raf = 0;

export const HOME_DEFAULT = { name: 'Rilly-sur-Loire', lat: 47.4597, lon: 1.1236, elev: 70 };

function load(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? { ...fallback, ...JSON.parse(s) } : fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* navigation privée */ }
}

export const settings = load('lc.settings', {
  useGps: true,
  orientation: 'sky',      // 'sky' : vue réelle · 'north' : nord en haut
  earthshine: true,
  haptics: true,
  world: 'observatoire',
});
export const home = load('lc.home', HOME_DEFAULT);

export function saveSettings() { save('lc.settings', settings); emit('settings'); }
export function saveHome() { save('lc.home', home); emit('location'); }

// ---------- lieu ----------
export const place = { ...home, source: 'home', accuracy: null, distanceFromHome: 0 };

function haversineKm(a, b) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function setPlace(p) {
  Object.assign(place, p);
  place.distanceFromHome = haversineKm(home, place);
  emit('location');
}

export function useHome() {
  setPlace({ name: home.name, lat: home.lat, lon: home.lon, elev: home.elev, source: 'home', accuracy: null });
}

export function locate() {
  if (!settings.useGps || !('geolocation' in navigator)) { useHome(); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const c = pos.coords;
      const near = haversineKm(home, { lat: c.latitude, lon: c.longitude }) < 2;
      setPlace({
        name: near ? home.name : 'Ici',
        lat: c.latitude, lon: c.longitude, elev: c.altitude ?? home.elev,
        source: near ? 'home-gps' : 'gps', accuracy: c.accuracy,
      });
    },
    () => { if (place.source !== 'gps') useHome(); place.gpsError = true; emit('location'); },
    { enableHighAccuracy: false, maximumAge: 10 * 60000, timeout: 15000 },
  );
}

// ---------- temps ----------
export const clock = {
  base: Date.now(),      // « maintenant », rafraîchi chaque minute
  offset: 0,             // décalage en jours (fractionnaire pendant un geste)
  get date() { return new Date(this.base + this.offset * DAY); },
  get dayIndex() { return Math.round(this.offset); },
  get isLive() { return this.offset === 0; },
};

export function setOffset(o, reason = 'scrub') {
  if (o === clock.offset) return;
  const before = Math.round(clock.offset);
  clock.offset = o;
  if (Math.round(o) !== before) emit('day');
  emit(reason);
}

let anim = null;
export function stopAnimation() { if (anim) { cancelAnimationFrame(anim.id); anim = null; } }

/** Glisse en douceur vers une cible (en jours). */
export function animateTo(target, duration = 700, ease = (t) => 1 - Math.pow(1 - t, 3)) {
  stopAnimation();
  const from = clock.offset, t0 = performance.now();
  if (Math.abs(target - from) < 1e-6) { setOffset(target, 'settle'); return; }
  const dur = Math.min(1600, duration + Math.abs(target - from) * 12);
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    setOffset(from + (target - from) * ease(k), k < 1 ? 'anim' : 'settle');
    if (k < 1) anim.id = requestAnimationFrame(step); else anim = null;
  };
  anim = { id: requestAnimationFrame(step) };
}

/** Fin de geste : élan naturel puis arrêt sur un jour entier. */
export function fling(velocityDaysPerMs, maxDays = 12) {
  const travel = Math.max(-maxDays, Math.min(maxDays, velocityDaysPerMs * 325));
  const projected = clock.offset + travel;
  animateTo(Math.round(projected), 520);
}

export function refreshNow() {
  clock.base = Date.now();
  emit('tick');
}

// ---------- abonnements ----------
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(reason) {
  pending.add(reason);
  if (!raf) raf = requestAnimationFrame(flush);
}
const pending = new Set();
function flush() {
  raf = 0;
  const reasons = new Set(pending); pending.clear();
  for (const fn of listeners) fn(reasons);
}
