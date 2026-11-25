// Onglet Persos : liste compacte (table de jeu pour le MJ, mes persos + le groupe pour un joueur) et création.
import { speciesDefenses } from '../lib/dnd/srd/creation';
import { Suspense, lazy, useState } from 'react';
import { useSession } from '../data/session';
import type { CampaignView } from '../data/useCampaign';
import { CLASSES, SPECIES, conditionOf, findClass } from '../lib/dnd/data';
import { passivePerception, suggestedMaxHp } from '../lib/dnd/rules';
import { normalizeSheet } from '../lib/dnd/sheet';
import { AVATARS, blankCharacterValues, hpOf } from '../lib/templates';
import type { Character } from '../lib/types';
import { navigate } from '../router';
import { Empty, Modal } from '../components/ui';
import { useToast } from '../components/Toast';
// Assistant de création chargé à la demande (il embarque la bibliothèque de sorts)
const CreationWizard = lazy(() => import('./creation/CreationWizard').then((m) => ({ default: m.CreationWizard })));
import { HpDialog } from './sheet/HpDialog';
import { identityLine } from './sheet/IdentitySection';

export function Characters({ view }: { view: CampaignView }) {
  const { user } = useSession();
  const [creating, setCreating] = useState<false | 'wizard' | 'quick'>(false);
  const data = view.data!;
  const { isGM, myCharacters } = view;
  const others = data.characters.filter((c) => c.owner_id !== user?.id);
  const list = isGM ? data.characters : myCharacters;

  return (
    <div className="stack">
      <div className="row between">
        <h2 className="section-title">{isGM ? 'Table de jeu' : 'Mes personnages'}</h2>
        <button className="btn small" onClick={() => setCreating('wizard')}>
          {isGM ? '+ PNJ' : '+ Nouveau'}
        </button>
      </div>
      {list.length === 0 ? (
        isGM ? (
          <Empty icon="🪑" title="Personne à la table">
            <p className="muted">
              Donne le code <strong className="code">{data.campaign.join_code}</strong> à tes joueurs : leurs personnages apparaîtront ici en direct.
            </p>
          </Empty>
        ) : (
          <Empty icon="🧙" title="Crée ton premier personnage">
            <button className="btn primary" onClick={() => setCreating('wizard')}>
              Créer un personnage
            </button>
          </Empty>
        )
      ) : (
        <ul className="char-list">
          {list.map((c) => (
            <CharRow key={c.id} view={view} c={c} />
          ))}
        </ul>
      )}
      {!isGM && others.length > 0 && (
        <>
          <h2 className="section-title">Le groupe</h2>
          <ul className="char-list">
            {others.map((c) => (
              <CharRow key={c.id} view={view} c={c} readOnly={!data.campaign.settings.shareSheets} />
            ))}
          </ul>
        </>
      )}
      {creating === 'wizard' && (
        <Suspense fallback={null}>
          <CreationWizard view={view} onClose={() => setCreating(false)} onQuick={() => setCreating('quick')} />
        </Suspense>
      )}
      {creating === 'quick' && <NewCharacterDialog view={view} onClose={() => setCreating(false)} />}
    </div>
  );
}

/** Ligne compacte : avatar, nom, PV, CA, perception passive, états. Bouton PV rapide pour qui peut modifier. */
function CharRow({ view, c, readOnly }: { view: CampaignView; c: Character; readOnly?: boolean }) {
  const [hpOpen, setHpOpen] = useState(false);
  const s = normalizeSheet(c.sheet);
  const hp = hpOf(c);
  const pct = hp.max > 0 ? Math.min(100, (hp.current / hp.max) * 100) : 0;
  const canHp = view.can(c, 'resources');
  const open = () => !readOnly && navigate(`/c/${c.campaign_id}/perso/${c.id}`);

  return (
    <li className={`char-row ${hp.current === 0 && hp.max > 0 ? 'down' : ''}`}>
      <button className="char-row-main" onClick={open} disabled={readOnly}>
        <span className="avatar">{c.avatar}</span>
        <span className="list-main">
          <strong className="ellipsis">{c.name}</strong>
          <span className="muted small ellipsis">
            {identityLine(s)}
            {view.isGM && c.owner_id !== view.data!.campaign.gm_id ? ` · ${view.memberName(c.owner_id)}` : ''}
          </span>
          {!readOnly && (
            <span className="row-stats">
              <span className={`bar bar-hp mini ${pct <= 25 ? 'low' : ''}`}>
                <span className="bar-fill" style={{ width: pct + '%' }} />
              </span>
              <span className="small">
                {hp.current}/{hp.max}
                {hp.temp > 0 && <span className="hp-temp">+{hp.temp}</span>}
              </span>
              <span className="small muted">CA {s.ac}</span>
              {view.isGM && <span className="small muted">PP {passivePerception(s)}</span>}
            </span>
          )}
          {!readOnly && (s.conditions.length + s.exhaustion > 0 || s.concentration) && (
            <span className="row-conds">
              {s.conditions.map((k) => (
                <span key={k} title={conditionOf(k)?.label}>
                  {conditionOf(k)?.icon}
                </span>
              ))}
              {s.exhaustion > 0 && <span className="small">😩{s.exhaustion}</span>}
              {s.concentration && <span title={`Concentration : ${s.concentration}`}>🧠</span>}
            </span>
          )}
        </span>
      </button>
      {(canHp || view.isGM) && !readOnly && (
        <span className="row-actions">
          {canHp && (
            <button className="btn small hp-btn" onClick={() => setHpOpen(true)} aria-label={`PV de ${c.name}`}>
              ❤️ PV
            </button>
          )}
          {view.isGM && <GrantButton view={view} c={c} grant={s.grant ?? null} />}
        </span>
      )}
      {hpOpen && <HpDialog c={c} onClose={() => setHpOpen(false)} onDone={view.reload} />}
    </li>
  );
}

/** MJ : donne un avantage, un désavantage ou rien (cycle) pour tous les jets d20 du perso. */
function GrantButton({ view, c, grant }: { view: CampaignView; c: Character; grant: 'adv' | 'dis' | null }) {
  const { store } = useSession();
  const toast = useToast();
  const next = grant === null ? 'adv' : grant === 'adv' ? 'dis' : null;
  const label = grant === 'adv' ? '🎯 Avantage' : grant === 'dis' ? '⚠️ Désav.' : '🎲 Normal';
  return (
    <button
      className={`btn small grant-btn ${grant ?? ''}`}
      onClick={() => store.patchSheet(c.id, { grant: next }).then(view.reload).catch((e: Error) => toast(e.message, 'error'))}
      aria-label={`Avantage de ${c.name} : ${label}`}
      title="Avantage ou désavantage donné par le MJ (touche pour changer)"
    >
      {label}
    </button>
  );
}

export function NewCharacterDialog({ view, onClose }: { view: CampaignView; onClose: () => void }) {
  const { store, user } = useSession();
  const toast = useToast();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [className, setClassName] = useState('');
  const [species, setSpecies] = useState('');
  const [level, setLevel] = useState(1);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const cls = findClass(className);
      const def = speciesDefenses(species.trim());
      const sheet = { className, species, level, hitDie: cls?.hitDie ?? 8, saveProf: cls?.saves ?? [], ...(def ? { defenses: def } : {}) };
      const maxHp = suggestedMaxHp(normalizeSheet(sheet));
      const c = await store.createCharacter({
        campaign_id: view.data!.campaign.id,
        owner_id: user!.id,
        name: name.trim(),
        avatar,
        subtitle: '',
        notes: '',
        ...blankCharacterValues(sheet, maxHp),
      });
      view.reload();
      navigate(`/c/${c.campaign_id}/perso/${c.id}`);
    } catch (err) {
      toast((err as Error).message, 'error');
      setBusy(false);
    }
  };

  return (
    <Modal title="Nouveau personnage" onClose={onClose}>
      <form className="stack" onSubmit={(e) => (e.preventDefault(), create())}>
        <label htmlFor="char-name">Nom</label>
        <input id="char-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Thalia Brisevent" autoFocus />
        <div className="row gap">
          <label className="grow field">
            <span>Classe</span>
            <select id="char-class" value={className} onChange={(e) => setClassName(e.target.value)}>
              <option value="">—</option>
              {CLASSES.map((cl) => (
                <option key={cl.name}>{cl.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Niveau</span>
            <input id="char-level" className="num-input" type="number" min={1} max={20} value={level} onChange={(e) => setLevel(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))} />
          </label>
        </div>
        <label className="field">
          <span>Espèce</span>
          <input id="char-species" list="new-species" value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="Elfe, Humain…" />
          <datalist id="new-species">{SPECIES.map((x) => <option key={x} value={x} />)}</datalist>
        </label>
        <span className="label">Avatar</span>
        <div className="avatar-picker">
          {AVATARS.map((a) => (
            <button type="button" key={a} className={a === avatar ? 'on' : ''} onClick={() => setAvatar(a)} aria-label={`Avatar ${a}`}>
              {a}
            </button>
          ))}
        </div>
        <p className="muted small">Caracs, compétences et PV se règlent ensuite sur la fiche (bouton ✏️ Modifier).</p>
        <button className="btn primary" disabled={busy || !name.trim()}>
          Créer
        </button>
      </form>
    </Modal>
  );
}
