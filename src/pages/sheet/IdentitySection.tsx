// Fiche : en-tête (avatar, nom, résumé) et identité D&D (espèce, classe, historique…), dépliable. Niveau et XP : LevelBar / MJ.
import { useState } from 'react';
import { useSession } from '../../data/session';
import { LazyInput, Modal } from '../../components/ui';
import { ALIGNMENTS, BACKGROUNDS, CLASSES, SIZES, SPECIES, findClass } from '../../lib/dnd/data';
import { AVATARS } from '../../lib/templates';
import type { SheetCtx } from './useSheet';
import { xpPatch } from '../../lib/dnd/levels';
import { speciesDarkvision } from '../../lib/dnd/srd/creation';

/** Résumé d'une ligne : « Elfe · Rôdeur 3 ». */
export function identityLine(s: { species: string; className: string; level: number }) {
  return [s.species, s.className ? `${s.className} ${s.level}` : `Niveau ${s.level}`].filter(Boolean).join(' · ');
}

export function SheetHeader({ ctx }: { ctx: SheetCtx }) {
  const { store } = useSession();
  const { c, s, can, view, fail } = ctx;
  const [avatarOpen, setAvatarOpen] = useState(false);
  const save = (p: { name?: string; avatar?: string }) => store.updateCharacter(c.id, p).then(view.reload).catch(fail);

  return (
    <section className="sheet-head">
      <button className="avatar big" disabled={!can.id} onClick={() => setAvatarOpen(true)} aria-label="Changer d’avatar">
        {c.avatar}
      </button>
      <div className="grow stack-xs">
        {can.id ? (
          <LazyInput id="sheet-name" className="title-input" value={c.name} onCommit={(name) => save({ name })} aria-label="Nom" />
        ) : (
          <h2 className="title-input">{c.name}</h2>
        )}
        <span className="muted">{identityLine(s)}</span>
        <span className="muted small">Joué par {view.memberName(c.owner_id)}</span>
      </div>
      {avatarOpen && (
        <Modal title="Avatar" onClose={() => setAvatarOpen(false)}>
          <div className="avatar-picker">
            {AVATARS.map((a) => (
              <button key={a} className={a === c.avatar ? 'on' : ''} onClick={() => (save({ avatar: a }), setAvatarOpen(false))}>
                {a}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </section>
  );
}

export function IdentitySection({ ctx }: { ctx: SheetCtx }) {
  const { s, can, patch } = ctx;
  const [open, setOpen] = useState(false);
  const ro = !can.stats;

  /** Change la classe ; propose ses sauvegardes et son dé de vie si rien n'est encore coché. */
  const setClass = (name: string) => {
    const cls = findClass(name);
    patch({
      className: name,
      ...(cls ? { hitDie: cls.hitDie } : {}),
      ...(cls && s.saveProf.length === 0 ? { saveProf: cls.saves } : {}),
    });
  };

  const text = (id: string, label: string, value: string, onCommit: (v: string) => void, list?: string, wide = false) => (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <LazyInput id={id} value={value} disabled={ro} onCommit={onCommit} aria-label={label} list={list} />
    </label>
  );

  return (
    <section className="card stack-sm">
      <button className="row between section-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <h3 className="section-title">Identité</h3>
        <span className="muted small">
          {s.background || 'historique ?'} {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div className="fields">
          {text('id-species', 'Espèce', s.species, (v) => patch({ species: v }), 'list-species')}
          <label className="field">
            <span>Classe</span>
            <select id="id-class" value={findClass(s.className)?.name ?? (s.className ? '__autre' : '')} disabled={ro} onChange={(e) => e.target.value !== '__autre' && setClass(e.target.value)}>
              <option value="">Choisir…</option>
              {CLASSES.map((cl) => (
                <option key={cl.name} value={cl.name}>
                  {cl.name} (d{cl.hitDie})
                </option>
              ))}
              {s.className && !findClass(s.className) && <option value="__autre">{s.className}</option>}
            </select>
          </label>
          {text('id-subclass', 'Sous-classe', s.subclass, (v) => patch({ subclass: v }))}
          {text('id-bg', 'Historique', s.background, (v) => patch({ background: v }), 'list-bg')}
          <label className="field">
            <span>Alignement</span>
            <select id="id-align" value={s.alignment} disabled={ro} onChange={(e) => patch({ alignment: e.target.value })}>
              <option value="">—</option>
              {ALIGNMENTS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Taille</span>
            <select id="id-size" value={s.size} disabled={ro} onChange={(e) => patch({ size: e.target.value })}>
              {SIZES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>XP {ctx.gm ? '' : '(MJ)'}</span>
            <LazyInput id="id-xp" value={String(s.xp)} disabled={!ctx.gm} onCommit={(v) => patch(xpPatch(s, (parseInt(v, 10) || 0) - s.xp))} aria-label="XP" />
          </label>
          <label className="field">
            <span>Vision dans le noir (m)</span>
            <LazyInput id="id-darkvision" value={String(s.darkvision ?? speciesDarkvision(s.species))} disabled={ro} onCommit={(v) => patch({ darkvision: Math.max(0, parseFloat(v.replace(',', '.')) || 0) })} aria-label="Vision dans le noir" />
          </label>
          {text('id-lang', 'Langues', s.languages, (v) => patch({ languages: v }), undefined, true)}
          {text('id-training', 'Maîtrises (armes, armures, outils)', s.training, (v) => patch({ training: v }), undefined, true)}
          <datalist id="list-species">{SPECIES.map((x) => <option key={x} value={x} />)}</datalist>
          <datalist id="list-bg">{BACKGROUNDS.map((x) => <option key={x} value={x} />)}</datalist>
        </div>
      )}
    </section>
  );
}
