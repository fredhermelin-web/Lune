// Geste horizontal partagé (bandeau, Lune, courbe) : glisser = faire couler le temps.
import { clock, setOffset, stopAnimation, fling } from './state.js';

/** pxPerDay : nombre de pixels pour un jour (fonction, car la largeur peut changer). */
export function attachScrub(el, pxPerDay, { onTap, onLongPress, maxFling = 12 } = {}) {
  let id = null, lastX = 0, startX = 0, startY = 0, moved = false, samples = [], pressTimer = 0, pressed = false;

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    id = e.pointerId; lastX = startX = e.clientX; startY = e.clientY; moved = false; pressed = false;
    samples = [{ x: e.clientX, t: e.timeStamp }];
    stopAnimation();
    if (onLongPress) {
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => { if (id !== null && !moved) { pressed = true; onLongPress(); } }, 600);
    }
  });
  el.addEventListener('contextmenu', (e) => { if (onLongPress) e.preventDefault(); });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    if (!moved) {
      if (Math.abs(e.clientX - startX) < 6) {
        if (Math.abs(e.clientY - startY) > 8) clearTimeout(pressTimer);
        return;
      }
      clearTimeout(pressTimer);
      moved = true;
      try { el.setPointerCapture(id); } catch { /* ok */ }
      el.classList.add('is-dragging');
    }
    const dx = e.clientX - lastX; lastX = e.clientX;
    setOffset(clock.offset - dx / pxPerDay(), 'scrub');
    samples.push({ x: e.clientX, t: e.timeStamp });
    if (samples.length > 6) samples.shift();
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    clearTimeout(pressTimer);
    el.classList.remove('is-dragging');
    if (pressed) return;
    if (!moved) {
      if (e.type === 'pointerup' && Math.hypot(e.clientX - startX, e.clientY - startY) < 8 && onTap) onTap(e);
      if (clock.offset !== Math.round(clock.offset)) fling(0);
      return;
    }
    const b = samples[samples.length - 1];
    const a = samples.find((s) => b.t - s.t <= 120) || b;
    const dt = Math.max(16, b.t - a.t);
    const vPx = e.timeStamp - b.t > 80 ? 0 : (b.x - a.x) / dt;   // px/ms
    fling(-vPx / pxPerDay(), maxFling);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
