// Racine de l'appli : fournisseurs (notifications, session) et choix de l'écran selon la route
// (connexion, accueil, mon compte, campagne) ; nouveau mot de passe après le lien « mot de passe oublié ».
import { SessionProvider, useSession } from './data/session';
import { ToastProvider } from './components/Toast';
import { useRoute } from './router';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Campaign } from './pages/Campaign';
import { Account, NewPasswordDialog } from './pages/Account';
import { useEffect, useState } from 'react';

function Routes() {
  const { user, store } = useSession();
  const route = useRoute();
  const [recovery, setRecovery] = useState(false);
  useEffect(() => store.onPasswordRecovery(() => setRecovery(true)), [store]);
  const page = !user ? <Login /> : route[0] === 'c' && route[1] ? <Campaign key={route[1]} id={route[1]} rest={route.slice(2)} /> : route[0] === 'compte' ? <Account /> : <Home />;
  return (
    <>
      {page}
      {recovery && user && <NewPasswordDialog onClose={() => setRecovery(false)} />}
    </>
  );
}

export function App() {
  return (
    <ToastProvider>
      <SessionProvider fallback={<div className="splash">Ouverture du grimoire…</div>}>
        <Routes />
      </SessionProvider>
    </ToastProvider>
  );
}
