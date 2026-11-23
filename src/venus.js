// Vénus, l'étoile du berger : sa phase (comme Galilée l'a vue en 1610), son éclat, où et quand la regarder.
import * as A from '../vendor/astronomy.js';
import { time, num, direction, shortDate } from './format.js';
import { runhead, folio, dropcap } from './panels.js';
import { phasePath } from './phase-icon.js';

const DAY = 86400000;
const V = A.Body.Venus, S = A.Body.Sun;
const R_VENUS = 6051.8;

function riseSetOf(body, obs, start, end) {
  const lim = (end - start) / DAY;
  const f = (dir) => { const r = A.SearchRiseSet(body, obs, dir, start, lim); return r && r.date < end ? r.date : null; };
  return { rise: f(+1), set: f(-1) };
}

/** Tout sur Vénus pour un instant et un lieu. */
export function venusAt(date, obs) {
  const t = A.MakeTime(date);
  const il = A.Illumination(V, t);
  const el = A.Elongation(V, t);
  const eq = A.Equator(V, t, obs, true, true);
  const hor = A.Horizon(t, obs, eq.ra, eq.dec, 'normal');
  const distKm = il.geo_dist * A.KM_PER_AU;
  const diam = 2 * Math.atan(R_VENUS / distKm) * 206264.8;      // secondes d'arc
  const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d1 = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 1);
  const v = riseSetOf(V, obs, d0, d1), s = riseSetOf(S, obs, d0, d1);
  const evening = el.visibility === 'evening';
  // la fenêtre où l'on peut la voir : après le coucher du Soleil, ou avant son lever
  let window = null;
  if (el.elongation > 9) {
    if (evening && v.set && s.set && v.set - s.set > 25 * 60000) window = { from: new Date(s.set.getTime() + 20 * 60000), to: v.set };
    if (!evening && v.rise && s.rise && s.rise - v.rise > 25 * 60000) window = { from: v.rise, to: new Date(s.rise.getTime() - 20 * 60000) };
  }
  return {
    fraction: il.phase_fraction, mag: il.mag, elongation: el.elongation, evening,
    altitude: hor.altitude, azimuth: hor.azimuth, distKm, diam, rise: v.rise, set: v.set, window,
    setAz: v.set ? A.Horizon(v.set, obs, A.Equator(V, v.set, obs, true, true).ra, A.Equator(V, v.set, obs, true, true).dec, 'normal').azimuth : null,
    riseAz: v.rise ? A.Horizon(v.rise, obs, A.Equator(V, v.rise, obs, true, true).ra, A.Equator(V, v.rise, obs, true, true).dec, 'normal').azimuth : null,
  };
}

/** Version courte, sur une seule ligne, pour l'écran Lune. */
export function venusShort(v) {
  if (!v.window) return v.elongation <= 9 ? 'Vénus est cachée par le Soleil' : 'Vénus : pas visible aujourd’hui';
  return v.evening ? `L’étoile du berger · ce soir jusqu’à ${time(v.window.to)}` : `L’étoile du berger · ce matin dès ${time(v.window.from)}`;
}

/** La petite ligne de l'écran Lune. */
export function venusLine(v) {
  if (!v.window) {
    if (v.elongation <= 9) return 'Vénus est cachée dans l’éclat du Soleil ces jours-ci';
    return v.evening ? 'L’étoile du berger se couche trop tôt pour être vue ce soir' : 'L’étoile du berger se lève trop tard pour être vue ce matin';
  }
  return v.evening
    ? `L’étoile du berger brille ce soir ${where(v.setAz)}, jusqu’à ${time(v.window.to)}`
    : `L’étoile du berger brille ce matin ${where(v.riseAz)}, dès ${time(v.window.from)}`;
}
function where(az) {
  if (az == null) return 'sur l’horizon';
  const d = direction(az).toLowerCase();
  return /^[eo]/.test(d) ? `à l’${d}` : `au ${d}`;
}

/** Vénus dessinée au lavis, à la taille apparente (exagérée) et dans sa phase. */
function venusDrawing(v) {
  const r = Math.max(18, Math.min(80, v.diam * 1.25));
  const s = 2 * r + 20;
  const lit = phasePath(v.fraction, v.evening, r, s / 2, s / 2);
  return `<svg viewBox="0 0 ${s} ${s}" class="venus-draw" style="width:${s}px;height:${s}px" aria-hidden="true">
    <defs><radialGradient id="vlit" cx="40%" cy="40%" r="70%"><stop offset="0" stop-color="#fbf4e2"/><stop offset="1" stop-color="#e4d2a8"/></radialGradient></defs>
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="#6b4a2a" opacity=".85"/>
    <path d="${lit}" fill="url(#vlit)"/>
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="#3a2614" stroke-width="1.2"/>
  </svg>`;
}

export function renderVenus(body, v, date) {
  const pct = Math.round(v.fraction * 100);
  const shape = pct < 35 ? 'un fin croissant' : pct < 65 ? 'une demi-Vénus, comme un quartier de Lune' : pct < 92 ? 'une Vénus gibbeuse' : 'un disque presque plein, tout petit';
  body.innerHTML = `
    ${runhead('De Venere')}
    <h3 class="lettrine">${dropcap('Vénus, l’étoile du berger')}</h3>
    <p class="lead">${v.evening ? 'Étoile du soir : elle suit le Soleil à l’ouest après son coucher.' : 'Étoile du matin : elle précède le Soleil à l’est avant l’aube.'}</p>
    <div class="venus-plate">${venusDrawing(v)}<p class="caption">Dans une lunette, ce soir, Vénus montre ${shape}.</p></div>
    <dl class="rows">
      <div class="row"><dt>Quand la voir</dt><dd>${v.window ? `${time(v.window.from)} → ${time(v.window.to)}` : '—'}<small>${venusLine(v)}</small></dd></div>
      <div class="row"><dt>Éclat</dt><dd>${num(v.mag, 1)}<small>après la Lune, l’astre le plus brillant de la nuit</small></dd></div>
      <div class="row"><dt>Phase</dt><dd>${pct} %<small>éclairée</small></dd></div>
      <div class="row"><dt>Écart au Soleil</dt><dd>${num(v.elongation, 0)}°<small>${v.evening ? 'à l’est du Soleil' : 'à l’ouest du Soleil'}</small></dd></div>
      <div class="row"><dt>Diamètre apparent</dt><dd>${num(v.diam, 0)}″<small>${num(v.distKm / 1e6, 0)} millions de km</small></dd></div>
      <div class="row"><dt>Lever · coucher</dt><dd>${time(v.rise)} · ${time(v.set)}</dd></div>
    </dl>
    <h4>Ce que Galilée a vu</h4>
    <p class="story">À l’automne 1610, Galilée pointe sa lunette vers Vénus et la voit changer de forme, du disque rond au fin
      croissant, en grossissant à mesure qu’elle s’approche. Impossible si elle tournait autour de la Terre :
      elle tourne autour du Soleil. Copernic avait raison.</p>
    <p class="story">Prudent, il cache sa découverte dans une anagramme latine envoyée à Prague, à l’intention de Kepler :
      <i>« Haec immatura a me iam frustra leguntur o.y. »</i> — qu’il dévoile ensuite :
      <i>« Cynthiae figuras aemulatur mater amorum »</i>, <b>la mère des amours imite les figures de la Lune</b>.</p>
    <h4>L’étoile du berger</h4>
    <p class="story">Première lumière du soir et dernière de l’aube, elle guidait les bergers qui rentraient ou sortaient
      les troupeaux. Ce n’est pas une étoile : c’est une planète voilée de nuages, qui renvoie la lumière du Soleil.</p>
    <p class="motto-small">Mater amorum</p>
    ${folio(date)}`;
}

/** Vecteur J2000 (EQJ) de Vénus, pour la carte du ciel. */
export function venusEqj(date, obs) {
  const e = A.Equator(V, A.MakeTime(date), obs, false, true);
  return { ra: e.ra * 15, dec: e.dec };
}
