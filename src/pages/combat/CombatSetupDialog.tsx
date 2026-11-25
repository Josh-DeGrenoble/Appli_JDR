// MJ : ajouter au combat des persos de la campagne ou des monstres (nombre, PV, CA, bonus d'initiative).
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { Modal } from '../../components/ui';
import type { CombatCtx } from './useCombat';
import { RangeSelect } from '../../components/RangeSelect';
import { uid } from '../../lib/ids';
import { ABILITIES, type Ability } from '../../lib/dnd/data';
import { BESTIARY, type BestiaryMonster } from '../../lib/dnd/srd/monsters';
import type { MonsterAttack } from '../../lib/dnd/combat';
import { attackLine } from './MonsterAttacks';

const MONSTER_AVATARS = ['👹', '👺', '💀', '🐺', '🕷️', '🐉', '🧟', '👻', '🐗', '🦂'];

/** `monstersOnly` : préparation d'un plan (pas de persos). */
export function CombatSetupDialog({ cx, view, onClose, monstersOnly }: { cx: CombatCtx; view: CampaignView; onClose: () => void; monstersOnly?: boolean }) {
  const [tab, setTab] = useState<'pc' | 'monster'>(monstersOnly ? 'monster' : 'pc');
  const inCombat = new Set(cx.combat.combatants.map((x) => x.characterId).filter(Boolean));
  const available = view.data!.characters.filter((c) => !inCombat.has(c.id));
  const [picked, setPicked] = useState<string[]>(available.filter((c) => c.owner_id !== view.data!.campaign.gm_id).map((c) => c.id));
  const [m, setM] = useState({
    name: '', count: 1, hp: 7, ac: 13, initBonus: 2, avatar: '👹', saves: {} as Record<Ability, number>,
    atkName: '', atkBonus: 4, atkDamage: '1d6+2', atkRange: 1.5, multiattack: 1, speed: 9,
  });
  const [preset, setPreset] = useState<MonsterAttack[] | null>(null);
  const [defenses, setDefenses] = useState<BestiaryMonster['defenses']>(undefined);
  const mine = view.data!.secrets?.bestiary ?? [];
  // Monstres favoris du lieu actuel, proposés en premier
  const place = (view.data!.secrets?.places ?? []).find((p) => p.id === view.data!.campaign.settings.place?.id);
  const favs = place?.monsters ?? [];
  const [hidden, setHidden] = useState(false);
  const num = (v: string) => parseInt(v, 10) || 0;
  /** Remplit le formulaire depuis le bestiaire. */
  const pickPreset = (name: string) => {
    const b = name.startsWith('m:') ? mine.find((x) => x.name === name.slice(2)) : BESTIARY.find((x) => x.name === name);
    if (!b) return setPreset(null), setDefenses(undefined);
    setDefenses(b.defenses);
    setM({ ...m, name: b.name, hp: b.hp, ac: b.ac, initBonus: b.init, avatar: b.avatar, saves: { ...(b.saves as Record<Ability, number>) }, multiattack: b.multiattack, speed: b.speed, atkName: '' });
    setPreset(b.attacks.map((a) => ({ ...a, id: uid() })));
  };

  return (
    <Modal title="Ajouter au combat" onClose={onClose}>
      <div className="segmented" hidden={monstersOnly}>
        <button className={tab === 'pc' ? 'on' : ''} onClick={() => setTab('pc')}>
          🛡️ Persos
        </button>
        <button className={tab === 'monster' ? 'on' : ''} onClick={() => setTab('monster')}>
          👹 Monstres
        </button>
      </div>

      {tab === 'pc' &&
        (available.length === 0 ? (
          <p className="muted">Tous les persos sont déjà dans le combat.</p>
        ) : (
          <>
            <div className="stack-xs">
              {available.map((c) => (
                <label key={c.id} className="check">
                  <input
                    type="checkbox"
                    checked={picked.includes(c.id)}
                    onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))}
                  />
                  {c.avatar} {c.name}
                </label>
              ))}
            </div>
            <button
              className="btn primary"
              disabled={!picked.length}
              onClick={() => {
                cx.addCharacters(picked);
                onClose();
              }}
            >
              Ajouter {picked.length} perso{picked.length > 1 ? 's' : ''}
            </button>
          </>
        ))}

      {tab === 'monster' && (
        <form
          className="stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const own = m.atkName.trim() ? [{ id: uid(), name: m.atkName.trim(), bonus: m.atkBonus, damage: m.atkDamage.trim() || '1', range: m.atkRange, type: '' }] : [];
            cx.addMonsters({ ...m, attacks: [...(preset ?? []), ...own], hidden, defenses });
            onClose();
          }}
        >
          <label className="field">
            <span>📚 Bestiaire (remplit tout)</span>
            <select id="mon-preset" defaultValue="" onChange={(e) => pickPreset(e.target.value)}>
              <option value="">Monstre personnalisé</option>
              {favs.length > 0 && (
                <optgroup label={`⭐ ${place?.name ?? 'Lieu actuel'}`}>
                  {favs.map((k) => {
                    const b = k.startsWith('m:') ? mine.find((x) => x.name === k.slice(2)) : BESTIARY.find((x) => x.name === k);
                    return b ? (
                      <option key={`f-${k}`} value={k}>
                        ⭐ {b.avatar} {b.name} (FP {b.cr})
                      </option>
                    ) : null;
                  })}
                </optgroup>
              )}
              {mine.length > 0 && (
                <optgroup label="Mes monstres">
                  {mine.map((b) => (
                    <option key={`m-${b.name}`} value={`m:${b.name}`}>
                      {b.avatar} {b.name} (FP {b.cr})
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Bestiaire du SRD">
                {BESTIARY.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.avatar} {b.name} (FP {b.cr})
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          {preset && (
            <ul className="muted small preset-attacks">
              {preset.map((a) => (
                <li key={a.id}>
                  <strong>{a.name}</strong> {attackLine(a)}
                </li>
              ))}
              {m.multiattack > 1 && <li>{m.multiattack} attaques par action</li>}
            </ul>
          )}
          <div className="row gap">
            <label className="field grow">
              <span>Nom</span>
              <input id="mon-name" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="Gobelin" autoFocus />
            </label>
            <label className="field">
              <span>Nombre</span>
              <input id="mon-count" className="num-input" type="number" min={1} max={20} value={m.count} onChange={(e) => setM({ ...m, count: Math.min(20, Math.max(1, num(e.target.value))) })} />
            </label>
          </div>
          <div className="row gap">
            <label className="field">
              <span>PV</span>
              <input id="mon-hp" className="num-input" type="number" min={1} value={m.hp} onChange={(e) => setM({ ...m, hp: Math.max(1, num(e.target.value)) })} />
            </label>
            <label className="field">
              <span>CA</span>
              <input id="mon-ac" className="num-input" type="number" value={m.ac} onChange={(e) => setM({ ...m, ac: num(e.target.value) })} />
            </label>
            <label className="field">
              <span>Bonus init.</span>
              <input id="mon-init" className="num-input" type="number" value={m.initBonus} onChange={(e) => setM({ ...m, initBonus: num(e.target.value) })} />
            </label>
          </div>
          <span className="label">Bonus de sauvegarde (pour les sorts des joueurs)</span>
          <div className="saves-grid">
            {ABILITIES.map((a) => (
              <label key={a.key} className="field">
                <span>{a.short}</span>
                <input
                  className="num-input"
                  type="number"
                  value={m.saves[a.key] ?? 0}
                  onChange={(e) => setM({ ...m, saves: { ...m.saves, [a.key]: num(e.target.value) } })}
                  aria-label={`Sauvegarde ${a.label}`}
                />
              </label>
            ))}
          </div>
          <span className="label">Attaque principale (jouée par le MJ, modifiable ensuite)</span>
          <div className="row gap">
            <input id="mon-atk-name" className="grow" placeholder="Cimeterre" value={m.atkName} onChange={(e) => setM({ ...m, atkName: e.target.value })} aria-label="Nom de l’attaque" />
            <input id="mon-atk-bonus" className="num-input" type="number" value={m.atkBonus} onChange={(e) => setM({ ...m, atkBonus: num(e.target.value) })} aria-label="Bonus d’attaque" />
          </div>
          <div className="row gap">
            <input id="mon-atk-dmg" className="grow" placeholder="1d6+2" value={m.atkDamage} onChange={(e) => setM({ ...m, atkDamage: e.target.value })} aria-label="Dégâts" />
            <RangeSelect id="mon-atk-range" value={m.atkRange} allowSelf={false} onChange={(v) => setM({ ...m, atkRange: v })} />
          </div>
          <div className="row gap">
            <label className="field">
              <span>Attaques / action</span>
              <input id="mon-multi" className="num-input" type="number" min={1} value={m.multiattack} onChange={(e) => setM({ ...m, multiattack: Math.max(1, num(e.target.value)) })} />
            </label>
            <label className="field">
              <span>Vitesse (m)</span>
              <input id="mon-speed" className="num-input" type="number" min={0} step={1.5} value={m.speed} onChange={(e) => setM({ ...m, speed: Math.max(0, parseFloat(e.target.value) || 0) })} />
            </label>
          </div>
          <div className="avatar-picker">
            {MONSTER_AVATARS.map((a) => (
              <button type="button" key={a} className={a === m.avatar ? 'on' : ''} onClick={() => setM({ ...m, avatar: a })}>
                {a}
              </button>
            ))}
          </div>
          <p className="muted small">Les PV et la CA des monstres restent secrets : les joueurs ne voient que leur état (indemne, blessé, en sang, vaincu).</p>
          <label className="check">
            <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Cachés aux joueurs (embuscade)
          </label>
          <button className="btn primary" disabled={!m.name.trim()}>
            Ajouter {m.count > 1 ? `${m.count} monstres` : 'le monstre'}
          </button>
        </form>
      )}
    </Modal>
  );
}
