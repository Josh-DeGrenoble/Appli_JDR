// Historique de la campagne : bouton 🕘 (avec pastille « non lu ») qui ouvre un panneau glissant depuis la droite.
import { cleanLabel } from '../lib/dnd/requests';
import { useState } from 'react';
import type { Roll } from '../lib/types';
import { timeAgo } from '../lib/ids';
import { Drawer, useSeen } from './Drawer';

type Filter = 'all' | 'event' | 'roll';
const FILTERS: [Filter, string][] = [
  ['all', 'Tout'],
  ['event', 'Événements'],
  ['roll', 'Jets'],
];

/** Bouton de la barre du haut + tiroir d'historique (jets, dégâts, soins, objets, tours de combat). */
export function HistoryDrawer({ campaignId, rolls, myId }: { campaignId: string; rolls: Roll[]; myId?: string }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const seen = useSeen(`grimoire-history-seen-${campaignId}`, rolls[0]?.created_at ?? '', open);
  const unread = rolls.filter((r) => r.created_at > seen && r.user_id !== myId).length;
  const shown = rolls.filter((r) => filter === 'all' || (r.kind ?? 'roll') === filter);

  return (
    <Drawer icon="🕘" label="Historique" title="Historique" unread={unread} open={open} onOpen={setOpen}>
      <div className="chips">
        {FILTERS.map(([k, l]) => (
          <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
            {l}
          </button>
        ))}
      </div>
      <ul className="history-list">
        {shown.length === 0 && <li className="muted">Rien pour l’instant.</li>}
        {shown.map((r) => (
          <HistoryRow key={r.id} r={r} />
        ))}
      </ul>
    </Drawer>
  );
}

function HistoryRow({ r }: { r: Roll }) {
  const event = r.kind === 'event';
  return (
    <li className={`history-row ${event ? 'event' : 'roll'} ${r.secret ? 'secret' : ''}`}>
      {!event && <span className="history-total">{r.total}</span>}
      <span className="list-main">
        <span>
          {!event && <strong>{r.author_name} · </strong>}
          {cleanLabel(r.label) || r.formula}
          {r.secret && <span className="pill">caché</span>}
        </span>
        <span className="muted small">
          {event ? `${r.author_name} · ` : r.formula ? `${r.formula} → ${r.detail} · ` : ''}
          {timeAgo(r.created_at)}
        </span>
      </span>
    </li>
  );
}
