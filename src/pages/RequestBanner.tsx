// Joueur : bandeau « Le MJ demande un test » en haut de l'écran pour chacun de ses persos concernés qui n'a pas
// encore répondu. Jet lancé par l'appli (avantage automatique compris), ou total tapé en mode vrais dés.
import { useState } from 'react';
import type { CampaignView } from '../data/useCampaign';
import { useRoller } from '../data/useRoller';
import { useSession } from '../data/session';
import { useToast } from '../components/Toast';
import { autoMode, modeTag } from '../lib/dnd/advantage';
import { d20Formula, fmtBonus } from '../lib/dnd/rules';
import { normalizeSheet } from '../lib/dnd/sheet';
import { requestBonus, requestLabel, requestResults, requestTag } from '../lib/dnd/requests';
import type { Character } from '../lib/types';

export function RequestBanner({ view }: { view: CampaignView }) {
  const data = view.data!;
  const req = data.campaign.settings.request;
  if (!req || view.isGM) return null;
  const answered = requestResults(data.rolls, req.id);
  const mine = view.myCharacters.filter((c) => req.targets.includes(c.id) && !answered.has(c.id));
  if (!mine.length) return null;
  return (
    <div className="stack-xs request-banners">
      {mine.map((c) => (
        <RequestRow key={c.id} view={view} c={c} />
      ))}
    </div>
  );
}

function RequestRow({ view, c }: { view: CampaignView; c: Character }) {
  const { store } = useSession();
  const toast = useToast();
  const roller = useRoller(view);
  const [typed, setTyped] = useState('');
  const req = view.data!.campaign.settings.request!;
  const s = normalizeSheet(c.sheet);
  const b = requestBonus(s, req);
  const a = autoMode({ kind: b.kind, ability: b.ability, self: s.conditions, grant: s.grant });
  const label = `${requestTag(req.id, c.id)}🎯 ${requestLabel(req)}${req.showDc && req.dc ? ` (DD ${req.dc})` : ''}${modeTag(a)}`;
  const real = !!view.data!.campaign.settings.realDice;

  /** Vrais dés : le joueur tape son total, enregistré comme un jet. */
  const send = () => {
    const total = parseInt(typed, 10);
    if (Number.isNaN(total)) return;
    store
      .addRoll({ campaign_id: c.campaign_id, author_name: c.name, label, formula: 'dé réel', detail: `${total}`, total, secret: !!req.secret })
      .then(() => (toast(`🎯 ${requestLabel(req)} : ${total} envoyé au MJ`), view.reload()))
      .catch((e: Error) => toast(e.message, 'error'));
  };

  return (
    <div className="card request-banner">
      <span>
        🎯 Le MJ demande à <strong>{c.name}</strong> : <strong>{requestLabel(req)}</strong> ({fmtBonus(b.bonus - 2 * s.exhaustion)})
        {req.showDc && req.dc ? ` · DD ${req.dc}` : ''}
      </span>
      {real ? (
        <div className="row gap">
          <input className="num-input grow" inputMode="numeric" placeholder="Total de ton dé" value={typed} onChange={(e) => setTyped(e.target.value.replace(/[^0-9-]/g, ''))} aria-label="Total du dé" />
          <button className="btn primary" disabled={!typed} onClick={send}>
            Envoyer
          </button>
        </div>
      ) : (
        <button className="btn primary" onClick={() => roller(d20Formula(b.bonus, a.mode, s.exhaustion), { label, author: c.name, secret: !!req.secret }).then(() => view.reload())}>
          🎲 Lancer
        </button>
      )}
    </div>
  );
}
