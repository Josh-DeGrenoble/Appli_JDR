// Joueur : réafficher une carte déjà passée dans l'aventure (archive campaign.settings.maps, plans que le MJ laisse
// revoir). Lecture seule : décor et image, sans pions. La carte active reste celle choisie par le MJ.
import type { CampaignView } from '../../data/useCampaign';
import { normalizeCombat } from '../../lib/dnd/combat';
import { viewableMaps, type PastMap } from '../../lib/dnd/pastMaps';
import { BattleMap } from './BattleMap';
import type { MapCtx } from './useCombat';

const noop = async () => undefined;

/** Puces « Carte actuelle » + cartes passées que le joueur peut revoir (rien si aucune). */
export function PastMapsBar({ view, viewing, onPick }: { view: CampaignView; viewing: string | null; onPick: (id: string | null) => void }) {
  const camp = view.data!.campaign;
  const list = viewableMaps(camp.settings.maps, normalizeCombat(camp.combat).map?.sceneId);
  if (!list.length) return null;
  return (
    <div className="chips past-maps" aria-label="Cartes de l’aventure">
      <button className={`chip ${viewing ? '' : 'on'}`} onClick={() => onPick(null)}>
        📍 Carte actuelle
      </button>
      {list.map((m) => (
        <button key={m.id} className={`chip ${viewing === m.id ? 'on' : ''}`} onClick={() => onPick(m.id)}>
          🗺️ {m.name}
        </button>
      ))}
    </div>
  );
}

/** Carte passée en lecture seule. */
export function PastMapView({ view, map }: { view: CampaignView; map: PastMap }) {
  const cx: MapCtx = {
    combat: normalizeCombat({ map: { ...map.map, name: map.name }, combatants: [] }),
    current: null,
    isGM: false,
    imageKey: map.id,
    move: noop,
    paint: noop,
    toggleDoor: noop,
    clearBoard: noop,
    setBackground: noop,
    setFog: noop,
    setDark: noop,
    setMapSize: noop,
  } as unknown as MapCtx;
  return (
    <div className="stack-xs">
      <p className="muted small">🗺️ {map.name} : carte déjà visitée (lecture seule).</p>
      <BattleMap cx={cx} tokens={[]} fog={null} campaignId={view.data!.campaign.id} actor={null} movable={() => false} speedOf={() => 0}
        range={null} area={null} aiming={false} onAim={() => undefined} targetState={() => undefined} targeted={[]} onTokenTouch={() => undefined} />
    </div>
  );
}
