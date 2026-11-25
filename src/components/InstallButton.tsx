// Bouton « Installer l'appli » (Android) ou explication pour iPhone.
import { useEffect, useState } from 'react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
}

/** Propose d'installer l'appli sur l'écran d'accueil (Android/Chrome), ou explique comment faire sur iPhone. */
export function InstallButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const standalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  if (standalone) return null;
  if (evt)
    return (
      <button className="btn ghost full" onClick={() => evt.prompt().then(() => setEvt(null))}>
        📲 Installer l’appli sur ce téléphone
      </button>
    );
  if (ios)
    return (
      <p className="hint">
        📲 Pour installer l’appli : touche <strong>Partager</strong> dans Safari, puis <strong>Sur l’écran d’accueil</strong>.
      </p>
    );
  return null;
}
