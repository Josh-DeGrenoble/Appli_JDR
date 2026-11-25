// MJ : plans enregistrés (salles, donjon, ville…). Enregistrer la carte affichée, en ouvrir une autre, supprimer.
// Les plans favoris du lieu actuel (⭐) passent en premier.
import { useState } from 'react';
import { ConfirmButton } from '../../components/ui';
import type { CombatCtx } from './useCombat';
import type { CampaignView } from '../../data/useCampaign';
import { useScenes } from './useScenes';
import { ScenePrep } from './ScenePrep';
import { blankScene } from './useSceneDraft';
import { favoritesFirst } from '../../lib/dnd/places';

export function ScenesPanel({ cx, view, campaignId }: { cx: CombatCtx; view: CampaignView; campaignId: string }) {
  const sc = useScenes(cx, campaignId);
  const placeId = view.data!.campaign.settings.place?.id;
  const here = (view.data!.secrets?.places ?? []).find((p) => p.id === placeId);
  // Plans déjà montrés : 👁️ les joueurs peuvent les revoir, 🙈 non
  const archived = new Map((view.data!.campaign.settings.maps ?? []).map((m) => [m.id, m.shared]));
  const [prep, setPrep] = useState<string | null>(null);
  /** Crée un plan vide en préparation (secret) et l'ouvre dans l'éditeur. */
  const prepareNew = () => {
    const s = blankScene();
    cx.mutate((_c, sec) => ({ secrets: { ...sec, scenes: [...(sec.scenes ?? []), s] } })).then(() => setPrep(s.id));
  };
  const [name, setName] = useState(cx.combat.map?.name ?? '');
  const busy = cx.combat.active;

  return (
    <div className="stack-xs scenes">
      <span className="label">Plans enregistrés</span>
      <div className="row gap">
        <input id="scene-name" className="grow" placeholder="Nom du plan (ex. Crypte)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nom du plan" />
        <button className="btn small" disabled={!name.trim()} onClick={() => sc.save(name.trim())}>
          💾 Enregistrer
        </button>
      </div>
      {sc.scenes.length === 0 && <p className="muted small">Enregistre la carte (décor, plan, monstres placés) pour la rouvrir plus tard.</p>}
      {archived.size > 0 && <p className="muted small">« Ouvrir » = carte active pour tous. 👁️ : les joueurs peuvent revoir ce plan déjà montré (🙈 : non).</p>}
      {favoritesFirst(sc.scenes, (s) => s.id, here?.scenes).map(({ item: s, fav }) => (
        <div key={s.id} className={`row between scene-row ${fav ? 'fav' : ''}`}>
          <span className="ellipsis">
            {fav ? '⭐' : '🗺️'} <strong>{s.name}</strong> <span className="muted small">{s.combatants.length} monstre{s.combatants.length > 1 ? 's' : ''}</span>
            {cx.combat.map?.sceneId === s.id && <span className="pill">affiché</span>}
          </span>
          <span className="row gap">
            {archived.has(s.id) && (
              <button className={`icon-btn ${archived.get(s.id) ? '' : 'off'}`} onClick={() => sc.share(s.id, !archived.get(s.id))}
                aria-label={`${archived.get(s.id) ? 'Cacher aux joueurs' : 'Laisser revoir'} ${s.name}`} title={archived.get(s.id) ? 'Les joueurs peuvent la revoir' : 'Cachée aux joueurs'}>
                {archived.get(s.id) ? '👁️' : '🙈'}
              </button>
            )}
            <button className="icon-btn" onClick={() => setPrep(s.id)} aria-label={`Préparer ${s.name}`}>
              ✏️
            </button>
            <button className="btn small" disabled={busy} onClick={() => (sc.open(s), setName(s.name))} aria-label={`Ouvrir ${s.name}`}>
              Ouvrir
            </button>
            <ConfirmButton className="icon-btn" confirmLabel="✕ ?" onConfirm={() => sc.remove(s)}>
              🗑️
            </ConfirmButton>
          </span>
        </div>
      ))}
      <button className="btn small" onClick={prepareNew}>
        🛠️ Préparer un nouveau plan (caché aux joueurs)
      </button>
      {!busy && (
        <ConfirmButton className="btn small ghost" confirmLabel="Nouvelle carte vide ?" onConfirm={() => (sc.blank(), setName(''))}>
          ➕ Vider la carte affichée
        </ConfirmButton>
      )}
      {busy && <p className="muted small">Termine le combat pour changer de plan.</p>}
      {prep && <ScenePrep cx={cx} view={view} sceneId={prep} onClose={() => setPrep(null)} />}
    </div>
  );
}
