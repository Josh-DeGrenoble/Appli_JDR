// Ligne de l'ordre d'initiative : distance avec le perso qui agit, ciblable ou non, PV (persos) ou état (monstres).
import type { CampaignView } from '../../data/useCampaign';
import type { Combatant } from '../../lib/dnd/combat';
import { conditionOf } from '../../lib/dnd/data';
import { normalizeSheet } from '../../lib/dnd/sheet';
import { distance, fmtDistance } from '../../lib/dnd/grid';
import { hpOf } from '../../lib/templates';
import type { CombatCtx } from './useCombat';
import { activeEffects } from '../../lib/dnd/effects';

interface Props {
  cx: CombatCtx;
  view: CampaignView;
  x: Combatant;
  active: boolean;
  actor: Combatant | null;
  targetState?: 'can' | 'no';
  targeted: boolean;
  onTouch: () => void;
}

export function CombatRow({ cx, view, x, active, actor, targetState, targeted, onTouch }: Props) {
  const owner = x.characterId ? view.data!.characters.find((c) => c.id === x.characterId) : undefined;
  const ch = x.companion ? undefined : owner;
  // Compagnon : ses propres PV (publics)
  const hp = x.companion ? { current: x.companion.hp, max: x.companion.maxHp, temp: 0 } : ch ? hpOf(ch) : null;
  const sheet = ch ? normalizeSheet(ch.sheet) : null;
  const sec = cx.secrets.monsters[x.id];
  const conds = [...x.conditions, ...(sheet?.conditions ?? [])];
  const down = (hp && hp.max > 0 && hp.current === 0) || x.status === 'vaincu';
  const pct = hp && hp.max ? (hp.current / hp.max) * 100 : sec && sec.maxHp ? (sec.hp / sec.maxHp) * 100 : null;
  const dist = actor && actor.id !== x.id ? fmtDistance(distance(actor, x)) : actor?.id === x.id ? 'toi' : null;
  const cls = ['init-row', x.kind, active && 'active', down && 'down', targetState && `t-${targetState}`, targeted && 'targeted'].filter(Boolean).join(' ');

  return (
    <li className={cls}>
      <span className="init-value">{x.initiative ?? '–'}</span>
      <button className="init-main" onClick={onTouch} aria-pressed={targeted}>
        <span className="avatar">{x.avatar}</span>
        <span className="list-main">
          <strong className="ellipsis">
            {x.name}
            {x.companion && owner && <span className="muted small"> · 🐾 {owner.name}</span>}
          </strong>
          <span className="small muted">
            {x.kind === 'pc' && hp && `${hp.current}/${hp.max} PV${hp.temp ? ` +${hp.temp}` : ''}`}
            {x.kind === 'monster' && (cx.isGM && sec ? `${sec.hp}/${sec.maxHp} PV · CA ${sec.ac}` : '')}
            {x.kind === 'monster' && <span className={`status st-${(x.status ?? 'indemne').replace(' ', '-')}`}>{x.status ?? 'indemne'}</span>}
            {sheet?.concentration && <span title={`Concentration : ${sheet.concentration}`}> · 🧠 {sheet.concentration}</span>}
          </span>
          {pct !== null && (x.kind === 'pc' || cx.isGM) && (
            <span className={`bar bar-hp mini ${pct <= 25 ? 'low' : ''}`}>
              <span className="bar-fill" style={{ width: Math.max(0, pct) + '%' }} />
            </span>
          )}
        </span>
        <span className="row-side">
          {dist && <span className={`dist ${dist === 'toi' ? 'me' : ''}`}>{dist}</span>}
          <span className="row-conds">
            {conds.map((k) => (
              <span key={k} title={conditionOf(k)?.label}>
                {conditionOf(k)?.icon}
              </span>
            ))}
            {x.used?.dodge ? <span title="Esquive : désavantage pour l’attaquer">🛡️</span> : null}
            {x.helped && <span title="Aidé : avantage à sa prochaine attaque">🤝</span>}
            {activeEffects(x, Math.max(1, cx.combat.round)).map((e) => (
              <span key={e.id} className="effect-badge" title={`${e.name} : encore ${e.until - Math.max(1, cx.combat.round) + 1} round(s)`}>
                {e.icon}
                <small>{e.until - Math.max(1, cx.combat.round) + 1}</small>
              </span>
            ))}
          </span>
        </span>
      </button>
      {active && <span className="turn-flag">▶</span>}
    </li>
  );
}
