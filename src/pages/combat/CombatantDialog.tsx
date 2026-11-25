// MJ : détail d'un combattant. Monstre : PV secrets (dégâts/soins), CA, états. Perso : PV via sa fiche. Initiative, retrait.
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { ConfirmButton, Modal } from '../../components/ui';
import { ABILITIES, CONDITIONS } from '../../lib/dnd/data';
import { navigate } from '../../router';
import { HpDialog } from '../sheet/HpDialog';
import type { CombatCtx } from './useCombat';
import { MonsterAttacks } from './MonsterAttacks';
import { EffectsEditor } from './EffectsEditor';
import { companionHp } from '../../lib/dnd/companions';
import { DefensesEditor } from '../../components/DefensesEditor';

export function CombatantDialog({ cx, view, id, onClose }: { cx: CombatCtx; view: CampaignView; id: string; onClose: () => void }) {
  const x = cx.combat.combatants.find((c) => c.id === id);
  const [amount, setAmount] = useState('');
  const [hpOpen, setHpOpen] = useState(false);
  if (!x) return null;
  const sec = cx.secrets.monsters[x.id];
  const ch = x.characterId ? view.data!.characters.find((c) => c.id === x.characterId) : undefined;
  const n = parseInt(amount, 10);
  const ok = !Number.isNaN(n) && n > 0;

  return (
    <Modal title={`${x.avatar} ${x.name}`} onClose={onClose}>
      <label className="row between">
        <span>Initiative</span>
        <input
          key={x.initiative ?? 'none'}
          className="num-input"
          type="number"
          defaultValue={x.initiative ?? ''}
          aria-label="Initiative"
          onBlur={(e) => e.target.value !== '' && Number(e.target.value) !== x.initiative && cx.setInit(x, parseInt(e.target.value, 10) || 0)}
        />
      </label>

      {x.kind === 'monster' && sec && (
        <>
          <p className="hp-recap">
            <strong>{sec.hp}</strong> / {sec.maxHp} PV · CA {sec.ac}
          </p>
          <input id="mon-amount" className="big-input" inputMode="numeric" placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          <div className="row gap">
            <button className="btn hurt grow" disabled={!ok} onClick={() => (cx.adjustMonster(x, -n), setAmount(''))}>
              💥 Dégâts
            </button>
            <button className="btn heal grow" disabled={!ok} onClick={() => (cx.adjustMonster(x, n), setAmount(''))}>
              ✨ Soins
            </button>
          </div>
          <div className="saves-grid">
            {ABILITIES.map((a) => (
              <label key={a.key} className="field">
                <span>JS {a.short}</span>
                <input
                  className="num-input"
                  type="number"
                  defaultValue={sec.saves?.[a.key] ?? 0}
                  onBlur={(e) => cx.updateMonster(x.id, { saves: { ...(sec.saves ?? {}), [a.key]: parseInt(e.target.value, 10) || 0 } })}
                  aria-label={`Sauvegarde ${a.label}`}
                />
              </label>
            ))}
          </div>
          <MonsterAttacks attacks={sec.attacks ?? []} multi={sec.multiattack ?? 1} onChange={(attacks, multiattack) => cx.updateMonster(x.id, { attacks, multiattack })} />
          <DefensesEditor value={sec.defenses} onChange={(defenses) => cx.updateMonster(x.id, { defenses })} />
          <label className="field">
            <span>Notes du MJ</span>
            <textarea
              rows={2}
              defaultValue={sec.notes}
              onBlur={(e) => e.target.value !== sec.notes && cx.updateMonster(x.id, { notes: e.target.value })}
            />
          </label>
        </>
      )}

      {x.companion && (
        <>
          <p className="hp-recap">
            🐾 <strong>{x.companion.hp}</strong> / {x.companion.maxHp} PV · CA {x.companion.ac}
          </p>
          <input id="comp-amount" className="big-input" inputMode="numeric" placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          <div className="row gap">
            <button className="btn hurt grow" disabled={!ok} onClick={() => (cx.mutate((c) => ({ combat: { ...c, combatants: c.combatants.map((y) => (y.id === x.id && y.companion ? { ...y, companion: { ...y.companion, hp: companionHp(y, -n) } } : y)) } })), setAmount(''))}>
              💥 Dégâts
            </button>
            <button className="btn heal grow" disabled={!ok} onClick={() => (cx.mutate((c) => ({ combat: { ...c, combatants: c.combatants.map((y) => (y.id === x.id && y.companion ? { ...y, companion: { ...y.companion, hp: companionHp(y, n) }, status: undefined } : y)) } })), setAmount(''))}>
              ✨ Soins
            </button>
          </div>
        </>
      )}

      {x.kind === 'pc' && ch && !x.companion && (
        <div className="row gap">
          <button className="btn grow" onClick={() => setHpOpen(true)}>
            ❤️ PV
          </button>
          <button className="btn grow" onClick={() => navigate(`/c/${ch.campaign_id}/perso/${ch.id}`)}>
            Ouvrir la fiche
          </button>
        </div>
      )}

      <EffectsEditor cx={cx} x={x} />

      {x.kind === 'monster' && (
        <label className="check">
          <input type="checkbox" checked={!!x.hidden} onChange={(e) => cx.setHidden(x, e.target.checked)} /> Caché aux joueurs (embuscade)
        </label>
      )}

      {x.kind === 'monster' && (
        <div className="stack-xs">
          <span className="label">États</span>
          <div className="chips">
            {CONDITIONS.map((c) => (
              <button key={c.key} className={`chip ${x.conditions.includes(c.key) ? 'on' : ''}`} onClick={() => cx.toggleCondition(x, c.key)}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <ConfirmButton
        onConfirm={() => {
          cx.remove(x);
          onClose();
        }}
      >
        Retirer du combat
      </ConfirmButton>
      {hpOpen && ch && <HpDialog c={ch} onClose={() => setHpOpen(false)} onDone={view.reload} />}
    </Modal>
  );
}
