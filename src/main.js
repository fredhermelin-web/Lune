// Lune & Ciel — assemblage de l'écran Lune.
import { clock, settings, place, subscribe, locate, refreshNow, animateTo } from './state.js';
import { makeObserver, moonAt, moonSky, dayEvents, lunation, phaseName } from './astro.js';
import { time, longDate, monthYear, num } from './format.js';
import { MoonRenderer } from './moon-renderer.js';
import { loadSky, sky, zenith } from './sky.js';
import { initSkyRenderer } from './sky-renderer.js';
import { initTimeline } from './timeline.js';
import { initCurve } from './curve.js';
import { attachScrub } from './scrub.js';
import { initSheet, renderEphemeris, renderSettings } from './panels.js';
import { ursa, nocturlabeSvg, ursaSheet } from './nocturlabe.js';
import { fullMoonOn, sealSvg, secretPage } from './secrets.js';
import { makeThought } from './thoughts.js';
import { playRitual, showThought } from './ritual.js';
import { saveSettings } from './state.js';
import { initMarginalia } from './marginalia.js';
import { renderSun } from './sun.js';

const $ = (id) => document.getElementById(id);
const DAY = 86400000;

// ---------- le ciel et la Lune ----------
const skyR = initSkyRenderer($('sky'), $('twinkles'));
const UI_ZONES = ['.topbar', '.month', '.strip', '.stage', '.phase', '.riseset', '.cycle', '.more', '.tabs'];
skyR.configure({
  exclusions: () => UI_ZONES.map((q) => document.querySelector(q)?.getBoundingClientRect()).filter(Boolean),
  latin: settings.latin,
});
document.body.classList.toggle('no-candle', !settings.candle);
const skyReady = loadSky().catch((e) => console.error('Catalogue', e));

const stage = $('stage');
let renderer = null;
try {
  renderer = new MoonRenderer($('moon'));
  renderer.load().catch((e) => console.error('Textures', e));
} catch (e) {
  console.error(e);
  stage.insertAdjacentHTML('beforeend', '<p class="lead" style="padding:40px;text-align:center">Ce navigateur ne permet pas le rendu WebGL2.</p>');
}

const margin = initMarginalia(stage);
let stageSize = 300;

function sizeStage() {
  // la Lune prend toute la place disponible, en gardant la courbe du cycle visible
  const free = window.innerHeight - 556;
  const s = Math.round(Math.max(240, Math.min(window.innerWidth * 0.88, 430, free)));
  stageSize = s;
  stage.style.width = stage.style.height = s + 'px';
  // le nocturlabe se range contre le bord de l'écran, loin de la Lune
  stage.style.setProperty('--edge', `${Math.min(-4, -(Math.min(window.innerWidth, 520) - s) / 2 + 6)}px`);
  renderer?.resize(s);
  drawSky();
  if (moonNow) updateMargin();
}

function updateMargin() {
  if (!settings.marginalia || !renderer) { margin.el.style.display = 'none'; return; }
  margin.el.style.display = '';
  margin.update(moonNow, stageSize, renderer.radiusFor(moonNow.distanceKm) * stageSize / 2, Math.round(clock.offset));
}

const timeline = initTimeline($('strip'), $('strip-track'));
const curve = initCurve($('cycle'), $('curve'));
// glisser sur la Lune : le cycle défile sous le doigt ; appui long : la Lune de Galilée
attachScrub(stage, () => 26, { maxFling: 8, onLongPress: () => toggleGalileo() });

function applyStyle(animate) {
  renderer?.setStyle(settings.galileo ? 1 : 0, animate);
  document.body.classList.toggle('galileo', !!settings.galileo);
}
function toggleGalileo() {
  settings.galileo = !settings.galileo;
  saveSettings();
  applyStyle(true);
  navigator.vibrate?.(12);
  document.querySelectorAll('.thought').forEach((t) => t.remove());
  showThought(settings.galileo
    ? { text: 'La Lune de Galilée, au lavis de sépia, comme sur ses feuillets de 1609.', author: 'appui long pour revenir', duration: 4200 }
    : { text: 'Retour à la lunette moderne.', duration: 2600 }, true);
}
applyStyle(false);

// ---------- panneaux ----------
let last = null, lastUrsa = null, lastFull = null;
const sheet = initSheet($('sheet'), $('sheet-grip'), { onOpen: () => last && renderEphemeris($('sheet-body'), last) });
const settingsSheet = initSheet($('settings'), $('settings-grip'), { onOpen: () => renderSettings($('settings-body'), () => render(new Set(['settings']))) });
const ursaPanel = initSheet($('ursa'), $('ursa-grip'), { onOpen: () => openUrsa() });
const secretPanel = initSheet($('secret'), $('secret-grip'), { onOpen: () => lastFull && secretPage($('secret-body'), lastFull) });
$('more-btn').addEventListener('click', () => sheet.open());
$('settings-btn').addEventListener('click', () => settingsSheet.open());
$('place-btn').addEventListener('click', () => settingsSheet.open());
$('today-btn').addEventListener('click', () => animateTo(0, 600));
$('noct-btn').addEventListener('click', (e) => { e.stopPropagation(); ursaPanel.open(); });
$('noct-btn').addEventListener('pointerdown', (e) => e.stopPropagation());
$('seal-btn').addEventListener('click', (e) => { e.stopPropagation(); secretPanel.open(); });
$('seal-btn').addEventListener('pointerdown', (e) => e.stopPropagation());
$('seal-btn').innerHTML = sealSvg();

function openUrsa() {
  if (!sky.ready) return;
  const date = clock.date;
  ursaSheet($('ursa-body'), ursa(date, obs, place), date, place.source === 'gps' ? 'l’endroit où tu te trouves' : place.name);
}

// ---------- onglets ----------
let activeView = 'view-moon';
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  activeView = t.dataset.view;
  document.body.dataset.view = activeView;
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('is-active', x === t));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('is-active', v.id === t.dataset.view));
  if (activeView === 'view-sun') { sunKey = ''; drawSun(); }
}));

// ---------- le Soleil ----------
let sunKey = '';
function drawSun() {
  if (activeView !== 'view-sun') return;
  const date = clock.date;
  const key = `${Math.floor(date.getTime() / 60000)}|${place.lat}|${place.lon}`;
  if (key === sunKey) return;
  sunKey = key;
  const root = $('view-sun'), scroll = root.scrollTop;
  renderSun(root, date, obs, place.source === 'gps' ? 'position GPS' : place.name);
  root.scrollTop = scroll;
}
$('view-sun').addEventListener('click', (e) => {
  const b = e.target.closest('.sun-arrow');
  if (b) animateTo(Math.round(clock.offset) + Number(b.dataset.step), 300);
});

// ---------- rendu ----------
let obs = makeObserver(place);
let eventsKey = '', events = null, moonNow = null, zen = null;
let touched = false;
document.addEventListener('pointerdown', () => { touched = true; }, { once: true, capture: true });

function drawSky() {
  if (!moonNow) return;
  const r = stage.getBoundingClientRect();
  skyR.draw(moonNow.basis, [r.left + r.width / 2, r.top + r.height / 2], zen);
}
$('view-moon').addEventListener('scroll', drawSky, { passive: true });

function render(reasons) {
  if (reasons.has('location')) {
    obs = makeObserver(place);
    eventsKey = '';
    $('place-name').textContent = place.source === 'gps'
      ? `Ici · ${num(place.distanceFromHome, 0)} km de la maison` : place.name;
    if (settingsSheet.isOpen) renderSettings($('settings-body'), () => render(new Set(['settings'])));
  }
  if (reasons.has('day') && settings.haptics && !reasons.has('tick')
    && (navigator.userActivation ? navigator.userActivation.hasBeenActive : touched)) navigator.vibrate?.(4);

  const date = clock.date;
  const moon = moonAt(date, obs, settings.orientation);
  moonNow = moon;
  zen = zenith(date, obs);
  renderer?.set(moon, { earthshine: settings.earthshine });
  $('halo').style.opacity = (0.15 + 0.85 * moon.fraction).toFixed(3);
  drawSky();

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
    lastFull = fullMoonOn(date);
    $('seal-btn').hidden = !lastFull;
  }

  // le nocturlabe tourne avec le temps
  if (sky.ready) {
    const u = ursa(date, obs, place);
    lastUrsa = u;
    $('noct-btn').innerHTML = nocturlabeSvg(u, date, false);
  }

  const moving = reasons.has('scrub') || reasons.has('anim');
  if (!moving) drawSun();
  // l'encre sèche quand le temps s'arrête : les annotations reviennent à l'arrêt
  stage.classList.toggle('is-moving', moving);
  if (!moving) updateMargin();
  if (reasons.has('settings')) {
    skyR.configure({ latin: settings.latin });
    if ((renderer?.style ?? 0) !== (settings.galileo ? 1 : 0)) applyStyle(true);
    document.body.classList.toggle('no-candle', !settings.candle);
  }
  if (!moving || !last) {
    last = { moon, sky: moonSky(date, obs), phase, luna, events, date };
    if (sheet.isOpen) renderEphemeris($('sheet-body'), last);
    if (ursaPanel.isOpen) openUrsa();
  }
}

subscribe(render);
window.lune = { clock, animateTo, toggleGalileo: () => toggleGalileo() };   // accès de mise au point depuis la console
sizeStage();
window.addEventListener('resize', sizeStage);
render(new Set(['location', 'settle']));

// ---------- l'ouverture ----------
skyReady.then(() => {
  render(new Set(['settle']));
  const date = clock.date;
  const thought = makeThought({ date, moon: moonNow, ursa: lastUrsa, luna: last?.luna, place });
  const lon = moonSky(date, obs).eclipticLon;
  const r = stage.getBoundingClientRect();
  playRitual({ moonLon: lon, thought, center: [r.left + r.width / 2, r.top + r.height / 2], onReveal: () => renderer?.reveal() });
});

// ---------- temps réel et position ----------
locate();
setInterval(() => { if (clock.offset === 0 && !document.hidden) refreshNow(); }, 30000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { refreshNow(); locate(); }
});

// ---------- application installable (hors ligne) ----------
if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  // quand une nouvelle version vient d'être installée, on recharge une fois pour l'afficher aussitôt
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  });
}
