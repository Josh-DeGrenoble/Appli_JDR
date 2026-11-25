// Routeur minimal par hash (#/c/<id>/des) : navigate() et useRoute().
import { useEffect, useState } from 'react';


let memoryRoute = '/';
const listeners = new Set<(r: string) => void>();

function readHash(): string {
  const h = typeof location !== 'undefined' ? location.hash.replace(/^#/, '') : '';
  return h.startsWith('/') ? h : memoryRoute;
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  memoryRoute = path;
  try {
    if (opts.replace) history.replaceState(null, '', '#' + path);
    else location.hash = path;
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(path));
}

export function back(fallback = '/') {
  if (history.length > 1 && location.hash.startsWith('#/')) history.back();
  else navigate(fallback);
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(readHash);
  useEffect(() => {
    const onHash = () => setRoute(readHash());
    listeners.add(setRoute);
    window.addEventListener('hashchange', onHash);
    return () => {
      listeners.delete(setRoute);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);
  return route.split('/').filter(Boolean);
}
