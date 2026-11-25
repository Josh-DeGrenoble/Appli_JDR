// Charge l'image de fond de la carte quand sa version (combat.map.bg) change.
import { useEffect, useState } from 'react';
import { useSession } from '../../data/session';

/** Data URL de l'image de fond, ou null. */
export function useMapImage(campaignId: string, version: string | undefined, key = 'current'): string | null {
  const { store } = useSession();
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!version) {
      setSrc(null);
      return;
    }
    store
      .loadMapImage(campaignId, key)
      .then((s) => alive && setSrc(s))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [store, campaignId, version, key]);
  return src;
}
