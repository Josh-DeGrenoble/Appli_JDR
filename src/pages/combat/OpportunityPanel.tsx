// Attaques d'opportunité en attente : un ennemi a quitté le contact. Celui qui contrôle l'attaquant (joueur, ou MJ
// pour ses monstres/PNJ) choisit une attaque au contact (payée avec sa réaction) ou ignore.
import { useState } from 'react';
import type { Combatant, Opportunity } from '../../lib/dnd/combat';
import { opportunityAttacks, type CombatAction } from '../../lib/dnd/combatActions';

export interface OpportunityChoice {
  r: Opportunity;
  by: Combatant;
  target: Combatant;
  attacks: CombatAction[];
}

interface Props {
  list: OpportunityChoice[];
  onAttack: (c: OpportunityChoice, a: CombatAction) => Promise<void>;
  onIgnore: (c: OpportunityChoice) => void;
}

/** Construit la liste des choix (attaques au contact de chaque attaquant). */
export const choicesOf = (reactions: Opportunity[], order: Combatant[], actionsOf: (x: Combatant) => CombatAction[], mine: (x: Combatant) => boolean) =>
  reactions
    .map((r) => ({ r, by: order.find((x) => x.id === r.by), target: order.find((x) => x.id === r.target) }))
    .filter((c): c is { r: Opportunity; by: Combatant; target: Combatant } => !!c.by && !!c.target && mine(c.by))
    .map((c) => ({ ...c, attacks: opportunityAttacks(actionsOf(c.by)) }));

export function OpportunityPanel({ list, onAttack, onIgnore }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!list.length) return null;
  return (
    <div className="stack-sm">
      {list.map((c) => (
        <section key={c.r.id} className="card stack-xs opportunity" role="alert">
          <strong>
            ⚡ {c.target.name} s’éloigne de {c.by.name} !
          </strong>
          <span className="muted small">Attaque d’opportunité : utilise la réaction de {c.by.name}.</span>
          <div className="row gap wrap">
            {c.attacks.map((a) => (
              <button
                key={a.id}
                className="btn primary small"
                disabled={!!busy}
                onClick={() => {
                  setBusy(c.r.id);
                  onAttack(c, a).finally(() => setBusy(null));
                }}
              >
                ⚔️ {a.name}
              </button>
            ))}
            {!c.attacks.length && <span className="muted small">Aucune attaque au contact (à ajouter dans sa fiche).</span>}
            <button className="btn ghost small" disabled={!!busy} onClick={() => onIgnore(c)}>
              Ignorer
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
