// Connexion : pseudo (mode démo) ou email + mot de passe (mode en ligne), avec lien de connexion par email et
// « mot de passe oublié ». Le compte garde persos, campagnes et progression sur tous les appareils.
import { useState } from 'react';
import { useSession } from '../data/session';

export function Login() {
  const { store } = useSession();
  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const local = store.mode === 'local';
  const profiles = local ? store.listLocalProfiles() : [];

  const run = async (fn: () => Promise<void>) => {
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-brand">
        <img src="./icon.svg" alt="" width={72} height={72} />
        <h1>Grimoire</h1>
        <p className="muted">Tes personnages, ton inventaire et tes dés, en direct avec ton MJ.</p>
      </div>

      {local ? (
        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => store.signInLocal(name));
          }}
        >
          <div className="demo-banner">
            Mode démo : les données restent dans ce navigateur. Pour tester MJ et joueur en même temps, ouvre un 2ᵉ onglet,
            touche « Changer de profil » et entre un autre pseudo.
          </div>
          <label htmlFor="login-name">Ton pseudo</label>
          <input id="login-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Aria" autoFocus />
          <button className="btn primary" disabled={busy || !name.trim()}>
            Entrer
          </button>
          {profiles.length > 0 && (
            <div className="stack-sm">
              <span className="label">Profils existants sur cet appareil</span>
              <div className="chips">
                {profiles.map((p) => (
                  <button type="button" key={p.id} className="chip" onClick={() => run(() => store.signInLocal(p.name))}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      ) : (
        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => (tab === 'in' ? store.signIn(email, password) : store.signUp(email, password, name)));
          }}
        >
          <div className="segmented" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'in'} className={tab === 'in' ? 'on' : ''} onClick={() => setTab('in')}>
              Connexion
            </button>
            <button type="button" role="tab" aria-selected={tab === 'up'} className={tab === 'up' ? 'on' : ''} onClick={() => setTab('up')}>
              Créer un compte
            </button>
          </div>
          {tab === 'up' && (
            <>
              <label htmlFor="login-name">Pseudo</label>
              <input id="login-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Aria" />
            </>
          )}
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="login-pass">Mot de passe</label>
          <input
            id="login-pass"
            type="password"
            autoComplete={tab === 'in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn primary" disabled={busy || !email || password.length < 6 || (tab === 'up' && !name.trim())}>
            {tab === 'in' ? 'Se connecter' : 'Créer mon compte'}
          </button>
          {tab === 'in' && (
            <div className="stack-xs login-help">
              <button type="button" className="link" disabled={busy || !email.includes('@')}
                onClick={() => run(() => store.sendLoginLink(email).then(() => setInfo('📧 Lien envoyé : ouvre l’email sur ce téléphone pour te connecter.')))}>
                📧 Recevoir un lien de connexion (sans mot de passe)
              </button>
              <button type="button" className="link" disabled={busy || !email.includes('@')}
                onClick={() => run(() => store.resetPassword(email).then(() => setInfo('📧 Email envoyé : suis le lien pour choisir un nouveau mot de passe.')))}>
                Mot de passe oublié ?
              </button>
              {!email.includes('@') && <span className="muted small">Saisis d’abord ton email.</span>}
            </div>
          )}
          <p className="muted small">Ton compte garde tes persos, tes campagnes et ta progression, sur tous tes appareils. Tu restes connecté jusqu’à « Déconnexion ».</p>
        </form>
      )}
      {err && <p className="error">{err}</p>}
      {info && <p className="info-msg">{info}</p>}
    </div>
  );
}
