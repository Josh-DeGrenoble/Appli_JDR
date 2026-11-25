// Inventaire d'un perso : le MJ ajoute et modifie ; le joueur utilise, équipe, donne ou jette (jamais d'ajout).
import { ItemGive } from './ItemGive';
import { describeEffects, effectsOf } from '../lib/dnd/gear';
import { useState } from 'react';
import { useSession } from '../data/session';
import type { CampaignView } from '../data/useCampaign';
import type { Character, Item } from '../lib/types';
import { ConfirmButton, Modal, Stepper } from '../components/ui';
import { useToast } from '../components/Toast';
import { rollDice } from '../lib/dice';
import { logEvent } from '../data/actions';
import { ITEM_LIBRARY, libraryItem } from '../lib/dnd/srd/items';
import { EquipToggles, SlotTag } from './sheet/Equipment';

export function Inventory({ view, c, canEdit }: { view: CampaignView; c: Character; canEdit: boolean }) {
  const { store } = useSession();
  const toast = useToast();
  const items = view.data!.items.filter((i) => i.character_id === c.id);
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState<Item | null>(null);
  const fail = (e: Error) => toast(e.message, 'error');

  const add = async () => {
    if (!name.trim()) return;
    try {
      const lib = libraryItem(name);
      await store.addItem({ campaign_id: c.campaign_id, character_id: c.id, name: lib?.name ?? name.trim(), qty: Math.max(1, qty), description: lib?.description ?? '', ...(lib?.heal ? { heal: lib.heal } : {}) });
      setName('');
      setQty(1);
      view.reload();
    } catch (e) {
      fail(e as Error);
    }
  };

  const changeQty = (it: Item, d: number) => {
    const q = it.qty + d;
    (q <= 0 ? store.deleteItem(it.id) : store.updateItem(it.id, { qty: q })).then(view.reload).catch(fail);
  };

  return (
    <section className="card stack-sm">
      <div className="row between">
        <h3 className="section-title">Inventaire</h3>
        <span className="muted small">{items.reduce((s, i) => s + i.qty, 0)} objets</span>
      </div>
      {items.length === 0 ? (
        <p className="muted small">Sac vide. {view.isGM ? 'Ajoute un objet ci-dessous.' : 'Le MJ te donnera des objets.'}</p>
      ) : (
        <ul className="inv">
          {items.map((it) => (
            <li key={it.id} className="inv-row">
              <button className="inv-main" onClick={() => setOpen(it)}>
                <span className="inv-name">
                  {it.equipped && <span title="Équipé">⚔️ </span>}
                  {it.attuned && <span title="Harmonisé">✨ </span>}
                  {it.name} <SlotTag name={it.name} />
                </span>
                {effectsOf(it.name) ? (
                  <span className="small ellipsis gear-effects">{describeEffects(effectsOf(it.name))}</span>
                ) : (
                  it.description && <span className="muted small ellipsis">{it.description}</span>
                )}
              </button>
              {it.heal && canEdit && <DrinkButton view={view} item={it} who={c.name} />}
              {canEdit ? (
                <Stepper label={it.name} value={it.qty} canIncrease={view.isGM} onDelta={(d) => changeQty(it, d)} />
              ) : (
                <span className="qty">×{it.qty}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {view.isGM && (
        <form
          className="inv-add"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <datalist id="item-library">
            {ITEM_LIBRARY.map((it) => (
              <option key={it.name} value={it.name} />
            ))}
          </datalist>
          <input id={`inv-add-${c.id}`} list="item-library" placeholder="Ajouter un objet (bibliothèque ou maison)…" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nom de l’objet" />
          <input
            className="num-input"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
            aria-label="Quantité"
          />
          <button className="btn primary small" disabled={!name.trim()}>
            Ajouter
          </button>
        </form>
      )}
      {open && <ItemDialog view={view} item={open} canEdit={canEdit} onClose={() => setOpen(null)} />}
    </section>
  );
}

function ItemDialog({ view, item, canEdit, onClose }: { view: CampaignView; item: Item; canEdit: boolean; onClose: () => void }) {
  const { store } = useSession();
  const toast = useToast();
  const [name, setName] = useState(item.name);
  const [desc, setDesc] = useState(item.description);
  const [qty, setQty] = useState(item.qty);
  const [healF, setHealF] = useState(item.heal ?? '');
  const owner = view.data!.characters.find((x) => x.id === item.character_id)?.name ?? '?';
  const fail = (e: Error) => toast(e.message, 'error');

  if (!canEdit)
    return (
      <Modal title={item.name} onClose={onClose}>
        <p>Quantité : {item.qty}</p>
        <p className="prewrap">{item.description || <span className="muted">Pas de description.</span>}</p>
        {effectsOf(item.name) && <p className="small gear-effects">⚔️ Une fois équipé : {describeEffects(effectsOf(item.name))}</p>}
      </Modal>
    );

  const use = () => {
    const heal = item.heal ? Math.max(0, rollDice(item.heal).total) : 0;
    return (item.heal ? store.useItem(item.id, heal) : item.qty <= 1 ? store.deleteItem(item.id) : store.updateItem(item.id, { qty: item.qty - 1 }))
      .then(() => {
        toast(item.heal ? `🧪 ${item.name} : +${heal} PV` : `✋ ${item.name} utilisé`, item.heal ? 'gift' : undefined);
        logEvent(store, item.campaign_id, item.heal ? `🧪 ${owner} boit ${item.name} : +${heal} PV` : `✋ ${owner} utilise ${item.name}`, owner);
        view.reload();
        onClose();
      })
      .catch(fail);
  };

  return (
    <Modal title={view.isGM ? 'Objet' : item.name} onClose={onClose}>
      {!view.isGM && (
        <>
          <p className="muted">Quantité : {item.qty}</p>
          {item.description && <p className="prewrap">{item.description}</p>}
          <button className="btn primary" onClick={use}>
            ✋ Utiliser (−1)
          </button>
        </>
      )}
      {view.isGM && (
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          store
            .updateItem(item.id, { name: name.trim() || item.name, description: desc, qty: Math.max(0, qty), heal: healF.trim() })
            .then(() => {
              view.reload();
              onClose();
            })
            .catch(fail);
        }}
      >
        <label htmlFor="item-name">Nom</label>
        <input id="item-name" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="item-desc">Description</label>
        <textarea id="item-desc" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Effets, poids, valeur…" />
        <label htmlFor="item-heal">Soin en l’utilisant (formule, vide = aucun)</label>
        <input id="item-heal" value={healF} onChange={(e) => setHealF(e.target.value)} placeholder="2d4+2" />
        <label htmlFor="item-qty">Quantité</label>
        <input id="item-qty" className="num-input" type="number" min={0} value={qty} onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)} />
        <button className="btn primary">Enregistrer</button>
      </form>
      )}

      {effectsOf(item.name) && <p className="small gear-effects">⚔️ Une fois équipé : {describeEffects(effectsOf(item.name))}</p>}
      <EquipToggles view={view} item={item} />

      <ItemGive view={view} item={item} owner={owner} onDone={onClose} />

      <ConfirmButton
        onConfirm={() =>
          store
            .deleteItem(item.id)
            .then(() => {
              view.reload();
              onClose();
            })
            .catch(fail)
        }
      >
        Jeter l’objet
      </ConfirmButton>
    </Modal>
  );
}

/** Boire une potion directement depuis le sac : PV rendus tout de suite (hors combat ; en combat, passer par l'onglet Carte). */
function DrinkButton({ view, item, who }: { view: CampaignView; item: Item; who: string }) {
  const { store } = useSession();
  const toast = useToast();
  const drink = () => {
    const heal = Math.max(0, rollDice(item.heal!).total);
    store
      .useItem(item.id, heal)
      .then(() => {
        toast(`🧪 ${item.name} : +${heal} PV`, 'gift');
        logEvent(store, item.campaign_id, `🧪 ${who} boit ${item.name} : +${heal} PV`, who);
        view.reload();
      })
      .catch((e: Error) => toast(e.message, 'error'));
  };
  return (
    <button className="btn small heal" onClick={drink} aria-label={`Boire ${item.name}`}>
      🧪 Boire
    </button>
  );
}
