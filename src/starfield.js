// Ciel de fond : dessiné une seule fois, scintillement confié au compositeur (CSS) — économe en batterie.

function rng(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

const TEMPS = ['#cfd9ff', '#e6ebff', '#ffffff', '#fff4e2', '#ffe5c4'];

export function initStarfield(canvas, twinkleLayer) {
  const draw = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const g = ctx.createRadialGradient(w * 0.5, h * 0.32, 0, w * 0.5, h * 0.32, Math.max(w, h) * 0.8);
    g.addColorStop(0, '#0a0f18'); g.addColorStop(0.55, '#05080d'); g.addColorStop(1, '#030407');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const rand = rng(1610);           // 1610 : le Sidereus Nuncius de Galilée
    const n = Math.round((w * h) / 1900);
    for (let i = 0; i < n; i++) {
      const x = rand() * w, y = rand() * h;
      const m = Math.pow(rand(), 3.2);           // beaucoup de faibles, peu de brillantes
      const r = 0.25 + m * 1.15;
      ctx.globalAlpha = 0.18 + m * 0.75;
      ctx.fillStyle = TEMPS[Math.floor(rand() * TEMPS.length)];
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  draw();
  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 200); });

  const rand = rng(1609);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('i');
    s.style.left = (rand() * 100).toFixed(2) + '%';
    s.style.top = (rand() * 100).toFixed(2) + '%';
    const size = 1 + rand() * 1.4;
    s.style.width = s.style.height = size.toFixed(1) + 'px';
    s.style.setProperty('--d', (4 + rand() * 7).toFixed(1) + 's');
    s.style.setProperty('--delay', (-rand() * 10).toFixed(1) + 's');
    s.style.setProperty('--o', (0.45 + rand() * 0.5).toFixed(2));
    frag.appendChild(s);
  }
  twinkleLayer.appendChild(frag);
}
