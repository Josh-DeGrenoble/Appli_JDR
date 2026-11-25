// Panneau MJ « Distribuer en direct » : objets, pièces, PV, états, épuisement, repos, XP et niveaux pour un ou plusieurs persos.
import { useState } from 'react';
import { useSession } from '../../data/session';
import type { CampaignView } from '../../data/useCampaign';
import { concentrationReminder, logEvent, longRestChar, toggleCondition } from '../../data/actions';
import { COINS, CONDITIONS, EXHAUSTION_MAX, type Coin } from '../../lib/dnd/data';
import { useToast } from '../../components/Toast';
import { normalizeSheet } from '../../lib/dnd/sheet';
import { grantLevelPatch, xpPatch } from '../../lib/dnd/levels';
import { ITEM_LIBRARY, libraryItem } from '../../lib/dnd/srd/items';
import { describeEffects, effectsOf } from '../../lib/dnd/gear';

type Kind = 'item' | 'coins' | 'hp' | 'state' | 'level';

export function Distribute({ view }: { view: CampaignView }) {
  const { store } = useSession();
  const toast = useToast();
  const chars = view.data!.characters;
  const [targets, setTargets] = useState<string[]>([]);
  const [kind, setKind] = useState<Kind>('hp');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState(5);
  const [coin, setCoin] = useState<Coin>('po');
  const [cond, setCond] = useState(CONDITIONS[0].key);
  const [busy, setBusy] = useState(false);

  if (chars.length === 0) return null;
  const all = targets.length === chars.length;
  const toggle = (id: string) => setTargets((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  const selected = chars.filter((c) => targets.includes(c.id));
  const who = selected.length === 1 ? selected[0].name : `${selected.length} persos`;
  const none = busy || !selected.length;

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      logEvent(store, view.data!.campaign.id, msg);
      view.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const each = (fn: (c: (typeof chars)[number]) => Promise<unknown>) => () => Promise.all(selected.map(fn));
  const condLabel = CONDITIONS.find((c) => c.key === cond)!.label;
  /** Objet de la bibliothèque choisi : description (et effets une fois équipé) pré-remplis. */
  const pickName = (v: string) => {
    setName(v);
    const lib = libraryItem(v);
    if (lib) setDesc(lib.description);
  };
  const libFx = describeEffects(effectsOf(name));

  return (
    <section className="card stack-sm distribute">
      <h3 className="section-title">Distribuer en direct</h3>
      <div className="chips">
        <button className={`chip ${all ? 'on' : ''}`} onClick={() => setTargets(all ? [] : chars.map((c) => c.id))}>
          Tous
        </button>
        {chars.map((c) => (
          <button key={c.id} className={`chip ${targets.includes(c.id) ? 'on' : ''}`} onClick={() => toggle(c.id)}>
            {c.avatar} {c.name}
          </button>
        ))}
      </div>

      <div className="segmented">
        {([['hp', '❤️ PV'], ['item', '🎁 Objet'], ['coins', '💰 Pièces'], ['state', '🌀 État'], ['level', '⭐ Niveau']] as [Kind, string][]).map(([k, l]) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
            {l}
          </button>
        ))}
      </div>

      {kind === 'hp' && (
        <>
          <input id="give-hp" className="big-input" type="number" min={1} value={amount} onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)} aria-label="Points de vie" />
          <div className="row gap">
            <button className="btn hurt grow" disabled={none || amount <= 0} onClick={() => run(each((c) => store.applyHp(c.id, -amount).then(() => { const r = concentrationReminder(c, amount); if (r) (toast(r, 'hurt'), logEvent(store, c.campaign_id, r)); })), `💥 ${amount} dégâts à ${who}`)}>
              💥 Dégâts
            </button>
            <button className="btn heal grow" disabled={none || amount <= 0} onClick={() => run(each((c) => store.applyHp(c.id, amount)), `✨ ${amount} PV soignés pour ${who}`)}>
              ✨ Soins
            </button>
          </div>
          <div className="row gap">
            <button className="btn ghost grow" disabled={none} onClick={() => run(each((c) => store.setTempHp(c.id, amount)), `🛡️ ${amount} PV temporaires pour ${who}`)}>
              🛡️ PV temp.
            </button>
            <button className="btn ghost grow" disabled={none} onClick={() => run(each((c) => longRestChar(store, c)), `🌙 Repos long pour ${who}`)}>
              🌙 Repos long
            </button>
          </div>
        </>
      )}

      {kind === 'item' && (
        <>
          <div className="row gap">
            <input id="give-name" className="grow" list="give-lib" placeholder="Nom (ou choisis dans la liste)" value={name} onChange={(e) => pickName(e.target.value)} aria-label="Nom de l’objet" />
            <datalist id="give-lib">{ITEM_LIBRARY.map((x) => <option key={x.name} value={x.name} />)}</datalist>
            <input id="give-qty" className="num-input" type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)} aria-label="Quantité" />
          </div>
          <input id="give-desc" placeholder="Description (optionnel)" value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Description" />
          {libFx && <p className="muted small">⚔️ Une fois équipé : {libFx}</p>}
          <button
            className="btn primary"
            disabled={none || !name.trim()}
            onClick={() =>
              run(async () => {
                await Promise.all(
                  selected.map((c) => store.addItem({ campaign_id: c.campaign_id, character_id: c.id, name: name.trim(), qty, description: desc.trim(), ...(libraryItem(name)?.heal ? { heal: libraryItem(name)!.heal } : {}) }))
                );
                setName('');
                setDesc('');
                setQty(1);
              }, `🎁 ${name.trim()} donné à ${who}`)
            }
          >
            Donner {selected.length ? `à ${who}` : ''}
          </button>
        </>
      )}

      {kind === 'coins' && (
        <>
          <div className="row gap">
            <input id="give-amount" className="big-input grow" type="number" min={1} value={amount} onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)} aria-label="Montant" />
            <select id="give-coin" value={coin} onChange={(e) => setCoin(e.target.value as Coin)} aria-label="Type de pièce" className="coin-select">
              {COINS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="row gap">
            <button className="btn hurt grow" disabled={none || amount <= 0} onClick={() => run(each((c) => store.adjustCoins(c.id, coin, -amount)), `−${amount} ${coin} pour ${who}`)}>
              − Retirer
            </button>
            <button className="btn heal grow" disabled={none || amount <= 0} onClick={() => run(each((c) => store.adjustCoins(c.id, coin, amount)), `+${amount} ${coin} pour ${who}`)}>
              + Donner
            </button>
          </div>
        </>
      )}

      {kind === 'state' && (
        <>
          <select id="give-cond" value={cond} onChange={(e) => setCond(e.target.value)} aria-label="État">
            {CONDITIONS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
          <div className="row gap">
            <button className="btn ghost grow" disabled={none} onClick={() => run(each((c) => toggleCondition(store, c, cond, false)), `${condLabel} retiré`)}>
              Retirer
            </button>
            <button className="btn primary grow" disabled={none} onClick={() => run(each((c) => toggleCondition(store, c, cond, true)), `${condLabel} : ${who}`)}>
              Appliquer
            </button>
          </div>
          <div className="row between">
            <span>😮‍💨 Épuisement</span>
            <div className="row gap">
              <button className="btn ghost" disabled={none} onClick={() => run(each((c) => store.patchSheet(c.id, { exhaustion: Math.max(0, normalizeSheet(c.sheet).exhaustion - 1) })), `😮‍💨 Épuisement −1 : ${who}`)} aria-label="Épuisement −1 pour la sélection">
                −1
              </button>
              <button className="btn hurt" disabled={none} onClick={() => run(each((c) => store.patchSheet(c.id, { exhaustion: Math.min(EXHAUSTION_MAX, normalizeSheet(c.sheet).exhaustion + 1) })), `😮‍💨 Épuisement +1 : ${who}`)} aria-label="Épuisement +1 pour la sélection">
                +1
              </button>
            </div>
          </div>
        </>
      )}

      {kind === 'level' && (
        <>
          <div className="row gap">
            <input id="give-xp" className="big-input grow" type="number" min={1} value={amount} onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)} aria-label="XP" />
            <button className="btn primary" disabled={none || amount <= 0} onClick={() => run(each((c) => store.patchSheet(c.id, xpPatch(normalizeSheet(c.sheet), amount))), `⭐ +${amount} XP pour ${who}`)}>
              ⭐ + XP
            </button>
          </div>
          <p className="muted small">Atteindre un palier d’XP accorde le niveau. Le joueur choisit ensuite ses gains sur sa fiche.</p>
          <div className="row gap">
            <button className="btn ghost grow" disabled={none} onClick={() => run(each((c) => store.levelDown(c.id)), `⬇️ −1 niveau pour ${who}`)}>
              ⬇️ −1 niveau
            </button>
            <button className="btn heal grow" disabled={none} onClick={() => run(each((c) => store.patchSheet(c.id, grantLevelPatch(normalizeSheet(c.sheet)))), `⬆️ Niveau accordé à ${who}`)}>
              ⬆️ +1 niveau
            </button>
          </div>
        </>
      )}
    </section>
  );
}
