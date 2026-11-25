// Perso à 0 PV en combat : plus aucune action ni déplacement. Au début de son tour, le jet contre la mort se lance
// tout seul sur le téléphone du joueur, puis le tour passe (sauf sur un 20 : le perso se relève avec 1 PV).
import { useEffect } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { useSession } from '../../data/session';
import { useRoller } from '../../data/useRoller';
import { useToast } from '../../components/Toast';
import { normalizeSheet } from '../../lib/dnd/sheet';
import type { Character } from '../../lib/types';

/** Tours déjà joués automatiquement sur cet appareil (« round:perso »), pour ne lancer qu'une fois. */
const autoDone = new Set<string>();

export function DownPanel({ view, ch, isTurn, round, onEndTurn }: { view: CampaignView; ch: Character; isTurn: boolean; round: number; onEndTurn?: () => void }) {
  const { store } = useSession();
  const roller = useRoller(view);
  const toast = useToast();
  const ds = normalizeSheet(ch.sheet).deathSaves;
  const stable = ds.success >= 3;
  const dead = ds.failure >= 3;

  /** Lance le jet ; renvoie le d20 (null si impossible). */
  const save = async () => {
    const r = await roller('1d20', { label: 'Jet contre la mort', author: ch.name });
    if (!r) return null;
    await store.deathSave(ch.id, r.total).catch((e: Error) => toast(e.message, 'error'));
    view.reload();
    return r.total;
  };

  // Joueur : au début de son tour, jet automatique puis fin du tour (le MJ garde ses boutons).
  useEffect(() => {
    const key = `${round}:${ch.id}`;
    if (!isTurn || !onEndTurn || autoDone.has(key)) return;
    autoDone.add(key);
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const nat = stable || dead ? 0 : await save();
      if (nat === 20) return toast(`🌟 20 ! ${ch.name} se relève avec 1 PV`, 'gift');
      timer = setTimeout(onEndTurn, 1800);
    })();
    return () => timer && clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTurn, round, ch.id]);

  return (
    <section className="card stack-sm down-panel" role="alert">
      <h3 className="section-title">💀 {ch.name} est à terre (0 PV)</h3>
      <p className="muted small">
        {dead ? 'Trois échecs : le personnage est mort.' : stable ? 'Stabilisé : il reste inconscient jusqu’à ce qu’on le soigne.' : 'Plus d’action ni de déplacement. À chaque tour : un jet contre la mort (10 ou plus = réussite, 20 = reprend 1 PV, 1 = deux échecs).'}
      </p>
      <div className="row gap small">
        <span>Réussites {[0, 1, 2].map((i) => <span key={i} className={`dot ok ${i < ds.success ? 'on' : ''}`} />)}</span>
        <span>Échecs {[0, 1, 2].map((i) => <span key={i} className={`dot ko ${i < ds.failure ? 'on' : ''}`} />)}</span>
      </div>
      {isTurn && !onEndTurn && !stable && !dead && (
        <button className="btn primary big" onClick={save}>
          🎲 Jet contre la mort
        </button>
      )}
      {isTurn && onEndTurn && <p className="small">🎲 Jet contre la mort lancé automatiquement, le tour passe tout seul.</p>}
      {isTurn && onEndTurn && (
        <button className="btn big" onClick={onEndTurn}>
          ⏭️ Finir mon tour
        </button>
      )}
    </section>
  );
}
