// Fiche : capacités à utilisations limitées (Rage, Second souffle…). Le MJ les crée ; le joueur les utilise.
import { useState } from 'react';
import { useSession } from '../../data/session';
import { ConfirmButton, Modal } from '../../components/ui';
import { newFeature } from '../../lib/dnd/actions';
import type { Feature } from '../../lib/dnd/sheet';
import { uid } from '../../lib/ids';
import type { SheetCtx } from './useSheet';

const RECHARGE: Record<Feature['recharge'], string> = { short: 'repos court', long: 'repos long', none: 'manuel' };

export function FeaturesSection({ ctx }: { ctx: SheetCtx }) {
  const { s, can, gm, saveIn, view, c, fail } = ctx;
  const { store } = useSession();
  const [edit, setEdit] = useState<Feature | null>(null);
  /** Le MJ ajuste librement ; le joueur peut seulement utiliser (jamais récupérer seul). */
  const use = (f: Feature, d: number) => {
    if (gm) saveIn('features', { ...f, used: Math.min(f.max, Math.max(0, f.used + d)) });
    else if (d > 0) store.useFeature(c.id, f.id).then(view.reload).catch(fail);
  };

  return (
    <section className="card stack-sm">
      <div className="row between">
        <h3 className="section-title">Capacités</h3>
        {gm && (
          <button className="btn small ghost" onClick={() => setEdit(newFeature(uid()))}>
            + Capacité
          </button>
        )}
      </div>
      {s.features.length === 0 && <p className="muted small">{gm ? 'Ex. : Second souffle (1, repos court), Rage (2, repos long).' : 'Le MJ ajoute ici tes capacités de classe.'}</p>}
      <ul className="features">
        {s.features.map((f) => {
          const left = f.max - f.used;
          return (
            <li key={f.id} className="feature">
              <button className="attack-name" onClick={() => gm && setEdit(f)} disabled={!gm}>
                <strong>{f.name || 'Capacité'}</strong>
                <span className="muted small">
                  {f.max > 0 ? `${left}/${f.max} · ${RECHARGE[f.recharge]}` : 'passive'}
                  {f.notes ? ` · ${f.notes}` : ''}
                </span>
              </button>
              {f.max > 0 && (
                <div className="pips" aria-label={`${left} utilisations restantes sur ${f.max}`}>
                  {Array.from({ length: Math.min(f.max, 10) }, (_, i) => (
                    <button
                      key={i}
                      className={`pip ${i < left ? 'on' : ''}`}
                      disabled={!can.id || (!gm && i >= left)}
                      onClick={() => use(f, i < left ? 1 : -1)}
                      aria-label={i < left ? 'Utiliser' : 'Récupérer'}
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {edit && <FeatureDialog ctx={ctx} feature={edit} onClose={() => setEdit(null)} />}
    </section>
  );
}

function FeatureDialog({ ctx, feature, onClose }: { ctx: SheetCtx; feature: Feature; onClose: () => void }) {
  const [f, setF] = useState<Feature>(feature);
  const isNew = !ctx.s.features.some((x) => x.id === feature.id);
  const set = <K extends keyof Feature>(k: K, v: Feature[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <Modal title={isNew ? 'Nouvelle capacité' : f.name || 'Capacité'} onClose={onClose}>
      <form
        className="stack-sm"
        onSubmit={(e) => {
          e.preventDefault();
          ctx.saveIn('features', { ...f, name: f.name.trim() || 'Capacité', used: Math.min(f.used, f.max) });
          onClose();
        }}
      >
        <label className="field">
          <span>Nom</span>
          <input id="feat-name" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Second souffle" autoFocus />
        </label>
        <div className="row gap">
          <label className="field">
            <span>Utilisations (0 = passive)</span>
            <input id="feat-max" className="num-input" type="number" min={0} max={20} value={f.max} onChange={(e) => set('max', Math.max(0, parseInt(e.target.value, 10) || 0))} />
          </label>
          <label className="field grow">
            <span>Récupération</span>
            <select id="feat-recharge" value={f.recharge} onChange={(e) => set('recharge', e.target.value as Feature['recharge'])}>
              <option value="short">Repos court</option>
              <option value="long">Repos long</option>
              <option value="none">Manuelle</option>
            </select>
          </label>
        </div>
        <div className="row gap wrap">
          <label className="field">
            <span>En combat</span>
            <select id="feat-cost" value={f.cost ?? 'bonus'} onChange={(e) => set('cost', e.target.value as Feature['cost'])}>
              <option value="action">Action</option>
              <option value="bonus">Action bonus</option>
              <option value="reaction">Réaction</option>
              <option value="free">Gratuite</option>
            </select>
          </label>
          <label className="field grow">
            <span>Effet automatique</span>
            <select id="feat-effect" value={f.effect ?? 'none'} onChange={(e) => set('effect', e.target.value as Feature['effect'])}>
              <option value="none">Aucun (compteur seulement)</option>
              <option value="heal">Se soigner</option>
              <option value="extra-action">Action supplémentaire</option>
            </select>
          </label>
        </div>
        {f.effect === 'heal' && (
          <label className="field">
            <span>Soin (formule, {'{niveau}'} = niveau du perso)</span>
            <input id="feat-heal" value={f.heal ?? ''} onChange={(e) => set('heal', e.target.value)} placeholder="1d10+{niveau}" />
          </label>
        )}
        <label className="field">
          <span>Notes</span>
          <textarea id="feat-notes" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Effet, action bonus, 1d10 + niveau…" />
        </label>
        <button className="btn primary">Enregistrer</button>
        {!isNew && (
          <ConfirmButton
            onConfirm={() => {
              ctx.removeIn('features', f.id);
              onClose();
            }}
          >
            Supprimer la capacité
          </ConfirmButton>
        )}
      </form>
    </Modal>
  );
}
