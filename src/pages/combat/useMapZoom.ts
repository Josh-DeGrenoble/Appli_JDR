// Zoom de la carte : boutons − / + et pincement à deux doigts. Le niveau est retenu sur l'appareil ; à chaque
// changement, la carte se recentre sur le pion choisi, le mien ou celui dont c'est le tour.
import { useEffect, useRef, useState, type PointerEvent } from 'react';

export const ZOOMS = [1, 1.5, 2, 3];
const KEY = 'grimoire.mapZoom';

const saved = () => {
  try {
    const z = parseFloat(localStorage.getItem(KEY) ?? '1');
    return ZOOMS.includes(z) ? z : 1;
  } catch {
    return 1;
  }
};

/** Niveau de zoom, conteneur à faire défiler et gestes de pincement. */
export function useMapZoom() {
  const [zoom, setZoomState] = useState(saved);
  const scroller = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const startDist = useRef<number | null>(null);

  const setZoom = (z: number) => {
    setZoomState(z);
    try {
      localStorage.setItem(KEY, String(z));
    } catch {
      /* stockage indisponible : zoom pour cette session seulement */
    }
  };
  const step = (dir: 1 | -1) => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(zoom) + dir))]);

  // Recentre sur le pion important après un changement de zoom
  useEffect(() => {
    const box = scroller.current;
    const tok = box?.querySelector<HTMLElement>('.token.picked, .token.me, .token.active');
    if (!box || !tok || zoom === 1) return;
    const b = box.getBoundingClientRect();
    const t = tok.getBoundingClientRect();
    box.scrollLeft += t.left - b.left - b.width / 2 + t.width / 2;
    box.scrollTop += t.top - b.top - b.height / 2 + t.height / 2;
  }, [zoom]);

  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  /** Gestes : deux doigts écartés = zoom +, rapprochés = zoom −. Renvoie true si un pincement est en cours. */
  const pinch = {
    onPointerDown: (e: PointerEvent) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) startDist.current = dist();
    },
    onPointerMove: (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size !== 2 || !startDist.current) return;
      const r = dist() / startDist.current;
      if (r > 1.3 || r < 0.75) {
        step(r > 1 ? 1 : -1);
        startDist.current = dist();
      }
    },
    onPointerUp: (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) startDist.current = null;
    },
  };
  const pinching = () => pointers.current.size >= 2;

  return { zoom, step, scroller, pinch, pinching, canIn: zoom < ZOOMS[ZOOMS.length - 1], canOut: zoom > ZOOMS[0] };
}
