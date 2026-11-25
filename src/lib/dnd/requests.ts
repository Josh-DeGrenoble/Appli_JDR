// Test demandé par le MJ à plusieurs persos (« tout le monde, Perception DD 15 ») : la demande est dans
// campaign.settings.request ; chaque réponse est un jet ordinaire de l'historique, marqué ⟦demande:perso⟧ dans son
// libellé (marque cachée à l'affichage). Le MJ voit qui a réussi. Avec les vrais dés, le joueur tape son total.
import type { Ability } from './data';
import { ABILITIES, SKILLS } from './data';
import type { DndSheet } from './sheet';
import type { D20Kind } from './advantage';
import { modOf, saveBonus, skillBonus } from './rules';
import type { Roll } from '../types';

export interface CheckRequest {
  id: string;
  /** 'skill' : compétence (`key`), 'save' : sauvegarde (`key` = caractéristique), 'ability' : test de caractéristique. */
  kind: 'skill' | 'save' | 'ability';
  key: string;
  /** Degré de difficulté (affiché au MJ, et aux joueurs si `showDc`). */
  dc?: number;
  showDc?: boolean;
  /** Persos concernés. */
  targets: string[];
  /** Jets cachés aux autres joueurs. */
  secret?: boolean;
}

/** Nom du test : « Perception », « Sauvegarde de DEX », « Force ». */
export function requestLabel(r: Pick<CheckRequest, 'kind' | 'key'>) {
  if (r.kind === 'skill') return SKILLS.find((s) => s.key === r.key)?.label ?? r.key;
  const ab = ABILITIES.find((a) => a.key === r.key);
  return r.kind === 'save' ? `Sauvegarde de ${ab?.short ?? r.key}` : ab?.label ?? r.key;
}

/** Bonus du perso pour ce test, et type de jet d20 (pour l'avantage automatique). */
export function requestBonus(s: DndSheet, r: CheckRequest): { bonus: number; kind: D20Kind; ability?: Ability } {
  if (r.kind === 'skill') return { bonus: skillBonus(s, r.key), kind: 'check', ability: SKILLS.find((k) => k.key === r.key)?.ability };
  if (r.kind === 'save') return { bonus: saveBonus(s, r.key as Ability), kind: 'save', ability: r.key as Ability };
  return { bonus: modOf(s, r.key as Ability), kind: 'check', ability: r.key as Ability };
}

/** Marque d'une réponse dans le libellé d'un jet. */
export const requestTag = (reqId: string, charId: string) => `⟦${reqId}:${charId}⟧ `;

/** Libellé sans marque (affichage). */
export const cleanLabel = (label: string) => label.replace(/⟦[^⟧]*⟧\s*/g, '');

/** Réponses reçues : perso → total (le premier jet compte). */
export function requestResults(rolls: Roll[], reqId: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of [...rolls].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const m = /⟦([^:⟧]+):([^⟧]+)⟧/.exec(r.label);
    if (m && m[1] === reqId && !out.has(m[2])) out.set(m[2], r.total);
  }
  return out;
}
