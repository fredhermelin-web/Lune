// Calculs astronomiques — tout est local, aucune connexion nécessaire.
// Bibliothèque : astronomy-engine (Don Cross, MIT), précision ~1 minute d'arc.
import * as A from '../vendor/astronomy.js';

const DAY = 86400000;
const Moon = A.Body.Moon;
const Sun = A.Body.Sun;

export const QUARTER_NAMES = ['Nouvelle lune', 'Premier quartier', 'Pleine lune', 'Dernier quartier'];
export const QUARTER_SHORT = ['NL', 'PQ', 'PL', 'DQ'];

export function makeObserver(loc) {
  return new A.Observer(loc.lat, loc.lon, loc.elev || 0);
}

// ---------- petits outils vectoriels ----------
const v = (x, y, z) => ({ x, y, z });
const sub = (a, b) => v(a.x - b.x, a.y - b.y, a.z - b.z);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => v(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const scale = (a, s) => v(a.x * s, a.y * s, a.z * s);
const norm = (a) => scale(a, 1 / Math.hypot(a.x, a.y, a.z));

/**
 * Géométrie de rendu : repère de l'écran (x droite, y haut, z vers l'observateur)
 * exprimé dans le repère sélénographique (IAU), direction du Soleil et de la Terre.
 * mode 'sky'   : le zénith en haut — la Lune telle qu'on la voit dans son ciel.
 * mode 'north' : le nord céleste en haut.
 */
function geometry(t, obs, mode, geoMoon, geoSun) {
  const obsVec = A.ObserverVector(t, obs, false);
  const topo = sub(geoMoon, obsVec);
  const zView = norm(scale(topo, -1));                    // de la Lune vers l'observateur
  const upRef = mode === 'north' ? v(0, 0, 1) : norm(obsVec); // zénith ≈ direction géocentrique
  const up = norm(sub(upRef, scale(zView, dot(upRef, zView))));
  const right = cross(up, zView);

  const axis = A.RotationAxis(Moon, t);
  const p = axis.north;
  const a0 = axis.ra * 15 * Math.PI / 180;
  const node = v(-Math.sin(a0), Math.cos(a0), 0);
  const W = axis.spin * Math.PI / 180;
  const xb = norm(v(
    Math.cos(W) * node.x + Math.sin(W) * (p.y * node.z - p.z * node.y),
    Math.cos(W) * node.y + Math.sin(W) * (p.z * node.x - p.x * node.z),
    Math.cos(W) * node.z + Math.sin(W) * (p.x * node.y - p.y * node.x)));
  const yb = cross(p, xb);
  const toBody = (a) => [dot(a, xb), dot(a, yb), dot(a, p)];

  const sunDir = norm(sub(geoSun, geoMoon));
  const earthDir = norm(scale(geoMoon, -1));
  const viewBody = toBody(zView);
  return {
    // mat3 GLSL (colonnes) : images de right, up, zView dans le repère lunaire
    viewToBody: [...toBody(right), ...toBody(up), ...viewBody],
    sun: toBody(sunDir),
    earth: toBody(earthDir),
    view: viewBody,
    // repère EQJ de la vue, pour placer le vrai ciel derrière la Lune
    basis: {
      fwd: [-zView.x, -zView.y, -zView.z],
      up: [up.x, up.y, up.z],
      right: [right.x, right.y, right.z],
    },
    // libration totale : point sub-observateur en coordonnées sélénographiques
    librationLon: Math.atan2(viewBody[1], viewBody[0]) * 180 / Math.PI,
    librationLat: Math.asin(viewBody[2]) * 180 / Math.PI,
  };
}

/** État complet de la Lune à un instant donné (léger : appelé à chaque image pendant le défilement). */
export function moonAt(date, obs, mode = 'sky') {
  const t = A.MakeTime(date);
  const geoMoon = A.GeoVector(Moon, t, true);
  const geoSun = A.GeoVector(Sun, t, true);
  const illum = A.Illumination(Moon, t);
  const elong = A.MoonPhase(t);
  const lib = A.Libration(t);
  const geo = geometry(t, obs, mode, geoMoon, geoSun);
  return {
    date,
    fraction: illum.phase_fraction,
    phaseAngle: illum.phase_angle,
    elongation: elong,              // 0 NL, 90 PQ, 180 PL, 270 DQ
    waxing: elong < 180,
    distanceKm: lib.dist_km,
    diameterArcmin: lib.diam_deg * 60,
    ...geo,
  };
}

/** Hauteur du Soleil (degrés), pour la couleur du ciel. */
export function sunAltitude(date, obs) {
  const t = A.MakeTime(date);
  const eq = A.Equator(Sun, t, obs, true, true);
  return A.Horizon(t, obs, eq.ra, eq.dec, 'normal').altitude;
}

/** Données « lentes » : position dans le ciel, constellation, signe. */
export function moonSky(date, obs) {
  const t = A.MakeTime(date);
  const eq = A.Equator(Moon, t, obs, true, true);
  const hor = A.Horizon(t, obs, eq.ra, eq.dec, 'normal');
  const eqj = A.Equator(Moon, t, obs, false, true);
  const c = A.Constellation(eqj.ra, eqj.dec);
  const ecl = A.EclipticGeoMoon(t);
  return {
    altitude: hor.altitude,
    azimuth: hor.azimuth,
    constellation: c.symbol,
    eclipticLon: ((ecl.lon % 360) + 360) % 360,
  };
}

function eventsIn(body, obs, dayStart, dayEnd) {
  const limit = (dayEnd - dayStart) / DAY;
  const find = (dir) => {
    const r = A.SearchRiseSet(body, obs, dir, dayStart, limit);
    return r && r.date < dayEnd ? r.date : null;
  };
  return { rise: find(+1), set: find(-1) };
}

/** Lever, coucher et culmination pour un jour civil local. */
export function dayEvents(dayStart, obs) {
  const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1);
  const moon = eventsIn(Moon, obs, dayStart, dayEnd);
  const sun = eventsIn(Sun, obs, dayStart, dayEnd);
  let transit = null;
  try {
    const h = A.SearchHourAngle(Moon, obs, 0, dayStart, +1);
    if (h.time.date < dayEnd) transit = { date: h.time.date, altitude: h.hor.altitude };
  } catch { /* rien */ }
  return { moon, sun, transit, dayStart, dayEnd };
}

// ---------- quartiers (cache) ----------
let qCache = [];   // [{quarter, date}]
let qFrom = Infinity, qTo = -Infinity;

function ensureQuarters(fromMs, toMs) {
  if (fromMs >= qFrom && toMs <= qTo) return;
  const start = Math.min(fromMs, qFrom) - 40 * DAY;
  const end = Math.max(toMs, qTo) + 40 * DAY;
  const list = [];
  let mq = A.SearchMoonQuarter(new Date(start));
  while (mq.time.date.getTime() < end) {
    list.push({ quarter: mq.quarter, date: mq.time.date });
    mq = A.NextMoonQuarter(mq);
  }
  qCache = list; qFrom = start + 40 * DAY; qTo = end - 40 * DAY;
}

export function quartersBetween(fromMs, toMs) {
  ensureQuarters(fromMs, toMs);
  return qCache.filter((q) => q.date.getTime() >= fromMs && q.date.getTime() <= toMs);
}

/** Âge de la Lune (jours depuis la dernière nouvelle lune) et prochaines phases. */
export function lunation(date) {
  const ms = date.getTime();
  ensureQuarters(ms - 35 * DAY, ms + 35 * DAY);
  let lastNew = null;
  for (const q of qCache) if (q.quarter === 0 && q.date.getTime() <= ms) lastNew = q.date;
  const next = qCache.filter((q) => q.date.getTime() > ms).slice(0, 4);
  return { age: lastNew ? (ms - lastNew.getTime()) / DAY : null, next };
}

// ---------- échantillons d'illumination (cache, pas de 3 h) ----------
const STEP = 3 * 3600000;
const fCache = new Map();
export function fractionAtStep(k) {
  let f = fCache.get(k);
  if (f === undefined) {
    f = A.Illumination(Moon, new Date(k * STEP)).phase_fraction;
    if (fCache.size > 4000) fCache.clear();
    fCache.set(k, f);
  }
  return f;
}
export const SAMPLE_STEP = STEP;

/** Fraction et sens (croissant/décroissant) pour une petite icône de jour. */
const iconCache = new Map();
export function phaseIcon(date) {
  const key = Math.round(date.getTime() / 600000);
  let r = iconCache.get(key);
  if (!r) {
    const t = A.MakeTime(date);
    r = { fraction: A.Illumination(Moon, t).phase_fraction, waxing: A.MoonPhase(t) < 180 };
    if (iconCache.size > 2000) iconCache.clear();
    iconCache.set(key, r);
  }
  return r;
}

/** Nom de phase : les phases principales sont des instants — on les nomme le jour où elles tombent. */
export function phaseName(date, elongation) {
  const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const q = quartersBetween(d0, d0 + DAY - 1)[0];
  if (q) return { name: QUARTER_NAMES[q.quarter], exact: q.date, quarter: q.quarter };
  const e = elongation;
  const name = e < 90 ? 'Premier croissant' : e < 180 ? 'Gibbeuse croissante'
    : e < 270 ? 'Gibbeuse décroissante' : 'Dernier croissant';
  return { name, exact: null, quarter: null };
}
