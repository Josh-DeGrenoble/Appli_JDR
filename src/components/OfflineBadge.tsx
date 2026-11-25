// Pastille « hors connexion » en haut de l'écran quand le téléphone perd le réseau (version en ligne).
import { useEffect, useState } from 'react';

export function OfflineBadge() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => (window.removeEventListener('online', up), window.removeEventListener('offline', down));
  }, []);
  if (online) return null;
  return (
    <div className="offline-badge" role="status">
      📡 Hors connexion : tes actions repartent dès le retour du réseau (sinon, réessaie)
    </div>
  );
}
