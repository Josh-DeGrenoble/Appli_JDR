// Avantage / désavantage automatiques (règles 2024) : états du lanceur, états de la cible, avantage donné par le MJ.
// Un avantage et un désavantage s'annulent. Tests : tests/advantage.test.ts.
import type { Ability, RollMode } from './data';

export type D20Kind = 'attack' | 'check' | 'save' | 'initiative';

export interface AutoMode {
  mode: RollMode;
  /** Raisons lisibles : « Empoisonné (désavantage) », « cible à terre (avantage) ». */
  reasons: string[];
}

export interface AutoModeInput {
  kind: D20Kind;
  /** Caractéristique (sauvegarde ou test). */
  ability?: Ability;
  /** États de celui qui lance. */
  self: string[];
  /** Avantage ou désavantage donné par le MJ. */
  grant?: RollMode | null;
  /** États de la cible (attaques). */
  target?: string[];
  /** Attaque au contact (1,5 m) : compte pour « à terre ». */
  melee?: boolean;
  /** Le lanceur a été aidé (action Aider d'un allié). */
  helped?: boolean;
  /** La cible esquive (action Esquiver). */
  targetDodging?: boolean;
}

/** Mode du d20 et ses raisons. */
export function autoMode(i: AutoModeInput): AutoMode {
  const adv: string[] = [];
  const dis: string[] = [];
  const has = (k: string) => i.self.includes(k);
  const tgt = (k: string) => (i.target ?? []).includes(k);

  if (i.grant === 'adv') adv.push('donné par le MJ');
  if (i.grant === 'dis') dis.push('donné par le MJ');

  if (i.kind === 'attack') {
    if (has('poisoned')) dis.push('empoisonné');
    if (has('frightened')) dis.push('effrayé');
    if (has('blinded')) dis.push('aveuglé');
    if (has('prone')) dis.push('à terre');
    if (has('restrained')) dis.push('entravé');
    if (has('grappled')) dis.push('agrippé');
    if (has('invisible')) adv.push('invisible');
    if (i.helped) adv.push('aidé par un allié');
    if (i.targetDodging) dis.push('la cible esquive');
    if (i.target) {
      for (const [k, l] of [['blinded', 'cible aveuglée'], ['paralyzed', 'cible paralysée'], ['stunned', 'cible étourdie'], ['unconscious', 'cible inconsciente'], ['restrained', 'cible entravée'], ['petrified', 'cible pétrifiée']] as const)
        if (tgt(k)) adv.push(l);
      if (tgt('prone')) (i.melee ? adv : dis).push(i.melee ? 'cible à terre, au contact' : 'cible à terre, à distance');
      if (tgt('invisible')) dis.push('cible invisible');
    }
  } else if (i.kind === 'check') {
    if (has('poisoned')) dis.push('empoisonné');
    if (has('frightened')) dis.push('effrayé');
  } else if (i.kind === 'save') {
    if (i.ability === 'dex' && has('restrained')) dis.push('entravé');
  } else if (i.kind === 'initiative') {
    if (has('invisible')) adv.push('invisible');
    if (has('incapacitated')) dis.push('neutralisé');
  }

  const mode: RollMode = adv.length && !dis.length ? 'adv' : dis.length && !adv.length ? 'dis' : 'normal';
  const reasons = [...adv.map((r) => `${r} (avantage)`), ...dis.map((r) => `${r} (désavantage)`)];
  if (adv.length && dis.length) reasons.push('ils s’annulent');
  return { mode, reasons };
}

/** Suffixe de libellé : « (avantage : empoisonné…) ». */
export function modeTag(a: AutoMode): string {
  if (a.mode === 'normal') return a.reasons.length ? ' (avantage et désavantage s’annulent)' : '';
  return ` (${a.mode === 'adv' ? 'avantage' : 'désavantage'} : ${a.reasons.map((r) => r.replace(/ \((avantage|désavantage)\)$/, '')).join(', ')})`;
}
