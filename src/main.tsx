// Point d'entrée : monte React, charge les styles, enregistre le service worker (PWA).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/base.css';
import './styles/controles.css';
import './styles/fiche.css';
import './styles/table.css';
import './styles/dnd.css';
import './styles/actions.css';
import './styles/combat.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Service worker : uniquement en production (évite les caches pendant le dev).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* environnement sans service worker (aperçu intégré) : l'appli marche quand même */
    });
  });
}
