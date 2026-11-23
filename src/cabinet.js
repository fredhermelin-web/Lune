// Le cabinet de Galilée : une vraie pièce où l'on entre. La fenêtre montre le vrai ciel,
// la bougie respire, et chaque objet s'éclaire quand on le touche.
import { phasePath } from './phase-icon.js';

const IMG_W = 1536, IMG_H = 2752;
// fenêtre (zone transparente de l'image), en fractions de l'image
const WIN = { x0: 0.118, y0: 0.15, x1: 0.342, y1: 0.485 };
const FLAME = { x: 0.581, y: 0.592 };

// les objets qu'on touche : zone (fractions de l'image), nom écrit à la plume, action
export const SPOTS = [
  { id: 'window', x0: 0.13, y0: 0.16, x1: 0.33, y1: 0.36, name: 'La fenêtre sur le ciel' },
  { id: 'scope', x0: 0.17, y0: 0.38, x1: 0.44, y1: 0.66, name: 'La lunette de Galilée' },
  { id: 'books', x0: 0.455, y0: 0.255, x1: 0.565, y1: 0.315, name: 'Les éphémérides' },
  { id: 'noct', x0: 0.455, y0: 0.36, x1: 0.555, y1: 0.435, name: 'Le nocturlabe' },
  { id: 'portrait', x0: 0.675, y0: 0.205, x1: 0.91, y1: 0.375, name: 'Galileo Galilei' },
  { id: 'sheets', x0: 0.65, y0: 0.39, x1: 0.895, y1: 0.535, name: 'Les lavis de la Lune, 1609' },
  { id: 'candle', x0: 0.54, y0: 0.565, x1: 0.645, y1: 0.69, name: 'La bougie' },
  { id: 'sphere', x0: 0.67, y0: 0.54, x1: 0.905, y1: 0.715, name: 'La sphère armillaire' },
  { id: 'book', x0: 0.16, y0: 0.72, x1: 0.61, y1: 0.815, name: 'Le carnet de l’astronome' },
  { id: 'quill', x0: 0.62, y0: 0.73, x1: 0.78, y1: 0.815, name: 'La plume et l’encrier' },
];

const SKY = [[-90, [6, 10, 30]], [-18, [8, 14, 40]], [-12, [16, 28, 70]], [-6, [40, 58, 110]], [-2, [120, 110, 150]],
  [2, [220, 150, 110]], [8, [130, 170, 220]], [25, [92, 140, 210]], [90, [70, 120, 200]]];
function skyColor(alt, top) {
  let c = SKY[SKY.length - 1][1];
  for (let i = 1; i < SKY.length; i++) {
    if (alt <= SKY[i][0]) {
      const [a0, c0] = SKY[i - 1], [a1, c1] = SKY[i];
      const k = Math.max(0, Math.min(1, (alt - a0) / (a1 - a0)));
      c = c0.map((v, j) => v + (c1[j] - v) * k); break;
    }
  }
  const f = top ? 0.72 : 1.08;
  return `rgb(${c.map((v) => Math.min(255, Math.round(v * f))).join(',')})`;
}

export function initCabinet(root, { onAction }) {
  const room = root.querySelector('#cab-room');
  const sky = root.querySelector('#cab-sky');
  const spots = root.querySelector('#cab-spots');
  const glow = root.querySelector('.cab-flame');
  const light = root.querySelector('.cab-light');
  let geom = null, skyState = null;

  for (const s of SPOTS) {
    const b = document.createElement('button');
    b.className = 'cab-spot';
    b.dataset.id = s.id;
    b.setAttribute('aria-label', s.name);
    b.style.setProperty('--d', (Math.random() * 9).toFixed(1) + 's');
    b.addEventListener('click', () => touch(s, b));
    spots.appendChild(b);
  }

  function touch(s, b) {
    b.classList.remove('is-touched'); void b.offsetWidth; b.classList.add('is-touched');
    navigator.vibrate?.(6);
    const lab = document.createElement('div');
    lab.className = 'cab-label';
    lab.innerHTML = `<span>${s.name}</span>`;
    const r = b.getBoundingClientRect(), rr = root.getBoundingClientRect();
    lab.style.left = Math.max(12, Math.min(rr.width - 12, r.left - rr.left + r.width / 2)) + 'px';
    lab.style.top = Math.max(60, r.top - rr.top - 10) + 'px';
    root.appendChild(lab);
    requestAnimationFrame(() => lab.classList.add('is-in'));
    setTimeout(() => { lab.classList.add('is-out'); setTimeout(() => lab.remove(), 700); }, 1500);
    setTimeout(() => onAction?.(s.id), 650);
  }

  function layout() {
    const cw = root.clientWidth, ch = root.clientHeight;
    if (!cw || !ch) return;
    const s = Math.max(cw / IMG_W, ch / IMG_H) * 1.03;     // un peu de marge pour la profondeur
    const w = IMG_W * s, h = IMG_H * s;
    const ox = (cw - w) / 2, oy = (ch - h) / 2;
    geom = { s, w, h, ox, oy };
    Object.assign(room.style, { width: w + 'px', height: h + 'px', left: ox + 'px', top: oy + 'px' });
    const px = (fx) => ox + fx * w, py = (fy) => oy + fy * h;
    spots.querySelectorAll('.cab-spot').forEach((b) => {
      const d = SPOTS.find((x) => x.id === b.dataset.id);
      Object.assign(b.style, { left: px(d.x0) + 'px', top: py(d.y0) + 'px', width: (d.x1 - d.x0) * w + 'px', height: (d.y1 - d.y0) * h + 'px' });
    });
    Object.assign(glow.style, { left: px(FLAME.x) + 'px', top: py(FLAME.y) + 'px' });
    light.style.setProperty('--fx', px(FLAME.x) + 'px');
    light.style.setProperty('--fy', py(FLAME.y) + 'px');
    // le ciel, juste derrière la fenêtre (un peu plus grand pour la profondeur)
    const m = 14;
    const sx = px(WIN.x0) - m, sy = py(WIN.y0) - m, sw = (WIN.x1 - WIN.x0) * w + 2 * m, sh = (WIN.y1 - WIN.y0) * h + 2 * m;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    Object.assign(sky.style, { left: sx + 'px', top: sy + 'px', width: sw + 'px', height: sh + 'px' });
    sky.width = Math.round(sw * dpr); sky.height = Math.round(sh * dpr);
    drawSky();
  }

  /** st : { sunAlt, moonAlt, fraction, waxing, venusAlt, venusVisible } */
  function setSky(st) { skyState = st; drawSky(); }

  function drawSky() {
    if (!skyState || !sky.width) return;
    const ctx = sky.getContext('2d');
    const W = sky.width, H = sky.height;
    const { sunAlt } = skyState;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, skyColor(sunAlt, true)); g.addColorStop(1, skyColor(sunAlt, false));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // les étoiles, quand la nuit tombe
    const night = Math.max(0, Math.min(1, (-sunAlt - 5) / 8));
    if (night > 0) {
      let seed = 42;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < 70; i++) {
        const x = rnd() * W, y = rnd() * H * 0.95, m = Math.pow(rnd(), 2.4);
        ctx.globalAlpha = night * (0.25 + 0.75 * m);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, (0.5 + m * 1.6) * W / 300, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Vénus, l'étoile du berger
    if (skyState.venusVisible && sunAlt < -2) {
      const vx = W * 0.28, vy = H * 0.62, r = W * 0.012;
      const vg = ctx.createRadialGradient(vx, vy, 0, vx, vy, r * 9);
      vg.addColorStop(0, 'rgba(255,248,220,.95)'); vg.addColorStop(0.2, 'rgba(255,230,170,.4)'); vg.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(vx, vy, r * 9, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(vx, vy, r, 0, 6.2832); ctx.fill();
    }
    // la Lune, dans sa phase exacte, quand elle est levée
    if (skyState.moonAlt > -1) {
      const mx = W * 0.6, my = H * 0.26, r = W * 0.12;
      const day = Math.max(0, Math.min(1, (sunAlt + 4) / 10));
      const halo = ctx.createRadialGradient(mx, my, r * 0.9, mx, my, r * 3.2);
      halo.addColorStop(0, `rgba(235,235,225,${0.28 * (1 - day) * skyState.fraction})`); halo.addColorStop(1, 'rgba(235,235,225,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, r * 3.2, 0, 6.2832); ctx.fill();
      ctx.fillStyle = `rgba(40,48,70,${0.55 * (1 - day)})`;
      ctx.beginPath(); ctx.arc(mx, my, r, 0, 6.2832); ctx.fill();
      ctx.save(); ctx.translate(mx - r, my - r);
      ctx.fillStyle = day > 0.5 ? 'rgba(245,245,240,.85)' : '#f2efe4';
      ctx.fill(new Path2D(phasePath(skyState.fraction, skyState.waxing, r, r, r)));
      ctx.restore();
    }
  }

  // la profondeur : en inclinant le téléphone, le ciel bouge plus que la pièce
  let tilt = null;
  function onTilt(e) {
    if (e.gamma == null) return;
    const gx = Math.max(-1, Math.min(1, e.gamma / 30)), gy = Math.max(-1, Math.min(1, (e.beta - 50) / 30));
    tilt = tilt ? [tilt[0] * 0.85 + gx * 0.15, tilt[1] * 0.85 + gy * 0.15] : [gx, gy];
    room.style.transform = `translate3d(${(-tilt[0] * 6).toFixed(1)}px, ${(-tilt[1] * 4).toFixed(1)}px, 0)`;
    sky.style.transform = `translate3d(${(-tilt[0] * 14).toFixed(1)}px, ${(-tilt[1] * 9).toFixed(1)}px, 0)`;
    spots.style.transform = room.style.transform;
  }

  return {
    layout, setSky,
    setActive(on) {
      if (on) { layout(); window.addEventListener('deviceorientation', onTilt); }
      else window.removeEventListener('deviceorientation', onTilt);
    },
  };
}
