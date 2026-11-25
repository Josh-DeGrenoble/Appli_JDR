// Panneau qui glisse depuis la droite (historique), avec bouton d'ouverture et pastille « non lu ».
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Mémorise (par appareil) la date du dernier élément vu, pour la pastille « non lu ». */
export function useSeen(key: string, latest: string, open: boolean) {
  const read = () => {
    try {
      return localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  };
  const [seen, setSeen] = useState(read);
  useEffect(() => {
    if (open && latest && latest > seen) {
      try {
        localStorage.setItem(key, latest);
      } catch {
        /* stockage indisponible : la pastille se recalcule simplement */
      }
      setSeen(latest);
    }
  }, [open, latest, seen, key]);
  return seen;
}

interface Props {
  icon: string;
  label: string;
  title: string;
  unread: number;
  open: boolean;
  onOpen: (open: boolean) => void;
  className?: string;
  children: ReactNode;
}

/** Bouton de la barre du haut + panneau latéral (Échap ou fond pour fermer). */
export function Drawer({ icon, label, title, unread, open, onOpen, className = '', children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpen]);

  return (
    <>
      <button className={`icon-btn history-btn ${className}`} onClick={() => onOpen(true)} aria-label={label}>
        {icon}
        {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open &&
        createPortal(
          <>
            <div className="drawer-backdrop" onClick={() => onOpen(false)} aria-hidden />
            <aside className="drawer" aria-label={title}>
              <header className="row between">
                <h2 className="section-title">
                  {icon} {title}
                </h2>
                <button className="icon-btn" onClick={() => onOpen(false)} aria-label={`Fermer : ${title}`}>
                  ✕
                </button>
              </header>
              {children}
            </aside>
          </>,
          document.body
        )}
    </>
  );
}
