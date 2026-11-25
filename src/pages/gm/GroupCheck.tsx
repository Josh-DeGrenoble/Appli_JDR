// MJ (écran du MJ) : demander un test à plusieurs persos (compétence, sauvegarde ou caractéristique, DD), voir les
// réponses arriver (réussi / raté), terminer. Les joueurs répondent depuis le bandeau en haut de leur écran.
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { useSession } from '../../data/session';
import { useToast } from '../../components/Toast';
import { logEvent } from '../../data/actions';
import { ABILITIES, SKILLS } from '../../lib/dnd/data';
import { requestLabel, requestResults, type CheckRequest } from '../../lib/dnd/requests';
import { uid } from '../../lib/ids';

export function GroupCheck({ view }: { view: CampaignView }) {
  const { store } = useSession();
  const toast = useToast();
  const data = view.data!;
  const camp = data.campaign;
  const pcs = data.characters.filter((c) => c.owner_id !== camp.gm_id);
  const req = camp.settings.request ?? null;
  const [kind, setKind] = useState<CheckRequest['kind']>('skill');
  const [key, setKey] = useState('perception');
  const [dc, setDc] = useState(15);
  const [showDc, setShowDc] = useState(false);
  const [secret, setSecret] = useState(false);
  const [targets, setTargets] = useState<string[]>(pcs.map((c) => c.id));
  const fail = (e: Error) => toast(e.message, 'error');
  const save = (request: CheckRequest | null) => store.updateCampaign(camp.id, { settings: { ...camp.settings, request } }).then(view.reload).catch(fail);

  if (req) {
    const res = requestResults(data.rolls, req.id);
    return (
      <section className="card stack-sm group-check">
        <div className="row between">
          <strong>
            🎯 {requestLabel(req)}
            {req.dc ? ` · DD ${req.dc}` : ''}
          </strong>
          <span className="muted small">
            {res.size}/{req.targets.length}
          </span>
        </div>
        <ul className="list">
          {req.targets.map((id) => {
            const c = data.characters.find((x) => x.id === id);
            const t = res.get(id);
            return (
              <li key={id} className="row between check-row">
                <span>
                  {c?.avatar} {c?.name ?? '?'}
                </span>
                <span className={t === undefined ? 'muted small' : req.dc ? (t >= req.dc ? 'ok' : 'ko') : ''}>
                  {t === undefined ? 'en attente…' : `${t}${req.dc ? (t >= req.dc ? ' ✓ réussi' : ' ✗ raté') : ''}`}
                </span>
              </li>
            );
          })}
        </ul>
        <button className="btn" onClick={() => save(null)}>
          Terminer le test
        </button>
      </section>
    );
  }

  const options = kind === 'skill' ? SKILLS.map((s) => [s.key, s.label]) : ABILITIES.map((a) => [a.key, a.label]);
  return (
    <section className="card stack-sm group-check">
      <h3 className="section-title">🎯 Demander un test</h3>
      <div className="segmented small">
        {([['skill', 'Compétence'], ['save', 'Sauvegarde'], ['ability', 'Caractéristique']] as const).map(([k, l]) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => (setKind(k), setKey(k === 'skill' ? 'perception' : 'dex'))}>
            {l}
          </button>
        ))}
      </div>
      <div className="row gap">
        <select id="check-key" className="grow" value={key} onChange={(e) => setKey(e.target.value)} aria-label="Test">
          {options.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <label className="row gap small">
          DD <input id="check-dc" className="num-input" type="number" value={dc} onChange={(e) => setDc(parseInt(e.target.value, 10) || 0)} />
        </label>
      </div>
      <div className="chips">
        {pcs.map((c) => (
          <button key={c.id} className={`chip ${targets.includes(c.id) ? 'on' : ''}`} onClick={() => setTargets((t) => (t.includes(c.id) ? t.filter((x) => x !== c.id) : [...t, c.id]))}>
            {c.avatar} {c.name}
          </button>
        ))}
      </div>
      <label className="check">
        <input type="checkbox" checked={showDc} onChange={(e) => setShowDc(e.target.checked)} /> Montrer le DD aux joueurs
      </label>
      <label className="check">
        <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} /> Jets cachés aux autres joueurs
      </label>
      <button
        className="btn primary"
        disabled={!targets.length}
        onClick={() => {
          const r: CheckRequest = { id: uid(), kind, key, dc: dc || undefined, showDc, secret, targets };
          save(r).then(() => logEvent(store, camp.id, `🎯 Le MJ demande : ${requestLabel(r)}`));
        }}
      >
        🎯 Demander à {targets.length} perso{targets.length > 1 ? 's' : ''}
      </button>
    </section>
  );
}
