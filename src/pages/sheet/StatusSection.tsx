// Fiche : états (conditions), épuisement, repos court (dés de vie) et repos long.
import { useState } from 'react';
import { useSession } from '../../data/session';
import { logEvent, longRestChar, toggleCondition } from '../../data/actions';
import { ConfirmButton, Modal } from '../../components/ui';
import { CONDITIONS, EXHAUSTION_MAX, conditionOf } from '../../lib/dnd/data';
import { shortRestPatch } from '../../lib/dnd/actions';
import { exhaustionPenalty, hitDieFormula } from '../../lib/dnd/rules';
import { normalizeSheet } from '../../lib/dnd/sheet';
import type { SheetCtx } from './useSheet';
import { DefensesEditor } from '../../components/DefensesEditor';

export function StatusSection({ ctx }: { ctx: SheetCtx }) {
  const { store } = useSession();
  const { c, s, can, patch, view, fail } = ctx;
  const [picker, setPicker] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [shortRest, setShortRest] = useState(false);
  const shown = info ? conditionOf(info) : null;

  return (
    <section className="card stack-sm">
      <h3 className="section-title">États et repos</h3>
      <div className="chips">
        {s.conditions.map((k) => {
          const cd = conditionOf(k);
          return (
            <button key={k} className="chip cond" onClick={() => setInfo(k)}>
              {cd?.icon} {cd?.label ?? k}
            </button>
          );
        })}
        {s.conditions.length === 0 && <span className="muted small">Aucun état.</span>}
        {can.id && (
          <button className="chip add" onClick={() => setPicker(true)}>
            + État
          </button>
        )}
      </div>

      <div className="row between">
        <span>
          Épuisement <strong>{s.exhaustion}</strong>/{EXHAUSTION_MAX}
          {s.exhaustion > 0 && <span className="muted small"> · {exhaustionPenalty(s)} aux d20</span>}
        </span>
        {!ctx.gm && <span className="muted small">géré par le MJ</span>}
        {ctx.gm && <div className="stepper">
          <button className="step" disabled={!ctx.gm || s.exhaustion <= 0} onClick={() => patch({ exhaustion: s.exhaustion - 1 })} aria-label="Épuisement −1">
            −
          </button>
          <button className="step" disabled={!ctx.gm || s.exhaustion >= EXHAUSTION_MAX} onClick={() => patch({ exhaustion: s.exhaustion + 1 })} aria-label="Épuisement +1">
            +
          </button>
        </div>}
      </div>

      <DefensesEditor value={s.defenses} readOnly={!ctx.gm} onChange={(defenses) => patch({ defenses })} />

      {!can.hp && <p className="muted small">Les PV et les repos sont gérés par le MJ.</p>}
      {can.hp && (
        <div className="row gap">
          <button className="btn grow" onClick={() => setShortRest(true)}>
            ☕ Repos court
          </button>
          <ConfirmButton className="btn grow" confirmLabel="Confirmer le repos long ?" onConfirm={() => longRestChar(store, c).then(() => (logEvent(store, c.campaign_id, `🌙 ${c.name} fait un repos long`, c.name), view.reload())).catch(fail)}>
            🌙 Repos long
          </ConfirmButton>
        </div>
      )}

      {picker && (
        <Modal title="Ajouter un état" onClose={() => setPicker(false)}>
          <div className="cond-grid">
            {CONDITIONS.map((cd) => (
              <button
                key={cd.key}
                className={`option ${s.conditions.includes(cd.key) ? 'on' : ''}`}
                disabled={!ctx.gm && s.conditions.includes(cd.key)}
                onClick={() => toggleCondition(store, c, cd.key).then(view.reload).catch(fail)}
              >
                <span>
                  <strong>
                    {cd.icon} {cd.label}
                  </strong>
                  <span className="muted small">{cd.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {shown && (
        <Modal title={`${shown.icon} ${shown.label}`} onClose={() => setInfo(null)}>
          <p>{shown.hint}</p>
          {!ctx.gm && <p className="muted small">Seul le MJ peut retirer un état.</p>}
          {ctx.gm && (
            <button className="btn" onClick={() => (toggleCondition(store, c, shown.key, false).then(view.reload).catch(fail), setInfo(null))}>
              Retirer cet état
            </button>
          )}
        </Modal>
      )}
      {shortRest && <ShortRestDialog ctx={ctx} onClose={() => setShortRest(false)} />}
    </section>
  );
}

function ShortRestDialog({ ctx, onClose }: { ctx: SheetCtx; onClose: () => void }) {
  const { store } = useSession();
  const { c, s, roll, patch, view, fail } = ctx;
  const [healed, setHealed] = useState<number[]>([]);
  const [startUsed] = useState(s.hitDiceUsed);
  const left = Math.max(0, s.level - startUsed - healed.length);

  const spend = async () => {
    const total = await roll('Dé de vie (repos court)', hitDieFormula(s));
    if (total === null) return;
    const gain = Math.max(0, total);
    await store.applyHp(c.id, gain).catch(fail);
    patch({ hitDiceUsed: startUsed + healed.length + 1 });
    setHealed((h) => [...h, gain]);
    view.reload();
  };

  return (
    <Modal title="Repos court" onClose={onClose}>
      <p>
        Dépense des dés de vie pour récupérer des PV : chaque dé rend <strong>{hitDieFormula(s)}</strong> PV.
      </p>
      <p className="muted">Dés de vie restants : {left}</p>
      {healed.length > 0 && <p>Soigné : {healed.map((h) => `+${h}`).join(', ')} PV</p>}
      <button className="btn primary" disabled={left <= 0} onClick={spend}>
        🎲 Dépenser un dé de vie
      </button>
      <button
        className="btn ghost"
        onClick={() => {
          patch(shortRestPatch(normalizeSheet(c.sheet)));
          onClose();
        }}
      >
        Terminer le repos (capacités{s.spellcasting.pact ? ', pacte' : ''})
      </button>
    </Modal>
  );
}
