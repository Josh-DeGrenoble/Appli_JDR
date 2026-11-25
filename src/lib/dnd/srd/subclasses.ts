// Sous-classes 2024 (choisies au niveau 3) : la sous-classe du SRD avec le nom de ses aptitudes, les autres
// sous-classes du manuel avec une aptitude générique (le détail se lit dans le manuel).

/** Niveaux où la sous-classe donne une aptitude, par classe. */
export const SUBCLASS_LEVELS: Record<string, number[]> = {
  Barbare: [3, 6, 10, 14],
  Barde: [3, 6, 14],
  Clerc: [3, 6, 17],
  Druide: [3, 6, 10, 14],
  Ensorceleur: [3, 6, 14, 18],
  Guerrier: [3, 7, 10, 15, 18],
  Magicien: [3, 6, 10, 14],
  Moine: [3, 6, 11, 17],
  Occultiste: [3, 6, 10, 14],
  Paladin: [3, 7, 15, 20],
  Rôdeur: [3, 7, 11, 15],
  Roublard: [3, 9, 13, 17],
};

export interface Subclass {
  name: string;
  /** Aptitudes par niveau (seulement pour la sous-classe du SRD). */
  features?: Record<number, string[]>;
}

const SRD: Record<string, Subclass> = {
  Barbare: { name: 'Voie du Berserker', features: { 3: ['Frénésie'], 6: ['Rage aveugle'], 10: ['Représailles'], 14: ['Présence intimidante'] } },
  Barde: { name: 'Collège du Savoir', features: { 3: ['Maîtrises supplémentaires', 'Mots cinglants'], 6: ['Découvertes magiques'], 14: ['Talent hors pair'] } },
  Clerc: { name: 'Domaine de la Vie', features: { 3: ['Disciple de la vie', 'Sorts de domaine', 'Préserver la vie'], 6: ['Guérisseur béni'], 17: ['Guérison suprême'] } },
  Druide: { name: 'Cercle de la Terre', features: { 3: ['Sorts du cercle', 'Aide de la terre'], 6: ['Récupération naturelle'], 10: ['Protection de la nature'], 14: ['Sanctuaire naturel'] } },
  Ensorceleur: { name: 'Sorcellerie draconique', features: { 3: ['Résistance draconique', 'Sorts draconiques'], 6: ['Affinité élémentaire'], 14: ['Ailes de dragon'], 18: ['Compagnon dragon'] } },
  Guerrier: { name: 'Champion', features: { 3: ['Critique amélioré', 'Athlète remarquable'], 7: ['Style de combat supplémentaire'], 10: ['Guerrier héroïque'], 15: ['Critique supérieur'], 18: ['Survivant'] } },
  Magicien: { name: 'Évocateur', features: { 3: ['Savant en évocation', 'Sorts mineurs puissants'], 6: ['Sculpter les sorts'], 10: ['Évocation renforcée'], 14: ['Surcharge'] } },
  Moine: { name: 'Voie de la Paume', features: { 3: ['Technique de la paume'], 6: ['Plénitude du corps'], 11: ['Pas rapides'], 17: ['Paume vibratoire'] } },
  Occultiste: { name: 'Protecteur Fiélon', features: { 3: ['Bénédiction du ténébreux', 'Sorts du Fiélon'], 6: ['Chance du ténébreux'], 10: ['Résistance fiélonne'], 14: ['Traversée des enfers'] } },
  Paladin: { name: 'Serment de Dévotion', features: { 3: ['Arme sacrée', 'Sorts de serment'], 7: ['Aura de dévotion'], 15: ['Châtiment protecteur'], 20: ['Nimbe sacré'] } },
  Rôdeur: { name: 'Chasseur', features: { 3: ['Proie du chasseur', 'Savoir du chasseur'], 7: ['Tactiques défensives'], 11: ['Proie supérieure du chasseur'], 15: ['Défense supérieure du chasseur'] } },
  Roublard: { name: 'Voleur', features: { 3: ['Mains lestes', 'Monte-en-l’air'], 9: ['Furtivité suprême'], 13: ['Utilisation d’objets magiques'], 17: ['Réflexes de voleur'] } },
};

const OTHERS: Record<string, string[]> = {
  Barbare: ['Voie de l’Arbre-Monde', 'Voie du Cœur sauvage', 'Voie du Zélateur'],
  Barde: ['Collège de la Danse', 'Collège de la Séduction', 'Collège de la Vaillance'],
  Clerc: ['Domaine de la Lumière', 'Domaine de la Ruse', 'Domaine de la Guerre'],
  Druide: ['Cercle de la Lune', 'Cercle de la Mer', 'Cercle des Étoiles'],
  Ensorceleur: ['Sorcellerie aberrante', 'Sorcellerie mécanique', 'Magie sauvage'],
  Guerrier: ['Maître de guerre', 'Chevalier occultiste', 'Guerrier psi'],
  Magicien: ['Abjurateur', 'Devin', 'Illusionniste'],
  Moine: ['Voie de l’Ombre', 'Voie des Éléments', 'Voie de la Miséricorde'],
  Occultiste: ['Protecteur Archifée', 'Protecteur Grand Ancien', 'Protecteur Céleste'],
  Paladin: ['Serment de Gloire', 'Serment des Anciens', 'Serment de Vengeance'],
  Rôdeur: ['Maître des bêtes', 'Traqueur des ténèbres', 'Vagabond féerique'],
  Roublard: ['Assassin', 'Escroc arcanique', 'Lame spirituelle'],
};

/** Sous-classes possibles d'une classe (celle du SRD en premier). */
export function subclassesOf(className: string): Subclass[] {
  const srd = SRD[className];
  return srd ? [srd, ...(OTHERS[className] ?? []).map((name) => ({ name }))] : [];
}

/** Niveau où l'on choisit sa sous-classe (3 pour toutes les classes en 2024). */
export const SUBCLASS_LEVEL = 3;

/** Aptitudes de la sous-classe gagnées à ce niveau ([] si aucune). */
export function subclassFeaturesAt(className: string, subclass: string, level: number): string[] {
  if (!subclass || !SUBCLASS_LEVELS[className]?.includes(level)) return [];
  const known = subclassesOf(className).find((x) => x.name === subclass);
  if (known?.features) return known.features[level] ?? [];
  return [`${subclass} : aptitude${level === SUBCLASS_LEVEL ? 's' : ''} de niveau ${level}`];
}

/** Les lignes génériques du tableau de progression remplacées par les aptitudes de la sous-classe. */
export const isGenericSubclassRow = (name: string) =>
  /^Aptitude d[e’]/.test(name) ||
  ['Voie primitive', 'Collège bardique', 'Domaine divin', 'Cercle druidique', 'Origine ensorcelée', 'Archétype martial', 'Tradition arcanique',
    'Tradition monastique', 'Protecteur d’outre-monde', 'Serment sacré', 'Archétype de rôdeur', 'Archétype de roublard'].includes(name);
