// L'atelier : les objets du savant posés sur la table — encrier et plume, bougie, lunette de Galilée.
// Dessins vectoriels à la manière des gravures, rehaussés d'or.

export const INKWELL = `<svg viewBox="0 0 60 72" aria-hidden="true">
  <defs>
    <linearGradient id="ink-glass" x1="0" x2="1"><stop offset="0" stop-color="#2a3550"/><stop offset=".45" stop-color="#121a2a"/><stop offset="1" stop-color="#070a12"/></linearGradient>
    <linearGradient id="ink-gold" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f3dfae"/><stop offset="1" stop-color="#9a7440"/></linearGradient>
    <linearGradient id="ink-vane" x1="0" x2="1"><stop offset="0" stop-color="#fbf4e4"/><stop offset="1" stop-color="#d9ccb0"/></linearGradient>
  </defs>
  <path d="M33 31 C26 22 16 10 6 1 C10 9 16 18 24 26 C18 22 10 18 3 17 C10 22 19 27 28 31Z" fill="url(#ink-vane)" opacity=".95"/>
  <path d="M6 1 C16 12 25 22 33 31" stroke="#8a6a3c" stroke-width=".8" fill="none"/>
  <path d="M10 7l5 1M13 11l6 0M17 15l5 0M8 12l4 3M12 17l4 3M16 21l5 2" stroke="#b9a684" stroke-width=".5"/>
  <path d="M13 51 Q11 39 21 35 L23 29 H37 L39 35 Q49 39 47 51 Q45 64 30 64 Q15 64 13 51Z" fill="url(#ink-glass)" stroke="#c9a464" stroke-width=".7"/>
  <path d="M18 44 Q19 39 24 37" stroke="rgba(255,255,255,.35)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <rect x="21.5" y="26.5" width="17" height="4" rx="1" fill="url(#ink-gold)"/>
  <ellipse cx="30" cy="64.5" rx="20" ry="2.6" fill="rgba(0,0,0,.45)"/>
</svg>`;

export const CANDLE = `<svg viewBox="0 0 40 96" aria-hidden="true">
  <defs>
    <radialGradient id="cd-flame" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#fffbe8"/><stop offset=".35" stop-color="#ffe08a"/><stop offset=".75" stop-color="#ff9c3a"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
    <radialGradient id="cd-halo"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
    <linearGradient id="cd-wax" x1="0" x2="1"><stop offset="0" stop-color="#e9dcc0"/><stop offset=".5" stop-color="#fbf3e0"/><stop offset="1" stop-color="#cdbd9c"/></linearGradient>
    <linearGradient id="cd-brass" x1="0" x2="1"><stop offset="0" stop-color="#7a5a2e"/><stop offset=".4" stop-color="#f0d9a6"/><stop offset="1" stop-color="#6d5330"/></linearGradient>
  </defs>
  <circle class="c-halo" cx="20" cy="14" r="18" fill="url(#cd-halo)"/>
  <g class="c-flame"><path d="M20 3 C24 10 25 15 23.5 19 C22.5 22 17.5 22 16.5 19 C15 15 16 10 20 3Z" fill="url(#cd-flame)"/>
    <ellipse cx="20" cy="18.5" rx="1.6" ry="2.6" fill="#6b8cff" opacity=".45"/></g>
  <line x1="20" y1="20" x2="20" y2="24" stroke="#2a1a0e" stroke-width="1"/>
  <path d="M14 24 H26 V70 H14Z" fill="url(#cd-wax)"/>
  <path d="M14 24 Q15 30 14 34 M24 24 Q25.5 29 24.5 36 Q24 39 25 40" stroke="#e0d1b0" stroke-width="1.2" fill="none"/>
  <ellipse cx="20" cy="24" rx="6" ry="1.4" fill="#f6ecd6"/>
  <path d="M8 70 H32 L30 74 H10Z" fill="url(#cd-brass)"/>
  <path d="M16 74 H24 V82 H16Z" fill="url(#cd-brass)"/>
  <ellipse cx="20" cy="86" rx="15" ry="4" fill="url(#cd-brass)"/>
  <path d="M33 84 Q39 80 36 76" stroke="#c9a464" stroke-width="1.6" fill="none"/>
  <ellipse cx="20" cy="91" rx="17" ry="2.4" fill="rgba(0,0,0,.45)"/>
</svg>`;

// la lunette : de l'oculaire (en bas à gauche) à l'objectif (en haut à droite)
const E = [12, 54], O = [80, 16];
const L = Math.hypot(O[0] - E[0], O[1] - E[1]);
const d = [(O[0] - E[0]) / L, (O[1] - E[1]) / L], n = [-d[1], d[0]];
const at = (t, w, s = 1) => [E[0] + (O[0] - E[0]) * t + n[0] * w * s, E[1] + (O[1] - E[1]) * t + n[1] * w * s];
const pt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const tube = `M${pt(at(0, 3))}L${pt(at(1, 5.2))}L${pt(at(1, 5.2, -1))}L${pt(at(0, 3, -1))}Z`;
const bands = [0.12, 0.4, 0.68, 0.94].map((t) => {
  const w = 3 + 2.2 * t + 0.6;
  return `<path d="M${pt(at(t, w))}L${pt(at(t, w, -1))}" stroke="url(#ts-gold)" stroke-width="2.4"/>`;
}).join('');
const ang = Math.atan2(d[1], d[0]) * 180 / Math.PI;
const mount = at(0.46, 0);

export const TELESCOPE = `<svg viewBox="0 0 92 76" aria-hidden="true">
  <defs>
    <linearGradient id="ts-leather" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#8a5a32"/><stop offset=".5" stop-color="#5a3519"/><stop offset="1" stop-color="#341d0c"/></linearGradient>
    <linearGradient id="ts-gold" x1="0" x2="1"><stop offset="0" stop-color="#9a7440"/><stop offset=".5" stop-color="#f3dfae"/><stop offset="1" stop-color="#9a7440"/></linearGradient>
    <linearGradient id="ts-wood" x1="0" x2="1"><stop offset="0" stop-color="#4a2e16"/><stop offset=".5" stop-color="#8a6034"/><stop offset="1" stop-color="#3a220e"/></linearGradient>
  </defs>
  <path d="M${pt(mount)}L28 72M${pt(mount)}L58 72M${pt(mount)}L44 74" stroke="url(#ts-wood)" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="${mount[0].toFixed(1)}" cy="${mount[1].toFixed(1)}" r="3" fill="url(#ts-gold)"/>
  <path d="${tube}" fill="url(#ts-leather)" stroke="#2a160a" stroke-width=".6"/>
  <path d="M${pt(at(0.02, 1.6))}L${pt(at(0.98, 3.2))}" stroke="rgba(255,220,170,.25)" stroke-width="1"/>
  ${bands}
  <ellipse cx="${O[0]}" cy="${O[1]}" rx="2.2" ry="6.2" transform="rotate(${ang.toFixed(1)} ${O[0]} ${O[1]})" fill="#1a2438" stroke="url(#ts-gold)" stroke-width="1.6"/>
  <ellipse cx="${O[0]}" cy="${O[1]}" rx="1.1" ry="3.4" transform="rotate(${ang.toFixed(1)} ${O[0]} ${O[1]})" fill="rgba(160,190,255,.45)"/>
  <path d="M${pt(at(0, 2))}L${pt(at(-0.08, 1.8))}L${pt(at(-0.08, 1.8, -1))}L${pt(at(0, 2, -1))}Z" fill="url(#ts-gold)"/>
  <ellipse cx="44" cy="74.5" rx="20" ry="1.8" fill="rgba(0,0,0,.45)"/>
</svg>`;

/** La vue dans la lunette : l'iris se referme autour de la Lune, dans un anneau de laiton gravé. */
export function openEyepiece(center, radius, onClose) {
  const el = document.createElement('div');
  el.className = 'eyepiece';
  el.style.setProperty('--cx', center[0] + 'px');
  el.style.setProperty('--cy', center[1] + 'px');
  el.style.setProperty('--R', radius + 'px');
  const ring = radius + 16;
  el.innerHTML = `<svg class="ep-ring" viewBox="${-ring - 30} ${-ring - 30} ${2 * ring + 60} ${2 * ring + 60}"
      style="width:${2 * ring + 60}px;height:${2 * ring + 60}px;left:${center[0] - ring - 30}px;top:${center[1] - ring - 30}px">
    <defs><linearGradient id="epg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dfae"/><stop offset=".5" stop-color="#9a7440"/><stop offset="1" stop-color="#5a3f1e"/></linearGradient>
      <path id="eparc" d="M${-ring - 9} 0 A${ring + 9} ${ring + 9} 0 1 1 ${ring + 9} 0"/></defs>
    <circle r="${ring}" fill="none" stroke="url(#epg)" stroke-width="10"/>
    <circle r="${ring - 6}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="2"/>
    <circle r="${ring + 6}" fill="none" stroke="rgba(255,230,180,.35)" stroke-width="1"/>
    <text class="ep-text"><textPath href="#eparc" startOffset="50%" text-anchor="middle">PERSPICILLVM · GALILAEI · MDCIX</textPath></text>
  </svg>
  <p class="ep-cap">Dans la lunette de Galilée<small>touche pour sortir</small></p>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-open'));
  const close = () => {
    el.classList.remove('is-open');
    el.classList.add('is-closing');
    setTimeout(() => el.remove(), 700);
    onClose?.();
  };
  el.addEventListener('click', close);
  return close;
}
