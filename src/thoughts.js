// La pensée du soir : une phrase différente à chaque ouverture, tirée du ciel réel.
import { direction, num, time, shortDate } from './format.js';
import { sky, specialVec, starName, vec } from './sky.js';
import { fullMoonName } from './secrets.js';

const QUOTES = [
  ['La philosophie est écrite dans ce grand livre qui se tient constamment ouvert devant nos yeux : l’univers.', 'Galilée, 1623'],
  ['C’est une chose très belle et très agréable à la vue que de contempler le corps de la Lune.', 'Galilée, 1610'],
  ['La géométrie est l’archétype de la beauté du monde.', 'Kepler'],
  ['Et pourtant, elle tourne.', 'attribué à Galilée'],
  ['Ursine, le temps venra.', 'devise du duc de Berry'],
  ['Les cieux racontent la gloire, et le firmament annonce l’ouvrage.', 'Psaume 19'],
];

const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;

export function makeThought({ date, moon, ursa, luna, place }) {
  const out = [];

  // L'Ourse ce soir
  if (ursa) {
    const c = ursa.centre;
    out.push(`Ce soir, la Grande Ourse veille au ${direction(c.azimuth).toLowerCase()}, à ${num(c.altitude, 0)}° au-dessus de l’horizon.`);
    if (ursa.dubhe.altitude > 15) out.push('Mizar et Alcor t’attendent au milieu de la queue de l’Ourse : les vois-tu séparées ?');
  }

  // La Lune près d'une étoile brillante ou des Pléiades
  if (sky.ready && moon) {
    const m = moon.basis.fwd;
    const pl = vec(56.75, 24.12);
    if (angle(m, pl) < 7) out.push('La Lune passe ces jours-ci tout près des Pléiades, les sept sœurs du Taureau.');
    for (const [i, n] of Object.entries(sky.names)) {
      const o = +i * 5;
      if (sky.stars[o + 3] > 1.6) continue;
      const d = angle(m, [sky.stars[o], sky.stars[o + 1], sky.stars[o + 2]]);
      if (d < 6) { out.push(`Ce soir, la Lune croise ${starName(n)}, à ${num(d, 0)}° d’elle.`); break; }
    }
  }

  // La prochaine pleine lune
  const fm = luna?.next.find((q) => q.quarter === 2);
  if (fm) {
    const days = Math.round((fm.date - date) / 86400000);
    if (days >= 1 && days <= 4) {
      out.push(`${days === 1 ? 'Demain' : `Dans ${days} jours`}, la ${fullMoonName(fm).name} — pleine le ${shortDate(fm.date)} à ${time(fm.date)}.`);
    }
  }

  // Galilée, à la saison où il dessina la Lune pour la première fois
  if (date.getMonth() >= 10) {
    out.push(`À la fin de 1609, Galilée pointait sa lunette vers cette même Lune. Il y a ${date.getFullYear() - 1609} ans.`);
  }

  const pick = out.length && Math.random() < 0.72 ? { text: out[Math.floor(Math.random() * out.length)] } : null;
  if (pick) return pick;
  const [text, author] = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  return { text: `« ${text} »`, author };
}
