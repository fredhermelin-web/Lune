// La carte du ciel : le ciel au-dessus de toi, en coordonnées horizontales (l'horizon reste horizontal).
// On glisse pour tourner, on pince pour zoomer ; en mode boussole, le téléphone devient une lunette.
import * as A from '../vendor/astronomy.js';
import { sky, vec, basis, project, starColor, starName, specialVec, DIPPER, DIPPER_LINES, CASSIOPEIA, eclipticVec } from './sky.js';
import { CONSTELLATIONS, LATIN, direction, num } from './format.js';
import { phasePath } from './phase-icon.js';

const D2R = Math.PI / 180;
const PLANETS = [
  ['Mercury', 'Mercure', '#d9cbb0'], ['Venus', 'Vénus', '#fff2d0'], ['Mars', 'Mars', '#ff9a6a'],
  ['Jupiter', 'Jupiter', '#ffe1b0'], ['Saturn', 'Saturne', '#ead39a'],
];
const CARDINALS = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SO', 225], ['O', 270], ['NO', 315]];

/** Direction horizontale → vecteur HOR (x = nord, y = ouest, z = zénith). */
export function horVec(az, alt) {
  const a = az * D2R, h = alt * D2R;
  return [Math.cos(h) * Math.cos(a), -Math.cos(h) * Math.sin(a), Math.sin(h)];
}
export function azAlt(v) {
  return [((Math.atan2(-v[1], v[0]) / D2R) + 360) % 360, Math.asin(Math.max(-1, Math.min(1, v[2]))) / D2R];
}

export function initSkyMap(canvas, { onInfo, onDrag } = {}) {
  const ctx = canvas.getContext('2d');
  const view = { az: 20, alt: 35, fov: 100, compass: false, fwd: null, up: null };
  const opts = { labels: false };
  let W = 0, H = 0, dpr = 1, pending = 0, state = null, active = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    draw();
  }
  window.addEventListener('resize', resize);

  /** Prépare tout ce qui dépend de l'instant et du lieu (une fois par changement d'heure). */
  function setTime(date, obs) {
    const t = A.MakeTime(date);
    const r = A.Rotation_EQJ_HOR(t, obs).rot;
    const toHor = (v) => [
      r[0][0] * v[0] + r[1][0] * v[1] + r[2][0] * v[2],
      r[0][1] * v[0] + r[1][1] * v[1] + r[2][1] * v[2],
      r[0][2] * v[0] + r[1][2] * v[1] + r[2][2] * v[2]];
    const body = (b) => { const e = A.Equator(b, t, obs, false, true); return toHor(vec(e.ra * 15, e.dec)); };
    const planets = PLANETS.map(([id, name, color]) => {
      const b = A.Body[id];
      return { name, color, v: body(b), mag: A.Illumination(b, t).mag };
    });
    const moonV = body(A.Body.Moon), sunV = body(A.Body.Sun);
    const illum = A.Illumination(A.Body.Moon, t);
    // l'Ourse : son centre, pour la guider
    let c = [0, 0, 0];
    for (const k of DIPPER) { const v = toHor(specialVec(k)); c = [c[0] + v[0], c[1] + v[1], c[2] + v[2]]; }
    const m = Math.hypot(...c); c = c.map((x) => x / m);
    const sunAlt = Math.asin(sunV[2]) / D2R;
    state = { date, toHor, planets, moonV, sunV, moonF: illum.phase_fraction, ursa: c, sunAlt };
    const [uaz, ualt] = azAlt(c);
    onInfo?.({ ursaAz: uaz, ursaAlt: ualt, sunAlt });
    draw();
  }

  function centerOnNorth() {
    animateView(0, 36, 115);
  }
  function centerOnVenus() {
    const ven = state?.planets.find((x) => x.name === 'Vénus');
    if (!ven) return;
    const [az, alt] = azAlt(ven.v);
    animateView(az, Math.max(15, alt + 10), 90);
  }
  function centerOnUrsa() {
    if (!state) return;
    const [az, alt] = azAlt(state.ursa);
    animateView(az, Math.max(12, Math.min(70, alt + 8)), 100);
  }

  let viewAnim = 0;
  function animateView(az, alt, fov) {
    cancelAnimationFrame(viewAnim);
    const a0 = view.az, h0 = view.alt, f0 = view.fov, t0 = performance.now();
    let da = ((az - a0 + 540) % 360) - 180;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3);
      view.az = (a0 + da * e + 360) % 360; view.alt = h0 + (alt - h0) * e; view.fov = f0 + (fov - f0) * e;
      draw();
      if (k < 1) viewAnim = requestAnimationFrame(step);
    };
    viewAnim = requestAnimationFrame(step);
  }

  function draw() {
    if (!active || !state || !W) return;
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = 0; render(); });
  }

  function currentBasis() {
    if (view.compass && view.fwd) return basis(view.fwd, view.up);
    const f = horVec(view.az, view.alt);
    return basis(f, view.alt > 85 ? horVec(view.az + 180, 0) : [0, 0, 1]);
  }

  function render() {
    const b = currentBasis();
    const S = (W / 2) / (2 * Math.tan((view.fov / 2) * D2R / 2));
    const cx = W / 2, cy = H / 2;
    const P = (v) => { const p = project(v, b); return [cx + p[0] * S, cy - p[1] * S, p[2]]; };
    const on = (p, m = 30) => p[2] > -0.3 && p[0] > -m && p[0] < W + m && p[1] > -m && p[1] < H + m;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // fond : le ciel nocturne, plus clair vers l'horizon
    // de jour, le ciel s'éclaire et les étoiles s'effacent (on les montre quand même, en filigrane)
    const day = Math.max(0, Math.min(1, (state.sunAlt + 12) / 14));
    const mixc = (a, b) => `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * day)).join(',')})`;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mixc([6, 12, 34], [22, 40, 70])); g.addColorStop(1, mixc([18, 32, 70], [52, 78, 112]));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // grille de hauteur (30°, 60°) et méridiens tous les 45°
    ctx.strokeStyle = 'rgba(201, 163, 107, 0.10)'; ctx.lineWidth = 0.7;
    const poly = (pts) => {
      ctx.beginPath(); let pen = false;
      for (const v of pts) { const p = P(v); if (on(p, 800)) { pen ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen = true; } else pen = false; }
      ctx.stroke();
    };
    for (const h of [30, 60]) { const pts = []; for (let a = 0; a <= 360; a += 3) pts.push(horVec(a, h)); poly(pts); }
    for (let a = 0; a < 360; a += 45) { const pts = []; for (let h = 0; h <= 90; h += 3) pts.push(horVec(a, h)); poly(pts); }

    // l'écliptique
    ctx.save(); ctx.setLineDash([2, 6]); ctx.strokeStyle = 'rgba(216, 189, 134, 0.3)';
    const ecl = []; for (let l = 0; l <= 360; l += 2) ecl.push(state.toHor(eclipticVec(l))); poly(ecl);
    ctx.restore();

    // constellations
    ctx.strokeStyle = 'rgba(165, 182, 212, 0.22)'; ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (const [id, segs] of Object.entries(sky.lines)) {
      if (id === 'UMa' || id === 'UMi') continue;
      for (const seg of segs) {
        let prev = null;
        for (const v of seg) {
          const p = P(state.toHor(v));
          if (prev && on(p, 200) && on(prev, 200)) { ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); }
          prev = p;
        }
      }
    }
    ctx.stroke();
    // la Grande Ourse entière, en or ; la casserole plus appuyée
    ctx.strokeStyle = 'rgba(216, 189, 134, 0.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const seg of sky.lines.UMa || []) {
      let prev = null;
      for (const v of seg) { const p = P(state.toHor(v)); if (prev && on(p, 200) && on(prev, 200)) { ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); } prev = p; }
    }
    ctx.stroke();
    // la Petite Ourse, en or aussi : la Polaire au bout de sa queue
    ctx.strokeStyle = 'rgba(240, 207, 142, 0.7)'; ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const seg of sky.lines.UMi || []) {
      let prev = null;
      for (const v of seg) { const p = P(state.toHor(v)); if (prev && on(p, 200) && on(prev, 200)) { ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); } prev = p; }
    }
    ctx.stroke();
    // les deux gardes : de Merak à Dubhe, et cinq fois plus loin, la Polaire
    {
      const a = P(state.toHor(specialVec('merak'))), c = P(state.toHor(specialVec('polaris')));
      if (on(a, 400) && on(c, 400)) {
        ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(240, 207, 142, 0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); ctx.restore();
      }
    }
    ctx.strokeStyle = 'rgba(240, 207, 142, 0.85)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const [a, c] of DIPPER_LINES) {
      const p = P(state.toHor(specialVec(a))), q = P(state.toHor(specialVec(c)));
      if (on(p, 300) && on(q, 300)) { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
    }
    ctx.stroke();

    // étoiles
    const limit = 4.3 + (100 - view.fov) / 35;
    const st = sky.stars;
    const named = [];
    for (let i = sky.count - 1; i >= 0; i--) {
      const o = i * 5, mag = st[o + 3];
      if (mag > limit) continue;
      const hv = state.toHor([st[o], st[o + 1], st[o + 2]]);
      const p = P(hv);
      if (!on(p, 6)) continue;
      const r = Math.max(0.5, (limit + 1.4 - mag) * 0.52);
      const c = starColor(st[o + 4]);
      ctx.globalAlpha = Math.min(1, 0.3 + (limit - mag) * 0.22) * (hv[2] < 0 ? 0.25 : 1) * (1 - day * 0.45);
      ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.2832); ctx.fill();
      if (sky.names[i] && hv[2] > 0 && (mag < 2.3 || Object.values(sky.special).includes(i))) named.push({ i, p, mag });
    }
    ctx.globalAlpha = 1;

    // ---------- étiquettes : peu de noms, jamais les uns sur les autres ----------
    const placed = [];
    const label = (text, x, y, font, color, align = 'left', force = false) => {
      ctx.font = font;
      const w = ctx.measureText(text).width, h = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
      const x0 = align === 'center' ? x - w / 2 : x, r = [x0 - 3, y - h, x0 + w + 3, y + 4];
      if (!force && placed.some((q) => r[2] > q[0] && r[0] < q[2] && r[3] > q[1] && r[1] < q[3])) return false;
      placed.push(r);
      ctx.textAlign = align; ctx.fillStyle = color;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(4, 8, 20, .85)'; ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
      return true;
    };
    const showAll = opts.labels;
    // la Grande Ourse et la Polaire d'abord : toujours nommées
    const order = ['dubhe', 'alkaid', 'merak', 'mizar', 'alioth', 'phecda', 'megrez', 'polaris'];
    for (const k of order) {
      const p = P(state.toHor(specialVec(k)));
      if (!on(p, -10)) continue;
      label(k === 'polaris' ? 'la Polaire' : starName(sky.names[sky.special[k]]), p[0] + 7, p[1] - 6,
        'italic 15px "EB Garamond", serif', '#f0cf8e', 'left', k === 'dubhe' || k === 'polaris');
    }
    {
      const p = P(state.ursa);
      if (on(p, -20)) label('Grande Ourse', p[0], p[1] + 34, '500 12px Inter, sans-serif', 'rgba(240, 207, 142, 0.95)', 'center', true);
      const lb = sky.labels.find((l) => l.id === 'UMi');
      if (lb) { const q = P(state.toHor(lb.v)); if (on(q, -20)) label('Petite Ourse', q[0], q[1] + 22, '500 12px Inter, sans-serif', 'rgba(240, 207, 142, 0.9)', 'center'); }
    }
    // la Lune et les planètes
    drawMoon(P, on, label);
    for (const pl of state.planets) {
      if (pl.name === 'Vénus') { drawVenus(P, on, label, pl); continue; }
      const p = P(pl.v);
      if (!on(p, 10)) continue;
      const r = Math.max(2.2, 3.8 - pl.mag * 0.35);
      const visible = pl.v[2] > 0;
      ctx.fillStyle = pl.color; ctx.globalAlpha = pl.v[2] < 0 ? 0.35 : 1;
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 1;
      if (visible) label(pl.name, p[0] + r + 5, p[1] + 5, 'italic 16px "EB Garamond", serif', '#f3d9a6');
    }
    // étoiles brillantes : seulement les plus belles, ou toutes si on zoome / « Noms »
    const starLimit = showAll ? 2.2 : view.fov < 60 ? 1.6 : 0.9;
    for (const n of named) {
      if (n.mag > starLimit || Object.values(sky.special).includes(n.i)) continue;
      label(starName(sky.names[n.i]), n.p[0] + 6, n.p[1] - 5, 'italic 15px "EB Garamond", serif', 'rgba(236, 238, 244, 0.85)');
    }
    // constellations : à la demande, ou de près
    if (showAll || view.fov < 70) {
      for (const lb of sky.labels) {
        if (lb.id === 'UMa') continue;
        const hv = state.toHor(lb.v);
        const p = P(hv);
        if (!on(p, -20) || hv[2] < -0.05) continue;
        const ok = label((CONSTELLATIONS[lb.id] || lb.id).toUpperCase(), p[0], p[1], '500 11px Inter, sans-serif', 'rgba(180, 194, 214, 0.75)', 'center');
        if (ok && (view.fov < 60 || showAll)) label(LATIN[lb.id] || '', p[0], p[1] + 15, 'italic 14px "EB Garamond", serif', 'rgba(216, 189, 134, 0.8)', 'center');
      }
    }

    // le sol et l'horizon. En projection stéréographique, l'horizon est toujours un cercle parfait :
    // on le calcule exactement à partir de trois de ses points (devant, à gauche, à droite), sans rayures.
    {
      const az0 = view.compass && view.fwd ? azAlt(view.fwd)[0] : view.az;
      const A = P(horVec(az0, 0)), B = P(horVec(az0 + 90, 0)), C = P(horVec(az0 - 90, 0));
      const Z = P([0, 0, 1]);
      const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
      const gg = ctx.createLinearGradient(0, 0, 0, H);
      gg.addColorStop(0, 'rgba(14, 11, 8, 0.88)'); gg.addColorStop(1, 'rgba(8, 6, 4, 0.96)');
      ctx.save();
      ctx.beginPath();
      if (Math.abs(d) > 1e-3) {
        const a2 = A[0] ** 2 + A[1] ** 2, b2 = B[0] ** 2 + B[1] ** 2, c2 = C[0] ** 2 + C[1] ** 2;
        const ux = (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d;
        const uy = (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d;
        const R = Math.hypot(A[0] - ux, A[1] - uy);
        if (R < 1e6) {
          const zenithInside = Math.hypot(Z[0] - ux, Z[1] - uy) < R;
          if (zenithInside) { ctx.rect(-10, -10, W + 20, H + 20); ctx.arc(ux, uy, R, 0, 6.2832, true); }
          else ctx.arc(ux, uy, R, 0, 6.2832);
          ctx.fillStyle = gg; ctx.fill('evenodd');
          ctx.beginPath(); ctx.arc(ux, uy, R, 0, 6.2832);
          ctx.strokeStyle = 'rgba(216, 189, 134, 0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
        }
      } else {
        // l'horizon passe par le point opposé : c'est une droite
        const dx = C[0] - B[0], dy = C[1] - B[1], m = Math.hypot(dx, dy) || 1;
        const nx = -dy / m, ny = dx / m;
        const side = Math.sign((Z[0] - B[0]) * nx + (Z[1] - B[1]) * ny) || 1;
        const far = 4 * (W + H);
        const p1 = [B[0] - dx / m * far, B[1] - dy / m * far], p2 = [B[0] + dx / m * far, B[1] + dy / m * far];
        ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p2[0] - nx * side * far, p2[1] - ny * side * far); ctx.lineTo(p1[0] - nx * side * far, p1[1] - ny * side * far);
        ctx.closePath(); ctx.fillStyle = gg; ctx.fill();
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
        ctx.strokeStyle = 'rgba(216, 189, 134, 0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.restore();
    }
    ctx.textAlign = 'center';
    for (const [lbl, az] of CARDINALS) {
      const p = P(horVec(az, 0));
      if (!on(p, -10)) continue;
      ctx.font = lbl.length === 1 ? '500 15px "EB Garamond", serif' : '12px "EB Garamond", serif';
      ctx.fillStyle = lbl === 'N' ? '#e8c98e' : 'rgba(216, 189, 134, 0.75)';
      ctx.fillText(lbl, p[0], p[1] + 20);
    }

    // ce qu'on cherche est hors du champ : une flèche dorée au bord
    edgeArrow(state.ursa, 'la Grande Ourse', b, P, cx, cy);
    const ven = state.planets.find((x) => x.name === 'Vénus');
    if (ven && ven.v[2] > -0.05) edgeArrow(ven.v, 'Vénus', b, P, cx, cy, '#fff1c8');
  }

  function edgeArrow(v, text, b, P, cx, cy, color = '#e8c98e') {
    const u = P(v);
    if (u[2] > 0 && u[0] > 30 && u[0] < W - 30 && u[1] > 120 && u[1] < H - 90) return;
    const pr = project(v, b);
    let dx = pr[0], dy = -pr[1];   // la projection garde le bon côté, même derrière soi
    const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
    const k = Math.min((W / 2 - 34) / Math.abs(dx || 1e-6), (H / 2 - 120) / Math.abs(dy || 1e-6));
    const ax = cx + dx * k, ay = cy + dy * k;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -7); ctx.lineTo(-2, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.font = 'italic 16px "EB Garamond", serif'; ctx.fillStyle = color;
    ctx.textAlign = dx > 0.3 ? 'right' : dx < -0.3 ? 'left' : 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(4, 8, 20, .85)';
    ctx.strokeText(text, ax - dx * 20, ay - dy * 20 + 4);
    ctx.fillText(text, ax - dx * 20, ay - dy * 20 + 4);
  }

  // Vénus : un joyau, avec sa lueur et ses quatre rayons
  function drawVenus(P, on, label, pl) {
    const p = P(pl.v);
    if (!on(p, 30)) return;
    const vis = pl.v[2] > 0;
    ctx.save();
    ctx.globalAlpha = vis ? 1 : 0.35;
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 26);
    g.addColorStop(0, 'rgba(255, 246, 215, .9)'); g.addColorStop(0.25, 'rgba(255, 220, 150, .35)'); g.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], 26, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 244, 210, .8)'; ctx.lineWidth = 1;
    const tw = 0.85 + 0.15 * Math.sin(performance.now() / 600);
    for (const [dx, dy, l] of [[1, 0, 18], [0, 1, 18], [0.7, 0.7, 9], [0.7, -0.7, 9]]) {
      ctx.beginPath(); ctx.moveTo(p[0] - dx * l * tw, p[1] - dy * l * tw); ctx.lineTo(p[0] + dx * l * tw, p[1] + dy * l * tw); ctx.stroke();
    }
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(p[0], p[1], 3.6, 0, 6.2832); ctx.fill();
    ctx.restore();
    if (vis) {
      label('Vénus', p[0] + 14, p[1] - 8, 'italic 18px "EB Garamond", serif', '#fff1c8', 'left', true);
      label('l’étoile du berger', p[0] + 14, p[1] + 10, 'italic 13px "EB Garamond", serif', 'rgba(255, 236, 190, .8)', 'left', true);
    }
  }

  function drawMoon(P, on, label) {
    const p = P(state.moonV);
    if (!on(p, 20)) return;
    const r = 9;
    // direction du Soleil vu depuis la Lune, sur l'écran
    const towards = state.moonV.map((x, i) => x + (state.sunV[i] - x) * 0.04);
    const q = P(towards);
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    ctx.save();
    ctx.globalAlpha = state.moonV[2] < 0 ? 0.4 : 1;
    const glow = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 4);
    glow.addColorStop(0, `rgba(235, 235, 225, ${0.25 * state.moonF})`); glow.addColorStop(1, 'rgba(235,235,225,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p[0], p[1], r * 4, 0, 6.2832); ctx.fill();
    ctx.translate(p[0], p[1]); ctx.rotate(ang);
    ctx.fillStyle = '#1d2230'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#efeee6'; ctx.fill(new Path2D(phasePath(state.moonF, true, r)));
    ctx.restore();
    if (state.moonV[2] > 0) label('la Lune', p[0] + r + 6, p[1] + 5, 'italic 16px "EB Garamond", serif', '#efeee6', 'left', true);
  }

  function spaced(t, x, y) {
    if ('letterSpacing' in ctx) { ctx.letterSpacing = '2px'; ctx.fillText(t, x, y); ctx.letterSpacing = '0px'; } else ctx.fillText(t, x, y);
  }

  // ---------- gestes : glisser pour tourner, pincer pour zoomer ----------
  const pts = new Map();
  let pinch0 = null;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    cancelAnimationFrame(viewAnim);
    if (pts.size === 2) { const [a, c] = [...pts.values()]; pinch0 = { d: Math.hypot(a[0] - c[0], a[1] - c[1]), fov: view.fov }; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const prev = pts.get(e.pointerId);
    if (!prev) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2 && pinch0) {
      const [a, c] = [...pts.values()];
      view.fov = Math.max(25, Math.min(150, pinch0.fov * pinch0.d / Math.max(10, Math.hypot(a[0] - c[0], a[1] - c[1]))));
    } else if (pts.size === 1 && !view.compass) {
      if (Math.abs(e.clientX - prev[0]) + Math.abs(e.clientY - prev[1]) > 1) onDrag?.();
      const k = view.fov / W;
      view.az = (view.az - (e.clientX - prev[0]) * k + 360) % 360;
      view.alt = Math.max(-15, Math.min(89, view.alt + (e.clientY - prev[1]) * k));
    }
    draw();
  });
  const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = null; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); view.fov = Math.max(25, Math.min(150, view.fov * Math.exp(e.deltaY * 0.001))); draw(); }, { passive: false });

  // ---------- mode boussole : le téléphone devient une lunette ----------
  let lastSensor = 0;
  function onOrientation(e) {
    if (e.alpha == null) return;
    const a = e.alpha * D2R, bt = e.beta * D2R, g = e.gamma * D2R;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(bt), sb = Math.sin(bt), cg = Math.cos(g), sg = Math.sin(g);
    // R = Rz(α)·Rx(β)·Ry(γ) ; repère terrestre : x Est, y Nord, z Zénith
    const col3 = [sg * ca + cg * sb * sa, sg * sa - cg * sb * ca, cg * cb];   // vers l'utilisateur
    const col2 = [-cb * sa, cb * ca, sb];                                      // haut de l'écran
    const toHor = (v) => [v[1], -v[0], v[2]];
    const fwd = toHor(col3.map((x) => -x)), upv = toHor(col2);
    const k = view.fwd ? 0.22 : 1;   // lissage
    const mix = (o, n) => { const m = o ? o.map((x, i) => x + (n[i] - x) * k) : n; const l = Math.hypot(...m); return m.map((x) => x / l); };
    view.fwd = mix(view.fwd, fwd); view.up = mix(view.up, upv);
    lastSensor = performance.now();
    draw();
  }
  function setCompass(on) {
    view.compass = on;
    if (on) {
      view.fwd = view.up = null; view.fov = 75; lastSensor = 0;
      window.addEventListener('deviceorientationabsolute', onOrientation);
      setTimeout(() => {
        if (view.compass && !lastSensor) { onInfo?.({ compassError: true }); setCompass(false); }
      }, 2000);
    } else {
      window.removeEventListener('deviceorientationabsolute', onOrientation);
      if (view.fwd) { const [az, alt] = azAlt(view.fwd); view.az = az; view.alt = Math.max(-15, Math.min(89, alt)); }
      view.fov = 100;
    }
    draw();
  }

  return {
    setTime, centerOnUrsa, centerOnNorth, centerOnVenus, setCompass, resize,
    setLabels(v) { opts.labels = v; draw(); },
    setActive(v) { active = v; if (v) resize(); },
    get compass() { return view.compass; },
  };
}
