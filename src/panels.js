// Panneaux : éphémérides détaillées et réglages.
import { settings, saveSettings, home, saveHome, place, locate, useHome } from './state.js';
import { num, time, longDate, shortDate, direction, zodiacSign, CONSTELLATIONS, LATIN, weekday, roman, dayOfYear } from './format.js';

// ---------- mise en page de livre ancien ----------
export const dropcap = (t) => `<span class="dc">${t.charAt(0)}</span>${t.slice(1)}`;
export const runhead = (latin) => `<div class="runhead">${latin}</div>`;
export const folio = (date) => `<div class="folio">❧ &nbsp;f. ${roman(dayOfYear(date), true)} · anno ${roman(date.getFullYear())}&nbsp; ❧</div>`;
import { QUARTER_NAMES } from './astro.js';
import { ALMANAC, MONTHS, upcoming } from './almanac.js';

function almanacHtml(date) {
  const soon = upcoming(date, 4).map((a) => `<div class="row alm"><dt>${a.d} ${MONTHS[a.m - 1]}<small>${a.y}</small></dt>
    <dd class="soft">${a.text}<small>${a.days === 0 ? 'aujourd’hui — il y a ' + a.years + ' ans' : 'dans ' + a.days + ' jour' + (a.days > 1 ? 's' : '') + ' · ' + a.years + ' ans'}</small></dd></div>`).join('');
  let year = '', month = 0;
  for (const [m, d, y, text] of ALMANAC) {
    if (m !== month) { month = m; year += `<p class="alm-month">${MONTHS[m - 1]}</p>`; }
    year += `<p class="alm-line"><b>${d}</b> <i>${y}</i> — ${text}</p>`;
  }
  return `<h4>Almanach des savants</h4><dl class="rows">${soon}</dl>
    <details class="alm-year"><summary>Toute l’année</summary>${year}</details>`;
}

const scrim = document.getElementById('scrim');
let openSheet = null;

export function initSheet(sheet, grip, { onOpen } = {}) {
  const api = {
    open() {
      if (openSheet && openSheet !== api) openSheet.close();
      openSheet = api;
      onOpen?.();
      sheet.style.transform = '';
      sheet.classList.add('is-open'); sheet.setAttribute('aria-hidden', 'false');
      scrim.classList.add('is-open');
    },
    close() {
      sheet.style.transform = '';
      sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true');
      scrim.classList.remove('is-open');
      if (openSheet === api) openSheet = null;
    },
    get isOpen() { return sheet.classList.contains('is-open'); },
  };
  // glisser vers le bas pour fermer
  let y0 = null;
  grip.addEventListener('pointerdown', (e) => { y0 = e.clientY; grip.setPointerCapture(e.pointerId); sheet.style.transition = 'none'; });
  grip.addEventListener('pointermove', (e) => { if (y0 !== null) sheet.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`; });
  const up = (e) => {
    if (y0 === null) return;
    const dy = e.clientY - y0; y0 = null; sheet.style.transition = '';
    if (dy > 70 || Math.abs(dy) < 4) api.close(); else sheet.style.transform = '';
  };
  grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
  return api;
}
scrim.addEventListener('click', () => openSheet?.close());

const row = (label, value, small) =>
  `<div class="row"><dt>${label}</dt><dd>${value}${small ? `<small>${small}</small>` : ''}</dd></div>`;

/** data : { moon, sky, phase, luna, events, date } */
export function renderEphemeris(body, d) {
  const { moon, sky, phase, luna, events, date } = d;
  const distNote = moon.distanceKm < 365000 ? ' · proche du périgée' : moon.distanceKm > 402000 ? ' · proche de l’apogée' : '';
  const alt = sky.altitude;
  const lonL = moon.librationLon, latL = moon.librationLat;
  const libTxt = `${num(Math.abs(lonL), 1)}° ${lonL >= 0 ? 'E' : 'O'} · ${num(Math.abs(latL), 1)}° ${latL >= 0 ? 'N' : 'S'}`;
  const next = luna.next.map((q) => row(QUARTER_NAMES[q.quarter],
    `${weekday(q.date)} ${shortDate(q.date)}`, time(q.date))).join('');
  body.innerHTML = `
    ${runhead('De Luna')}
    <h3 class="lettrine">${dropcap(phase.name)}</h3>
    <p class="lead">${longDate(date)} · ${time(date)} · ${place.source === 'gps' ? 'position GPS' : place.name}</p>
    <dl class="rows">
      ${row('Illumination', num(moon.fraction * 100, 1) + ' %')}
      ${row('Âge', luna.age != null ? num(luna.age, 1) + ' jours' : '—', 'depuis la nouvelle lune')}
      ${row('Distance', num(Math.round(moon.distanceKm / 10) * 10) + ' km', `diamètre apparent ${num(moon.diameterArcmin, 1)}′${distNote}`)}
      ${row('Hauteur', `${num(alt, 0)}°`, alt >= 0 ? 'au-dessus de l’horizon' : 'sous l’horizon')}
      ${row('Direction', direction(sky.azimuth), `azimut ${num(sky.azimuth, 0)}°`)}
      ${row('Constellation', CONSTELLATIONS[sky.constellation] || sky.constellation, `<i>${LATIN[sky.constellation] || ''}</i> · signe zodiacal : ${zodiacSign(sky.eclipticLon)}`)}
      ${row('Libration', libTxt, 'la Lune nous montre un peu plus de ce bord')}
      ${row('Soleil', `${time(events.sun.rise)} — ${time(events.sun.set)}`, 'lever et coucher')}
    </dl>
    <h4>Prochaines phases</h4>
    <dl class="rows">${next}</dl>
    ${almanacHtml(date)}
    <p class="motto-small">Le temps venra</p>
    ${folio(date)}`;
}

export function renderSettings(body, onChange) {
  const sw = (key, label, hint) => `<div class="opt"><div class="txt">${label}${hint ? `<small>${hint}</small>` : ''}</div>
    <button class="switch" role="switch" data-key="${key}" aria-checked="${!!settings[key]}" aria-label="${label}"></button></div>`;
  const status = place.source === 'gps'
    ? `Position GPS · à ${num(place.distanceFromHome, 0)} km de la maison`
    : place.source === 'home-gps' ? 'À la maison (confirmé par le GPS)'
    : settings.useGps ? (place.gpsError ? 'GPS indisponible : position de la maison' : 'Recherche de la position…') : 'Position de la maison';
  body.innerHTML = `
    <h3>Réglages</h3>
    <h4>Lieu</h4>
    ${sw('useGps', 'Suivre ma position', status)}
    <div class="opt"><div class="txt">Maison<small>${home.name} · ${num(home.lat, 4)}° N, ${num(Math.abs(home.lon), 4)}° ${home.lon >= 0 ? 'E' : 'O'}</small></div></div>
    <div class="search"><input id="home-q" type="search" placeholder="Changer de commune…" autocomplete="off" enterkeyhint="search"><button class="btn" id="home-go">Chercher</button></div>
    <div class="results" id="home-results"></div>
    <h4>Affichage</h4>
    <div class="opt"><div class="txt">Orientation de la Lune<small>${settings.orientation === 'sky' ? 'Telle que tu la vois dans ton ciel' : 'Nord céleste en haut'}</small></div>
      <div class="seg"><button data-orient="sky" aria-pressed="${settings.orientation === 'sky'}">Mon ciel</button><button data-orient="north" aria-pressed="${settings.orientation === 'north'}">Nord</button></div></div>
    ${sw('earthshine', 'Lumière cendrée', 'La Terre éclaire la face nocturne')}
    <h4>Le cabinet du savant</h4>
    ${sw('galileo', 'La Lune de Galilée', 'Au lavis de sépia — ou appui long sur la Lune')}
    ${sw('marginalia', 'Annotations à la plume', 'Notes et tracés du savant autour de la Lune')}
    ${sw('latin', 'Noms latins', 'Sous les constellations, comme sur les atlas anciens')}
    ${sw('candle', 'Flamme de bougie', 'Une lueur chaude au coin du carnet')}
    ${sw('haptics', 'Petit « tic » au défilement', 'Vibration légère à chaque jour')}
    <p class="credit">Cartes de la Lune : NASA Scientific Visualization Studio, CGI Moon Kit (LRO · LROC WAC, LOLA).<br>
    Calculs : astronomy-engine, Don Cross (licence MIT).<br>
    Étoiles : d3-celestial (O. Frohn) d’après la base HYG (D. Nash).<br>Recherche de commune : Base Adresse Nationale (IGN / data.gouv.fr).</p>
    <p class="motto-small">Ursine, le temps venra</p>
    <p class="credit" style="text-align:center">Version 8 · le Soleil</p>`;

  body.querySelectorAll('.switch').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.key;
    settings[k] = !settings[k];
    b.setAttribute('aria-checked', settings[k]);
    saveSettings();
    if (k === 'useGps') { if (settings.useGps) locate(); else useHome(); }
    onChange?.();
  }));
  body.querySelectorAll('[data-orient]').forEach((b) => b.addEventListener('click', () => {
    settings.orientation = b.dataset.orient; saveSettings(); renderSettings(body, onChange); onChange?.();
  }));

  const q = body.querySelector('#home-q'), res = body.querySelector('#home-results');
  const search = async () => {
    const text = q.value.trim();
    if (text.length < 2) return;
    res.innerHTML = '<p class="lead">Recherche…</p>';
    try {
      const features = await geocode(text);
      res.innerHTML = features.length ? '' : '<p class="lead">Aucune commune trouvée.</p>';
      for (const f of features) {
        const b = document.createElement('button');
        const p = f.properties;
        b.innerHTML = `${p.city || p.name}<small>${p.postcode || ''} · ${p.context || ''}</small>`;
        b.addEventListener('click', () => {
          home.name = p.city || p.name;
          home.lon = f.geometry.coordinates[0]; home.lat = f.geometry.coordinates[1];
          saveHome();
          if (!settings.useGps || place.source !== 'gps') useHome(); else locate();
          renderSettings(body, onChange); onChange?.();
        });
        res.appendChild(b);
      }
    } catch { res.innerHTML = '<p class="lead">Pas de connexion : réessaie plus tard.</p>'; }
  };
  body.querySelector('#home-go').addEventListener('click', search);
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
}

async function geocode(text) {
  const qs = `?q=${encodeURIComponent(text)}&type=municipality&limit=6`;
  for (const base of ['https://data.geopf.fr/geocodage/search', 'https://api-adresse.data.gouv.fr/search/']) {
    try {
      const r = await fetch(base + qs);
      if (r.ok) return (await r.json()).features || [];
    } catch { /* essai suivant */ }
  }
  throw new Error('geocode');
}
