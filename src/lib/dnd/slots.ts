// Emplacements des objets portés (règles 2024, Guide du MJ : une seule armure, un seul bouclier, une seule paire de bottes,
// de gants, de bracelets, une cape, une ceinture, un couvre-chef, une amulette, une paire de lunettes ; 2 anneaux).
// Les armes n'ont pas d'emplacement (on en garde plusieurs prêtes), mais une arme à deux mains et un bouclier ne vont pas
// ensemble. = SQL _item_slot, _two_handed et déclencheur items_slot (06_equipement.sql).
import { effectsOf } from './gear';
import { searchKey as norm } from '../text';

export type Slot = 'armure' | 'bouclier' | 'tete' | 'yeux' | 'cou' | 'cape' | 'ceinture' | 'gants' | 'bracelets' | 'bottes' | 'anneau';

export interface SlotInfo {
  key: Slot;
  label: string;
  icon: string;
  /** Nombre d'objets portés en même temps à cet emplacement. */
  max: number;
}

export const SLOTS: SlotInfo[] = [
  { key: 'armure', label: 'Armure', icon: '🦺', max: 1 },
  { key: 'bouclier', label: 'Bouclier', icon: '🛡️', max: 1 },
  { key: 'tete', label: 'Tête', icon: '🎩', max: 1 },
  { key: 'yeux', label: 'Yeux', icon: '👓', max: 1 },
  { key: 'cou', label: 'Cou', icon: '📿', max: 1 },
  { key: 'cape', label: 'Cape', icon: '🧥', max: 1 },
  { key: 'ceinture', label: 'Ceinture', icon: '🎗️', max: 1 },
  { key: 'gants', label: 'Mains', icon: '🧤', max: 1 },
  { key: 'bracelets', label: 'Poignets', icon: '⛓️', max: 1 },
  { key: 'bottes', label: 'Pieds', icon: '🥾', max: 1 },
  { key: 'anneau', label: 'Anneaux', icon: '💍', max: 2 },
];

export const slotInfo = (k: Slot) => SLOTS.find((s) => s.key === k)!;

/** Début du nom → emplacement (sans accents, en minuscules). Recopié tel quel en SQL. */
export const SLOT_PATTERNS: [Slot, string][] = [
  ['armure', '^(armure|cotte|chemise de mailles|cuirasse|demi-plate|harnois|brigandine|clibanion|broigne)'],
  ['bouclier', '^(bouclier|ecu|pavois|targe|rondache)'],
  ['tete', '^(chapeau|casque|heaume|bandeau|diademe|couronne|serre-tete|capuche|bonnet|coiffe|tiare|cerclet)'],
  ['yeux', '^(lunettes|lentilles|yeux)'],
  ['cou', '^(amulette|collier|medaillon|pendentif|periapte|broche|talisman)'],
  ['cape', '^(cape|manteau|mante|houppelande)'],
  ['ceinture', '^(ceinture|ceinturon)'],
  ['gants', '^(gants|gantelets|mitaines)'],
  ['bracelets', '^(bracelets|brassards|bracelet|brassard)'],
  ['bottes', '^(bottes|chaussons|sandales|chausses|souliers|bottines)'],
  ['anneau', '^(anneau|bague|chevaliere)'],
];

/** Armes à deux mains (règles 2024 : propriété « à deux mains »). Recopié tel quel en SQL (_two_handed). */
export const TWO_HANDED_PATTERN = '^(coutille|hallebarde|pique|maillet|massue|arc court|arc long|arbalete legere|arbalete lourde)|a deux mains';


/** Emplacement d'un objet (armure et bouclier de la bibliothèque d'après leurs effets, sinon d'après le nom). */
export function slotOf(name: string): Slot | null {
  const e = effectsOf(name);
  if (e?.armor) return 'armure';
  if (e?.shield) return 'bouclier';
  if (e?.weapon) return null;
  const n = norm(name);
  return SLOT_PATTERNS.find(([, re]) => new RegExp(re).test(n))?.[0] ?? null;
}

/** Arme à deux mains (d'après le nom, objets de la bibliothèque ou maison). */
export const isTwoHanded = (name: string) => new RegExp(TWO_HANDED_PATTERN).test(norm(name));

/**
 * Objets à retirer pour équiper `name` : ceux du même emplacement au-delà de la limite (le plus ancien d'abord).
 * `worn` : objets déjà équipés du perso (sans celui qu'on équipe).
 */
export function slotConflicts<T extends { id: string; name: string }>(name: string, worn: T[]): T[] {
  const slot = slotOf(name);
  // Arme à deux mains ↔ bouclier : l'un retire l'autre
  if (isTwoHanded(name)) return worn.filter((w) => slotOf(w.name) === 'bouclier');
  const hands = slot === 'bouclier' ? worn.filter((w) => isTwoHanded(w.name)) : [];
  if (!slot) return [];
  const same = worn.filter((w) => slotOf(w.name) === slot);
  return [...hands, ...same.slice(0, Math.max(0, same.length - slotInfo(slot).max + 1))];
}

/** Message d'erreur quand l'emplacement est déjà pris (mode démo = SQL). */
export function checkSlot(name: string, worn: { id: string; name: string }[]) {
  const c = slotConflicts(name, worn);
  if (c.some((x) => isTwoHanded(x.name) || isTwoHanded(name))) throw new Error(`Arme à deux mains et bouclier ne vont pas ensemble (${c.map((x) => x.name).join(', ')}) : retire-le d’abord`);
  if (c.length) throw new Error(`Emplacement ${slotInfo(slotOf(name)!).label.toLowerCase()} déjà pris (${c.map((x) => x.name).join(', ')}) : retire-le d’abord`);
}
