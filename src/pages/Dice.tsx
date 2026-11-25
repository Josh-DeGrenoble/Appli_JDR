// Onglet Dés : composition de formule, lancer, jets cachés, fil des derniers jets.
import { cleanLabel } from '../lib/dnd/requests';
import { useEffect, useState } from 'react';
import { useSession } from '../data/session';
import type { CampaignView } from '../data/useCampaign';
import { useRoller } from '../data/useRoller';
import { appendDie, bumpModifier } from '../lib/dice';
import { timeAgo } from '../lib/ids';
import type { Roll } from '../lib/types';
import { ConfirmButton, Empty } from '../components/ui';

const DICE = [4, 6, 8, 10, 12, 20, 100];

export function DicePage({ view }: { view: CampaignView }) {
  const { store, user } = useSession();
  const roll = useRoller(view);
  const [formula, setFormula] = useState('');
  const [secret, setSecret] = useState(false);
  const [as, setAs] = useState('');
  const [last, setLast] = useState<Roll | null>(null);
  const [, tick] = useState(0);
  const data = view.data!;
  const rolls = data.rolls.filter((r) => r.kind !== 'event');
  const authors = view.isGM ? data.characters : view.myCharacters;

  // Rafraîchit les "il y a X min".
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const go = async (f = formula) => {
    if (!f) return;
    const author = authors.find((c) => c.id === as)?.name;
    const r = await roll(f, { secret, author });
    if (r) setLast(r);
  };

  return (
    <div className="stack">
      <section className="card stack-sm dice-box">
        <div className={`dice-result ${last ? 'show' : ''}`} key={last?.id} aria-live="polite">
          {last ? (
            <>
              <span className="dice-total">{last.total}</span>
              <span className="muted small">
                {last.formula} · {last.detail}
              </span>
            </>
          ) : (
            <span className="muted">Compose ta formule puis lance</span>
          )}
        </div>

        <div className="row gap">
          <input
            id="dice-formula"
            className="grow formula"
            value={formula}
            placeholder="ex : 2d6+3, 4d6kh3, 1d100"
            onChange={(e) => setFormula(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            aria-label="Formule de dés"
          />
          <button className="btn ghost small" onClick={() => setFormula('')} aria-label="Effacer la formule">
            ⌫
          </button>
        </div>

        <div className="dice-pad">
          {DICE.map((d) => (
            <button key={d} className="die" onClick={() => setFormula((f) => appendDie(f, d))}>
              d{d}
            </button>
          ))}
        </div>
        <div className="dice-pad mods">
          <button className="die mod" onClick={() => setFormula((f) => bumpModifier(f, -1))}>
            −1
          </button>
          <button className="die mod" onClick={() => setFormula((f) => bumpModifier(f, 1))}>
            +1
          </button>
          <button className="die mod" onClick={() => setFormula('2d20kh1')} title="Avantage">
            Av.
          </button>
          <button className="die mod" onClick={() => setFormula('2d20kl1')} title="Désavantage">
            Dés.
          </button>
        </div>

        <div className="row gap wrap">
          {authors.length > 0 && (
            <select id="dice-as" value={as} onChange={(e) => setAs(e.target.value)} aria-label="Lancer en tant que" className="grow">
              <option value="">{data.members.find((m) => m.user_id === user?.id)?.display_name || 'Moi'}</option>
              {authors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.avatar} {c.name}
                </option>
              ))}
            </select>
          )}
          <label className="check">
            <input id="dice-secret" type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
            {view.isGM ? 'Jet caché' : 'Visible MJ seul'}
          </label>
        </div>
        <button className="btn primary big" disabled={!formula} onClick={() => go()}>
          Lancer
        </button>
      </section>

      <section className="stack-sm">
        <div className="row between">
          <h2 className="section-title">Derniers jets</h2>
          {view.isGM && rolls.length > 0 && (
            <ConfirmButton className="link" confirmLabel="Effacer tout ?" onConfirm={() => store.clearRolls(data.campaign.id).then(view.reload)}>
              Effacer
            </ConfirmButton>
          )}
        </div>
        {rolls.length === 0 ? (
          <Empty icon="🎲" title="Aucun jet pour l’instant" />
        ) : (
          <ul className="feed">
            {rolls.map((r) => (
              <li key={r.id} className={`feed-row ${r.secret ? 'secret' : ''} ${r.user_id === user?.id ? 'mine' : ''}`}>
                <span className="feed-total">{r.total}</span>
                <span className="list-main">
                  <span>
                    <strong>{r.author_name}</strong>
                    {r.label && <> · {cleanLabel(r.label)}</>}
                    {r.secret && <span className="pill">caché</span>}
                  </span>
                  <span className="muted small ellipsis">
                    {r.formula} → {r.detail}
                  </span>
                </span>
                <span className="muted small nowrap">{timeAgo(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
