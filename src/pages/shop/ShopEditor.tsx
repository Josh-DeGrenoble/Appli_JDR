// MJ : préparer un marchand ou un coffre (nom, icône, description, objets avec prix et stock), depuis la
// bibliothèque d'objets (prix pré-remplis) ou en objet maison.
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { useSession } from '../../data/session';
import { useToast } from '../../components/Toast';
import { ConfirmButton, Modal } from '../../components/ui';
import { fmtPrice, poToCp } from '../../lib/dnd/shop';
import { searchItems, type ItemCategory, type LibraryItem } from '../../lib/dnd/srd/items';
import type { Shop, ShopItem } from '../../lib/types';

const AVATARS = ['🧙', '🧝', '🧔', '👩‍🌾', '⚒️', '⚗️', '🏹', '🛡️', '🧰', '💎', '📦', '⚱️'];
const CATS: [ItemCategory | '', string][] = [
  ['', 'Tout'],
  ['potion', 'Potions'],
  ['arme', 'Armes'],
  ['armure', 'Armures'],
  ['équipement', 'Équipement'],
  ['magique', 'Magiques'],
];

export function ShopEditor({ view, shop, onClose }: { view: CampaignView; shop: Shop; onClose: () => void }) {
  const { store } = useSession();
  const toast = useToast();
  const items = view.data!.shopItems.filter((i) => i.shop_id === shop.id);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ItemCategory | ''>('');
  const [custom, setCustom] = useState({ name: '', price: 1, qty: 1, heal: '' });
  const chest = shop.kind === 'chest';
  const fail = (e: Error) => toast(e.message, 'error');
  const done = () => view.reload();

  const patchShop = (p: Partial<Shop>) => store.saveShop({ id: shop.id, campaign_id: shop.campaign_id, ...p }).then(done).catch(fail);
  const add = (it: Pick<LibraryItem, 'name' | 'description' | 'price' | 'heal'>, qty = 1) => {
    const same = items.find((x) => x.name.toLowerCase() === it.name.toLowerCase());
    const p = same
      ? store.saveShopItem({ id: same.id, shop_id: shop.id, campaign_id: shop.campaign_id, qty: same.qty + qty })
      : store.saveShopItem({ shop_id: shop.id, campaign_id: shop.campaign_id, name: it.name, description: it.description, qty, price_cp: chest ? 0 : poToCp(it.price), ...(it.heal ? { heal: it.heal } : {}) });
    return p.then(() => (toast(`${it.name} ajouté`), done())).catch(fail);
  };
  const patchItem = (it: ShopItem, p: Partial<ShopItem>) => store.saveShopItem({ id: it.id, shop_id: it.shop_id, campaign_id: it.campaign_id, ...p }).then(done).catch(fail);

  return (
    <Modal title={chest ? 'Préparer un coffre' : 'Préparer un marchand'} onClose={onClose}>
      <div className="row gap">
        <input id="shop-name" className="grow" defaultValue={shop.name} aria-label="Nom" onBlur={(e) => e.target.value.trim() && e.target.value !== shop.name && patchShop({ name: e.target.value.trim() })} />
        <button className={`chip ${shop.visible ? 'on' : ''}`} onClick={() => patchShop({ visible: !shop.visible })}>
          {shop.visible ? '👁️ Visible' : '🙈 Caché'}
        </button>
      </div>
      <div className="avatar-picker">
        {AVATARS.map((a) => (
          <button type="button" key={a} className={a === shop.avatar ? 'on' : ''} onClick={() => patchShop({ avatar: a })}>
            {a}
          </button>
        ))}
      </div>
      {!chest && (
        <label className="check">
          <input type="checkbox" checked={shop.buys !== false} onChange={(e) => patchShop({ buys: e.target.checked })} /> Rachète les objets des joueurs (moitié prix)
        </label>
      )}
      <textarea rows={2} placeholder="Description (lieu, ambiance…)" defaultValue={shop.description} onBlur={(e) => e.target.value !== shop.description && patchShop({ description: e.target.value })} aria-label="Description" />

      <span className="label">{chest ? 'Contenu' : 'En vente'} ({items.length})</span>
      <ul className="inv">
        {items.map((it) => (
          <li key={it.id} className="inv-row shop-edit-row">
            <span className="list-main">
              <strong className="ellipsis">{it.name}</strong>
              {!chest && <span className="muted small">{fmtPrice(it.price_cp)} l’unité</span>}
            </span>
            {!chest && (
              <input className="num-input" type="number" min={0} step={0.1} defaultValue={it.price_cp / 100} aria-label={`Prix de ${it.name} (po)`} onBlur={(e) => patchItem(it, { price_cp: poToCp(parseFloat(e.target.value) || 0) })} />
            )}
            <input className="num-input" type="number" min={1} defaultValue={it.qty} aria-label={`Stock de ${it.name}`} onBlur={(e) => patchItem(it, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
            <button className="icon-btn" onClick={() => store.deleteShopItem(it.id).then(done).catch(fail)} aria-label={`Retirer ${it.name}`}>
              ✕
            </button>
          </li>
        ))}
      </ul>

      <span className="label">📚 Ajouter depuis la bibliothèque</span>
      <input id="shop-search" placeholder="Rechercher (potion, épée…)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        {CATS.map(([k, l]) => (
          <button key={k} className={`chip ${cat === k ? 'on' : ''}`} onClick={() => setCat(k)}>
            {l}
          </button>
        ))}
      </div>
      <ul className="inv lib-items">
        {searchItems(q, cat)
          .slice(0, 12)
          .map((it) => (
            <li key={it.name} className="inv-row">
              <span className="list-main">
                <strong className="ellipsis">{it.name}</strong>
                <span className="muted small ellipsis">
                  {chest ? '' : `${fmtPrice(poToCp(it.price))} · `}
                  {it.description}
                </span>
              </span>
              <button className="btn small" onClick={() => add(it)} aria-label={`Mettre en vente ${it.name}`}>
                +
              </button>
            </li>
          ))}
      </ul>

      <span className="label">Objet maison</span>
      <div className="row gap">
        <input className="grow" placeholder="Nom" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} aria-label="Nom de l’objet maison" />
        {!chest && <input className="num-input" type="number" min={0} step={0.1} value={custom.price} onChange={(e) => setCustom({ ...custom, price: parseFloat(e.target.value) || 0 })} aria-label="Prix (po)" />}
        <input className="num-input" type="number" min={1} value={custom.qty} onChange={(e) => setCustom({ ...custom, qty: Math.max(1, parseInt(e.target.value, 10) || 1) })} aria-label="Quantité" />
      </div>
      <div className="row gap">
        <input className="grow" placeholder="Soin (ex. 2d4+2, optionnel)" value={custom.heal} onChange={(e) => setCustom({ ...custom, heal: e.target.value })} aria-label="Formule de soin" />
        <button
          className="btn small primary"
          disabled={!custom.name.trim()}
          onClick={() => add({ name: custom.name.trim(), description: custom.heal ? `Rend ${custom.heal} PV.` : '', price: custom.price, heal: custom.heal.trim() || undefined }, custom.qty).then(() => setCustom({ name: '', price: 1, qty: 1, heal: '' }))}
        >
          Ajouter
        </button>
      </div>
      <p className="muted small">Prix en pièces d’or (0,1 = 1 pa). Les joueurs paient avec leur bourse ; la monnaie est rendue.</p>

      <ConfirmButton
        onConfirm={() => {
          store.deleteShop(shop.id).then(done).catch(fail);
          onClose();
        }}
      >
        Supprimer {chest ? 'le coffre' : 'le marchand'}
      </ConfirmButton>
    </Modal>
  );
}
