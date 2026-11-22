// Le Soleil : lever, coucher, midi vrai, crépuscules, heures dorées et bleues, course du jour et de l'année.
import * as A from '../vendor/astronomy.js';
import { time, longDate, num, direction, shortDate, CONSTELLATIONS, LATIN, roman, dayOfYear } from './format.js';

const DAY = 86400000;
const Sun = A.Body.Sun;

function sunAlt(date, obs) {
  const eq = A.Equator(Sun, date, obs, true, true);
  return A.Horizon(date, obs, eq.ra, eq.dec, 'normal');
}

const dayStartOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const nextDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

function riseSet(obs, start, end) {
  const lim = (end - start) / DAY;
  const f = (dir) => { const r = A.SearchRiseSet(Sun, obs, dir, start, lim); return r && r.date < end ? r.date : null; };
  return { rise: f(+1), set: f(-1) };
}

function crossing(obs, dir, start, end, alt) {
  const r = A.SearchAltitude(Sun, obs, dir, start, (end - start) / DAY, alt);
  return r && r.date < end ? r.date : null;
}

/** Toute la journée solaire d'un jour civil local. */
export function sunDay(date, obs) {
  const start = dayStartOf(date), end = nextDay(date);
  const { rise, set } = riseSet(obs, start, end);
  let noon = null;
  try {
    const h = A.SearchHourAngle(Sun, obs, 0, start, +1);
    if (h.time.date < end) noon = { date: h.time.date, altitude: h.hor.altitude };
  } catch { /* rien */ }
  const up = (a) => crossing(obs, +1, start, end, a), down = (a) => crossing(obs, -1, start, end, a);
  const dawn = { civil: up(-6), nautical: up(-12), astro: up(-18) };
  const dusk = { civil: down(-6), nautical: down(-12), astro: down(-18) };
  const golden = { am: [up(-4), up(6)], pm: [down(6), down(-4)] };
  const blue = { am: [up(-6), up(-4)], pm: [down(-4), down(-6)] };
  // la nuit noire jusqu'à l'aube astronomique du lendemain
  const end2 = nextDay(end);
  const nightEnd = crossing(obs, +1, end, end2, -18);
  // la journée d'hier, pour la variation
  const y0 = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
  const y = riseSet(obs, y0, start);
  const length = rise && set ? set - rise : null;
  const prevLength = y.rise && y.set ? y.set - y.rise : null;
  const samples = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 10 * 60000) samples.push([t, sunAlt(new Date(t), obs).altitude]);
  return { start, end, rise, set, noon, dawn, dusk, golden, blue, nightEnd, length, prevLength, samples };
}

/** Durée du jour au fil de l'année (1er et 15 de chaque mois), mise en cache. */
const yearCache = new Map();
export function yearCurve(year, obs) {
  const key = `${year}|${obs.latitude.toFixed(2)}|${obs.longitude.toFixed(2)}`;
  if (yearCache.has(key)) return yearCache.get(key);
  const pts = [];
  for (let m = 0; m < 12; m++) {
    for (const d of [1, 15]) {
      const s = new Date(year, m, d), e = new Date(year, m, d + 1);
      const { rise, set } = riseSet(obs, s, e);
      if (rise && set) pts.push([s.getTime(), (set - rise) / 3600000]);
    }
  }
  const s = new Date(year, 11, 31), e = new Date(year + 1, 0, 1);
  const last = riseSet(obs, s, e);
  if (last.rise && last.set) pts.push([s.getTime(), (last.set - last.rise) / 3600000]);
  const seasons = A.Seasons(year);
  const out = { pts, seasons: [
    ['Équinoxe de printemps', seasons.mar_equinox.date], ['Solstice d’été', seasons.jun_solstice.date],
    ['Équinoxe d’automne', seasons.sep_equinox.date], ['Solstice d’hiver', seasons.dec_solstice.date]] };
  yearCache.set(key, out);
  return out;
}

const hm = (ms) => {
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
};
const span = (a, b) => (a && b ? `${time(a)} – ${time(b)}` : '—');

// couleur du ciel selon la hauteur du Soleil (nuit, crépuscules, heure bleue, heure dorée, jour)
const SKY = [[-90, [4, 6, 11]], [-18, [5, 8, 15]], [-12, [11, 21, 48]], [-6, [27, 47, 92]], [-4, [58, 79, 134]],
  [0, [160, 103, 58]], [6, [185, 138, 74]], [12, [59, 88, 120]], [70, [74, 109, 146]]];
function skyColor(alt) {
  for (let i = 1; i < SKY.length; i++) {
    if (alt <= SKY[i][0]) {
      const [a0, c0] = SKY[i - 1], [a1, c1] = SKY[i];
      const k = Math.max(0, Math.min(1, (alt - a0) / (a1 - a0)));
      return c0.map((c, j) => Math.round(c + (c1[j] - c) * k));
    }
  }
  return SKY[SKY.length - 1][1];
}

function dayGraph(d, now, W) {
  const H = 178, top = 18, bottom = 30;
  const alts = d.samples.map((s) => s[1]);
  const amin = Math.min(-22, Math.min(...alts) - 2), amax = Math.max(30, Math.max(...alts) + 8);
  const x = (t) => ((t - d.start) / (d.end - d.start)) * W;
  const y = (a) => top + (1 - (a - amin) / (amax - amin)) * (H - top - bottom);
  let stops = '';
  d.samples.forEach(([t, a], i) => {
    if (i % 2) return;
    const c = skyColor(a);
    stops += `<stop offset="${(x(t) / W).toFixed(4)}" stop-color="rgb(${c.join(',')})"/>`;
  });
  const line = d.samples.map(([t, a], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)} ${y(a).toFixed(1)}`).join('');
  const y0 = y(0);
  let ticks = '';
  for (let h = 0; h <= 24; h += 3) {
    const t = d.start.getTime() + h * 3600000, xx = x(t);
    ticks += `<line x1="${xx}" x2="${xx}" y1="${H - bottom + 2}" y2="${H - bottom + (h % 6 ? 4 : 7)}" class="tk"/>`;
    if (h % 6 === 0 && h > 0 && h < 24) ticks += `<text x="${xx}" y="${H - 8}" class="hr">${roman(h)}</text>`;
  }
  let marks = '';
  for (const [t, cls] of [[d.rise, 'rs'], [d.set, 'rs']]) {
    if (!t) continue;
    marks += `<circle cx="${x(t).toFixed(1)}" cy="${y0}" r="2.2" class="${cls}"/>`;
  }
  let sun = '';
  if (now >= d.start && now < d.end) {
    const a = sunAlt(now, OBS_REF.obs).altitude;
    const sx = x(now.getTime()), sy = y(a);
    sun = `<line x1="${sx}" x2="${sx}" y1="${top - 6}" y2="${H - bottom}" class="now"/>
      <circle cx="${sx}" cy="${sy}" r="11" class="glow"/><circle cx="${sx}" cy="${sy}" r="5" class="${a > -0.8 ? 'sun' : 'sun under'}"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="sun-svg" preserveAspectRatio="none">
    <defs><linearGradient id="skyday" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient>
      <radialGradient id="sunglow"><stop offset="0" stop-color="#ffd98f" stop-opacity=".9"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>
    <rect x="0" y="${top - 6}" width="${W}" height="${H - top - bottom + 6}" fill="url(#skyday)" rx="10" opacity=".75"/>
    <rect x="0" y="${y0}" width="${W}" height="${H - bottom - y0}" class="earth" rx="0"/>
    <line x1="0" x2="${W}" y1="${y0}" y2="${y0}" class="hz"/>
    <path d="${line}" class="course"/>
    ${marks}${ticks}${sun}
  </svg>`;
}

function yearGraph(yc, now, W) {
  const H = 96, pad = 14;
  const t0 = new Date(now.getFullYear(), 0, 1).getTime(), t1 = new Date(now.getFullYear() + 1, 0, 1).getTime();
  const hs = yc.pts.map((p) => p[1]);
  const hmin = Math.min(...hs) - 0.5, hmax = Math.max(...hs) + 0.5;
  const x = (t) => ((t - t0) / (t1 - t0)) * W;
  const y = (h) => pad + (1 - (h - hmin) / (hmax - hmin)) * (H - pad * 2);
  const d = yc.pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join('');
  let months = '';
  'JFMAMJJASOND'.split('').forEach((m, i) => {
    const xx = x(new Date(now.getFullYear(), i, 15).getTime());
    months += `<text x="${xx.toFixed(1)}" y="${H - 1}" class="mo">${m}</text>`;
  });
  // position du jour par interpolation
  const nt = now.getTime();
  let hn = hs[0];
  for (let i = 1; i < yc.pts.length; i++) {
    if (yc.pts[i][0] >= nt) { const [ta, ha] = yc.pts[i - 1], [tb, hb] = yc.pts[i]; hn = ha + (hb - ha) * (nt - ta) / (tb - ta); break; }
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="year-svg" preserveAspectRatio="none">
    <path d="${d}" class="yl"/>
    <line x1="${x(nt)}" x2="${x(nt)}" y1="${pad - 6}" y2="${H - 12}" class="now"/>
    <circle cx="${x(nt)}" cy="${y(hn)}" r="3.6" class="sun"/>
    ${months}</svg>`;
}

const OBS_REF = { obs: null };

/** Rend toute la page Soleil. */
export function renderSun(root, date, obs, placeName) {
  OBS_REF.obs = obs;
  const d = sunDay(date, obs);
  const W = Math.min(root.clientWidth || 360, 488) - 32;
  const pos = sunAlt(date, obs);
  const eqj = A.Equator(Sun, date, obs, false, true);
  const con = A.Constellation(eqj.ra, eqj.dec).symbol;
  const delta = d.length && d.prevLength ? d.length - d.prevLength : null;
  const dTxt = delta == null ? '' : `${delta >= 0 ? '+' : '−'}${Math.floor(Math.abs(delta) / 60000)} min ${String(Math.round(Math.abs(delta) / 1000) % 60).padStart(2, '0')} s depuis hier`;
  const yc = yearCurve(date.getFullYear(), obs);
  const nextSeason = [...yc.seasons, ...yearCurve(date.getFullYear() + 1, obs).seasons].find(([, t]) => t > date);
  const days = nextSeason ? Math.ceil((nextSeason[1] - date) / DAY) : null;
  const winterNote = nextSeason && nextSeason[0] === 'Solstice d’hiver' ? ' — ensuite, les jours rallongeront'
    : nextSeason && nextSeason[0] === 'Solstice d’été' ? ' — ensuite, les jours raccourciront' : '';

  root.innerHTML = `
    <div class="sun-page">
      <div class="runhead">De Sole</div>
      <div class="sun-nav">
        <button class="sun-arrow" data-step="-1" aria-label="Jour précédent">‹</button>
        <div class="sun-date">${longDate(date)}<small>${placeName}</small></div>
        <button class="sun-arrow" data-step="1" aria-label="Jour suivant">›</button>
      </div>
      <div class="sun-graph">${dayGraph(d, date, W)}</div>
      <div class="riseset sun-rs">
        <div class="rs"><span class="rs-label">Lever</span><span class="rs-time">${time(d.rise)}</span></div>
        <div class="rs"><span class="rs-label">Midi vrai</span><span class="rs-time">${d.noon ? time(d.noon.date) : '—'}${d.noon ? `<small>${num(d.noon.altitude, 0)}°</small>` : ''}</span></div>
        <div class="rs"><span class="rs-label">Coucher</span><span class="rs-time">${time(d.set)}</span></div>
      </div>
      <p class="sun-len">${d.length ? `<b>${hm(d.length)}</b> de jour` : '—'}<small>${dTxt}</small></p>

      <div class="hours">
        <div class="hr gold"><div class="hr-t">Heure dorée</div><div class="hr-v">${span(...d.golden.am)}<br>${span(...d.golden.pm)}</div>
          <p>Le Soleil frôle l’horizon : lumière chaude et rasante, ombres longues.</p></div>
        <div class="hr blue"><div class="hr-t">Heure bleue</div><div class="hr-v">${span(...d.blue.am)}<br>${span(...d.blue.pm)}</div>
          <p>Le Soleil est juste sous l’horizon : le ciel prend un bleu profond et froid.</p></div>
      </div>

      <h4>Crépuscules</h4>
      <dl class="rows">
        <div class="row"><dt>Civil</dt><dd>${time(d.dawn.civil)} · ${time(d.dusk.civil)}<small>on lit encore dehors sans lampe</small></dd></div>
        <div class="row"><dt>Nautique</dt><dd>${time(d.dawn.nautical)} · ${time(d.dusk.nautical)}<small>l’horizon marin se perd</small></dd></div>
        <div class="row"><dt>Astronomique</dt><dd>${time(d.dawn.astro)} · ${time(d.dusk.astro)}<small>au-delà, le ciel est tout à fait noir</small></dd></div>
        <div class="row"><dt>Nuit noire</dt><dd>${d.dusk.astro && d.nightEnd ? `${time(d.dusk.astro)} → ${time(d.nightEnd)}` : 'pas de vraie nuit'}<small>le meilleur moment pour l’Ourse et la Voie lactée</small></dd></div>
      </dl>

      <h4>Le Soleil à ${time(date)}</h4>
      <dl class="rows">
        <div class="row"><dt>Hauteur</dt><dd>${num(pos.altitude, 0)}°<small>${pos.altitude > 0 ? 'au-dessus de l’horizon' : 'sous l’horizon'}</small></dd></div>
        <div class="row"><dt>Direction</dt><dd>${direction(pos.azimuth)}<small>azimut ${num(pos.azimuth, 0)}°</small></dd></div>
        <div class="row"><dt>Constellation</dt><dd>${CONSTELLATIONS[con] || con}<small><i>${LATIN[con] || ''}</i></small></dd></div>
      </dl>

      <h4>L’année du Soleil</h4>
      <div class="year-graph">${yearGraph(yc, date, W)}</div>
      ${nextSeason ? `<p class="sun-season"><b>${nextSeason[0]}</b> : ${shortDate(nextSeason[1])} à ${time(nextSeason[1])}, dans ${days} jour${days > 1 ? 's' : ''}${winterNote}.</p>` : ''}

      <p class="motto-small">Sol lucet omnibus</p>
      <div class="folio">❧ &nbsp;f. ${roman(dayOfYear(date), true)} · anno ${roman(date.getFullYear())}&nbsp; ❧</div>
    </div>`;
}
