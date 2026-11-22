// Le nocturlabe : instrument de la Renaissance qui lisait l'heure de la nuit
// grâce aux « gardes » de la Grande Ourse tournant autour de la Polaire.
// Ici, il montre en direct l'Ourse telle qu'elle est au-dessus de toi, regard tourné vers le nord.
import { sky, specialVec, basis, project, zenith, horizontal, localSiderealTime, DIPPER, DIPPER_LINES, CASSIOPEIA } from './sky.js';
import { direction, num, time } from './format.js';
import { dropcap, runhead, folio } from './panels.js';

const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const R = 40;                          // rayon utile du cadran (unités SVG)
const K = R / (2 * Math.tan((54 / 2) * Math.PI / 180));   // 54° autour de la Polaire : l'horizon nord entre dans le cadran

/** Géométrie de l'Ourse pour un instant et un lieu. */
export function ursa(date, obs, place) {
  const polaris = specialVec('polaris');
  const zen = zenith(date, obs);
  const b = basis(polaris, zen);
  const P = (key) => { const p = project(specialVec(key), b); return [p[0] * K, -p[1] * K]; };
  const pts = {};
  for (const k of [...DIPPER, 'alcor', ...CASSIOPEIA]) pts[k] = P(k);

  // horizon : points de hauteur nulle vus depuis la Polaire
  const horizon = [];
  const n = [zen[0], zen[1], zen[2]];
  // deux vecteurs du plan horizontal
  let e1 = [-n[1], n[0], 0]; const m1 = Math.hypot(...e1); e1 = e1.map((x) => x / m1);
  const e2 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
  for (let a = 0; a <= 360; a += 4) {
    const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
    const v = [e1[0] * c + e2[0] * s, e1[1] * c + e2[1] * s, e1[2] * c + e2[2] * s];
    const p = project(v, b);
    if (p[2] > 0) horizon.push([p[0] * K, -p[1] * K]);
  }
  horizon.sort((u, w) => u[0] - w[0]);
  // le nord sur l'horizon : le pôle céleste rabattu sur l'horizon
  const k0 = zen[2];
  let nv = [-k0 * zen[0], -k0 * zen[1], 1 - k0 * zen[2]]; const mn = Math.hypot(...nv); nv = nv.map((x) => x / mn);
  const np = project(nv, b);
  const north = [np[0] * K, -np[1] * K];

  // position de l'Ourse dans le ciel
  let sx = 0, sy = 0, sz = 0;
  for (const k of DIPPER) { const v = specialVec(k); sx += v[0]; sy += v[1]; sz += v[2]; }
  const m = Math.hypot(sx, sy, sz);
  const centre = horizontal([sx / m, sy / m, sz / m], date, obs);
  const dubhe = horizontal(specialVec('dubhe'), date, obs);
  const alkaidDec = 49.31;
  const circumpolar = place.lat > 90 - alkaidDec;

  // l'alidade : de la Polaire vers les gardes (Merak → Dubhe), comme sur l'instrument
  const g = pts.dubhe;
  const angle = Math.atan2(-g[1], g[0]);   // angle mathématique (y vers le haut)
  return { pts, horizon, north, centre, dubhe, circumpolar, angle, lst: localSiderealTime(date, place.lon) };
}

/** Dessin SVG du nocturlabe. big : version détaillée (graduations romaines). */
export function nocturlabeSvg(u, date, big = false) {
  const hours = date.getHours() + date.getMinutes() / 60;
  // l'anneau des heures est réglé « à la date du jour » : l'alidade y lit l'heure locale
  const base = u.angle - hours * 15 * Math.PI / 180;
  const at = (h, r) => {
    const a = base + h * 15 * Math.PI / 180;
    return [Math.cos(a) * r, -Math.sin(a) * r];
  };
  let ticks = '', labels = '';
  for (let h = 0; h < 24; h++) {
    const [x1, y1] = at(h, 44.5), [x2, y2] = at(h, h % 3 === 0 ? 41 : 42.6);
    ticks += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
    if (big && h % 2 === 0) {
      const [x, y] = at(h, 47.6);
      labels += `<text x="${x.toFixed(2)}" y="${(y + 1.1).toFixed(2)}">${ROMAN[h % 12]}</text>`;
    }
  }
  const p = u.pts;
  const line = (a, b, cls) => `<line class="${cls}" x1="${p[a][0].toFixed(2)}" y1="${p[a][1].toFixed(2)}" x2="${p[b][0].toFixed(2)}" y2="${p[b][1].toFixed(2)}"/>`;
  const dipper = DIPPER_LINES.map(([a, b]) => line(a, b, 'ul')).join('');
  const cas = big ? ['caph', 'schedar', 'gcas', 'ruchbah', 'segin'].slice(0, -1)
    .map((k, i, arr) => line(k, ['schedar', 'gcas', 'ruchbah', 'segin'][i], 'cl')).join('') : '';
  const star = (k, r) => `<circle class="st" cx="${p[k][0].toFixed(2)}" cy="${p[k][1].toFixed(2)}" r="${r}"/>`;
  const stars = DIPPER.map((k) => star(k, k === 'megrez' ? 1.05 : 1.45)).join('') + (big ? star('alcor', 0.55) : '')
    + (big ? CASSIOPEIA.map((k) => star(k, 0.95)).join('') : '');
  const [ax, ay] = at(hours, 44);
  const hz = u.horizon.length > 1
    ? `<path class="hz" d="M-60 ${u.horizon[0][1].toFixed(1)}L${u.horizon.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L')}L60 ${u.horizon[u.horizon.length - 1][1].toFixed(1)}L60 60L-60 60Z"/>` : '';
  // noms écartés de part et d'autre de la figure, pour ne pas se chevaucher
  let names = '';
  if (big) {
    const LABEL = { dubhe: 'Dubhe', merak: 'Merak', phecda: 'Phecda', megrez: 'Megrez', alioth: 'Alioth', mizar: 'Mizar', alkaid: 'Alkaid' };
    let cx = 0, cy = 0;
    for (const k of DIPPER) { cx += p[k][0] / 7; cy += p[k][1] / 7; }
    for (const k of DIPPER) {
      let dx = p[k][0] - cx, dy = p[k][1] - cy; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      const x = p[k][0] + dx * 3.2, y = p[k][1] + dy * 3.2 + 1.2;
      names += `<text class="nm" x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="${dx > 0.3 ? 'start' : dx < -0.3 ? 'end' : 'middle'}">${LABEL[k]}</text>`;
    }
    names += `<text class="nm cas" x="${(p.gcas[0]).toFixed(2)}" y="${(p.gcas[1] - 4).toFixed(2)}" text-anchor="middle">Cassiopée</text>`;
    const n = u.north;
    if (Math.hypot(n[0], n[1]) < 37) names += `<text class="nord" x="${n[0].toFixed(2)}" y="${(n[1] + 4.5).toFixed(2)}">NORD</text>`;
  }
  return `<svg viewBox="-52 -52 104 104" class="noct${big ? ' big' : ''}" aria-hidden="true">
    <defs><radialGradient id="brass${big ? 'B' : 'S'}" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="#f0d9a6"/><stop offset=".55" stop-color="#b8945a"/><stop offset="1" stop-color="#6d5330"/></radialGradient>
      <clipPath id="dial${big ? 'B' : 'S'}"><circle r="40"/></clipPath></defs>
    <circle class="rim" r="${big ? 50.5 : 49}" stroke="url(#brass${big ? 'B' : 'S'})"/>
    <circle class="face" r="40"/>
    <g clip-path="url(#dial${big ? 'B' : 'S'})">${hz}${cas}${dipper}
      <line class="al" x1="0" y1="0" x2="${(ax * 0.9).toFixed(2)}" y2="${(ay * 0.9).toFixed(2)}"/></g>
    <g class="tk" stroke="url(#brass${big ? 'B' : 'S'})">${ticks}</g>
    <g class="rn">${labels}</g>
    <g clip-path="url(#dial${big ? 'B' : 'S'})">${stars}${names}</g>
    <path class="po" d="M0 -2.6 L0.7 -0.7 L2.6 0 L0.7 0.7 L0 2.6 L-0.7 0.7 L-2.6 0 L-0.7 -0.7Z"/>
  </svg>`;
}

const STARS_TEXT = [
  ['Dubhe', '« l’ours » — le dos de la Grande Ourse'],
  ['Merak', '« les reins » — avec Dubhe, l’une des deux gardes qui montrent la Polaire'],
  ['Phecda', '« la cuisse »'],
  ['Megrez', '« la racine de la queue » — la plus discrète des sept'],
  ['Alioth', 'la plus brillante de la constellation'],
  ['Mizar & Alcor', '« le cheval et le cavalier » — l’épreuve des yeux perçants'],
  ['Alkaid', '« le chef » — au bout de la queue, la plus lointaine'],
];

export function ursaSheet(body, u, date, placeName) {
  const pos = u.centre;
  const visible = pos.altitude > 0;
  body.innerHTML = `
    ${runhead('De Ursa Maiore')}
    <h3 class="lettrine">${dropcap('La Grande Ourse')}</h3>
    <p class="lead">${u.circumpolar ? `Toujours veillante : à ${placeName}, elle ne se couche jamais.` : 'Selon l’heure, elle frôle l’horizon.'}</p>
    <div class="noct-big">${nocturlabeSvg(u, date, true)}</div>
    <p class="caption">Le ciel du nord à ${time(date)}, tel que tu le vois en tournant le dos au sud.
      L’aiguille part de la Polaire et passe par les gardes : sur l’anneau réglé au jour, elle lit l’heure.</p>
    <dl class="rows">
      <div class="row"><dt>Direction</dt><dd>${direction(pos.azimuth)}<small>azimut ${num(pos.azimuth, 0)}°</small></dd></div>
      <div class="row"><dt>Hauteur</dt><dd>${num(pos.altitude, 0)}°<small>${visible ? 'au-dessus de l’horizon' : 'sous l’horizon'}</small></dd></div>
      <div class="row"><dt>Dubhe</dt><dd>${num(u.dubhe.altitude, 0)}° · ${direction(u.dubhe.azimuth)}<small>pour la retrouver à l’œil</small></dd></div>
      <div class="row"><dt>Heure sidérale</dt><dd>${Math.floor(u.lst)} h ${String(Math.floor((u.lst % 1) * 60)).padStart(2, '0')}<small>l’heure des étoiles</small></dd></div>
    </dl>
    <h4>Les sept étoiles</h4>
    <dl class="rows">${STARS_TEXT.map(([n, t]) => `<div class="row"><dt>${n}</dt><dd class="soft">${t}</dd></div>`).join('')}</dl>
    <h4>Légende</h4>
    <p class="story">Zeus aimait la nymphe Callisto. Héra, jalouse, la changea en ourse ; des années plus tard,
      son fils Arcas faillit la tuer à la chasse. Zeus les enleva tous deux au ciel : Callisto devint la Grande Ourse,
      Arcas la Petite. Héra obtint de l’Océan qu’il ne les laisse jamais se baigner — c’est pourquoi, sous nos latitudes,
      l’Ourse ne se couche jamais.</p>
    <p class="story">Les Romains y voyaient sept bœufs de labour, les <i>septem triones</i> : de là vient notre mot
      <i>septentrion</i>, le nord.</p>
    <p class="story">Prolonge cinq fois la ligne Merak → Dubhe : tu tombes sur la Polaire, l’étoile immobile.
      Suis l’arc de la queue : il mène à Arcturus, « le gardien de l’Ourse ».</p>
    <p class="motto-small">Ursine, le temps venra</p>
    ${folio(date)}`;
}
