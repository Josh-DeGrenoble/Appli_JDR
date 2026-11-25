// Onglet MJ, volet Lieux : lieux préparés à l'avance (nom, icône, notes du MJ) avec leurs favoris (plans, monstres,
// notes), mis en avant dans la Carte, l'ajout de monstres et les Notes quand le groupe s'y trouve. « 📍 Y aller » affiche
// le lieu en haut de l'écran de tout le monde.
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { ConfirmButton, Empty, Modal } from '../../components/ui';
import { BESTIARY } from '../../lib/dnd/srd/monsters';
import { PLACE_ICONS, newPlace, toggleFav, type Place } from '../../lib/dnd/places';
import { usePlaces } from './usePlaces';

export function PlacesPage({ view }: { view: CampaignView }) {
  const pl = usePlaces(view);
  const [edit, setEdit] = useState<Place | null>(null);

  return (
    <div className="stack">
      <button className="btn primary" onClick={() => setEdit(newPlace())}>
        + Nouveau lieu
      </button>
      {pl.places.length === 0 && (
        <Empty icon="📍" title="Aucun lieu">
          <p className="muted small">Prépare les lieux de ton aventure (taverne, crypte…) avec leurs plans, monstres et notes en favoris.</p>
        </Empty>
      )}
      {pl.places.map((p) => {
        const here = pl.here?.id === p.id;
        return (
          <section key={p.id} className={`card stack-xs place-card ${here ? 'here' : ''}`}>
            <div className="row between gap">
              <strong className="ellipsis">
                {p.icon} {p.name} {here && <span className="pill">📍 ici</span>}
              </strong>
              <button className="icon-btn" onClick={() => setEdit(structuredClone(p))} aria-label={`Modifier ${p.name}`}>
                ✏️
              </button>
            </div>
            {p.description && <p className="muted small prewrap">{p.description}</p>}
            <span className="muted small">
              ⭐ {p.scenes.length} plan{p.scenes.length > 1 ? 's' : ''} · {p.monsters.length} monstre{p.monsters.length > 1 ? 's' : ''} · {p.notes.length} note{p.notes.length > 1 ? 's' : ''}
            </span>
            <button className={`btn ${here ? 'ghost' : ''}`} onClick={() => pl.goTo(here ? null : p)}>
              {here ? 'Quitter ce lieu' : '📍 Y aller'}
            </button>
          </section>
        );
      })}
      {edit && <PlaceDialog view={view} place={edit} onClose={() => setEdit(null)} onSave={(p) => pl.save(p).then(() => setEdit(null))} onDelete={() => pl.remove(edit).then(() => setEdit(null))} />}
    </div>
  );
}

interface DialogProps {
  view: CampaignView;
  place: Place;
  onClose: () => void;
  onSave: (p: Place) => void;
  onDelete: () => void;
}

/** Fenêtre d'un lieu : nom, icône, notes du MJ, favoris. */
function PlaceDialog({ view, place, onClose, onSave, onDelete }: DialogProps) {
  const [p, setP] = useState(place);
  const [srd, setSrd] = useState('');
  const data = view.data!;
  const scenes = data.secrets?.scenes ?? [];
  const mine = data.secrets?.bestiary ?? [];
  const exists = (data.secrets?.places ?? []).some((x) => x.id === p.id);
  const set = (patch: Partial<Place>) => setP((o) => ({ ...o, ...patch }));
  const chip = (on: boolean, label: string, onClick: () => void, key: string) => (
    <button key={key} className={`chip ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on}>
      {label}
    </button>
  );

  return (
    <Modal title={`${p.icon} ${p.name || 'Lieu'}`} onClose={onClose}>
      <label className="field">
        <span>Nom</span>
        <input id="place-name" value={p.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <div className="chips place-icons">{PLACE_ICONS.map((i) => chip(p.icon === i, i, () => set({ icon: i }), i))}</div>
      <label className="field">
        <span>Notes du MJ (secrètes)</span>
        <textarea id="place-desc" rows={3} value={p.description} onChange={(e) => set({ description: e.target.value })} placeholder="Ambiance, PNJ, secrets…" />
      </label>

      <span className="label">⭐ Plans</span>
      <div className="chips">
        {scenes.length === 0 && <span className="muted small">Enregistre des plans dans l’onglet Carte.</span>}
        {scenes.map((s) => chip(p.scenes.includes(s.id), `🗺️ ${s.name}`, () => set({ scenes: toggleFav(p.scenes, s.id) }), s.id))}
      </div>

      <span className="label">⭐ Monstres</span>
      <div className="chips">
        {mine.map((m) => chip(p.monsters.includes(`m:${m.name}`), `${m.avatar} ${m.name}`, () => set({ monsters: toggleFav(p.monsters, `m:${m.name}`) }), `m:${m.name}`))}
        {p.monsters.filter((k) => !k.startsWith('m:')).map((k) => chip(true, `${BESTIARY.find((b) => b.name === k)?.avatar ?? '👹'} ${k}`, () => set({ monsters: toggleFav(p.monsters, k) }), k))}
      </div>
      <select id="place-srd" value={srd} onChange={(e) => (e.target.value && set({ monsters: toggleFav(p.monsters, e.target.value) }), setSrd(''))} aria-label="Ajouter un monstre du SRD">
        <option value="">+ Monstre du bestiaire SRD…</option>
        {BESTIARY.filter((b) => !p.monsters.includes(b.name)).map((b) => (
          <option key={b.name} value={b.name}>
            {b.avatar} {b.name} (FP {b.cr})
          </option>
        ))}
      </select>

      <span className="label">⭐ Notes</span>
      <div className="chips">
        {data.notes.length === 0 && <span className="muted small">Aucune note pour l’instant.</span>}
        {data.notes.map((n) => chip(p.notes.includes(n.id), `📜 ${n.title || 'Sans titre'}`, () => set({ notes: toggleFav(p.notes, n.id) }), n.id))}
      </div>

      <button className="btn primary" disabled={!p.name.trim()} onClick={() => onSave({ ...p, name: p.name.trim() })}>
        Enregistrer
      </button>
      {exists && (
        <ConfirmButton confirmLabel={`Supprimer ${p.name} ?`} onConfirm={onDelete}>
          Supprimer ce lieu
        </ConfirmButton>
      )}
    </Modal>
  );
}
