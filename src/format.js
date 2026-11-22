// Mise en forme française.

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const fmtTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: tz });
const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz });
const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: tz });
const fmtWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: tz });
const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: tz });

export const time = (d) => (d ? fmtTime.format(d) : '—');
export const longDate = (d) => cap(fmtLong.format(d));
export const shortDate = (d) => fmtShort.format(d).replace('.', '');
export const weekday = (d) => fmtWeekday.format(d).replace('.', '');
export const monthYear = (d) => cap(fmtMonth.format(d));
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const num = (x, digits = 0) =>
  x.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const DIRS = ['Nord', 'Nord-Nord-Est', 'Nord-Est', 'Est-Nord-Est', 'Est', 'Est-Sud-Est', 'Sud-Est', 'Sud-Sud-Est',
  'Sud', 'Sud-Sud-Ouest', 'Sud-Ouest', 'Ouest-Sud-Ouest', 'Ouest', 'Ouest-Nord-Ouest', 'Nord-Ouest', 'Nord-Nord-Ouest'];
const DIRS8 = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export const direction = (az) => DIRS[Math.round(az / 22.5) % 16];
export const dirShort = (az) => DIRS8[Math.round(az / 45) % 8];

const SIGNS = ['Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge',
  'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'];
export const zodiacSign = (lon) => SIGNS[Math.floor(lon / 30) % 12];

/** Chiffres romains : roman(2026) = « MMXXVI », roman(326, true) = « cccxxvi ». */
export function roman(n, lower = false) {
  const T = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of T) while (n >= v) { s += r; n -= v; }
  return lower ? s.toLowerCase() : s;
}

export const dayOfYear = (d) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(d.getFullYear(), 0, 0)) / 86400000);

// Noms latins, tels qu'on les lit sur les atlas anciens
export const LATIN = {
  And: 'Andromeda', Ant: 'Antlia', Aps: 'Apus', Aqr: 'Aquarius', Aql: 'Aquila', Ara: 'Ara', Ari: 'Aries', Aur: 'Auriga',
  Boo: 'Bootes', Cae: 'Caelum', Cam: 'Camelopardalis', Cnc: 'Cancer', CVn: 'Canes Venatici', CMa: 'Canis Maior',
  CMi: 'Canis Minor', Cap: 'Capricornus', Car: 'Carina', Cas: 'Cassiopeia', Cen: 'Centaurus', Cep: 'Cepheus',
  Cet: 'Cetus', Cha: 'Chamaeleon', Cir: 'Circinus', Col: 'Columba', Com: 'Coma Berenices', CrA: 'Corona Australis',
  CrB: 'Corona Borealis', Crv: 'Corvus', Crt: 'Crater', Cru: 'Crux', Cyg: 'Cygnus', Del: 'Delphinus', Dor: 'Dorado',
  Dra: 'Draco', Equ: 'Equuleus', Eri: 'Eridanus', For: 'Fornax', Gem: 'Gemini', Gru: 'Grus', Her: 'Hercules',
  Hor: 'Horologium', Hya: 'Hydra', Hyi: 'Hydrus', Ind: 'Indus', Lac: 'Lacerta', Leo: 'Leo', LMi: 'Leo Minor',
  Lep: 'Lepus', Lib: 'Libra', Lup: 'Lupus', Lyn: 'Lynx', Lyr: 'Lyra', Men: 'Mensa', Mic: 'Microscopium',
  Mon: 'Monoceros', Mus: 'Musca', Nor: 'Norma', Oct: 'Octans', Oph: 'Ophiuchus', Ori: 'Orion', Pav: 'Pavo',
  Peg: 'Pegasus', Per: 'Perseus', Phe: 'Phoenix', Pic: 'Pictor', Psc: 'Pisces', PsA: 'Piscis Austrinus',
  Pup: 'Puppis', Pyx: 'Pyxis', Ret: 'Reticulum', Sge: 'Sagitta', Sgr: 'Sagittarius', Sco: 'Scorpius',
  Scl: 'Sculptor', Sct: 'Scutum', Ser: 'Serpens', Sex: 'Sextans', Tau: 'Taurus', Tel: 'Telescopium',
  Tri: 'Triangulum', TrA: 'Triangulum Australe', Tuc: 'Tucana', UMa: 'Ursa Maior', UMi: 'Ursa Minor',
  Vel: 'Vela', Vir: 'Virgo', Vol: 'Volans', Vul: 'Vulpecula',
};

// Les 88 constellations (UAI), noms français — servira aussi à la carte du ciel.
export const CONSTELLATIONS = {
  And: 'Andromède', Ant: 'Machine pneumatique', Aps: 'Oiseau de paradis', Aqr: 'Verseau', Aql: 'Aigle',
  Ara: 'Autel', Ari: 'Bélier', Aur: 'Cocher', Boo: 'Bouvier', Cae: 'Burin', Cam: 'Girafe', Cnc: 'Cancer',
  CVn: 'Chiens de chasse', CMa: 'Grand Chien', CMi: 'Petit Chien', Cap: 'Capricorne', Car: 'Carène',
  Cas: 'Cassiopée', Cen: 'Centaure', Cep: 'Céphée', Cet: 'Baleine', Cha: 'Caméléon', Cir: 'Compas',
  Col: 'Colombe', Com: 'Chevelure de Bérénice', CrA: 'Couronne australe', CrB: 'Couronne boréale',
  Crv: 'Corbeau', Crt: 'Coupe', Cru: 'Croix du Sud', Cyg: 'Cygne', Del: 'Dauphin', Dor: 'Dorade',
  Dra: 'Dragon', Equ: 'Petit Cheval', Eri: 'Éridan', For: 'Fourneau', Gem: 'Gémeaux', Gru: 'Grue',
  Her: 'Hercule', Hor: 'Horloge', Hya: 'Hydre', Hyi: 'Hydre mâle', Ind: 'Indien', Lac: 'Lézard',
  Leo: 'Lion', LMi: 'Petit Lion', Lep: 'Lièvre', Lib: 'Balance', Lup: 'Loup', Lyn: 'Lynx', Lyr: 'Lyre',
  Men: 'Table', Mic: 'Microscope', Mon: 'Licorne', Mus: 'Mouche', Nor: 'Règle', Oct: 'Octant',
  Oph: 'Serpentaire', Ori: 'Orion', Pav: 'Paon', Peg: 'Pégase', Per: 'Persée', Phe: 'Phénix',
  Pic: 'Peintre', Psc: 'Poissons', PsA: 'Poisson austral', Pup: 'Poupe', Pyx: 'Boussole',
  Ret: 'Réticule', Sge: 'Flèche', Sgr: 'Sagittaire', Sco: 'Scorpion', Scl: 'Sculpteur', Sct: 'Écu de Sobieski',
  Ser: 'Serpent', Sex: 'Sextant', Tau: 'Taureau', Tel: 'Télescope', Tri: 'Triangle', TrA: 'Triangle austral',
  Tuc: 'Toucan', UMa: 'Grande Ourse', UMi: 'Petite Ourse', Vel: 'Voiles', Vir: 'Vierge', Vol: 'Poisson volant',
  Vul: 'Petit Renard',
};
