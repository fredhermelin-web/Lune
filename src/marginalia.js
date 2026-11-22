// Les marges du savant : annotations à la plume autour de la Lune, et tracés de construction.
// Tout est calculé : les flèches visent la vraie lumière cendrée, la vraie ligne d'ombre, une vraie mer.

const NS = 'http://www.w3.org/2000/svg';

// Mers et cratères remarquables (latitude, longitude sélénographiques)
const FEATURES = [
  ['Mare Tranquillitatis', 'mer de la Tranquillité · Apollo 11, 1969', 8.5, 31.4],
  ['Mare Serenitatis', 'mer de la Sérénité', 28.0, 17.5],
  ['Mare Imbrium', 'mer des Pluies', 32.8, -15.6],
  ['Mare Crisium', 'mer des Crises', 17.0, 59.1],
  ['Oceanus Procellarum', 'océan des Tempêtes', 18.4, -57.4],
  ['Mare Nubium', 'mer des Nuées', -21.3, -16.6],
  ['Mare Fecunditatis', 'mer de la Fécondité', -7.8, 51.3],
  ['Mare Nectaris', 'mer du Nectar', -15.2, 35.5],
  ['Mare Frigoris', 'mer du Froid', 56.0, 1.4],
  ['Tycho', 'cratère aux grands rayons', -43.3, -11.2],
  ['Copernicus', 'le « monarque de la Lune »', 9.6, -20.1],
  ['Plato', 'cratère au fond sombre', 51.6, -9.4],
];

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

export function initMarginalia(stage) {
  const svg = el('svg', { class: 'margin', 'aria-hidden': 'true' });
  stage.appendChild(svg);
  let mirrored = null;

  // toucher une annotation : elle s'écrit en miroir, comme Léonard
  svg.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('.note');
    if (!g) return;
    e.stopPropagation();
    g.classList.toggle('is-mirror');
    clearTimeout(mirrored);
    mirrored = setTimeout(() => g.classList.remove('is-mirror'), 3500);
  });

  /** moon : état de astro.moonAt ; S : taille de la scène (px) ; radius : rayon du disque (px) ; dayKey : jour */
  function update(moon, S, radius, dayKey) {
    svg.setAttribute('viewBox', `${-S / 2} ${-S / 2} ${S} ${S}`);
    svg.innerHTML = '';
    const M = moon.viewToBody;
    const cols = [M.slice(0, 3), M.slice(3, 6), M.slice(6, 9)];
    const toView = (nb) => [dot3(cols[0], nb), dot3(cols[1], nb), dot3(cols[2], nb)];
    const s = toView(moon.sun);
    const sxy = Math.hypot(s[0], s[1]) || 1e-6;
    const u = [s[0] / sxy, s[1] / sxy];                  // direction écran du Soleil (y vers le haut)
    const scr = (x, y) => [x * radius, -y * radius];      // unités disque → px SVG

    // ---------- tracés de construction ----------
    const g = el('g', { class: 'constr' }, svg);
    const rr = radius + 9;
    el('circle', { r: rr }, g);
    let ticks = '';
    for (let a = 0; a < 360; a += 10) {
      const t = a * Math.PI / 180, l = a % 30 === 0 ? 6 : 3;
      ticks += `M${(Math.cos(t) * rr).toFixed(1)} ${(Math.sin(t) * rr).toFixed(1)}L${(Math.cos(t) * (rr + l)).toFixed(1)} ${(Math.sin(t) * (rr + l)).toFixed(1)}`;
    }
    el('path', { d: ticks }, g);
    // l'axe de la lumière, tiré vers le Soleil, et l'angle mesuré depuis le zénith
    const [ux, uy] = [u[0], -u[1]];
    el('line', { x1: ux * (rr + 3), y1: uy * (rr + 3), x2: ux * (rr + 26), y2: uy * (rr + 26), class: 'axis' }, g);
    el('circle', { cx: ux * (rr + 31), cy: uy * (rr + 31), r: 4, class: 'sol' }, g);
    el('circle', { cx: ux * (rr + 31), cy: uy * (rr + 31), r: 0.9, class: 'sol-dot' }, g);
    const ang = Math.atan2(u[0], u[1]);                  // depuis le haut, sens horaire
    const ar = rr + 16;
    const large = Math.abs(ang) > Math.PI ? 1 : 0;
    el('path', { class: 'arc', d: `M0 ${-ar} A${ar} ${ar} 0 ${large} ${ang > 0 ? 1 : 0} ${(Math.sin(ang) * ar).toFixed(1)} ${(-Math.cos(ang) * ar).toFixed(1)}` }, g);
    el('line', { x1: 0, y1: -(rr + 3), x2: 0, y2: -(rr + 22), class: 'zen' }, g);
    const mid = ang / 2, lr = ar + 9;
    const lab = el('text', { x: (Math.sin(mid) * lr).toFixed(1), y: (-Math.cos(mid) * lr + 3).toFixed(1), class: 'deg' }, g);
    lab.textContent = `${Math.round(Math.abs(ang * 180 / Math.PI))}°`;

    // ---------- annotations ----------
    const notes = [];
    const f = moon.fraction;
    if (f < 0.82) {
      const t = -(1 + s[2]) / 2;
      notes.push({ target: [u[0] * t * 0.95, u[1] * t * 0.95], lines: ['lumière cendrée', 'le reflet de la Terre — Léonard'] });
    }
    if (f > 0.04 && f < 0.97) {
      // un point de la ligne d'ombre : grand cercle perpendiculaire au Soleil
      const b = [-u[1], u[0], 0];
      let a = [s[1] * b[2] - s[2] * b[1], s[2] * b[0] - s[0] * b[2], s[0] * b[1] - s[1] * b[0]];
      if (a[2] < 0) a = a.map((x) => -x);
      const th = 0.55;
      const n = [Math.cos(th) * a[0] + Math.sin(th) * b[0], Math.cos(th) * a[1] + Math.sin(th) * b[1]];
      notes.push({ target: n, lines: [moon.waxing ? 'ici, l’aube lunaire' : 'ici, le crépuscule lunaire', 'les montagnes y portent ombre'] });
    }
    const lit = [];
    for (const [la, fr, lat, lon] of FEATURES) {
      const r = Math.PI / 180;
      const nb = [Math.cos(lat * r) * Math.cos(lon * r), Math.cos(lat * r) * Math.sin(lon * r), Math.sin(lat * r)];
      const v = toView(nb);
      if (v[2] > 0.42 && dot3(nb, moon.sun) > 0.12) lit.push({ target: [v[0], v[1]], lines: [la, fr], latin: true });
    }
    if (lit.length) notes.push(lit[Math.abs(dayKey) % lit.length]);

    // chaque note dans un coin libre de la page, au plus près de ce qu'elle désigne
    const corners = [
      { x: -S / 2 + 2, y: -S / 2 + 12, anchor: 'start', dir: [-1, 1] },
      { x: S / 2 - 2, y: -S / 2 + 12, anchor: 'end', dir: [1, 1] },
      { x: S / 2 - 2, y: S / 2 - 26, anchor: 'end', dir: [1, -1] },
      { x: -S / 2 + 2, y: S / 2 - 26, anchor: 'start', dir: [-1, -1] },
    ];
    const used = new Set();
    for (const n of notes.slice(0, 3)) {
      let best = null, bd = -Infinity;
      corners.forEach((c, i) => {
        if (used.has(i)) return;
        const d = (n.target[0] * c.dir[0] + n.target[1] * c.dir[1]) / (Math.hypot(...n.target) || 1);
        if (d > bd) { bd = d; best = i; }
      });
      if (best === null) break;
      used.add(best);
      const c = corners[best];
      const note = el('g', { class: 'note' + (n.latin ? ' latin' : '') }, svg);
      const t1 = el('text', { x: c.x, y: c.y, 'text-anchor': c.anchor, class: 'l1' }, note);
      t1.textContent = n.lines[0];
      const t2 = el('text', { x: c.x, y: c.y + 15, 'text-anchor': c.anchor, class: 'l2' }, note);
      t2.textContent = n.lines[1];
      // flèche à main levée vers la cible
      const [tx, ty] = scr(n.target[0], n.target[1]);
      const sx = c.x + (c.anchor === 'start' ? 34 : -34), sy = c.y + (c.dir[1] > 0 ? 19 : -14);
      const mx = (sx + tx) / 2 + (c.dir[0] * 16), my = (sy + ty) / 2 - (c.dir[1] * 10);
      el('path', { class: 'quill', d: `M${sx.toFixed(1)} ${sy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}` }, note);
      const ang2 = Math.atan2(ty - my, tx - mx);
      const h = 5;
      el('path', {
        class: 'quill', d: `M${(tx - h * Math.cos(ang2 - 0.45)).toFixed(1)} ${(ty - h * Math.sin(ang2 - 0.45)).toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}L${(tx - h * Math.cos(ang2 + 0.45)).toFixed(1)} ${(ty - h * Math.sin(ang2 + 0.45)).toFixed(1)}`,
      }, note);
      el('circle', { cx: tx, cy: ty, r: 1.6, class: 'pin' }, note);
    }
  }

  return { update, el: svg };
}
