// Fiche : bourse D&D (pp, po, pe, pa, pc), modifiable par type de pièce.
import { useState } from 'react';
import { useSession } from '../../data/session';
import { AmountDialog } from '../../components/ui';
import { COINS, type Coin } from '../../lib/dnd/data';
import { totalGold } from '../../lib/dnd/rules';
import type { SheetCtx } from './useSheet';
import { logEvent } from '../../data/actions';

export function CoinsSection({ ctx }: { ctx: SheetCtx }) {
  const { store } = useSession();
  const { c, s, can, view, fail } = ctx;
  const [edit, setEdit] = useState<Coin | null>(null);
  const info = COINS.find((x) => x.key === edit);

  return (
    <section className="card stack-sm">
      <div className="row between">
        <h3 className="section-title">Bourse</h3>
        <span className="muted small">≈ {totalGold(s.coins)} po</span>
      </div>
      <div className="coins">
        {COINS.map((co) => (
          <button key={co.key} className={`coin coin-${co.key}`} disabled={!can.inv} onClick={() => setEdit(co.key)} aria-label={`${co.name} : ${s.coins[co.key]}`}>
            <strong>{s.coins[co.key]}</strong>
            <span>{co.label}</span>
          </button>
        ))}
      </div>
      {edit && info && (
        <AmountDialog
          title={`Pièces de ${info.name.toLowerCase()} (${info.label})`}
          current={s.coins[edit]}
          allowAdd={ctx.gm}
          allowSet={ctx.gm}
          onClose={() => setEdit(null)}
          onApply={({ delta, set }) =>
            store
              .adjustCoins(c.id, edit, delta ?? (set ?? 0) - s.coins[edit])
              .then(() => {
                const d = delta ?? (set ?? 0) - s.coins[edit];
                if (d) logEvent(store, c.campaign_id, `💰 ${c.name} : ${d > 0 ? '+' : '−'}${Math.abs(d)} ${edit}`, c.name);
                view.reload();
              })
              .catch(fail)
          }
        />
      )}
    </section>
  );
}
