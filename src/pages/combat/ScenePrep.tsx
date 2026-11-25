// MJ : préparer un plan à l'avance (invisible des joueurs) : nom, décor, portes, image, taille, brouillard, monstres.
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { Modal } from '../../components/ui';
import type { Combatant } from '../../lib/dnd/combat';
import { BattleMap } from './BattleMap';
import { CombatSetupDialog } from './CombatSetupDialog';
import type { CombatCtx } from './useCombat';
import { useSceneDraft } from './useSceneDraft';

export function ScenePrep({ cx, view, sceneId, onClose }: { cx: CombatCtx; view: CampaignView; sceneId: string; onClose: () => void }) {
  const d = useSceneDraft(cx, view.data!.campaign.id, sceneId);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Combatant | null>(null);
  if (!d.scene) return null;
  const tokens = d.map.combat.combatants;

  return (
    <Modal title={`Préparer : ${d.scene.name}`} onClose={onClose}>
      <p className="muted small">🙈 Les joueurs ne voient pas ce plan. Quand il est prêt : « Ouvrir » dans les plans enregistrés.</p>
      <input id="prep-name" defaultValue={d.scene.name} aria-label="Nom du plan" onBlur={(e) => e.target.value.trim() && e.target.value !== d.scene!.name && d.rename(e.target.value.trim())} />
      <BattleMap
        cx={d.map}
        tokens={tokens}
        fog={null}
        campaignId={view.data!.campaign.id}
        actor={null}
        movable={() => true}
        speedOf={() => 9}
        range={null}
        area={null}
        aiming={false}
        onAim={() => undefined}
        targetState={() => undefined}
        targeted={picked ? [picked.id] : []}
        onTokenTouch={(x) => setPicked(picked?.id === x.id ? null : x)}
      />
      <div className="row gap">
        <button className="btn grow" onClick={() => setAdding(true)}>
          + Monstres
        </button>
        {picked && (
          <button className="btn danger grow" onClick={() => (d.removeToken(picked.id), setPicked(null))}>
            Retirer {picked.name}
          </button>
        )}
      </div>
      <p className="muted small">{tokens.length} monstre{tokens.length > 1 ? 's' : ''} placé{tokens.length > 1 ? 's' : ''}. Les persos des joueurs arriveront avec le groupe.</p>
      <button className="btn primary" onClick={onClose}>
        ✓ Terminé
      </button>
      {adding && <CombatSetupDialog cx={{ ...cx, combat: d.map.combat, addMonsters: d.addMonsters }} view={view} monstersOnly onClose={() => setAdding(false)} />}
    </Modal>
  );
}
