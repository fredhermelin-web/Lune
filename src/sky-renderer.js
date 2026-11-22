// Le ciel derrière la Lune : les vraies étoiles qui l'entourent à l'instant choisi,
// les tracés des constellations, l'écliptique (la route de la Lune) et quelques noms.
// Le scintillement des étoiles brillantes est confié au compositeur (CSS) — économe.
import { sky, project, starColor, starName, eclipticVec, vec } from './sky.js';
import { CONSTELLATIONS } from './format.js';

const FIELD = 36;   // demi-champ horizontal, en degrés
const PLEIADES = vec(56.75, 24.12);

export function initSkyRenderer(canvas, twinkleLayer) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, bg = null;
  let pending = 0, last = null;
  const twinkles = [];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('i');
    s.style.setProperty('--d', (3.5 + Math.random() * 6).toFixed(1) + 's');
    s.style.setProperty('--delay', (-Math.random() * 8).toFixed(1) + 's');
    twinkleLayer.appendChild(s);
    twinkles.push(s);
  }
  // halo pré-rendu pour les étoiles brillantes
  const glow = document.createElement('canvas');
  glow.width = glow.height = 64;
  const g = glow.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.25, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    bg = null;
    if (last) draw(last.basis, last.center, last.zen);
  }
  window.addEventListener('resize', resize);
  resize();

  function background() {
    if (bg) return bg;
    bg = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, Math.max(W, H) * 0.85);
    bg.addColorStop(0, '#0b111b'); bg.addColorStop(0.55, '#05080e'); bg.addColorStop(1, '#020306');
    return bg;
  }

  /** basis : repère EQJ de la vue ; center : position écran (px) du centre de la Lune ; zen : zénith (EQJ). */
  function draw(basis, center, zen) {
    last = { basis, center, zen };
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = 0; render(); });
  }

  function render() {
    const { basis, center, zen } = last;
    const up = (v) => (zen ? v[0] * zen[0] + v[1] * zen[1] + v[2] * zen[2] : 1);   // sinus de la hauteur
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = background();
    ctx.fillRect(0, 0, W, H);
    if (!sky.ready) return;

    const S = (Math.max(W, 360) / 2) / (2 * Math.tan((FIELD / 2) * Math.PI / 180));
    const cx = center[0], cy = center[1];
    const toScreen = (v) => {
      const p = project(v, basis);
      return [cx + p[0] * S, cy - p[1] * S, p[2]];
    };
    const on = (p, m = 40) => p[2] > -0.2 && p[0] > -m && p[0] < W + m && p[1] > -m && p[1] < H + m;

    // écliptique : la route de la Lune et du Soleil
    ctx.save();
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = 'rgba(216, 189, 134, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    let pen = false;
    for (let l = 0; l <= 360; l += 1.5) {
      const p = toScreen(eclipticVec(l));
      if (on(p, 400)) { pen ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen = true; } else pen = false;
    }
    ctx.stroke();
    ctx.restore();

    // tracés des constellations
    ctx.strokeStyle = 'rgba(165, 182, 212, 0.17)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const segs of Object.values(sky.lines)) {
      for (const seg of segs) {
        let prev = null;
        for (const v of seg) {
          const p = toScreen(v);
          if (prev && on(p, 300) && on(prev, 300)) { ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); }
          prev = p;
        }
      }
    }
    ctx.stroke();

    // étoiles (du plus faible au plus brillant)
    const st = sky.stars;
    const bright = [];
    for (let i = sky.count - 1; i >= 0; i--) {
      const o = i * 5;
      const p = toScreen([st[o], st[o + 1], st[o + 2]]);
      if (!on(p, 8)) continue;
      const mag = st[o + 3];
      const below = up([st[o], st[o + 1], st[o + 2]]) < 0;
      const r = Math.max(0.45, 2.5 - mag * 0.42);
      const a = Math.min(1, Math.max(0.16, 1.15 - mag * 0.17)) * (below ? 0.2 : 1);
      const c = starColor(st[o + 4]);
      if (mag < 1.6 && !below) {
        const gs = 14 + (1.6 - mag) * 9;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(glow, p[0] - gs / 2, p[1] - gs / 2, gs, gs);
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.2832); ctx.fill();
      if (mag < 3 && !below) bright.push({ i, p, mag });
    }
    ctx.globalAlpha = 1;

    // l'horizon réel et les points cardinaux
    if (zen) {
      let e1 = [-zen[1], zen[0], 0]; const m1 = Math.hypot(...e1) || 1; e1 = e1.map((x) => x / m1);
      const e2 = [zen[1] * e1[2] - zen[2] * e1[1], zen[2] * e1[0] - zen[0] * e1[2], zen[0] * e1[1] - zen[1] * e1[0]];
      ctx.save();
      ctx.strokeStyle = 'rgba(150, 170, 200, 0.28)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(120, 150, 200, .5)'; ctx.shadowBlur = 8;
      ctx.beginPath();
      let pen2 = false;
      for (let a = 0; a <= 360; a += 1) {
        const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
        const p = toScreen([e1[0] * c + e2[0] * s, e1[1] * c + e2[1] * s, e1[2] * c + e2[2] * s]);
        if (on(p, 600)) { pen2 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen2 = true; } else pen2 = false;
      }
      ctx.stroke();
      ctx.restore();
      // nord = pôle céleste projeté sur l'horizon ; est = nord × zénith
      const P = [0, 0, 1], k = zen[2];
      let n = [P[0] - k * zen[0], P[1] - k * zen[1], P[2] - k * zen[2]]; const mn = Math.hypot(...n); n = n.map((x) => x / mn);
      const e = [n[1] * zen[2] - n[2] * zen[1], n[2] * zen[0] - n[0] * zen[2], n[0] * zen[1] - n[1] * zen[0]];
      ctx.font = '500 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(190, 200, 218, 0.55)';
      for (const [lbl, v] of [['N', n], ['E', e], ['S', n.map((x) => -x)], ['O', e.map((x) => -x)]]) {
        const p = toScreen(v);
        if (on(p, -12)) ctx.fillText(lbl, p[0], p[1] + 16);
      }
    }

    // noms des constellations
    ctx.font = '500 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(160, 172, 190, 0.38)';
    for (const lb of sky.labels) {
      const p = toScreen(lb.v);
      if (!on(p, -10) || up(lb.v) < 0) continue;
      if (Math.hypot(p[0] - cx, p[1] - cy) < 170) continue;   // jamais sur la Lune
      spaced(CONSTELLATIONS[lb.id] || lb.id, p[0], p[1]);
    }

    // noms des étoiles brillantes, et les Pléiades
    ctx.font = 'italic 13px "EB Garamond", serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(226, 228, 234, 0.6)';
    for (const b of bright) {
      const n = sky.names[b.i];
      if (!n || b.mag > 2.1 || n === 'Alcyone') continue;
      if (Math.hypot(b.p[0] - cx, b.p[1] - cy) < 165) continue;
      ctx.fillText(starName(n), b.p[0] + 7, b.p[1] + 4);
    }
    const pl = toScreen(PLEIADES);
    if (on(pl, -10) && Math.hypot(pl[0] - cx, pl[1] - cy) > 165) {
      ctx.fillStyle = 'rgba(200, 214, 255, 0.62)';
      ctx.fillText('les Pléiades', pl[0] + 9, pl[1] + 14);
    }

    // scintillement sur les vraies étoiles brillantes
    bright.sort((a, b) => a.mag - b.mag);
    twinkles.forEach((t, k) => {
      const b = bright[k];
      if (!b || Math.hypot(b.p[0] - cx, b.p[1] - cy) < 150) { t.style.display = 'none'; return; }
      t.style.display = '';
      t.style.transform = `translate3d(${(b.p[0] - 1.5).toFixed(1)}px, ${(b.p[1] - 1.5).toFixed(1)}px, 0)`;
    });
  }

  function spaced(text, x, y) {
    const t = text.toUpperCase();
    if ('letterSpacing' in ctx) { ctx.letterSpacing = '2px'; ctx.fillText(t, x, y); ctx.letterSpacing = '0px'; }
    else ctx.fillText(t, x, y);
  }

  return { draw, redraw: () => last && draw(last.basis, last.center, last.zen) };
}
