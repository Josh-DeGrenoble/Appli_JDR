// Joueur : vendre au marchand les objets de son sac (moitié de leur valeur : prix du marchand ou de la bibliothèque),
// ou les déposer dans un coffre (gratuit).
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { useSession } from '../../data/session';
import { useToast } from '../../components/Toast';
import { logEvent } from '../../data/actions';
import { fmtPrice, itemValue, resalePrice } from '../../lib/dnd/shop';
import { libraryCp } from '../../lib/dnd/srd/items';
import type { Shop, ShopItem } from '../../lib/types';

export function SellList({ view, shop, stock, sellerId }: { view: CampaignView; shop: Shop; stock: ShopItem[]; sellerId: string }) {
  const { store } = useSession();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const seller = view.data!.characters.find((c) => c.id === sellerId);
  const mine = view.data!.items.filter((i) => i.character_id === sellerId && !i.equipped);
  if (!seller) return null;

  const chest = shop.kind === 'chest';
  const sell = async (itemId: string, name: string, gain: number) => {
    setBusy(itemId);
    try {
      await (chest ? store.depositItem(itemId, shop.id, 1) : store.sellItem(itemId, shop.id, 1));
      const msg = chest ? `🧰 ${seller.name} dépose ${name} dans ${shop.name}` : `💰 ${seller.name} vend ${name} à ${shop.name} (${fmtPrice(gain)})`;
      toast(msg, 'gift');
      logEvent(store, shop.campaign_id, msg, seller.name);
      view.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack-xs sell">
      <button className="link" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? '▲' : '▼'} {chest ? `Déposer dans ${shop.name}` : `Vendre à ${shop.name} (moitié prix)`}
      </button>
      {open && (
        <ul className="inv">
          {mine.length === 0 && <li className="muted small">Rien à {chest ? 'déposer' : 'vendre'} (retire d’abord ce qui est équipé).</li>}
          {mine.map((it) => {
            const value = itemValue(it.name, stock, libraryCp(it.name));
            const gain = value === null ? 0 : resalePrice(value);
            return (
              <li key={it.id} className="inv-row shop-row">
                <span className="list-main">
                  <strong className="ellipsis">{it.name}</strong>
                  <span className="muted small">×{it.qty}</span>
                </span>
                {!chest && <span className="price">{gain ? fmtPrice(gain) : '—'}</span>}
                <button className="btn small" disabled={(!chest && !gain) || busy === it.id} onClick={() => sell(it.id, it.name, gain)} aria-label={`${chest ? 'Déposer' : 'Vendre'} ${it.name}`}>
                  {chest ? 'Déposer' : 'Vendre'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && !chest && <p className="muted small">« — » : le marchand ne connaît pas le prix de cet objet (demande au MJ).</p>}
    </div>
  );
}
