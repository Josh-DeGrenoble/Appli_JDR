// Panneau d'actions de l'onglet Combat (joueur, ou MJ pour un monstre/PNJ) : économie du tour, liste des actions
// (coût, portée, utilisations), niveau d'emplacement pour les sorts, mode de jet, bouton pour lancer.
import { useState } from 'react';
import { FRESH_ECONOMY, type Combatant, type CombatState } from '../../lib/dnd/combat';
import { seeEachOther } from '../../lib/dnd/sight';
import { canAfford, costLabel, remaining, type CombatAction } from '../../lib/dnd/combatActions';
import type { RollMode } from '../../lib/dnd/data';
import type { AutoMode } from '../../lib/dnd/advantage';
import { fmtDistance, fmtRange, inRange, movementLeft, posOf } from '../../lib/dnd/grid';
import { fmtShape } from '../../lib/dnd/area';
import { useToast } from '../../components/Toast';

const COST_SHORT = { action: 'A', bonus: 'B', reaction: 'R', free: '—' } as const;

/**
 * Une cible est-elle valable pour l'action ? Portée, type de cible, ligne de vue (un mur entre les deux bloque),
 * et pour une zone d'effet : prise dans la zone visée.
 */
export function targetable(action: CombatAction, actor: Combatant, t: Combatant, area?: Set<string> | null, combat?: Pick<CombatState, 'map'>) {
  if (action.shape) return t.status !== 'vaincu' && (!area || area.has(`${posOf(t).x},${posOf(t).y}`));
  if (action.targeting === 'none') return false;
  if (action.targeting === 'self') return t.id === actor.id;
  if (action.targeting === 'enemy' && t.id === actor.id) return false;
  if (t.status === 'vaincu') return false;
  return inRange(actor, t, action.range) && (!combat || t.id === actor.id || seeEachOther(combat, actor, t));
}

interface Props {
  title: string;
  actor: Combatant;
  actions: CombatAction[];
  attacksPerAction: number;
  speed: number;
  isTurn: boolean;
  others: Combatant[];
  selected: CombatAction | null;
  targets: string[];
  /** Zone d'effet visée (action à zone sélectionnée). */
  area: Set<string> | null;
  /** État du combat (carte : ligne de vue). */
  combat: CombatState;
  onSelect: (a: CombatAction | null) => void;
  onLaunch: (a: CombatAction, mode: RollMode, slot?: number) => Promise<void>;
  /** Avantage/désavantage automatique pour l'attaque choisie (états, cible, MJ). */
  auto: AutoMode | null;
  /** Le MJ peut forcer le mode (monstres, PNJ). */
  canForce: boolean;
}

export function ActionsPanel({ title, actor, actions, attacksPerAction, speed, isTurn, others, selected, targets, area, combat, onSelect, onLaunch, auto, canForce }: Props) {
  const toast = useToast();
  const [mode, setMode] = useState<RollMode | 'auto'>('auto');
  const finalMode: RollMode = mode === 'auto' ? auto?.mode ?? 'normal' : mode;
  const [slot, setSlot] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [showStd, setShowStd] = useState(false);
  const used = actor.used ?? FRESH_ECONOMY;
  const left = remaining(used, attacksPerAction);
  const chosen = others.filter((o) => targets.includes(o.id));

  /** Jouable maintenant : tour (sauf réaction), coût payable, compatible avec les cibles déjà choisies. */
  const playable = (a: CombatAction) =>
    (isTurn || a.cost === 'reaction') && canAfford(a, used, attacksPerAction) && chosen.every((t) => targetable(a, actor, t, a.id === selected?.id ? area : null, combat));
  const needTargets = selected && !selected.shape && selected.targeting !== 'none' && selected.targeting !== 'self';
  const ready = selected && playable(selected) && (selected.shape ? !!area : !needTargets || chosen.length > 0);
  const slots = selected?.slotLevels ?? [];
  const chosenSlot = slot && slots.includes(slot) ? slot : slots[0];

  const launch = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await onLaunch(selected, finalMode, chosenSlot);
      setMode('auto');
      setSlot(undefined);
      onSelect(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const row = (a: CombatAction) => (
    <li key={a.id}>
      <button className={`action-row ${selected?.id === a.id ? 'on' : ''} ${playable(a) ? '' : 'off'}`} onClick={() => onSelect(selected?.id === a.id ? null : a)} aria-pressed={selected?.id === a.id}>
        <span className={`cost cost-${a.cost}`} title={costLabel(a.cost)}>{COST_SHORT[a.cost]}</span>
        <span className="list-main">
          <strong className="ellipsis">{a.name}</strong>
          <span className="muted small ellipsis">{a.summary}</span>
        </span>
        <span className="action-meta">
          <span>{fmtRange(a.range)}</span>
          {a.shape && <span>{fmtShape(a.shape)}</span>}
          {a.uses && <span className={a.uses.left ? '' : 'empty'}>{a.uses.left}/{a.uses.max}</span>}
        </span>
      </button>
    </li>
  );
  const own = actions.filter((a) => a.source !== 'standard');
  const std = actions.filter((a) => a.source === 'standard');

  return (
    <section className={`card stack-sm actions-panel ${isTurn ? 'my-turn' : ''}`}>
      <div className="row between">
        <h3 className="section-title">{title}</h3>
        {!isTurn && <span className="muted small">réactions seulement</span>}
      </div>
      <div className="economy">
        <span className={left.action ? 'on' : ''}>Action {left.action}</span>
        <span className={left.bonus ? 'on' : ''}>Bonus {left.bonus}</span>
        <span className={left.reaction ? 'on' : ''}>Réaction {left.reaction}</span>
        {attacksPerAction > 1 && <span className={left.attacks ? 'on' : ''}>Attaques {left.attacks}/{attacksPerAction}</span>}
        <span className={movementLeft(speed, used) > 0 ? 'on' : ''}>Déplacement {fmtDistance(movementLeft(speed, used)).replace('contact', '1,5 m')}</span>
      </div>
      {own.length === 0 && <p className="muted small">Aucune action propre : ajoute des attaques sur la fiche, ou demande au MJ sorts et capacités.</p>}
      <ul className="action-list">{own.map(row)}</ul>
      {std.length > 0 && (
        <>
          <button className="link" onClick={() => setShowStd((v) => !v)} aria-expanded={showStd}>
            {showStd ? '▲' : '▼'} Actions de base (Foncer, Esquiver…)
          </button>
          {showStd && <ul className="action-list">{std.map(row)}</ul>}
        </>
      )}
      {selected && (
        <div className="stack-sm launch-box">
          {slots.length > 1 && (
            <div className="chips" aria-label="Niveau d’emplacement">
              {slots.map((l) => (
                <button key={l} className={`chip ${chosenSlot === l ? 'on' : ''}`} onClick={() => setSlot(l)}>
                  Niv. {l}
                  {selected.upcast && l > (selected.spellLevel ?? 0) ? ` (+${l - (selected.spellLevel ?? 0)}×${selected.upcast})` : ''}
                </button>
              ))}
            </div>
          )}
          {selected.effect === 'attack' && (
            <p className={`small auto-mode ${finalMode}`}>
              {finalMode === 'adv' ? '🎯 Avantage' : finalMode === 'dis' ? '⚠️ Désavantage' : '🎲 Jet normal'}
              {mode === 'auto' && auto?.reasons.length ? ` : ${auto.reasons.join(', ')}` : mode !== 'auto' ? ' (choisi par le MJ)' : ''}
            </p>
          )}
          {selected.effect === 'attack' && canForce && (
            <div className="segmented small" aria-label="Mode du jet">
              {(['auto', 'dis', 'normal', 'adv'] as (RollMode | 'auto')[]).map((m) => (
                <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                  {m === 'auto' ? 'Auto' : m === 'dis' ? 'Désav.' : m === 'adv' ? 'Avantage' : 'Normal'}
                </button>
              ))}
            </div>
          )}
          <p className="muted small">
            {selected.shape
              ? area
                ? `Zone (${fmtShape(selected.shape)}) : ${chosen.length ? chosen.map((c) => c.name).join(', ') : 'personne dedans'}. Touche un nom pour le retirer.`
                : `Zone ${fmtShape(selected.shape)} : touche la case visée sur la carte.`
              : needTargets
              ? chosen.length
                ? `Cible${chosen.length > 1 ? 's' : ''} : ${chosen.map((c) => c.name).join(', ')}`
                : selected.multi
                  ? 'Choisis une ou plusieurs cibles en surbrillance (carte ou liste).'
                  : 'Choisis une cible en surbrillance (carte ou liste).'
              : selected.targeting === 'self'
                ? 'Sur toi-même.'
                : 'Sans cible.'}
          </p>
          <button className="btn primary big" disabled={!ready || busy} onClick={launch}>
            {busy ? '…' : `⚔️ Lancer ${selected.name}`}
          </button>
        </div>
      )}
    </section>
  );
}
