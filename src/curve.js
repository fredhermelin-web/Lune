// Courbe d'illumination sur ±15 jours : elle défile sous le curseur, synchronisée avec la Lune.
import { clock, animateTo } from './state.js';
import { fractionAtStep, SAMPLE_STEP, quartersBetween, QUARTER_SHORT } from './astro.js';
import { shortDate } from './format.js';
import { phasePath } from './phase-icon.js';
import { attachScrub } from './scrub.js';

const DAY = 86400000;
const SPAN = 30;           // jours visibles
const NS = 'http://www.w3.org/2000/svg';
const ICON_F = [0, 0.5, 1, 0.5];
const ICON_WAX = [true, true, true, false];

export function initCurve(container, svg) {
  let W = 0, H = 0;
  const pad = { top: 18, bottom: 44, left: 16, right: 16 };
  const el = (tag, attrs = {}, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    parent.appendChild(e);
    return e;
  };

  svg.innerHTML = `<defs>
    <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8e9ee" stop-opacity=".16"/><stop offset="1" stop-color="#e8e9ee" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="curveStroke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e8e9ee" stop-opacity=".15"/><stop offset=".5" stop-color="#f2f2ee" stop-opacity="1"/>
      <stop offset="1" stop-color="#e8e9ee" stop-opacity=".15"/>
    </linearGradient></defs>`;
  const gGrid = el('g');
  const area = el('path', { class: 'area' });
  const path = el('path', { class: 'path' });
  const gQ = el('g');
  const cursorLine = el('line', { class: 'cursor-line' });
  const cursorDot = el('circle', { class: 'cursor-dot', r: 4 });
  const cursorVal = el('text', { class: 'cursor-val' });

  const yOf = (f) => pad.top + (1 - f) * (H - pad.top - pad.bottom);
  const pxPerDay = () => (W - pad.left - pad.right) / SPAN;

  function layout() {
    W = container.clientWidth; H = container.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    gGrid.innerHTML = '';
    for (const f of [0, 0.5, 1]) {
      el('line', { class: 'grid', x1: pad.left, x2: W - pad.right, y1: yOf(f), y2: yOf(f) }, gGrid);
    }
    el('text', { class: 'axis', x: W - pad.right, y: yOf(1) - 5, 'text-anchor': 'end' }, gGrid).textContent = '100 %';
    el('text', { class: 'axis', x: W - pad.right, y: yOf(0) - 5, 'text-anchor': 'end' }, gGrid).textContent = '0 %';
  }

  attachScrub(container, pxPerDay, {
    onTap: (e) => {
      // toucher un repère de phase : on y glisse
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const target = clock.offset + (x - W / 2) / pxPerDay();
      const t = clock.base + target * DAY;
      const q = quartersBetween(t - 1.2 * DAY, t + 1.2 * DAY)[0];
      animateTo(q ? (q.date.getTime() - clock.base) / DAY : Math.round(target), 700);
    },
  });

  function update() {
    if (!W) layout();
    const now = clock.base + clock.offset * DAY;
    const t0 = now - (SPAN / 2) * DAY, t1 = now + (SPAN / 2) * DAY;
    const xOf = (t) => W / 2 + ((t - now) / DAY) * pxPerDay();
    const k0 = Math.floor(t0 / SAMPLE_STEP) - 1, k1 = Math.ceil(t1 / SAMPLE_STEP) + 1;
    let d = '';
    for (let k = k0; k <= k1; k++) {
      const x = xOf(k * SAMPLE_STEP), y = yOf(fractionAtStep(k));
      d += (k === k0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    path.setAttribute('d', d);
    area.setAttribute('d', d + `L${xOf(k1 * SAMPLE_STEP).toFixed(1)} ${yOf(0)}L${xOf(k0 * SAMPLE_STEP).toFixed(1)} ${yOf(0)}Z`);

    gQ.innerHTML = '';
    for (const q of quartersBetween(t0 - DAY, t1 + DAY)) {
      const x = xOf(q.date.getTime());
      const f = ICON_F[q.quarter];
      el('line', { class: 'q-line', x1: x, x2: x, y1: yOf(f) + 6, y2: H - pad.bottom + 6 }, gQ);
      const iy = H - pad.bottom + 15;
      el('circle', { class: 'q-ico-dark', cx: x, cy: iy, r: 5 }, gQ);
      if (q.quarter !== 0) el('path', { class: 'q-ico', d: phasePath(f, ICON_WAX[q.quarter], 5, x, iy) }, gQ);
      el('text', { class: 'q-label', x, y: iy + 17 }, gQ).textContent = QUARTER_SHORT[q.quarter] + ' ' + shortDate(q.date);
    }

    const fNow = fractionAtInstant(now);
    const cx = W / 2, cy = yOf(fNow);
    cursorLine.setAttribute('x1', cx); cursorLine.setAttribute('x2', cx);
    cursorLine.setAttribute('y1', pad.top - 8); cursorLine.setAttribute('y2', H - pad.bottom + 4);
    cursorDot.setAttribute('cx', cx); cursorDot.setAttribute('cy', cy);
    cursorVal.setAttribute('x', cx); cursorVal.setAttribute('y', Math.max(11, cy - 10));
    cursorVal.textContent = Math.round(fNow * 100) + ' %';
  }

  function fractionAtInstant(t) {
    const k = Math.floor(t / SAMPLE_STEP), a = (t - k * SAMPLE_STEP) / SAMPLE_STEP;
    return fractionAtStep(k) * (1 - a) + fractionAtStep(k + 1) * a;
  }

  window.addEventListener('resize', () => { layout(); update(); });
  return { update, layout };
}
