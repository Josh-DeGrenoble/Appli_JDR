// Mon compte : pseudo (changé dans toutes mes campagnes), email et mot de passe (en ligne), déconnexion.
// En démo, explique que les données restent sur l'appareil.
import { useState } from 'react';
import { useSession } from '../data/session';
import { useToast } from '../components/Toast';
import { Modal } from '../components/ui';
import { navigate } from '../router';

export function Account() {
  const { store, user, refreshUser } = useSession();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [pw, setPw] = useState('');
  const local = store.mode === 'local';
  const fail = (e: Error) => toast(e.message, 'error');

  return (
    <div className="page">
      <header className="topbar">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Retour">
          ←
        </button>
        <div className="topbar-title grow">
          <h1>Mon compte</h1>
        </div>
      </header>
      <main className="content stack">
        <section className="card stack-sm">
          <label htmlFor="acc-name">Pseudo</label>
          <div className="row gap">
            <input id="acc-name" className="grow" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn" disabled={!name.trim() || name.trim() === user?.name}
              onClick={() => store.updateName(name).then(refreshUser).then(() => toast('✓ Pseudo changé')).catch(fail)}>
              Enregistrer
            </button>
          </div>
          <p className="muted small">Il change aussi dans toutes tes campagnes.</p>
        </section>

        {local ? (
          <section className="card stack-sm">
            <span className="label">Mode démo</span>
            <p className="small">Tes persos et tes campagnes sont gardés <strong>dans ce navigateur, sur cet appareil</strong> : reviens avec le même pseudo pour les retrouver.</p>
            <p className="muted small">Pour les retrouver sur n’importe quel téléphone, avec un vrai compte (email + mot de passe), il faut la version en ligne (voir docs/MISE_EN_LIGNE.md).</p>
          </section>
        ) : (
          <section className="card stack-sm">
            <span className="label">Connexion</span>
            <p className="small">Email : <strong>{user?.email}</strong></p>
            <label htmlFor="acc-pw">Nouveau mot de passe</label>
            <div className="row gap">
              <input id="acc-pw" className="grow" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button className="btn" disabled={pw.length < 6} onClick={() => store.updatePassword(pw).then(() => (setPw(''), toast('✓ Mot de passe changé'))).catch(fail)}>
                Changer
              </button>
            </div>
            <p className="muted small">Tes persos, campagnes et ta progression sont gardés en ligne : connecte-toi sur n’importe quel appareil pour les retrouver.</p>
          </section>
        )}

        <button className="btn ghost" onClick={() => store.signOut().then(() => navigate('/'))}>
          {local ? 'Changer de profil' : 'Déconnexion'}
        </button>
      </main>
    </div>
  );
}

/** Après le lien « mot de passe oublié » : choisir le nouveau mot de passe. */
export function NewPasswordDialog({ onClose }: { onClose: () => void }) {
  const { store } = useSession();
  const toast = useToast();
  const [pw, setPw] = useState('');
  return (
    <Modal title="Nouveau mot de passe" onClose={onClose}>
      <input id="new-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Nouveau mot de passe" />
      <button className="btn primary" disabled={pw.length < 6}
        onClick={() => store.updatePassword(pw).then(() => (toast('✓ Mot de passe changé'), onClose())).catch((e: Error) => toast(e.message, 'error'))}>
        Enregistrer
      </button>
    </Modal>
  );
}
