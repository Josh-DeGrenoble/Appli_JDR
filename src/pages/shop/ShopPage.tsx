// Onglet Marché : marchands et coffres. MJ : les prépare à l'avance et les montre/cache aux joueurs.
// Joueur : voit les marchands visibles, achète avec la bourse de son perso (ou prend dans un coffre).
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { useSession } from '../../data/session';
import { useToast } from '../../components/Toast';
import { Empty } from '../../components/ui';
import { logEvent } from '../../data/actions';
import { normalizeSheet } from '../../lib/dnd/sheet';
import { fmtPrice, purseCp } from '../../lib/dnd/shop';
import type { Shop, ShopItem } from '../../lib/types';
import { ShopEditor } from './ShopEditor';
import { SellList } from './SellList';

export function ShopPage({ view }: { view: CampaignView }) {
  const { store } = useSession();
  const toast = useToast();
  const data = view.data!;
  const [edit, setEdit] = useState<Shop | null>(null);
  const [buyer, setBuyer] = useState<string>(view.myCharacters[0]?.id ?? '');
  const shops = data.shops;
  const fail = (e: Error) => toast(e.message, 'error');

  const create = (kind: Shop['kind']) =>
    store
      .saveShop({ campaign_id: data.campaign.id, kind, name: kind === 'chest' ? 'Coffre' : 'Nouveau marchand', avatar: kind === 'chest' ? '🧰' : '🧙', visible: false, description: '' })
      .then((s) => (view.reload(), setEdit(s)))
      .catch(fail);

  const toggle = (s: Shop) =>
    store
      .saveShop({ id: s.id, campaign_id: s.campaign_id, visible: !s.visible })
      .then(() => {
        view.reload();
        if (!s.visible) logEvent(store, s.campaign_id, `${s.kind === 'chest' ? '🧰' : '🏪'} ${s.name} est disponible`);
      })
      .catch(fail);

  const me = view.myCharacters.find((c) => c.id === buyer) ?? view.myCharacters[0];
  const purse = me ? purseCp(normalizeSheet(me.sheet).coins) : 0;

  return (
    <div className="stack">
      <div className="row between">
        <h2 className="section-title">Marché</h2>
        {view.isGM && (
          <div className="row gap">
            <button className="btn small" onClick={() => create('merchant')}>
              + Marchand
            </button>
            <button className="btn small" onClick={() => create('chest')}>
              + Coffre
            </button>
          </div>
        )}
      </div>

      {!view.isGM && me && (
        <div className="card row between purse">
          {view.myCharacters.length > 1 ? (
            <select value={me.id} onChange={(e) => setBuyer(e.target.value)} aria-label="Personnage qui achète">
              {view.myCharacters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.avatar} {c.name}
                </option>
              ))}
            </select>
          ) : (
            <strong>
              {me.avatar} {me.name}
            </strong>
          )}
          <span>💰 {fmtPrice(purse)}</span>
        </div>
      )}

      {shops.length === 0 && (
        <Empty icon="🏪" title={view.isGM ? 'Aucun marchand' : 'Aucun marchand pour l’instant'}>
          <p className="muted">{view.isGM ? 'Prépare tes marchands et coffres à l’avance, puis montre-les aux joueurs au bon moment (👁️).' : 'Le MJ ouvrira une boutique ou un coffre ici.'}</p>
        </Empty>
      )}

      {shops.map((s) => (
        <ShopCard
          key={s.id}
          view={view}
          shop={s}
          items={data.shopItems.filter((i) => i.shop_id === s.id)}
          buyerId={me?.id}
          purse={purse}
          onEdit={() => setEdit(s)}
          onToggle={() => toggle(s)}
        />
      ))}
      {edit && <ShopEditor view={view} shop={shops.find((x) => x.id === edit.id) ?? edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

interface CardProps {
  view: CampaignView;
  shop: Shop;
  items: ShopItem[];
  buyerId?: string;
  purse: number;
  onEdit: () => void;
  onToggle: () => void;
}

function ShopCard({ view, shop, items, buyerId, purse, onEdit, onToggle }: CardProps) {
  const { store } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const chest = shop.kind === 'chest';
  const buyer = view.data!.characters.find((c) => c.id === buyerId);

  const buy = async (it: ShopItem) => {
    if (!buyer) return;
    setBusy(it.id);
    try {
      await store.buyItem(it.id, buyer.id, 1);
      const msg = chest ? `🧰 ${buyer.name} prend ${it.name}` : `🛒 ${buyer.name} achète ${it.name} (${fmtPrice(it.price_cp)})`;
      toast(msg, 'gift');
      logEvent(store, shop.campaign_id, msg, buyer.name);
      view.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={`card stack-sm shop ${shop.visible ? '' : 'shop-hidden'}`}>
      <div className="row between">
        <h3 className="section-title">
          {shop.avatar} {shop.name}
        </h3>
        {view.isGM && (
          <div className="row gap">
            <button className={`chip ${shop.visible ? 'on' : ''}`} onClick={onToggle} aria-pressed={shop.visible} aria-label={`Visibilité de ${shop.name}`}>
              {shop.visible ? '👁️ Visible' : '🙈 Caché'}
            </button>
            <button className="icon-btn" onClick={onEdit} aria-label={`Modifier ${shop.name}`}>
              ✏️
            </button>
          </div>
        )}
      </div>
      {shop.description && <p className="muted small">{shop.description}</p>}
      {items.length === 0 ? (
        <p className="muted small">{chest ? 'Le coffre est vide.' : 'Plus rien à vendre.'}</p>
      ) : (
        <ul className="inv">
          {items.map((it) => (
            <li key={it.id} className="inv-row shop-row">
              <span className="list-main">
                <strong>
                  {it.heal ? '🧪 ' : ''}
                  {it.name}
                </strong>
                <span className="muted small ellipsis">{it.description}</span>
              </span>
              <span className="shop-side">
                {!chest && <span className="price">{fmtPrice(it.price_cp)}</span>}
                <span className="muted small">×{it.qty}</span>
              </span>
              {!view.isGM && (
                <button
                  className="btn primary small"
                  disabled={!buyer || busy === it.id || (!chest && it.price_cp > purse)}
                  onClick={() => buy(it)}
                  aria-label={`${chest ? 'Prendre' : 'Acheter'} ${it.name}`}
                >
                  {chest ? 'Prendre' : 'Acheter'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!view.isGM && (chest || shop.buys !== false) && buyerId && <SellList view={view} shop={shop} stock={items} sellerId={buyerId} />}
    </section>
  );
}
