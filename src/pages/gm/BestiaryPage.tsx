// Onglet MJ, volet Bestiaire : monstres préparés à l'avance (statistiques, sauvegardes, attaques), à partir de
// rien ou d'un monstre du SRD. Ils apparaissent dans « Mes monstres » à l'ajout au combat ou dans un plan préparé.
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { useSession } from '../../data/session';
import { useToast } from '../../components/Toast';
import { ConfirmButton, Empty, Modal } from '../../components/ui';
import type { CampaignSecrets } from '../../lib/dnd/combat';
import { ABILITIES, type Ability } from '../../lib/dnd/data';
import { BESTIARY, type BestiaryMonster } from '../../lib/dnd/srd/monsters';
import { MonsterAttacks, attackLine } from '../combat/MonsterAttacks';
import { DefensesEditor } from '../../components/DefensesEditor';

const AVATARS = ['👹', '👺', '💀', '🐺', '🕷️', '🐉', '🧟', '👻', '🐗', '🦂', '🧙', '🗡️', '🐻', '🦇', '🐍', '🧌'];
const BLANK: BestiaryMonster = { name: 'Nouveau monstre', avatar: '👹', cr: '1', hp: 20, ac: 13, init: 1, speed: 9, saves: {}, multiattack: 1, attacks: [] };

export function BestiaryPage({ view }: { view: CampaignView }) {
  const { store } = useSession();
  const toast = useToast();
  const id = view.data!.campaign.id;
  const list = view.data!.secrets?.bestiary ?? [];
  const [edit, setEdit] = useState<{ m: BestiaryMonster; index: number } | null>(null);

  /** Modifie les secrets à partir de leur dernière version (ne pas écraser les PV des monstres en combat). */
  const update = async (fn: (b: BestiaryMonster[]) => BestiaryMonster[]) => {
    try {
      const d = await store.loadCampaign(id);
      const sec: CampaignSecrets = { monsters: {}, ...(d.secrets ?? {}) };
      await store.saveSecrets(id, { ...sec, bestiary: fn(sec.bestiary ?? []) });
      view.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div className="stack">
      <div className="row gap">
        <button className="btn primary grow" onClick={() => setEdit({ m: structuredClone(BLANK), index: -1 })}>
          + Nouveau monstre
        </button>
        <select className="grow" value="" aria-label="Copier un monstre du SRD" onChange={(e) => {
          const b = BESTIARY.find((x) => x.name === e.target.value);
          if (b) setEdit({ m: { ...structuredClone(b), name: `${b.name} (modifié)` }, index: -1 });
        }}>
          <option value="">📚 Partir du SRD…</option>
          {BESTIARY.map((b) => (
            <option key={b.name} value={b.name}>
              {b.avatar} {b.name}
            </option>
          ))}
        </select>
      </div>
      {list.length === 0 ? (
        <Empty icon="🐉" title="Aucun monstre préparé">
          <p className="muted">Prépare tes monstres (boss, PNJ hostiles…) avec leurs statistiques : tu les retrouveras dans « Mes monstres » en un tap.</p>
        </Empty>
      ) : (
        <ul className="inv">
          {list.map((m, i) => (
            <li key={`${m.name}-${i}`} className="inv-row">
              <button className="inv-main" onClick={() => setEdit({ m: structuredClone(m), index: i })} aria-label={`Modifier ${m.name}`}>
                <span className="inv-name">
                  {m.avatar} {m.name} <span className="muted small">FP {m.cr}</span>
                </span>
                <span className="muted small ellipsis">
                  {m.hp} PV · CA {m.ac} · {m.attacks.map((a) => a.name).join(', ') || 'aucune attaque'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {edit && (
        <MonsterEditor
          m={edit.m}
          isNew={edit.index < 0}
          onSave={(m) => update((b) => (edit.index < 0 ? [...b, m] : b.map((x, i) => (i === edit.index ? m : x)))).then(() => setEdit(null))}
          onDelete={() => update((b) => b.filter((_x, i) => i !== edit.index)).then(() => setEdit(null))}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  );
}

interface EditorProps {
  m: BestiaryMonster;
  isNew: boolean;
  onSave: (m: BestiaryMonster) => void;
  onDelete: () => void;
  onClose: () => void;
}

function MonsterEditor({ m: initial, isNew, onSave, onDelete, onClose }: EditorProps) {
  const [m, setM] = useState(initial);
  const num = (k: 'hp' | 'ac' | 'init' | 'speed', label: string) => (
    <label className="field">
      <span>{label}</span>
      <input className="num-input" type="number" value={m[k]} onChange={(e) => setM({ ...m, [k]: parseFloat(e.target.value) || 0 })} aria-label={label} />
    </label>
  );
  return (
    <Modal title={isNew ? 'Nouveau monstre' : m.name} onClose={onClose}>
      <div className="row gap">
        <input id="best-name" className="grow" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} aria-label="Nom" />
        <input className="num-input" value={m.cr} onChange={(e) => setM({ ...m, cr: e.target.value })} aria-label="FP" title="Facteur de puissance" />
      </div>
      <div className="avatar-picker">
        {AVATARS.map((a) => (
          <button type="button" key={a} className={a === m.avatar ? 'on' : ''} onClick={() => setM({ ...m, avatar: a })}>
            {a}
          </button>
        ))}
      </div>
      <div className="row gap wrap">
        {num('hp', 'PV')}
        {num('ac', 'CA')}
        {num('init', 'Init.')}
        {num('speed', 'Vitesse (m)')}
      </div>
      <div className="saves-grid">
        {ABILITIES.map((a) => (
          <label key={a.key} className="field">
            <span>JS {a.short}</span>
            <input className="num-input" type="number" value={m.saves?.[a.key] ?? 0} aria-label={`Sauvegarde ${a.label}`}
              onChange={(e) => setM({ ...m, saves: { ...(m.saves ?? {}), [a.key as Ability]: parseInt(e.target.value, 10) || 0 } })} />
          </label>
        ))}
      </div>
      <MonsterAttacks attacks={m.attacks} multi={m.multiattack} onChange={(attacks, multiattack) => setM({ ...m, attacks, multiattack })} />
      <DefensesEditor value={m.defenses} onChange={(defenses) => setM({ ...m, defenses })} />
      {m.attacks.length > 0 && <p className="muted small">{m.attacks.map((a) => `${a.name} : ${attackLine(a)}`).join(' · ')}</p>}
      <button className="btn primary" disabled={!m.name.trim()} onClick={() => onSave({ ...m, name: m.name.trim() })}>
        💾 Enregistrer
      </button>
      {!isNew && <ConfirmButton onConfirm={onDelete}>Supprimer ce monstre</ConfirmButton>}
    </Modal>
  );
}
