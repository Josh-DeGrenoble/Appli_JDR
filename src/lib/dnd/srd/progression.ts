// Progression des classes 2024 (niveaux 1 à 20) : aptitudes gagnées, sorts préparés, sorts mineurs,
// niveaux d'amélioration de caractéristiques, expertise, attaques par action, utilisations des aptitudes.
// Noms courts en français ; le détail se lit dans le manuel (le MJ peut compléter la description).
import { isGenericSubclassRow, subclassFeaturesAt } from './subclasses';

/** Aptitudes par niveau (index 0 = niveau 1), séparées par « ; ». */
const F: Record<string, string[]> = {
  Barbare: ['Rage ; Défense sans armure ; Maîtrise des armes', 'Sens du danger ; Attaque téméraire', 'Voie primitive ; Connaissance primitive', 'Amélioration', 'Attaque supplémentaire ; Déplacement rapide', 'Aptitude de voie', 'Instinct sauvage ; Bond instinctif', 'Amélioration', 'Critique brutal', 'Aptitude de voie', 'Rage implacable', 'Amélioration', 'Critique brutal amélioré', 'Aptitude de voie', 'Rage persistante', 'Amélioration', 'Critique brutal amélioré', 'Puissance indomptable', 'Don épique', 'Champion primitif'],
  Barde: ['Inspiration bardique ; Incantation', 'Expertise ; Touche-à-tout', 'Collège bardique', 'Amélioration', 'Source d’inspiration', 'Aptitude de collège', 'Contre-charme', 'Amélioration', 'Expertise', 'Secrets magiques', '', 'Amélioration', '', 'Aptitude de collège', '', 'Amélioration', '', 'Inspiration supérieure', 'Don épique', 'Mots de création'],
  Clerc: ['Incantation ; Ordre divin', 'Conduit divin', 'Domaine divin', 'Amélioration', 'Incinération des morts-vivants', 'Aptitude de domaine', 'Frappes bénies', 'Amélioration', '', 'Intervention divine', '', 'Amélioration', '', 'Frappes bénies améliorées', '', 'Amélioration', 'Aptitude de domaine', '', 'Don épique', 'Intervention divine supérieure'],
  Druide: ['Incantation ; Druidique ; Ordre primordial', 'Forme sauvage ; Compagnon sauvage', 'Cercle druidique', 'Amélioration', 'Résurgence sauvage', 'Aptitude de cercle', 'Furie élémentaire', 'Amélioration', '', 'Aptitude de cercle', '', 'Amélioration', '', 'Aptitude de cercle', 'Furie élémentaire améliorée', 'Amélioration', '', 'Sorts bestiaux', 'Don épique', 'Archidruide'],
  Ensorceleur: ['Incantation ; Sorcellerie innée', 'Source de magie ; Métamagie', 'Origine ensorcelée', 'Amélioration', 'Restauration ensorcelée', 'Aptitude d’origine', 'Incarnation ensorcelée', 'Amélioration', '', 'Métamagie', '', 'Amélioration', '', 'Aptitude d’origine', '', 'Amélioration', 'Métamagie', 'Aptitude d’origine', 'Don épique', 'Apothéose arcanique'],
  Guerrier: ['Style de combat ; Second souffle ; Maîtrise des armes', 'Fougue ; Esprit tactique', 'Archétype martial', 'Amélioration', 'Attaque supplémentaire ; Changement tactique', 'Amélioration', 'Aptitude d’archétype', 'Amélioration', 'Indomptable ; Maître tacticien', 'Aptitude d’archétype', 'Deux attaques supplémentaires', 'Amélioration', 'Indomptable (2) ; Attaques étudiées', 'Amélioration', 'Aptitude d’archétype', 'Amélioration', 'Fougue (2) ; Indomptable (3)', 'Aptitude d’archétype', 'Don épique', 'Trois attaques supplémentaires'],
  Magicien: ['Incantation ; Restauration arcanique ; Ritualiste', 'Érudit', 'Tradition arcanique', 'Amélioration', 'Mémorisation de sort', 'Aptitude de tradition', '', 'Amélioration', '', 'Aptitude de tradition', '', 'Amélioration', '', 'Aptitude de tradition', '', 'Amélioration', '', 'Maîtrise des sorts', 'Don épique', 'Sorts de prédilection'],
  Moine: ['Arts martiaux ; Défense sans armure', 'Focus du moine ; Déplacement sans armure ; Métabolisme surnaturel', 'Déviation des attaques ; Tradition monastique', 'Amélioration ; Chute ralentie', 'Attaque supplémentaire ; Frappe étourdissante', 'Frappes renforcées ; Aptitude de tradition', 'Dérobade', 'Amélioration', 'Mobilité acrobatique', 'Focus renforcé ; Purification de soi', 'Aptitude de tradition', 'Amélioration', 'Déviation des énergies', 'Survivant discipliné', 'Focus parfait', 'Amélioration', 'Aptitude de tradition', 'Défense supérieure', 'Don épique', 'Corps et esprit'],
  Occultiste: ['Manifestations occultes ; Magie de pacte', 'Astuce magique', 'Protecteur d’outre-monde', 'Amélioration', '', 'Aptitude de protecteur', '', 'Amélioration', 'Contacter un protecteur', 'Aptitude de protecteur', 'Arcanum mystique (niv. 6)', 'Amélioration', 'Arcanum mystique (niv. 7)', 'Aptitude de protecteur', 'Arcanum mystique (niv. 8)', 'Amélioration', 'Arcanum mystique (niv. 9)', '', 'Don épique', 'Maître de l’occulte'],
  Paladin: ['Imposition des mains ; Incantation ; Maîtrise des armes', 'Style de combat ; Châtiment du paladin', 'Conduit divin ; Serment sacré', 'Amélioration', 'Attaque supplémentaire ; Monture fidèle', 'Aura de protection', 'Aptitude de serment', 'Amélioration', 'Abjurer les ennemis', 'Aura de courage', 'Frappes radieuses', 'Amélioration', '', 'Contact purifiant', 'Aptitude de serment', 'Amélioration', '', 'Expansion d’aura', 'Don épique', 'Aptitude de serment'],
  Rôdeur: ['Incantation ; Ennemi juré ; Maîtrise des armes', 'Explorateur habile ; Style de combat', 'Archétype de rôdeur', 'Amélioration', 'Attaque supplémentaire', 'Vagabond', 'Aptitude d’archétype', 'Amélioration', 'Expertise', 'Infatigable', 'Aptitude d’archétype', 'Amélioration', 'Chasseur implacable', 'Voile de la nature', 'Aptitude d’archétype', 'Amélioration', 'Chasseur précis', 'Sens sauvages', 'Don épique', 'Tueur d’ennemis'],
  Roublard: ['Expertise ; Attaque sournoise ; Argot des voleurs ; Maîtrise des armes', 'Ruse', 'Archétype de roublard ; Visée stable', 'Amélioration', 'Frappe rusée ; Esquive instinctive', 'Expertise', 'Dérobade ; Talent fiable', 'Amélioration', 'Aptitude d’archétype', 'Amélioration', 'Frappe rusée améliorée', 'Amélioration', 'Aptitude d’archétype', 'Frappes sournoises', 'Esprit fuyant', 'Amélioration', 'Aptitude d’archétype', 'Insaisissable', 'Don épique', 'Coup de chance'],
};

/** Aptitudes gagnées à un niveau (sans « Amélioration », gérée à part). Avec une sous-classe, ses aptitudes
 *  remplacent les lignes génériques (« Aptitude de voie »…). */
export function featuresAt(className: string, level: number, subclass = ''): string[] {
  const row = F[className]?.[level - 1] ?? '';
  let list = row.split(';').map((x) => x.trim()).filter((x) => x && x !== 'Amélioration');
  const sub = subclassFeaturesAt(className, subclass, level);
  if (sub.length) list = [...list.filter((x) => !isGenericSubclassRow(x)), ...sub];
  if (className === 'Roublard' && level % 2 === 1) list.push(`Attaque sournoise ${Math.ceil(level / 2)}d6`);
  return list;
}

const SEQ = (s: string) => s.split(',').map(Number);
/** Sorts préparés par niveau (2024). */
const PREPARED: Record<string, number[]> = {
  Barde: SEQ('4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22'),
  Clerc: SEQ('4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22'),
  Druide: SEQ('4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22'),
  Ensorceleur: SEQ('2,4,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22'),
  Magicien: SEQ('4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25'),
  Occultiste: SEQ('2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15'),
  Paladin: SEQ('2,3,4,5,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15,15'),
  Rôdeur: SEQ('2,3,4,5,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15,15'),
};
/** Sorts mineurs connus : [niveau 1-3, 4-9, 10+]. */
const CANTRIPS: Record<string, [number, number, number]> = {
  Barde: [2, 3, 4], Clerc: [3, 4, 5], Druide: [2, 3, 4], Ensorceleur: [4, 5, 6], Magicien: [3, 4, 5], Occultiste: [2, 3, 4],
};

/** Nombre de sorts préparés autorisés (0 si la classe n'en a pas). */
export const preparedAt = (className: string, level: number) => PREPARED[className]?.[level - 1] ?? 0;
/** Nombre de sorts mineurs connus. */
export const cantripsAt = (className: string, level: number) => {
  const c = CANTRIPS[className];
  return c ? c[level >= 10 ? 2 : level >= 4 ? 1 : 0] : 0;
};

/** Niveaux d'amélioration de caractéristiques (+2, ou +1/+1, ou un don). */
export function isAsiLevel(className: string, level: number) {
  const extra = className === 'Guerrier' ? [6, 14] : className === 'Roublard' ? [10] : [];
  return [4, 8, 12, 16, ...extra].includes(level);
}

/** Nombre de compétences à passer en expertise à ce niveau. */
export function expertiseAt(className: string, level: number) {
  const t: Record<string, Record<number, number>> = { Barde: { 2: 2, 9: 2 }, Rôdeur: { 2: 1, 9: 2 }, Roublard: { 1: 2, 6: 2 } };
  return t[className]?.[level] ?? 0;
}

/** Attaques par action (Attaque supplémentaire). */
export function attacksAt(className: string, level: number) {
  if (className === 'Guerrier') return level >= 20 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1;
  return ['Barbare', 'Moine', 'Paladin', 'Rôdeur'].includes(className) && level >= 5 ? 2 : 1;
}

/** Utilisations des aptitudes à ressource (max, récupération) au niveau donné ; null si sans utilisations. */
export function featureUses(name: string, level: number, chaMod = 0): { max: number; recharge: 'short' | 'long' } | null {
  const at = (steps: [number, number][]) => steps.filter(([l]) => level >= l).pop()?.[1] ?? 0;
  if (name === 'Rage') return { max: at([[1, 2], [3, 3], [6, 4], [12, 5], [17, 6]]), recharge: 'long' };
  if (name === 'Second souffle') return { max: at([[1, 2], [4, 3], [10, 4]]), recharge: 'short' };
  if (name === 'Fougue') return { max: level >= 17 ? 2 : 1, recharge: 'short' };
  if (name === 'Inspiration bardique') return { max: Math.max(1, chaMod), recharge: level >= 5 ? 'short' : 'long' };
  if (name === 'Conduit divin') return { max: at([[2, 2], [6, 3], [18, 4]]), recharge: 'short' };
  if (name === 'Forme sauvage') return { max: at([[2, 2], [6, 3], [17, 4]]), recharge: 'short' };
  if (name.startsWith('Focus du moine')) return { max: level, recharge: 'short' };
  if (name === 'Source de magie') return { max: level, recharge: 'long' };
  if (name === 'Imposition des mains') return { max: 5 * level, recharge: 'long' };
  if (name === 'Chanceux') return { max: 2 + Math.floor((Math.min(20, Math.max(1, level)) - 1) / 4), recharge: 'long' };
  if (name === 'Indomptable') return { max: at([[9, 1], [13, 2], [17, 3]]), recharge: 'long' };
  return null;
}
