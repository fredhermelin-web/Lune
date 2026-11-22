// L'almanach des savants : [mois (1-12), jour, année, texte]
export const ALMANAC = [
  [1, 1, 1801, 'Piazzi découvre Cérès, le premier astéroïde'],
  [1, 4, 1643, 'naissance d’Isaac Newton'],
  [1, 7, 1610, 'Galilée aperçoit trois petites « étoiles » serrées contre Jupiter — ses lunes'],
  [1, 8, 1642, 'mort de Galilée à Arcetri, aveugle, les yeux usés par le ciel'],
  [2, 15, 1564, 'naissance de Galilée à Pise'],
  [2, 18, 1930, 'Clyde Tombaugh découvre Pluton'],
  [2, 19, 1473, 'naissance de Copernic à Toruń'],
  [3, 13, 1610, 'parution à Venise du « Sidereus Nuncius », le Messager des étoiles'],
  [3, 13, 1781, 'William Herschel découvre Uranus'],
  [3, 25, 1655, 'Huygens découvre Titan, la grande lune de Saturne'],
  [4, 14, 1629, 'naissance de Christiaan Huygens'],
  [4, 15, 1452, 'naissance de Léonard à Vinci'],
  [5, 2, 1519, 'Léonard s’éteint au Clos Lucé, à Amboise'],
  [5, 24, 1543, 'mort de Copernic, son « De revolutionibus » à peine imprimé'],
  [6, 22, 1633, 'Galilée abjure devant l’Inquisition'],
  [6, 26, 1730, 'naissance de Charles Messier, le « furet des comètes »'],
  [7, 4, 1054, 'les astronomes chinois voient s’allumer une étoile nouvelle : la nébuleuse du Crabe'],
  [7, 20, 1969, 'deux hommes marchent sur la mer de la Tranquillité'],
  [8, 25, 1609, 'Galilée présente sa lunette au doge de Venise'],
  [9, 23, 1846, 'Galle découvre Neptune, là où le calcul de Le Verrier l’attendait'],
  [10, 4, 1957, 'Spoutnik, la première lune artificielle'],
  [10, 24, 1601, 'mort de Tycho Brahe à Prague'],
  [11, 11, 1572, 'Tycho Brahe découvre une étoile nouvelle dans Cassiopée'],
  [11, 15, 1630, 'mort de Kepler à Ratisbonne'],
  [11, 15, 1738, 'naissance de William Herschel'],
  [11, 30, 1609, 'Galilée commence à dessiner la Lune dans sa lunette'],
  [12, 14, 1546, 'naissance de Tycho Brahe'],
  [12, 24, 1968, 'Apollo 8 voit la Terre se lever au-dessus de la Lune'],
  [12, 27, 1571, 'naissance de Kepler'],
];

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Les anniversaires à venir (y compris aujourd'hui), triés, avec le nombre de jours restants. */
export function upcoming(date, count = 4) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return ALMANAC.map(([m, d, y, text]) => {
    let t = new Date(today.getFullYear(), m - 1, d);
    if (t < today) t = new Date(today.getFullYear() + 1, m - 1, d);
    return { m, d, y, text, days: Math.round((t - today) / 86400000), years: t.getFullYear() - y };
  }).sort((a, b) => a.days - b.days).slice(0, count);
}

/** Phrases pour la pensée du soir (anniversaires à ±3 jours). */
export function almanacThoughts(date) {
  const out = [];
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  for (const [m, d, y, text] of ALMANAC) {
    const days = Math.round((new Date(date.getFullYear(), m - 1, d) - today) / 86400000);
    if (days === 0) out.push(`Il y a ${date.getFullYear() - y} ans, jour pour jour : ${text}.`);
    else if (days > 0 && days <= 3) out.push(`Dans ${days} jour${days > 1 ? 's' : ''}, l’anniversaire : ${d} ${MONTHS[m - 1]} ${y}, ${text}.`);
    else if (days < 0 && days >= -3) out.push(`Cette semaine, en ${y} : ${text}.`);
  }
  return out;
}
