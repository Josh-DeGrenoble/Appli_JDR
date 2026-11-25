// Réseau coupé (métro, cave, téléphone en veille) : reconnaître l'erreur et attendre le retour de la connexion.

/** L'erreur vient-elle du réseau (requête pas arrivée) plutôt que du serveur ? */
export function isNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(msg) || (typeof navigator !== 'undefined' && navigator.onLine === false);
}

/** Attend `ms` millisecondes, ou le retour de la connexion si le téléphone est hors ligne (20 s au plus). */
export function waitForNetwork(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false && typeof window !== 'undefined';
    if (!offline) return void setTimeout(resolve, ms);
    const done = () => (window.removeEventListener('online', done), clearTimeout(t), resolve());
    const t = setTimeout(done, 20000);
    window.addEventListener('online', done);
  });
}
