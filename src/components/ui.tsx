// Composants d'interface réutilisables : Modal, ConfirmButton, Stepper, LazyInput, AmountDialog, Empty.
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/** Bouton qui demande une seconde pression pour confirmer (pas de confirm() natif). */
export function ConfirmButton({
  children,
  confirmLabel = 'Confirmer ?',
  onConfirm,
  className = 'btn danger',
}: {
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={className + (armed ? ' armed' : '')}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}

export function Stepper({
  value,
  onDelta,
  disabled,
  canIncrease = true,
  label,
}: {
  value: ReactNode;
  onDelta: (d: number) => void;
  disabled?: boolean;
  /** Faux : seul « − » est actif (le joueur peut consommer, pas ajouter). */
  canIncrease?: boolean;
  label: string;
}) {
  return (
    <div className="stepper" aria-label={label}>
      <button type="button" className="step" disabled={disabled} onClick={() => onDelta(-1)} aria-label={`Retirer 1 ${label}`}>
        −
      </button>
      <span className="step-value">{value}</span>
      <button type="button" className="step" disabled={disabled || !canIncrease} onClick={() => onDelta(1)} aria-label={`Ajouter 1 ${label}`}>
        +
      </button>
    </div>
  );
}

/** Champ texte qui n'enregistre qu'à la sortie (évite une requête par lettre). */
export function LazyInput({
  value,
  onCommit,
  multiline,
  ...rest
}: {
  value: string;
  onCommit: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  rows?: number;
  list?: string;
  'aria-label'?: string;
}) {
  const [v, setV] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setV(value);
  }, [value]);
  const commit = () => {
    focused.current = false;
    if (v !== value) onCommit(v);
  };
  const common = {
    value: v,
    onFocus: () => (focused.current = true),
    onBlur: commit,
    ...rest,
  };
  return multiline ? (
    <textarea {...common} onChange={(e) => setV(e.target.value)} />
  ) : (
    <input
      {...common}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

/** Pavé pour saisir un nombre ou un écart (+5 / -3). */
export function AmountDialog({
  title,
  current,
  onClose,
  onApply,
  allowSet = true,
  allowAdd = true,
}: {
  title: string;
  current?: number;
  onClose: () => void;
  onApply: (r: { delta?: number; set?: number }) => void;
  allowSet?: boolean;
  /** Faux : seul « Retirer » est proposé (dépense). */
  allowAdd?: boolean;
}) {
  const [n, setN] = useState('');
  const num = parseInt(n, 10);
  const ok = !Number.isNaN(num);
  const apply = (r: { delta?: number; set?: number }) => {
    onApply(r);
    onClose();
  };
  return (
    <Modal title={title} onClose={onClose}>
      {current !== undefined && <p className="muted">Valeur actuelle : {current}</p>}
      <input
        id="amount-input"
        className="big-input"
        inputMode="numeric"
        autoFocus
        placeholder="Montant"
        value={n}
        onChange={(e) => setN(e.target.value.replace(/[^0-9]/g, ''))}
      />
      <div className="quick-amounts">
        {[1, 2, 5, 10, 20, 50].map((q) => (
          <button key={q} type="button" className="chip" onClick={() => setN(String(q))}>
            {q}
          </button>
        ))}
      </div>
      <div className="row gap">
        <button type="button" className="btn hurt grow" disabled={!ok} onClick={() => apply({ delta: -num })}>
          − Retirer
        </button>
        {allowAdd && (
          <button type="button" className="btn heal grow" disabled={!ok} onClick={() => apply({ delta: num })}>
            + Ajouter
          </button>
        )}
      </div>
      {allowSet && (
        <button type="button" className="btn ghost full" disabled={!ok} onClick={() => apply({ set: num })}>
          Fixer à {ok ? num : '…'}
        </button>
      )}
    </Modal>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden>
        {icon}
      </div>
      <p className="empty-title">{title}</p>
      {children}
    </div>
  );
}
