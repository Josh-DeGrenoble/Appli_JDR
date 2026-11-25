// Bandeau « Niveau » de la fiche. Le MJ accorde les niveaux (+1, ou XP dans l'onglet MJ) et peut revenir d'un niveau
// en arrière (fausse manip) ; le joueur choisit ensuite ses gains niveau par niveau (LevelUpDialog).
import { useState } from 'react';
import { useSession } from '../../data/session';
import { logEvent } from '../../data/actions';
import { ConfirmButton } from '../../components/ui';
import { allowedLevelOf, canLevelUp, grantLevelPatch, xpToNext } from '../../lib/dnd/levels';
import { LevelUpDialog } from './LevelUpDialog';
import type { SheetCtx } from './useSheet';

export function LevelBar({ ctx }: { ctx: SheetCtx }) {
  const { store, user } = useSession();
  const [open, setOpen] = useState(false);
  const { s, c, gm } = ctx;
  const mine = c.owner_id === user?.id;
  const allowed = allowedLevelOf(s);
  const ready = canLevelUp(s);
  const toNext = xpToNext(s);

  const grant = () => {
    ctx.patch(grantLevelPatch(s));
    logEvent(store, c.campaign_id, `⬆️ Le MJ accorde le niveau ${allowed + 1} à ${c.name}`, 'MJ');
  };
  const down = () =>
    store
      .levelDown(c.id)
      .then(() => (logEvent(store, c.campaign_id, `⬇️ ${c.name} : niveau retiré par le MJ`, 'MJ'), ctx.view.reload()))
      .catch(ctx.fail);

  return (
    <section className={`card level-bar ${ready ? 'ready' : ''}`}>
      <div className="row between gap">
        <div className="stack-xs">
          <strong>
            Niveau {s.level}
            {s.subclass ? <span className="muted small"> · {s.subclass}</span> : null}
          </strong>
          <span className="muted small">
            {s.xp} XP{toNext !== null ? ` · encore ${toNext} pour le niveau ${s.level + 1}` : ''}
            {allowed > s.level ? ` · niveau ${allowed} accordé` : ''}
          </span>
        </div>
        {gm && (
          <div className="row gap">
            <ConfirmButton className="btn small ghost" confirmLabel={allowed > s.level ? 'Retirer ?' : `Annuler niv. ${s.level} ?`} onConfirm={down}>
              −1
            </ConfirmButton>
            <button className="btn small" disabled={allowed >= 20} onClick={grant} aria-label="Accorder un niveau">
              +1 niveau
            </button>
          </div>
        )}
      </div>
      {ready && (mine || gm) && !ctx.editing && (
        <button className="btn primary full levelup-btn" onClick={() => setOpen(true)} aria-label={`Passer niveau ${s.level + 1}`}>
          ⬆️ Choisir le niveau {s.level + 1}
        </button>
      )}
      {ready && !mine && !gm && <p className="muted small">Niveau {s.level + 1} en attente de son joueur.</p>}
      {open && <LevelUpDialog ctx={ctx} onClose={() => setOpen(false)} />}
    </section>
  );
}
