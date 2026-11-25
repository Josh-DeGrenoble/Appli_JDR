// Accès à la bibliothèque de sorts : conversion en objets Spell, recherche par nom, niveau et classe.
import type { Spell } from '../sheet';
import { searchKey as norm } from '../../text';
import { SPELLS_HIGH } from './spellsHigh';
import { spellCombatFields } from './spellMeta';
import { SPELLS_LOW, type SpellRow } from './spellsLow';

export interface LibrarySpell {
  name: string;
  level: number;
  classes: string[];
  concentration: boolean;
  ritual: boolean;
  damage: string;
  notes: string;
}

const CLASS_CODES: Record<string, string> = {
  B: 'Barde', C: 'Clerc', D: 'Druide', E: 'Ensorceleur', M: 'Magicien', O: 'Occultiste', P: 'Paladin', R: 'Rôdeur',
};

const toSpell = ([name, level, classes, flags, damage, notes]: SpellRow): LibrarySpell => ({
  name,
  level,
  classes: classes.split('').map((c) => CLASS_CODES[c]).filter(Boolean),
  concentration: flags.includes('C'),
  ritual: flags.includes('R'),
  damage,
  notes,
});

/** Tous les sorts de la bibliothèque, triés par niveau puis par nom. */
export const SPELL_LIBRARY: LibrarySpell[] = [...SPELLS_LOW, ...SPELLS_HIGH]
  .map(toSpell)
  .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'fr'));

/** Enlève accents et majuscules pour la recherche. */

/** Recherche : texte (nom), niveau (null = tous) et classe ('' = toutes). */
export function searchSpells(query: string, level: number | null, className: string) {
  const q = norm(query.trim());
  return SPELL_LIBRARY.filter(
    (s) => (!q || norm(s.name).includes(q)) && (level === null || s.level === level) && (!className || s.classes.includes(className))
  );
}

/** Copie un sort de la bibliothèque dans la fiche d'un personnage. */
export function librarySpellToSheet(s: LibrarySpell, id: string): Spell {
  return {
    id,
    name: s.name,
    level: s.level,
    prepared: s.level === 0, // les sorts mineurs sont toujours disponibles ; le joueur prépare les autres
    ritual: s.ritual,
    concentration: s.concentration,
    damage: s.damage,
    notes: s.notes,
    ...spellCombatFields(s.name),
  };
}

export const SRD_ATTRIBUTION =
  'Sorts issus du System Reference Document 5.2.1 (« SRD 5.2.1 ») de Wizards of the Coast LLC, sous licence Creative Commons Attribution 4.0 (CC-BY-4.0). Résumés rédigés pour l’appli.';
