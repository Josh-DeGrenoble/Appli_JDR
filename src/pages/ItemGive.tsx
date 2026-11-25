// Fenêtre d'un objet : le donner à un autre perso, ou le déposer dans un coffre (joueur : coffres visibles).
import { useState } from 'react';
import { useSession } from '../data/session';
import type { CampaignView } from '../data/useCampaign';
import { useToast } from '../components/Toast';
import { logEvent } from '../data/actions';
import type { Item } from '../lib/types';

export function ItemGive({ view, item, owner, onDone }: { view: CampaignView; item: Item; owner: string; onDone: () => void }) {
  const { store } = useSession();
  const toast = useToast();
  const [to, setTo] = useState('');
  const [qty, setQty] = useState(1);
  const targets = view.data!.characters.filter((x) => x.id !== item.character_id);
  const chests = view.data!.shops.filter((s) => s.kind === 'chest' && (view.isGM || s.visible));
  if (!targets.length && !chests.length) return null;
  const n = Math.min(Math.max(1, qty), item.qty);

  const send = () => {
    const chest = chests.find((c) => c.id === to);
    const dest = chest?.name ?? targets.find((t) => t.id === to)?.name;
    (chest ? store.depositItem(item.id, to, n) : store.transferItem(item.id, to, n))
      .then(() => {
        toast(chest ? `🧰 ${item.name} déposé dans ${dest}` : `${item.name} donné à ${dest}`);
        logEvent(store, item.campaign_id, chest ? `🧰 ${owner} dépose ${n} × ${item.name} dans ${dest}` : `🎁 ${owner} donne ${n} × ${item.name} à ${dest}`, owner);
        view.reload();
        onDone();
      })
      .catch((e: Error) => toast(e.message, 'error'));
  };

  return (
    <div className="stack-sm give-box">
      <span className="label">Donner ou déposer</span>
      {item.equipped && <p className="muted small">Retire-le d’abord (⚔️ Équipé) pour le donner.</p>}
      <div className="row gap">
        <select id="item-to" className="grow" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Destinataire">
          <option value="">Choisir…</option>
          {targets.length > 0 && (
            <optgroup label="Personnages">
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.avatar} {t.name}
                </option>
              ))}
            </optgroup>
          )}
          {chests.length > 0 && (
            <optgroup label="Coffres">
              {chests.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.avatar} {c.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <input className="num-input" type="number" min={1} max={item.qty} value={qty} onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)} aria-label="Quantité à donner" />
      </div>
      <button className="btn" disabled={!to || !!item.equipped} onClick={send}>
        {chests.some((c) => c.id === to) ? '🧰 Déposer' : 'Donner'}
      </button>
    </div>
  );
}
