// Titre de la barre du haut : lieu où se trouve le groupe (sinon nom de la campagne). Le MJ le touche pour changer de lieu.
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { Modal } from '../../components/ui';
import { navigate } from '../../router';
import { usePlaces } from './usePlaces';

export function PlaceTitle({ view }: { view: CampaignView }) {
  const camp = view.data!.campaign;
  const here = camp.settings.place ?? null;
  const [open, setOpen] = useState(false);
  const title = (
    <span className="place-title">
      {here ? (
        <>
          <strong className="ellipsis">
            {here.icon} {here.name}
          </strong>
          <span className="muted small ellipsis">{camp.name}</span>
        </>
      ) : (
        <h1 className="ellipsis">{camp.name}</h1>
      )}
    </span>
  );
  if (!view.isGM) return <div className="topbar-title grow">{title}</div>;
  return (
    <>
      <button className="topbar-title grow place-btn" onClick={() => setOpen(true)} aria-label="Changer de lieu">
        {title}
      </button>
      {open && <PlacePicker view={view} onClose={() => setOpen(false)} />}
    </>
  );
}

/** MJ : choisir le lieu du groupe parmi ses lieux préparés. */
function PlacePicker({ view, onClose }: { view: CampaignView; onClose: () => void }) {
  const pl = usePlaces(view);
  const go = (p: Parameters<typeof pl.goTo>[0]) => pl.goTo(p).then(onClose);
  return (
    <Modal title="📍 Où est le groupe ?" onClose={onClose}>
      {pl.places.length === 0 && <p className="muted small">Aucun lieu préparé pour l’instant.</p>}
      <div className="stack-xs">
        {pl.places.map((p) => (
          <button key={p.id} className={`choice ${pl.here?.id === p.id ? 'on' : ''}`} onClick={() => go(p)}>
            <strong>
              {p.icon} {p.name}
            </strong>
            <span className="muted small">
              {p.scenes.length} plan{p.scenes.length > 1 ? 's' : ''} · {p.monsters.length} monstre{p.monsters.length > 1 ? 's' : ''} · {p.notes.length} note{p.notes.length > 1 ? 's' : ''}
            </span>
          </button>
        ))}
        {pl.here && (
          <button className="btn ghost" onClick={() => go(null)}>
            Ne plus afficher de lieu
          </button>
        )}
        <button className="btn" onClick={() => (onClose(), navigate(`/c/${view.data!.campaign.id}/mj/lieux`))}>
          ✏️ Préparer les lieux
        </button>
      </div>
    </Modal>
  );
}
