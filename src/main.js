// Lune & Ciel — assemblage de l'écran Lune.
import { clock, settings, place, subscribe, locate, refreshNow, animateTo } from './state.js';
import { makeObserver, moonAt, moonSky, dayEvents, lunation, phaseName } from './astro.js';
import { time, longDate, monthYear, num } from './format.js';
import { MoonRenderer } from './moon-renderer.js';
import { initStarfield } from './starfield.js';
import { initTimeline } from './timeline.js';
import { initCurve } from './curve.js';
import { attachScrub } from './scrub.js';
import { initSheet, renderEphemeris, renderSettings } from './panels.js';

const $ = (id) => document.getElementById(id);

initStarfield($('stars'), $('twinkles'));

// ---------- la Lune ----------
const stage = $('stage');
let renderer = null;
try {
  renderer = new MoonRenderer($('moon'));
  renderer.load().catch((e) => console.error('Textures', e));
} catch (e) {
  console.error(e);
  stage.insertAdjacentHTML('beforeend', '<p class="lead" style="padding:40px;text-align:center">Ce navigateur ne permet pas le rendu WebGL2.</p>');
}

function sizeStage() {
  const s = Math.round(Math.min(window.innerWidth * 0.9, 430, Math.max(250, window.innerHeight * 0.4)));
  stage.style.width = stage.style.height = s + 'px';
  renderer?.resize(s);
}
sizeStage();
window.addEventListener('resize', sizeStage);

const timeline = initTimeline($('strip'), $('strip-track'));
const curve = initCurve($('cycle'), $('curve'));
attachScrub(stage, () => 26, { maxFling: 8 });   // glisser sur la Lune : 26 px par jour, le cycle défile sous le doigt

// ---------- panneaux ----------
let last = null;
const sheet = initSheet($('sheet'), $('sheet-grip'), { onOpen: () => last && renderEphemeris($('sheet-body'), last) });
const settingsSheet = initSheet($('settings'), $('settings-grip'), { onOpen: () => renderSettings($('settings-body'), () => render(new Set(['settings']))) });
$('more-btn').addEventListener('click', () => sheet.open());
$('settings-btn').addEventListener('click', () => settingsSheet.open());
$('place-btn').addEventListener('click', () => settingsSheet.open());
$('today-btn').addEventListener('click', () => animateTo(0, 600));

// ---------- onglets ----------
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('is-active', x === t));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('is-active', v.id === t.dataset.view));
}));

// ---------- rendu ----------
let obs = makeObserver(place);
let eventsKey = '', events = null;

function render(reasons) {
  if (reasons.has('location')) {
    obs = makeObserver(place);
    eventsKey = '';
    $('place-name').textContent = place.source === 'gps'
      ? `Ici · ${num(place.distanceFromHome, 0)} km de la maison` : place.name;
    if (settingsSheet.isOpen) renderSettings($('settings-body'), () => render(new Set(['settings'])));
  }
  if (reasons.has('day') && settings.haptics && !reasons.has('tick')) navigator.vibrate?.(4);

  const date = clock.date;
  const moon = moonAt(date, obs, settings.orientation);
  renderer?.set(moon, { earthshine: settings.earthshine });
  $('halo').style.opacity = (0.15 + 0.85 * moon.fraction).toFixed(3);

  timeline.update();
  curve.update();

  const phase = phaseName(date, moon.elongation);
  const luna = lunation(date);
  $('phase-name').textContent = phase.name;
  $('phase-pct').textContent = Math.round(moon.fraction * 100) + ' %';
  $('phase-age').textContent = luna.age != null ? `${num(luna.age, 1)} jours` : '';
  const exact = phase.exact ? ` · exacte à ${time(phase.exact)}` : '';
  $('phase-when').textContent = (clock.isLive ? 'Maintenant · ' : '') + `${longDate(date)} · ${time(date)}${exact}`;
  $('month-label').textContent = monthYear(date);
  $('today-btn').hidden = Math.round(clock.offset) === 0;

  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const key = day.getTime() + '|' + place.lat + '|' + place.lon;
  if (key !== eventsKey) {
    eventsKey = key;
    events = dayEvents(day, obs);
    $('moonrise').textContent = time(events.moon.rise);
    $('moonset').textContent = time(events.moon.set);
    $('transit').innerHTML = events.transit
      ? `${time(events.transit.date)}<small>${num(events.transit.altitude, 0)}°</small>` : '—';
  }

  const moving = reasons.has('scrub') || reasons.has('anim');
  if (!moving || !last) {
    last = { moon, sky: moonSky(date, obs), phase, luna, events, date };
    if (sheet.isOpen) renderEphemeris($('sheet-body'), last);
  }
}

subscribe(render);
window.lune = { clock, animateTo };   // accès de mise au point depuis la console
render(new Set(['location', 'settle']));

// ---------- temps réel et position ----------
locate();
setInterval(() => { if (clock.offset === 0 && !document.hidden) refreshNow(); }, 30000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { refreshNow(); locate(); }
});

// ---------- application installable (hors ligne) ----------
if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  navigator.serviceWorker.register('sw.js');
}
