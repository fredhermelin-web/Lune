// Les secrets : le sceau de la pleine lune, son nom ancien, une énigme à résoudre dehors,
// et le carnet de l'astronome qui garde la trace des sceaux gagnés.
import { quartersBetween } from './astro.js';
import { time, longDate } from './format.js';

const DAY = 86400000;

const NAMES = ['Lune du Loup', 'Lune des Neiges', 'Lune du Ver', 'Lune Rose', 'Lune des Fleurs', 'Lune des Fraises',
  'Lune du Cerf', 'Lune de l’Esturgeon', 'Lune du Maïs', 'Lune du Chasseur', 'Lune du Castor', 'Lune Froide'];
const WHY = [
  'Celle des longues nuits de janvier, quand les loups hurlaient autour des villages.',
  'La neige la plus lourde tombe sous elle.',
  'Le sol dégèle, les vers reviennent : le printemps approche.',
  'Elle doit son nom aux premières fleurs roses du printemps — elle n’est pas rose pour autant.',
  'Les champs fleurissent sous sa lumière.',
  'Le temps de la cueillette des fraises sauvages.',
  'Les bois des jeunes cerfs repoussent.',
  'Les esturgeons abondaient dans les grands lacs à cette saison.',
  'Le temps de récolter le maïs.',
  'Après les moissons, la saison de la chasse s’ouvre sous sa clarté.',
  'Le temps de poser les pièges avant que les marais ne gèlent ; les castors préparent l’hiver.',
  'La pleine lune des nuits les plus longues et les plus froides.',
];

// Une énigme par mois : on y répond dehors, les yeux levés.
const RIDDLES = [
  ['L’étoile la plus brillante de toute la nuit suit Orion, son maître. Comment se nomme-t-elle ?', ['sirius']],
  ['Orion chasse dans le ciel d’hiver ; son épaule rouge porte un nom arabe. Lequel ?', ['betelgeuse']],
  ['Au cœur du Lion bat une étoile royale. Quel est son nom ?', ['regulus']],
  ['Suis l’arc de la queue de l’Ourse : il mène à une étoile orangée, le gardien de l’Ourse. Son nom ?', ['arcturus']],
  ['La Vierge tient un épi de blé : une étoile bleue. Comment l’appelle-t-on ?', ['spica', 'epi']],
  ['Prolonge cinq fois la ligne Merak → Dubhe. Quelle étoile immobile trouves-tu ?', ['polaire', 'polaris']],
  ['Trois étoiles forment le grand triangle de l’été : Véga, Deneb et… ?', ['altair']],
  ['Le Cygne vole le long de la Voie lactée. Comment se nomme l’étoile de sa queue ?', ['deneb']],
  ['Au milieu de la queue de l’Ourse, un œil perçant voit deux étoiles serrées. Nomme-les.', ['mizar', 'alcor']],
  ['Un grand W se dessine en face de la Grande Ourse, de l’autre côté de la Polaire. Quelle reine est-ce ?', ['cassiopee']],
  ['Sept sœurs voyagent serrées dans le Taureau. Qui sont-elles ?', ['pleiades', 'sept soeurs']],
  ['L’œil rouge du Taureau brille devant les Hyades. Quel est son nom ?', ['aldebaran']],
];

const GALILEE = 'La surface de la Lune n’est pas lisse et polie, mais inégale et rugueuse, couverte de hauteurs et de creux, '
  + 'comme la face même de la Terre.';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').trim();

function loadCarnet() {
  try { return JSON.parse(localStorage.getItem('lc.carnet')) || { seals: {} }; } catch { return { seals: {} }; }
}
function saveCarnet(c) { try { localStorage.setItem('lc.carnet', JSON.stringify(c)); } catch { /* ok */ } }

/** Pleine lune du jour civil de `date`, ou null. */
export function fullMoonOn(date) {
  const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return quartersBetween(d0, d0 + DAY - 1).find((q) => q.quarter === 2) || null;
}

export function fullMoonName(fm) {
  const d = fm.date;
  const y = d.getFullYear();
  const equinox = new Date(y, 8, 22, 12).getTime();
  // Lune des Moissons : la pleine lune la plus proche de l'équinoxe d'automne
  const fms = quartersBetween(equinox - 20 * DAY, equinox + 20 * DAY).filter((q) => q.quarter === 2);
  const harvest = fms.sort((a, b) => Math.abs(a.date - equinox) - Math.abs(b.date - equinox))[0];
  if (harvest && Math.abs(harvest.date - d) < DAY) {
    return { name: 'Lune des Moissons', why: 'La plus proche de l’équinoxe : elle se lève tôt plusieurs soirs de suite, et les moissonneurs travaillaient à sa lumière.' };
  }
  const m0 = new Date(y, d.getMonth(), 1).getTime(), m1 = new Date(y, d.getMonth() + 1, 1).getTime();
  const inMonth = quartersBetween(m0, m1 - 1).filter((q) => q.quarter === 2);
  if (inMonth.length === 2 && Math.abs(inMonth[1].date - d) < DAY) {
    return { name: 'Lune Bleue', why: 'La deuxième pleine lune d’un même mois. Elle n’est pas bleue, mais rare : « once in a blue moon ».' };
  }
  return { name: NAMES[d.getMonth()], why: WHY[d.getMonth()] };
}

export function sealSvg() {
  return `<svg viewBox="0 0 60 60" aria-hidden="true">
    <defs><radialGradient id="wax" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#c24a3c"/><stop offset=".6" stop-color="#8e2219"/><stop offset="1" stop-color="#5a120d"/></radialGradient></defs>
    <path fill="url(#wax)" d="M30 3c4 0 5 3 9 3.6s6-1.4 8.6 1.6 1 6 3.4 9 4.8 4 4.6 8.4-2.8 5-2.6 9 2.6 6-.2 9.4-6.2 2-9 4.4-3.2 6.4-7.4 7S32 54 28.6 54.8s-6-2.6-9.6-3.6-7.2.4-9.2-3 .6-6.4-.4-10.2-5-5.2-4.6-9.4 4.2-5 5-9-1-7 2-9.4 6.4-.4 9.6-2.4S26 3 30 3Z"/>
    <circle cx="30" cy="30" r="15.5" fill="none" stroke="#d98c7c" stroke-opacity=".45" stroke-width="1"/>
    <path d="M34.5 21.5a9.5 9.5 0 1 0 0 17 11 11 0 0 1 0-17Z" fill="#e9a493" fill-opacity=".55"/>
  </svg>`;
}

export function secretPage(body, fm, onChange) {
  const carnet = loadCarnet();
  const key = fm.date.toISOString().slice(0, 10);
  const { name, why } = fullMoonName(fm);
  const [riddle, answers] = RIDDLES[fm.date.getMonth()];
  const won = carnet.seals[key];
  const count = Object.keys(carnet.seals).length;
  body.innerHTML = `
    <div class="seal-big">${sealSvg()}</div>
    <h3 class="center">${name}</h3>
    <p class="lead center">${longDate(fm.date)} · pleine à ${time(fm.date)}</p>
    <p class="story">${why}</p>
    <blockquote class="quote">« ${GALILEE} »<cite>Galilée, <i>Sidereus Nuncius</i>, 1610</cite></blockquote>
    <h4>L’énigme de cette lune</h4>
    <p class="story">${riddle}</p>
    ${won ? `<p class="won">Sceau gagné · ${won}</p>` : `
    <div class="search"><input id="riddle-a" type="text" placeholder="Ta réponse…" autocomplete="off" enterkeyhint="done"><button class="btn" id="riddle-go">Sceller</button></div>
    <p class="lead" id="riddle-msg"></p>`}
    <p class="credit">Carnet de l’astronome : ${count} sceau${count > 1 ? 'x' : ''}.</p>
    <p class="motto-small">Le temps venra</p>`;
  const go = body.querySelector('#riddle-go');
  if (!go) return;
  const input = body.querySelector('#riddle-a'), msg = body.querySelector('#riddle-msg');
  const check = () => {
    const a = norm(input.value);
    if (!a) return;
    if (answers.some((x) => a.includes(norm(x)))) {
      carnet.seals[key] = input.value.trim();
      saveCarnet(carnet);
      navigator.vibrate?.([10, 60, 20]);
      secretPage(body, fm, onChange);
      onChange?.();
    } else {
      msg.textContent = 'Pas encore… lève les yeux, le ciel a la réponse.';
    }
  };
  go.addEventListener('click', check);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
}
