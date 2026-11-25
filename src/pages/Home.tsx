// Accueil : liste des campagnes, créer (MJ) ou rejoindre avec un code.
import { useEffect, useState } from 'react';
import { useSession } from '../data/session';
import { DND_TEMPLATE } from '../lib/templates';
import type { CampaignSummary } from '../lib/types';
import { navigate } from '../router';
import { Empty, Modal } from '../components/ui';
import { useToast } from '../components/Toast';
import { InstallButton } from '../components/InstallButton';
import { RulesButton } from './RulesDialog';

export function Home() {
  const { store, user } = useSession();
  const toast = useToast();
  const [list, setList] = useState<CampaignSummary[] | null>(null);
  const [dialog, setDialog] = useState<'create' | 'join' | null>(null);

  const load = () =>
    store
      .listCampaigns()
      .then(setList)
      .catch((e) => toast(e.message, 'error'));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-title">
          <img src="./icon.svg" alt="" width={28} height={28} />
          <h1>Grimoire</h1>
        </div>
        <button className="btn ghost small" onClick={() => navigate('/compte')} aria-label="Mon compte">
          👤 {user?.name}
        </button>
      </header>

      <main className="content stack">
        <p className="hello">
          Bonjour <strong>{user?.name}</strong>
          {store.mode === 'local' && <span className="pill">démo locale</span>}
        </p>

        <div className="row gap">
          <button className="btn primary grow" onClick={() => setDialog('join')}>
            Rejoindre une partie
          </button>
          <button className="btn grow" onClick={() => setDialog('create')}>
            Créer (MJ)
          </button>
        </div>
        <RulesButton />

        <section className="stack-sm">
          <h2 className="section-title">Mes campagnes</h2>
          {list === null ? (
            <p className="muted">Chargement…</p>
          ) : list.length === 0 ? (
            <Empty icon="🗺️" title="Aucune campagne pour l’instant">
              <p className="muted">Demande le code d’invitation à ton MJ, ou crée ta propre campagne si c’est toi qui mènes la partie.</p>
            </Empty>
          ) : (
            <ul className="list">
              {list.map((c) => (
                <li key={c.id}>
                  <button className="list-item" onClick={() => navigate(`/c/${c.id}`)}>
                    <span className="list-main">
                      <strong>{c.name}</strong>
                      <span className="muted small">Code {c.join_code}</span>
                    </span>
                    <span className={`role-badge ${c.role}`}>{c.role === 'gm' ? 'MJ' : 'Joueur'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <InstallButton />
      </main>

      {dialog === 'create' && <CreateDialog onClose={() => setDialog(null)} />}
      {dialog === 'join' && <JoinDialog onClose={() => setDialog(null)} />}
    </div>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const { store, user } = useSession();
  const toast = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Nouvelle campagne" onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const c = await store.createCampaign(name, structuredClone(DND_TEMPLATE), user?.name ?? '');
            navigate(`/c/${c.id}/mj`);
          } catch (err) {
            toast((err as Error).message, 'error');
            setBusy(false);
          }
        }}
      >
        <label htmlFor="camp-name">Nom de la campagne</label>
        <input id="camp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Les Brumes d’Ysmir" autoFocus />
        <p className="muted small">Fiches Donjons &amp; Dragons 5e (règles 2024).</p>
        <button className="btn primary" disabled={busy || !name.trim()}>
          Créer la campagne
        </button>
      </form>
    </Modal>
  );
}

function JoinDialog({ onClose }: { onClose: () => void }) {
  const { store, user } = useSession();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Rejoindre une partie" onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const c = await store.joinCampaign(code, user?.name ?? '');
            navigate(`/c/${c.id}`);
          } catch (err) {
            toast((err as Error).message, 'error');
            setBusy(false);
          }
        }}
      >
        <label htmlFor="join-code">Code donné par ton MJ</label>
        <input
          id="join-code"
          className="big-input code"
          value={code}
          maxLength={6}
          autoCapitalize="characters"
          autoFocus
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="ABC123"
        />
        <button className="btn primary" disabled={busy || code.length < 6}>
          Rejoindre
        </button>
      </form>
    </Modal>
  );
}
