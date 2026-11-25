// Onglet MJ. « Partie » : invitation, joueurs, règles de la table, renommer/supprimer (la distribution est sur l'écran MJ).
// « Marché » : marchands et coffres (ShopPage). « Bestiaire » : monstres préparés (BestiaryPage). « Lieux » : PlacesPage.
import { useSession } from '../../data/session';
import type { CampaignView } from '../../data/useCampaign';
import { navigate } from '../../router';
import { ConfirmButton, LazyInput } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { ShopPage } from '../shop/ShopPage';
import { BestiaryPage } from './BestiaryPage';
import { PlacesPage } from '../places/PlacesPage';

export function GmPanel({ view, sub }: { view: CampaignView; sub?: string }) {
  const camp = view.data!.campaign;
  const tabs = (
    <div className="segmented gm-tabs">
      <button className={!sub ? 'on' : ''} onClick={() => navigate(`/c/${camp.id}/mj`)}>
        👑 Partie
      </button>
      <button className={sub === 'marche' ? 'on' : ''} onClick={() => navigate(`/c/${camp.id}/mj/marche`)}>
        🏪 Marché
      </button>
      <button className={sub === 'bestiaire' ? 'on' : ''} onClick={() => navigate(`/c/${camp.id}/mj/bestiaire`)}>
        🐉 Bestiaire
      </button>
      <button className={sub === 'lieux' ? 'on' : ''} onClick={() => navigate(`/c/${camp.id}/mj/lieux`)}>
        📍 Lieux
      </button>
    </div>
  );
  return (
    <div className="stack">
      {tabs}
      {sub === 'marche' ? <ShopPage view={view} /> : sub === 'bestiaire' ? <BestiaryPage view={view} /> : sub === 'lieux' ? <PlacesPage view={view} /> : <GmGame view={view} />}
    </div>
  );
}

/** Volet « Partie » de l'onglet MJ. */
function GmGame({ view }: { view: CampaignView }) {
  const { store, user } = useSession();
  const toast = useToast();
  const data = view.data!;
  const camp = data.campaign;
  const fail = (e: Error) => toast(e.message, 'error');

  return (
    <div className="stack">
      <section className="card invite">
        <span className="label">Code d’invitation</span>
        <div className="row between">
          <strong className="code huge">{camp.join_code}</strong>
          <button
            className="btn small"
            onClick={() => {
              navigator.clipboard
                ?.writeText(camp.join_code)
                .then(() => toast('Code copié'))
                .catch(() => toast('Copie impossible : note le code à la main'));
            }}
          >
            Copier
          </button>
        </div>
        <p className="muted small">Les joueurs touchent « Rejoindre une partie » et saisissent ce code.</p>
      </section>

      <p className="muted small">Distribuer (PV, objets, états, niveaux) : onglet 🛡️ Persos, l’écran du MJ.</p>

      <section className="card stack-sm">
        <h3 className="section-title">Joueurs ({data.members.length - 1})</h3>
        <ul className="list">
          {data.members
            .filter((m) => m.user_id !== user?.id)
            .map((m) => (
              <li key={m.user_id} className="row between member-row">
                <span>
                  <strong>{m.display_name || 'Joueur'}</strong>
                  <span className="muted small">
                    {' '}
                    · {data.characters.filter((c) => c.owner_id === m.user_id).map((c) => c.name).join(', ') || 'pas de perso'}
                  </span>
                </span>
                <ConfirmButton className="link danger" confirmLabel="Exclure ?" onConfirm={() => store.removeMember(camp.id, m.user_id).then(view.reload).catch(fail)}>
                  Exclure
                </ConfirmButton>
              </li>
            ))}
          {data.members.length <= 1 && <li className="muted small">Aucun joueur pour l’instant.</li>}
        </ul>
      </section>

      <section className="card stack-sm">
        <h3 className="section-title">Règles de la table</h3>
        <Toggle view={view} k="playersEditInventory" label="Les joueurs gèrent leur inventaire et leurs pièces" />
        <Toggle view={view} k="playersEditStats" label="Les joueurs modifient leur fiche (caracs, compétences…)" />
        <Toggle view={view} k="shareSheets" label="Les joueurs voient les fiches des autres" />
        <Toggle view={view} k="playersEditHp" label="Les joueurs gèrent leurs PV (dégâts, soins, repos)" />
        <Toggle view={view} k="realDice" label="🎲 Vrais dés : les jets et sorts lancés depuis la fiche des joueurs ne passent plus par l’appli ni l’historique" />
      </section>

      <section className="card stack-sm">
        <h3 className="section-title">Campagne</h3>
        <label htmlFor="camp-rename">Nom</label>
        <LazyInput id="camp-rename" value={camp.name} onCommit={(name) => store.updateCampaign(camp.id, { name }).then(view.reload).catch(fail)} />
        <ConfirmButton
          confirmLabel="Tout sera effacé. Confirmer ?"
          onConfirm={() =>
            store
              .deleteCampaign(camp.id)
              .then(() => navigate('/'))
              .catch(fail)
          }
        >
          Supprimer la campagne
        </ConfirmButton>
      </section>
    </div>
  );
}

type BoolSetting = 'playersEditInventory' | 'playersEditStats' | 'shareSheets' | 'playersEditHp' | 'realDice';

function Toggle({ view, k, label }: { view: CampaignView; k: BoolSetting; label: string }) {
  const { store } = useSession();
  const toast = useToast();
  const s = view.data!.campaign.settings;
  return (
    <label className="toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        id={`setting-${k}`}
        checked={!!s[k]}
        onChange={(e) =>
          store
            .updateCampaign(view.data!.campaign.id, { settings: { ...s, [k]: e.target.checked } })
            .then(view.reload)
            .catch((err) => toast(err.message, 'error'))
        }
      />
      <span className="switch" aria-hidden />
    </label>
  );
}
