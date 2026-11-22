// Le vrai ciel : catalogue d'étoiles (HYG via d3-celestial), projections et repères.
import * as A from '../vendor/astronomy.js';

const D2R = Math.PI / 180;

export const sky = { ready: false, stars: null, count: 0, names: {}, special: {}, lines: {}, labels: [] };

// Noms français des étoiles brillantes
const FR = {
  Aldebaran: 'Aldébaran', Betelgeuse: 'Bételgeuse', Altair: 'Altaïr', Vega: 'Véga', Regulus: 'Régulus',
  Polaris: 'la Polaire', Spica: 'l’Épi', Achernar: 'Achernar', Fomalhaut: 'Fomalhaut', Hadar: 'Hadar',
  Shedar: 'Schedar', Navi: 'γ Cassiopée', Elnath: 'Elnath', Alnilam: 'Alnilam', Alnitak: 'Alnitak',
  Mintaka: 'Mintaka', Alhena: 'Alhena', Mirfak: 'Mirfak', Algol: 'Algol', Hamal: 'Hamal', Menkar: 'Menkar',
  Denebola: 'Dénébola', Algieba: 'Algieba', Rasalhague: 'Rasalhague', Kochab: 'Kochab', Eltanin: 'Eltanin',
  Enif: 'Enif', Scheat: 'Scheat', Markab: 'Markab', Alpheratz: 'Alphératz', Mirach: 'Mirach', Almach: 'Almach',
  Diphda: 'Diphda', Sadr: 'Sadr', Saiph: 'Saïph', Wezen: 'Wezen', Adhara: 'Adhara', Castor: 'Castor',
  Pollux: 'Pollux', Procyon: 'Procyon', Capella: 'Capella', Rigel: 'Rigel', Bellatrix: 'Bellatrix',
  Sirius: 'Sirius', Arcturus: 'Arcturus', Antares: 'Antarès', Deneb: 'Deneb', Alcyone: 'les Pléiades',
};
export const starName = (n) => FR[n] || n;

export function vec(raDeg, decDeg) {
  const r = raDeg * D2R, d = decDeg * D2R;
  return [Math.cos(d) * Math.cos(r), Math.cos(d) * Math.sin(r), Math.sin(d)];
}

export async function loadSky(url = 'data/sky.json') {
  const j = await (await fetch(url)).json();
  const n = j.stars.length;
  const s = new Float32Array(n * 5);   // x, y, z, mag, b-v
  j.stars.forEach(([ra, dec, mag, bv], i) => {
    const v = vec(ra, dec);
    s.set([v[0], v[1], v[2], mag, bv], i * 5);
  });
  sky.stars = s; sky.count = n;
  sky.names = j.names; sky.special = j.special;
  sky.lines = {};
  sky.labels = [];
  for (const [id, segs] of Object.entries(j.lines)) {
    const vs = segs.map((seg) => seg.map(([ra, dec]) => vec(ra, dec)));
    sky.lines[id] = vs;
    let cx = 0, cy = 0, cz = 0, k = 0;
    for (const seg of vs) for (const p of seg) { cx += p[0]; cy += p[1]; cz += p[2]; k++; }
    const m = Math.hypot(cx, cy, cz) || 1;
    sky.labels.push({ id, v: [cx / m, cy / m, cz / m] });
  }
  sky.ready = true;
  return sky;
}

export const starVec = (i) => [sky.stars[i * 5], sky.stars[i * 5 + 1], sky.stars[i * 5 + 2]];
export const specialVec = (key) => starVec(sky.special[key]);

/** Repère de vue (EQJ) : fwd = direction visée, up = haut de l'écran, right = droite. */
export function basis(fwd, upRef) {
  const d = fwd;
  const k = upRef[0] * d[0] + upRef[1] * d[1] + upRef[2] * d[2];
  let up = [upRef[0] - k * d[0], upRef[1] - k * d[1], upRef[2] - k * d[2]];
  const m = Math.hypot(...up); up = up.map((x) => x / m);
  const z = [-d[0], -d[1], -d[2]];
  const right = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]];
  return { fwd: d, up, right };
}

/** Projection stéréographique (conforme : les constellations gardent leur forme). Renvoie [X, Y, z]. */
export function project(v, b) {
  const x = v[0] * b.right[0] + v[1] * b.right[1] + v[2] * b.right[2];
  const y = v[0] * b.up[0] + v[1] * b.up[1] + v[2] * b.up[2];
  const z = v[0] * b.fwd[0] + v[1] * b.fwd[1] + v[2] * b.fwd[2];
  const k = 2 / (1 + Math.max(z, -0.98));
  return [x * k, y * k, z];
}

/** Zénith de l'observateur en coordonnées EQJ. */
export function zenith(date, obs) {
  const o = A.ObserverVector(A.MakeTime(date), obs, false);
  const m = Math.hypot(o.x, o.y, o.z);
  return [o.x / m, o.y / m, o.z / m];
}

/** Coordonnées horizontales d'un vecteur EQJ (hauteur, azimut en degrés, avec réfraction). */
export function horizontal(v, date, obs) {
  const time = A.MakeTime(date);
  const rot = A.Rotation_EQJ_HOR(time, obs);
  const hv = A.RotateVector(rot, new A.Vector(v[0], v[1], v[2], time));
  const h = A.HorizonFromVector(hv, 'normal');
  return { altitude: h.lat, azimuth: h.lon };
}

/** Écliptique J2000, pour tracer la route de la Lune et du Soleil. */
const EPS = 23.4392911 * D2R;
export function eclipticVec(lonDeg) {
  const l = lonDeg * D2R;
  return [Math.cos(l), Math.sin(l) * Math.cos(EPS), Math.sin(l) * Math.sin(EPS)];
}

/** Couleur d'une étoile selon son indice B-V. */
export function starColor(bv) {
  const t = Math.max(-0.4, Math.min(2, bv));
  if (t < 0) return [170, 191, 255];
  if (t < 0.4) return [202 + t * 100, 215 + t * 75, 255];
  if (t < 0.8) return [255, 244 - (t - 0.4) * 30, 232 - (t - 0.4) * 90];
  if (t < 1.4) return [255, 232 - (t - 0.8) * 70, 196 - (t - 0.8) * 120];
  return [255, 190, 130];
}

/** Heure sidérale locale (heures). */
export function localSiderealTime(date, lon) {
  return ((A.SiderealTime(A.MakeTime(date)) + lon / 15) % 24 + 24) % 24;
}

export const DIPPER = ['alkaid', 'mizar', 'alioth', 'megrez', 'phecda', 'merak', 'dubhe'];
export const DIPPER_LINES = [['alkaid', 'mizar'], ['mizar', 'alioth'], ['alioth', 'megrez'], ['megrez', 'phecda'],
  ['phecda', 'merak'], ['merak', 'dubhe'], ['dubhe', 'megrez']];
export const CASSIOPEIA = ['caph', 'schedar', 'gcas', 'ruchbah', 'segin'];
