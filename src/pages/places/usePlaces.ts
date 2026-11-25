// Lieux du MJ : lecture (secrets), modification à partir de la dernière version, et « aller » dans un lieu
// (campaign.settings.place, visible de tous, affiché en haut de l'écran).
import { useSession } from '../../data/session';
import type { CampaignView } from '../../data/useCampaign';
import { useToast } from '../../components/Toast';
import { logEvent } from '../../data/actions';
import type { CampaignSecrets } from '../../lib/dnd/combat';
import type { Place } from '../../lib/dnd/places';

/** Lieux préparés, lieu actuel et actions du MJ. */
export function usePlaces(view: CampaignView) {
  const { store } = useSession();
  const toast = useToast();
  const data = view.data!;
  const camp = data.campaign;
  const places = data.secrets?.places ?? [];
  const here = camp.settings.place ?? null;
  const current = here ? places.find((p) => p.id === here.id) ?? null : null;
  const fail = (e: Error) => toast(e.message, 'error');

  /** Modifie la liste des lieux (relue en base pour ne rien écraser). */
  const update = async (fn: (list: Place[]) => Place[]) => {
    try {
      const d = await store.loadCampaign(camp.id);
      const sec: CampaignSecrets = { monsters: {}, ...(d.secrets ?? {}) };
      await store.saveSecrets(camp.id, { ...sec, places: fn(sec.places ?? []) });
      view.reload();
    } catch (e) {
      fail(e as Error);
    }
  };

  /** Le groupe va dans ce lieu (null = aucun lieu affiché). */
  const goTo = async (p: Place | null) => {
    try {
      await store.updateCampaign(camp.id, { settings: { ...camp.settings, place: p ? { id: p.id, name: p.name, icon: p.icon } : null } });
      if (p) logEvent(store, camp.id, `📍 Le groupe arrive : ${p.icon} ${p.name}`);
      view.reload();
    } catch (e) {
      fail(e as Error);
    }
  };

  /** Enregistre un lieu ; s'il est le lieu actuel, met aussi à jour son nom affiché. */
  const save = async (p: Place) => {
    await update((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p]));
    if (here?.id === p.id && (here.name !== p.name || here.icon !== p.icon)) await goTo(p);
  };

  const remove = async (p: Place) => {
    await update((list) => list.filter((x) => x.id !== p.id));
    if (here?.id === p.id) await goTo(null);
  };

  return { places, here, current, save, remove, goTo };
}
