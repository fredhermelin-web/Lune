// Le rituel d'ouverture : la nuit s'éveille, l'astrolabe s'aligne sur la Lune,
// se dissout en poussière d'or, et la pensée du soir s'écrit à la plume.

const ZODIAC = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function ringsSvg() {
  let outer = '', mid = '', inner = '';
  for (let i = 0; i < 72; i++) {
    const a = i * 5 * Math.PI / 180, l = i % 6 === 0 ? 8 : 4;
    outer += `<line x1="${(Math.sin(a) * 186).toFixed(1)}" y1="${(-Math.cos(a) * 186).toFixed(1)}" x2="${(Math.sin(a) * (186 - l)).toFixed(1)}" y2="${(-Math.cos(a) * (186 - l)).toFixed(1)}"/>`;
  }
  ZODIAC.forEach((z, i) => {
    const a = (i * 30 + 15) * Math.PI / 180;
    outer += `<text x="${(Math.sin(a) * 164).toFixed(1)}" y="${(-Math.cos(a) * 164 + 6).toFixed(1)}" transform="rotate(${i * 30 + 15} ${(Math.sin(a) * 164).toFixed(1)} ${(-Math.cos(a) * 164 + 6).toFixed(1)})">${z}&#xFE0E;</text>`;
  });
  ROMAN.forEach((r, i) => {
    const a = i * 30 * Math.PI / 180;
    mid += `<text x="${(Math.sin(a) * 124).toFixed(1)}" y="${(-Math.cos(a) * 124 + 5).toFixed(1)}" transform="rotate(${i * 30} ${(Math.sin(a) * 124).toFixed(1)} ${(-Math.cos(a) * 124 + 5).toFixed(1)})">${r}</text>`;
  });
  for (let i = 0; i < 120; i++) {
    const a = i * 3 * Math.PI / 180, l = i % 10 === 0 ? 7 : 3;
    inner += `<line x1="${(Math.sin(a) * 100).toFixed(1)}" y1="${(-Math.cos(a) * 100).toFixed(1)}" x2="${(Math.sin(a) * (100 - l)).toFixed(1)}" y2="${(-Math.cos(a) * (100 - l)).toFixed(1)}"/>`;
  }
  // l'araignée (rete) : courbes ajourées de l'astrolabe
  const rete = `<path d="M0 -92 C40 -60 60 -10 30 40 S-50 70 -70 20 S-40 -70 0 -92Z"/><circle r="58"/><circle cx="0" cy="-22" r="70"/>`;
  return `<svg viewBox="-200 -200 400 400" class="astrolabe">
    <defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dfae"/><stop offset=".5" stop-color="#c9a464"/><stop offset="1" stop-color="#8a6a3a"/></linearGradient></defs>
    <g class="ring r1"><circle r="190"/><circle r="182"/><circle r="146"/>${outer}</g>
    <g class="ring r2"><circle r="140"/><circle r="110"/>${mid}</g>
    <g class="ring r3"><circle r="100"/>${inner}${rete}</g>
    <path class="pointer" d="M0 -199 L6 -188 L-6 -188Z"/>
  </svg>`;
}

/**
 * opts.moonLon : longitude écliptique de la Lune (degrés) — l'anneau du zodiaque s'y aligne.
 * opts.onReveal : appelé quand la Lune doit apparaître.
 * opts.thought : { text, author }
 */
export function playRitual({ moonLon = 0, onReveal, thought, center }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sky = document.querySelector('.sky');
  const el = document.createElement('div');
  el.className = 'ritual';
  if (center) { el.style.setProperty('--cx', center[0] + 'px'); el.style.setProperty('--cy', center[1] + 'px'); }
  document.body.classList.add('in-ritual');
  el.innerHTML = ringsSvg() + '<div class="dust"></div>';
  document.body.appendChild(el);
  const dust = el.querySelector('.dust');
  for (let i = 0; i < 46; i++) {
    const s = document.createElement('i');
    const a = Math.random() * Math.PI * 2, r0 = 100 + Math.random() * 90, r1 = r0 + 60 + Math.random() * 160;
    s.style.setProperty('--x0', (Math.cos(a) * r0).toFixed(0) + 'px');
    s.style.setProperty('--y0', (Math.sin(a) * r0).toFixed(0) + 'px');
    s.style.setProperty('--x1', (Math.cos(a) * r1).toFixed(0) + 'px');
    s.style.setProperty('--y1', (Math.sin(a) * r1 - 30).toFixed(0) + 'px');
    s.style.setProperty('--d', (900 + Math.random() * 900).toFixed(0) + 'ms');
    dust.appendChild(s);
  }

  const r1 = el.querySelector('.r1'), r2 = el.querySelector('.r2'), r3 = el.querySelector('.r3');
  // départ décalé, arrivée : le signe de la Lune sous l'index d'or
  const target = -moonLon;
  r1.style.transform = `rotate(${target + 140}deg)`;
  r2.style.transform = `rotate(${-120}deg)`;
  r3.style.transform = `rotate(${200}deg)`;

  let done = false;
  const timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  const reveal = () => { if (onReveal) { onReveal(); onReveal = null; } };
  const finish = (fast) => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    sky.classList.add('is-awake');
    reveal();
    document.body.classList.remove('in-ritual');
    el.classList.add('is-gone');
    setTimeout(() => el.remove(), fast ? 400 : 1200);
    showThought(thought, fast);
  };

  if (reduce) { finish(true); return; }
  el.addEventListener('pointerdown', () => finish(true));

  requestAnimationFrame(() => {
    el.classList.add('is-on');
    later(250, () => sky.classList.add('is-awake'));
    later(60, () => {
      r1.style.transform = `rotate(${target}deg)`;
      r2.style.transform = 'rotate(0deg)';
      r3.style.transform = 'rotate(0deg)';
    });
    later(2300, () => { el.classList.add('is-dissolving'); reveal(); });
    later(2900, () => document.body.classList.remove('in-ritual'));
    later(3300, () => finish(false));
  });
}

export function showThought(thought, fast) {
  if (!thought) return;
  const t = document.createElement('div');
  t.className = 'thought';
  t.innerHTML = `<p><span>${thought.text}</span>${thought.author ? `<cite>${thought.author}</cite>` : ''}</p>`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('is-in'), fast ? 50 : 150);
  const leave = () => { t.classList.add('is-out'); setTimeout(() => t.remove(), 1200); };
  const timer = setTimeout(leave, thought.duration || 6500);
  t.addEventListener('pointerdown', () => { clearTimeout(timer); leave(); });
}
