// Règles de D&D 2024 expliquées simplement (bouton « 📖 Les règles » de l'accueil) : menu par thème, chaque thème
// découpé en parties courtes. Contenu dans rulesContent.ts ; recherche dans tout le texte.
import { useState } from 'react';
import { Modal } from '../components/ui';
import { RULES } from './rulesContent';
import { searchKey as norm } from '../lib/text';


/** Bouton + fenêtre des règles. */
export function RulesButton() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<string | null>(RULES[0].title);
  const [q, setQ] = useState('');
  const n = norm(q.trim());
  const sections = RULES.map((s) => ({
    ...s,
    parts: n ? s.parts.map((p) => ({ ...p, lines: p.lines.filter((l) => norm(l).includes(n) || norm(p.title).includes(n)) })).filter((p) => p.lines.length) : s.parts,
  })).filter((s) => !n || s.parts.length || norm(s.title).includes(n));

  return (
    <>
      <button className="btn ghost full rules-btn" onClick={() => setOpen(true)}>
        📖 Les règles expliquées simplement
      </button>
      {open && (
        <Modal title="Les règles" onClose={() => setOpen(false)}>
          <p className="muted small">Donjons & Dragons (règles 2024), expliqué simplement. Le MJ a toujours le dernier mot.</p>
          <input placeholder="Chercher (avantage, sort, repos…)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Chercher dans les règles" />
          <ul className="rules">
            {sections.map((s) => {
              const isOpen = !!n || shown === s.title;
              return (
                <li key={s.title} className="card">
                  <button className="rules-head" onClick={() => setShown(shown === s.title ? null : s.title)} aria-expanded={isOpen}>
                    <span>
                      {s.icon} {s.title}
                    </span>
                    <span aria-hidden>{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <div className="stack-sm">
                      <p className="small muted">{s.intro}</p>
                      {s.parts.map((p) => (
                        <div key={p.title} className="rules-part">
                          <strong className="small">{p.title}</strong>
                          {p.lines.map((l) => (
                            <p key={l} className="small">
                              {l}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
            {sections.length === 0 && <li className="muted small">Rien trouvé.</li>}
          </ul>
        </Modal>
      )}
    </>
  );
}
