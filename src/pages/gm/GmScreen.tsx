// Écran du MJ (onglet Persos du MJ) : tout sur une page. Combat en cours (round, tour, ordre d'initiative avec PV,
// « Tour suivant »), test demandé au groupe, table des persos (PV, CA, avantage) et distribution en direct (PV, objets, états, niveaux…).
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { navigate } from '../../router';
import { Characters } from '../Characters';
import { CombatRow } from '../combat/CombatRow';
import { CombatantDialog } from '../combat/CombatantDialog';
import { useCombat } from '../combat/useCombat';
import { Distribute } from './Distribute';
import { GroupCheck } from './GroupCheck';

export function GmScreen({ view }: { view: CampaignView }) {
  const cx = useCombat(view);
  const [open, setOpen] = useState<string | null>(null);
  const { combat, order, current } = cx;
  const fighting = combat.active || combat.prep;

  return (
    <div className="stack">
      {fighting && (
        <section className="card stack-sm gm-combat">
          <div className="row between">
            <span>
              <strong>{combat.active ? `⚔️ Round ${combat.round}` : '⚔️ Préparation'}</strong>
              {current && <span className="muted"> · tour de {current.name}</span>}
            </span>
            <button className="btn small ghost" onClick={() => navigate(`/c/${view.data!.campaign.id}/combat`)}>
              🗺️ Carte
            </button>
          </div>
          <ol className="init-list compact">
            {order.map((x) => (
              <CombatRow key={x.id} cx={cx} view={view} x={x} active={current?.id === x.id} actor={null} targeted={false} onTouch={() => setOpen(x.id)} />
            ))}
          </ol>
          {combat.active && (
            <div className="row gap">
              <button className="btn" onClick={cx.previous} aria-label="Tour précédent">
                ◀
              </button>
              <button className="btn primary grow" onClick={cx.next}>
                Tour suivant ▶
              </button>
            </div>
          )}
          {combat.prep && !combat.active && <p className="muted small">Les joueurs lancent leur initiative ; démarre le combat depuis la Carte.</p>}
        </section>
      )}
      <GroupCheck view={view} />
      <Characters view={view} />
      <Distribute view={view} />
      {open && <CombatantDialog cx={cx} view={view} id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
