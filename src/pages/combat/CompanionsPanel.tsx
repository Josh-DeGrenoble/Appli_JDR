// Joueur (onglet Carte) : faire venir ses compagnons et invocations sur la carte, ou les renvoyer. Les compagnons se
// règlent sur la fiche du perso (section Compagnons) ; sur la carte, ils jouent juste après leur maître.
import type { CampaignView } from '../../data/useCampaign';
import { useSession } from '../../data/session';
import { useToast } from '../../components/Toast';
import { logEvent } from '../../data/actions';
import { normalizeCombat } from '../../lib/dnd/combat';
import { companionToken } from '../../lib/dnd/companions';
import { normalizeSheet } from '../../lib/dnd/sheet';

export function CompanionsPanel({ view }: { view: CampaignView }) {
  const { store } = useSession();
  const toast = useToast();
  const combat = normalizeCombat(view.data!.campaign.combat);
  const list = view.myCharacters.flatMap((c) => (normalizeSheet(c.sheet).companions ?? []).map((def) => ({ c, def, token: companionToken(combat, c.id, def.id) })));
  if (!list.length) return null;
  const fail = (e: Error) => toast(e.message, 'error');
  const campaignId = view.data!.campaign.id;

  return (
    <section className="card stack-xs companions-panel">
      <span className="label">🐾 Compagnons</span>
      {list.map(({ c, def, token }) => (
        <div key={def.id} className="row between">
          <span>
            {def.avatar} <strong>{def.name}</strong> <span className="muted small">({c.name}{token ? ` · ${token.companion!.hp}/${token.companion!.maxHp} PV` : ''})</span>
          </span>
          {token ? (
            <button className="btn small ghost" onClick={() => store.dismissCompanion(campaignId, token.id).then(view.reload).catch(fail)}>
              Renvoyer
            </button>
          ) : (
            <button
              className="btn small"
              onClick={() =>
                store
                  .summonCompanion(campaignId, c.id, def.id)
                  .then(() => (logEvent(store, campaignId, `🐾 ${c.name} appelle ${def.name}`, c.name), view.reload()))
                  .catch(fail)
              }
              aria-label={`Appeler ${def.name}`}
            >
              🐾 Appeler
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
