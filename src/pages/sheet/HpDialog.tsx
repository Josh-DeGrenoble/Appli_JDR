// Fenêtre PV : dégâts (PV temporaires d'abord), soins, PV temporaires. Utilisée par la fiche et la table MJ.
import { useState } from 'react';
import { useSession } from '../../data/session';
import { useToast } from '../../components/Toast';
import { concentrationReminder, logEvent } from '../../data/actions';
import { Modal } from '../../components/ui';
import { hpOf } from '../../lib/templates';
import type { Character } from '../../lib/types';

export function HpDialog({ c, onClose, onDone }: { c: Character; onClose: () => void; onDone: () => void }) {
  const { store, user } = useSession();
  const toast = useToast();
  const [n, setN] = useState('');
  const hp = hpOf(c);
  const num = parseInt(n, 10);
  const ok = !Number.isNaN(num) && num > 0;

  const go = (p: Promise<void>, text: string) => {
    p.then(() => logEvent(store, c.campaign_id, text, user?.name ?? 'MJ'))
      .then(onDone)
      .catch((e: Error) => toast(e.message, 'error'));
    onClose();
  };

  /** Perso concentré : rappelle la sauvegarde de concentration (et l'écrit dans l'historique). */
  const remind = (dmg: number) => {
    const r = concentrationReminder(c, dmg);
    if (r) (toast(r, 'hurt'), logEvent(store, c.campaign_id, r));
  };

  return (
    <Modal title={`PV de ${c.name}`} onClose={onClose}>
      <p className="hp-recap">
        <strong>{hp.current}</strong> / {hp.max}
        {hp.temp > 0 && <span className="pill">+{hp.temp} temp.</span>}
      </p>
      <input
        id="hp-amount"
        className="big-input"
        inputMode="numeric"
        autoFocus
        placeholder="Montant"
        value={n}
        onChange={(e) => setN(e.target.value.replace(/[^0-9]/g, ''))}
      />
      <div className="quick-amounts">
        {[1, 2, 3, 5, 8, 10, 15, 20].map((q) => (
          <button key={q} type="button" className="chip" onClick={() => setN(String(q))}>
            {q}
          </button>
        ))}
      </div>
      <div className="row gap">
        <button type="button" className="btn hurt grow" disabled={!ok} onClick={() => (go(store.applyHp(c.id, -num), `💥 ${c.name} : −${num} PV`), remind(num))}>
          💥 Dégâts
        </button>
        <button type="button" className="btn heal grow" disabled={!ok} onClick={() => go(store.applyHp(c.id, num), `✨ ${c.name} : +${num} PV`)}>
          ✨ Soins
        </button>
      </div>
      <button type="button" className="btn ghost full" disabled={Number.isNaN(num)} onClick={() => go(store.setTempHp(c.id, num || 0), `🛡️ ${c.name} : ${num || 0} PV temporaires`)}>
        🛡️ Fixer les PV temporaires à {Number.isNaN(num) ? '…' : num}
      </button>
      <p className="muted small">Les dégâts retirent d’abord les PV temporaires. Les PV temporaires ne se cumulent pas.</p>
    </Modal>
  );
}
