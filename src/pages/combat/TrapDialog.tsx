// MJ : réglage d'un piège de la carte (nom, sauvegarde, DD, dégâts). Secret : les joueurs ne voient pas le piège
// avant qu'il se déclenche. Le déclenchement est calculé par lib/dnd/traps.ts (et SQL combat_move).
import { useState } from 'react';
import { Modal } from '../../components/ui';
import { ABILITIES } from '../../lib/dnd/data';
import { DEFAULT_TRAP } from '../../lib/dnd/traps';
import { rollDice } from '../../lib/dice';
import type { TrapSecret } from '../../lib/dnd/combat';

const PRESETS: TrapSecret[] = [
  { name: 'Fosse', dc: 12, ability: 'dex', damage: '2d6', half: false },
  { name: 'Fléchettes empoisonnées', dc: 13, ability: 'con', damage: '2d10', half: true },
  { name: 'Lame pendulaire', dc: 15, ability: 'dex', damage: '4d10', half: true },
  { name: 'Rune de feu', dc: 15, ability: 'dex', damage: '4d8', half: true },
];

interface Props {
  trap?: TrapSecret;
  onSave: (t: TrapSecret | null) => void;
  onClose: () => void;
}

export function TrapDialog({ trap, onSave, onClose }: Props) {
  const [t, setT] = useState<TrapSecret>({ ...DEFAULT_TRAP, ...(trap ?? {}) });
  const [err, setErr] = useState('');
  const set = (p: Partial<TrapSecret>) => setT((o) => ({ ...o, ...p }));

  const save = () => {
    try {
      rollDice(t.damage);
      onSave({ ...t, name: t.name.trim() || 'Piège', dc: Math.max(1, Math.min(30, t.dc)) });
      onClose();
    } catch {
      setErr('Dégâts : écris une formule comme 2d10 ou 3d6+2');
    }
  };

  return (
    <Modal title="🪤 Piège" onClose={onClose}>
      <p className="muted small">Invisible pour les joueurs. Il se déclenche quand un pion s’arrête dessus (déplacement d’un joueur, ou n’importe quel pion en combat), puis devient visible.</p>
      <div className="chips">
        {PRESETS.map((p) => (
          <button key={p.name} className={`chip ${t.name === p.name ? 'on' : ''}`} onClick={() => setT(p)}>
            {p.name}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Nom</span>
        <input id="trap-name" value={t.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <div className="row gap">
        <label className="field grow">
          <span>Sauvegarde</span>
          <select id="trap-ability" value={t.ability} onChange={(e) => set({ ability: e.target.value as TrapSecret['ability'] })}>
            {ABILITIES.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>DD</span>
          <input id="trap-dc" className="num-input" type="number" value={t.dc} onChange={(e) => set({ dc: parseInt(e.target.value, 10) || 10 })} />
        </label>
      </div>
      <div className="row gap">
        <label className="field grow">
          <span>Dégâts</span>
          <input id="trap-damage" value={t.damage} onChange={(e) => (set({ damage: e.target.value }), setErr(''))} />
        </label>
        <label className="row gap small">
          <input type="checkbox" checked={t.half} onChange={(e) => set({ half: e.target.checked })} /> moitié si réussi
        </label>
      </div>
      {err && <p className="error small">{err}</p>}
      <div className="row gap">
        <button className="btn ghost grow" onClick={() => (onSave(null), onClose())}>
          Par défaut
        </button>
        <button className="btn primary grow" onClick={save}>
          Enregistrer
        </button>
      </div>
    </Modal>
  );
}
