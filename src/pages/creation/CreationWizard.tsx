// Assistant de création de personnage (règles 2024) : classe → historique → espèce → caractéristiques →
// compétences → équipement et nom. Calculs dans lib/dnd/creation.ts ; création rapide toujours possible.
import { OriginFeats, originFeatsReady, type OriginFeatChoices } from './OriginFeats';
import { subclassesOf } from '../../lib/dnd/srd/subclasses';
import { useState } from 'react';
import { useSession } from '../../data/session';
import type { CampaignView } from '../../data/useCampaign';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/ui';
import { navigate } from '../../router';
import { ABILITIES, SKILLS } from '../../lib/dnd/data';
import { BASE_SCORES, STANDARD_ARRAY, bonusValid, buildCharacter, suggestStandard, type Method, type Scores } from '../../lib/dnd/creation';
import { BACKGROUND_INFO, CLASS_INFO, SPECIES_INFO, SPECIES_LEGACY } from '../../lib/dnd/srd/creation';
import { AVATARS, blankCharacterValues } from '../../lib/templates';
import { AbilitiesStep } from './AbilitiesStep';
import { SpellPicker } from '../sheet/SpellPicker';
import { cantripsAt, preparedAt } from '../../lib/dnd/srd/progression';
import { suggestedSlots } from '../../lib/dnd/spells';
import { SPELL_LIBRARY, librarySpellToSheet } from '../../lib/dnd/srd/library';
import { uid } from '../../lib/ids';

const STEPS = ['Classe', 'Historique', 'Espèce', 'Caractéristiques', 'Compétences et sorts', 'Équipement'];
const skillLabel = (k: string) => SKILLS.find((s) => s.key === k)?.label ?? k;
const abShort = (k: string) => ABILITIES.find((a) => a.key === k)?.short ?? k;

export function CreationWizard({ view, onClose, onQuick }: { view: CampaignView; onClose: () => void; onQuick: () => void }) {
  const { store, user } = useSession();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [cls, setCls] = useState('');
  const [bgName, setBg] = useState('');
  const [species, setSpecies] = useState('');
  const [legacy, setLegacy] = useState('');
  const [feats, setFeats] = useState<OriginFeatChoices>({ humanFeat: '', skills: [], spells: [] });
  const [method, setMethod] = useState<Method>('standard');
  const [base, setBase] = useState<Scores>({ ...BASE_SCORES });
  const [pool, setPool] = useState<number[]>(STANDARD_ARRAY);
  const [bonus, setBonus] = useState<Partial<Scores>>({});
  const [skills, setSkills] = useState<string[]>([]);
  const [extra, setExtra] = useState('');
  const [equipment, setEquipment] = useState<'kit' | 'gold'>('kit');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [level, setLevel] = useState(1);
  const [subclass, setSubclass] = useState('');
  const [busy, setBusy] = useState(false);
  const [spellNames, setSpellNames] = useState<string[]>([]);
  const maxSpell = Object.entries(suggestedSlots(cls, level) ?? {}).filter(([, v]) => v.max > 0).reduce((m, [l]) => Math.max(m, +l), 0);
  const ci = CLASS_INFO.find((c) => c.name === cls);
  const bi = BACKGROUND_INFO.find((b) => b.name === bgName);
  const fromBg: string[] = bi ? [...bi.skills] : [];

  const canNext = [!!cls, !!bgName, !!species, bonusValid(bgName, bonus), skills.length === (ci?.skillCount ?? 0) && (species !== 'Humain' || !!extra) && originFeatsReady(bi?.feat ?? '', feats), !!name.trim()][step];
  const pickClass = (c: string) => (setCls(c), setSubclass(''), setBase(suggestStandard(c)), setPool(STANDARD_ARRAY), setMethod('standard'), setSkills([]));
  const pickBg = (b: string) => {
    const info = BACKGROUND_INFO.find((x) => x.name === b)!;
    setBg(b);
    setBonus({ [info.abilities[0]]: 2, [info.abilities[1]]: 1 }); // proposition, modifiable
    setSkills((s) => s.filter((k) => !info.skills.includes(k)));
  };
  const toggleSkill = (k: string) => setSkills((s) => (s.includes(k) ? s.filter((x) => x !== k) : s.length < (ci?.skillCount ?? 0) ? [...s, k] : s));

  const create = async () => {
    setBusy(true);
    try {
      const spells = SPELL_LIBRARY.filter((x) => spellNames.includes(x.name)).map((x) => librarySpellToSheet(x, uid()));
      const featSpells = SPELL_LIBRARY.filter((x) => feats.spells.includes(x.name)).map((x) => librarySpellToSheet(x, uid()));
      const built = buildCharacter({ className: cls, background: bgName, species, legacy, level, subclass, base, bonus, classSkills: skills, extraSkill: extra || undefined, equipment, spells,
        featSkills: feats.skills, featSpells, humanFeat: species === 'Humain' ? feats.humanFeat || undefined : undefined });
      const c = await store.createCharacter({
        campaign_id: view.data!.campaign.id, owner_id: user!.id, name: name.trim(), avatar, subtitle: '', notes: built.notes,
        ...blankCharacterValues(built.sheet, built.maxHp),
      });
      view.reload();
      navigate(`/c/${c.campaign_id}/perso/${c.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
      setBusy(false);
    }
  };

  return (
    <Modal title={`Nouveau personnage · ${step + 1}/${STEPS.length} ${STEPS[step]}`} onClose={onClose}>
      <div className="wiz-progress" aria-hidden>
        {STEPS.map((s, i) => <span key={s} className={i <= step ? 'on' : ''} />)}
      </div>

      {step === 0 && (
        <div className="stack-xs">
          {CLASS_INFO.map((c) => (
            <button key={c.name} className={`choice ${cls === c.name ? 'on' : ''}`} onClick={() => pickClass(c.name)}>
              <strong>{c.name}</strong>
              <span className="muted small">{c.pitch} · {c.primary.map(abShort).join(', ')}</span>
            </button>
          ))}
          <label className="row between">
            <span>Niveau de départ</span>
            <input className="num-input" type="number" min={1} max={20} value={level} onChange={(e) => (setLevel(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1))), setSpellNames([]))} aria-label="Niveau" />
          </label>
          {level >= 3 && cls && (
            <label className="row between">
              <span>Sous-classe</span>
              <select id="wiz-subclass" value={subclass} onChange={(e) => setSubclass(e.target.value)} aria-label="Sous-classe">
                <option value="">Choisir…</option>
                {subclassesOf(cls).map((x) => (
                  <option key={x.name}>{x.name}</option>
                ))}
              </select>
            </label>
          )}
          <button className="link" onClick={onQuick}>Création rapide (sans assistant)</button>
        </div>
      )}

      {step === 1 && (
        <div className="stack-xs">
          {BACKGROUND_INFO.map((b) => (
            <button key={b.name} className={`choice ${bgName === b.name ? 'on' : ''}`} onClick={() => pickBg(b.name)}>
              <strong>{b.name}</strong>
              <span className="muted small">{b.abilities.map(abShort).join(', ')} · {b.skills.map(skillLabel).join(', ')} · don : {b.feat}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="stack-xs">
          {SPECIES_INFO.map((s) => (
            <button key={s.name} className={`choice ${species === s.name ? 'on' : ''}`} onClick={() => (setSpecies(s.name), setLegacy(SPECIES_LEGACY[s.name]?.options[0][0] ?? ''))}>
              <strong>{s.name}</strong>
              <span className="muted small">{s.size}, {String(s.speed).replace('.', ',')} m · {s.traits}</span>
            </button>
          ))}
          {SPECIES_LEGACY[species] && (
            <label className="row between">
              <span>{SPECIES_LEGACY[species].label}</span>
              <select id="wiz-legacy" value={legacy} onChange={(e) => setLegacy(e.target.value)} aria-label={SPECIES_LEGACY[species].label}>
                {SPECIES_LEGACY[species].options.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {step === 3 && (
        <AbilitiesStep className={cls} background={bgName} method={method} base={base} pool={pool} bonus={bonus}
          onChange={(p) => (p.method && setMethod(p.method), p.base && setBase(p.base), p.pool && setPool(p.pool), p.bonus && setBonus(p.bonus))} />
      )}

      {step === 4 && ci && (
        <div className="stack-sm">
          <p className="muted small">Historique : {fromBg.map(skillLabel).join(', ')} (déjà acquises). Choisis {ci.skillCount} compétence{ci.skillCount > 1 ? 's' : ''} de {cls} :</p>
          <div className="chips">
            {ci.skills.filter((k) => !fromBg.includes(k)).map((k) => (
              <button key={k} className={`chip ${skills.includes(k) ? 'on' : ''}`} onClick={() => toggleSkill(k)}>{skillLabel(k)}</button>
            ))}
          </div>
          <p className="small">{skills.length} / {ci.skillCount}</p>
          {species === 'Humain' && (
            <label className="field">
              <span>Humain (doué) : une compétence en plus</span>
              <select value={extra} onChange={(e) => setExtra(e.target.value)} aria-label="Compétence de l’humain">
                <option value="">—</option>
                {SKILLS.filter((s) => !skills.includes(s.key) && !fromBg.includes(s.key)).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          )}
          {bi && <OriginFeats bgFeat={bi.feat} human={species === 'Humain'} taken={[...skills, ...fromBg, ...(extra ? [extra] : [])]} value={feats} onChange={setFeats} />}
          {(cantripsAt(cls, level) > 0 || preparedAt(cls, level) > 0) && (
            <>
              <SpellPicker className={cls} maxLevel={maxSpell} cantrips={cantripsAt(cls, level)} spells={preparedAt(cls, level)} known={[]} picked={spellNames} onChange={setSpellNames} />
              <p className="muted small">Optionnel : tu peux aussi les choisir plus tard avec le MJ.</p>
            </>
          )}
        </div>
      )}

      {step === 5 && ci && (
        <div className="stack-sm">
          <button className={`choice ${equipment === 'kit' ? 'on' : ''}`} onClick={() => setEquipment('kit')}>
            <strong>Équipement de départ</strong>
            <span className="muted small">{ci.kit} (le MJ te le donne dans le Sac)</span>
          </button>
          <button className={`choice ${equipment === 'gold' ? 'on' : ''}`} onClick={() => setEquipment('gold')}>
            <strong>{ci.gold} po</strong>
            <span className="muted small">Pour tout acheter toi-même chez les marchands</span>
          </button>
          <label htmlFor="wiz-name">Nom</label>
          <input id="wiz-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Thalia Brisevent" />
          <div className="avatar-picker">
            {AVATARS.map((a) => <button type="button" key={a} className={a === avatar ? 'on' : ''} onClick={() => setAvatar(a)} aria-label={`Avatar ${a}`}>{a}</button>)}
          </div>
          <p className="muted small">{cls} niveau {level} · {bgName} · {species}. Aptitudes de classe, emplacements de sorts et sorts choisis ajoutés tout seuls ; ensuite, le MJ t’accorde les niveaux suivants et tu choisis tes gains sur ta fiche.</p>
        </div>
      )}

      <div className="row gap">
        {step > 0 && <button className="btn grow" onClick={() => setStep(step - 1)}>← Retour</button>}
        {step < STEPS.length - 1 ? (
          <button className="btn primary grow" disabled={!canNext} onClick={() => setStep(step + 1)}>Suivant →</button>
        ) : (
          <button className="btn primary grow" disabled={!canNext || busy} onClick={create}>✓ Créer {name.trim() || 'le personnage'}</button>
        )}
      </div>
    </Modal>
  );
}
