// Bandeau horizontal des jours, virtualisé : il défile à l'infini, dans le passé comme dans l'avenir.
import { clock } from './state.js';
import { phaseIcon } from './astro.js';
import { weekday, cap } from './format.js';
import { phaseSvg } from './phase-icon.js';
import { attachScrub } from './scrub.js';
import { animateTo } from './state.js';

const DAY = 86400000;
export const CELL = 60;

export function initTimeline(strip, track) {
  const cells = [];
  const POOL = 13;
  for (let i = 0; i < POOL; i++) {
    const el = document.createElement('div');
    el.className = 'day';
    el.innerHTML = '<span class="wd"></span><span class="dn"></span><span class="ph"></span>';
    track.appendChild(el);
    cells.push({ el, k: null, wd: el.children[0], dn: el.children[1], ph: el.children[2] });
  }

  attachScrub(strip, () => CELL, {
    maxFling: 30,
    onTap: (e) => {
      const rect = strip.getBoundingClientRect();
      const k = Math.round(clock.offset + (e.clientX - rect.left - rect.width / 2) / CELL);
      animateTo(k, 500);
    },
  });

  function fill(c, k) {
    const d = new Date(clock.base + k * DAY);
    c.k = k;
    c.wd.textContent = k === 0 ? 'auj.' : weekday(d);
    c.dn.textContent = d.getDate();
    c.el.classList.toggle('is-today', k === 0);
    c.el.classList.toggle('is-first', d.getDate() === 1);
    if (d.getDate() === 1) c.dn.dataset.m = cap(d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''));
    const p = phaseIcon(d);
    c.ph.innerHTML = phaseSvg(p.fraction, p.waxing, 7);
  }

  function update(force = false) {
    const w = strip.clientWidth;
    const center = w / 2;
    const first = Math.floor(clock.offset) - Math.floor(POOL / 2);
    const wanted = new Set();
    for (let i = 0; i < POOL; i++) wanted.add(first + i);
    const free = cells.filter((c) => !wanted.has(c.k));
    for (const k of wanted) {
      let c = !force && cells.find((x) => x.k === k);
      if (!c) { c = free.pop() || cells.find((x) => x.k === k); fill(c, k); }
    }
    for (const c of cells) {
      const x = center + (c.k - clock.offset) * CELL;
      const dist = Math.abs(c.k - clock.offset);
      c.el.style.transform = `translate3d(${x.toFixed(1)}px,0,0) scale(${(1.08 - Math.min(dist, 3) * 0.05).toFixed(3)})`;
      c.el.style.color = dist < 0.5 ? 'var(--moon)' : '';
      c.dn.style.color = dist < 0.5 ? 'var(--moon)' : '';
    }
  }
  return { update };
}
