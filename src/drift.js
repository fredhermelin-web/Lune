// La profondeur de l'univers : des étoiles lointaines qui dérivent lentement derrière le vrai ciel,
// et parfois, une étoile filante. Tout est animé par le compositeur (CSS) : presque rien pour la batterie.

function tile(size, count, seed, maxR, maxA) {
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  for (let i = 0; i < count; i++) {
    const r = 0.3 + Math.pow(rand(), 3) * maxR;
    g.globalAlpha = 0.15 + rand() * maxA;
    g.fillStyle = rand() < 0.2 ? '#ffe9c8' : rand() < 0.5 ? '#cfdcff' : '#ffffff';
    g.beginPath(); g.arc(rand() * size, rand() * size, r, 0, 6.2832); g.fill();
  }
  return c.toDataURL('image/png');
}

export function initDrift(host) {
  const far = document.createElement('div');
  far.className = 'drift drift-far';
  far.style.backgroundImage = `url(${tile(400, 150, 7, 0.7, 0.45)})`;
  const near = document.createElement('div');
  near.className = 'drift drift-near';
  near.style.backgroundImage = `url(${tile(560, 60, 11, 1.1, 0.55)})`;
  const tw = host.querySelector('.twinkles');
  host.insertBefore(far, tw); host.insertBefore(near, tw);

  // les étoiles filantes : rares, imprévisibles
  let timer = 0;
  const shoot = () => {
    if (!document.hidden && document.body.dataset.view !== 'view-sun' && document.body.dataset.view !== 'view-sky'
      && !document.body.classList.contains('in-ritual')) {
      const m = document.createElement('i');
      m.className = 'meteor';
      const w = window.innerWidth, h = window.innerHeight;
      m.style.left = (w * (0.1 + Math.random() * 0.8)).toFixed(0) + 'px';
      m.style.top = (h * (0.05 + Math.random() * 0.35)).toFixed(0) + 'px';
      m.style.setProperty('--a', (15 + Math.random() * 40).toFixed(0) + 'deg');
      m.style.setProperty('--len', (90 + Math.random() * 120).toFixed(0) + 'px');
      host.appendChild(m);
      setTimeout(() => m.remove(), 1600);
    }
    timer = setTimeout(shoot, 20000 + Math.random() * 45000);
  };
  timer = setTimeout(shoot, 9000 + Math.random() * 8000);
  return () => clearTimeout(timer);
}
