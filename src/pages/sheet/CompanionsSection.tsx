// Fiche : compagnons et invocations (familier, bête du rôdeur, monture…) ajoutés depuis des modèles, PV et CA
// réglables. Sur la carte, le joueur les fait venir depuis l'onglet Carte (🐾 Compagnons).
import { useState } from 'react';
import { ConfirmButton } from '../../components/ui';
import { COMPANION_TEMPLATES, companionFrom, type CompanionDef } from '../../lib/dnd/companions';
import { fmtBonus } from '../../lib/dnd/rules';
import type { SheetCtx } from './useSheet';

export function CompanionsSection({ ctx }: { ctx: SheetCtx }) {
  const { s, can, patch } = ctx;
  const [pick, setPick] = useState('');
  const list = s.companions ?? [];
  const edit = can.stats || ctx.gm;
  const save = (next: CompanionDef[]) => patch({ companions: next });
  const update = (id: string, p: Partial<CompanionDef>) => save(list.map((c) => (c.id === id ? { ...c, ...p } : c)));

  if (!list.length && !edit) return null;
  return (
    <section className="card stack-sm">
      <h3 className="section-title">🐾 Compagnons et invocations</h3>
      {list.length === 0 && <p className="muted small">Familier, bête du rôdeur, monture, créature invoquée…</p>}
      {list.map((c) => (
        <div key={c.id} className="stack-xs companion-row">
          <div className="row between">
            <strong>
              {c.avatar} {c.name}
            </strong>
            {edit && (
              <ConfirmButton className="icon-btn" confirmLabel="✕ ?" onConfirm={() => save(list.filter((x) => x.id !== c.id))}>
                🗑️
              </ConfirmButton>
            )}
          </div>
          <span className="small muted">
            {c.attacks.map((a) => `${a.name} ${fmtBonus(a.bonus)} · ${a.damage} ${a.type}`).join(' ; ')} · {String(c.speed).replace('.', ',')} m
            {c.darkvision ? ` · vision dans le noir ${c.darkvision} m` : ''}
          </span>
          <div className="row gap">
            <label className="row gap small">
              PV max
              <input className="num-input" type="number" min={1} defaultValue={c.maxHp} disabled={!edit} onBlur={(e) => { const v = Math.max(1, parseInt(e.target.value, 10) || 1); if (v !== c.maxHp) update(c.id, { maxHp: v, hp: v }); }} aria-label={`PV max de ${c.name}`} />
            </label>
            <label className="row gap small">
              CA
              <input className="num-input" type="number" min={1} defaultValue={c.ac} disabled={!edit} onBlur={(e) => { const v = parseInt(e.target.value, 10) || c.ac; if (v !== c.ac) update(c.id, { ac: v }); }} aria-label={`CA de ${c.name}`} />
            </label>
          </div>
        </div>
      ))}
      {edit && (
        <div className="row gap">
          <select id="companion-template" className="grow" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Modèle de compagnon">
            <option value="">+ Ajouter un compagnon…</option>
            {COMPANION_TEMPLATES.map((t) => (
              <option key={t.name} value={t.name}>
                {t.avatar} {t.name} ({t.maxHp} PV, CA {t.ac})
              </option>
            ))}
          </select>
          <button className="btn" disabled={!pick} onClick={() => (save([...list, companionFrom(COMPANION_TEMPLATES.find((t) => t.name === pick)!)]), setPick(''))}>
            Ajouter
          </button>
        </div>
      )}
    </section>
  );
}
