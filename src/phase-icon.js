// Petite Lune vectorielle (fraction éclairée, croissante = éclairée à droite, vue de l'hémisphère nord).
export function phasePath(fraction, waxing, r = 7, cx = 0, cy = 0) {
  const f = Math.min(1, Math.max(0, fraction));
  const rx = Math.abs(2 * f - 1) * r;
  const sweep = f < 0.5 ? 0 : 1;
  const s = waxing ? 1 : -1;
  const top = `${cx} ${cy - r}`, bottom = `${cx} ${cy + r}`;
  // demi-disque éclairé puis retour par l'ellipse du terminateur
  return `M${top} A${r} ${r} 0 0 ${s > 0 ? 1 : 0} ${bottom} A${rx.toFixed(2)} ${r} 0 0 ${s > 0 ? sweep : 1 - sweep} ${top}Z`;
}

export function phaseSvg(fraction, waxing, r = 7) {
  const d = phasePath(fraction, waxing, r, r, r);
  return `<svg viewBox="0 0 ${2 * r} ${2 * r}" aria-hidden="true"><circle class="dark" cx="${r}" cy="${r}" r="${r}"/>`
    + (fraction > 0.005 ? `<path class="lit" d="${d}"/>` : '') + '</svg>';
}
