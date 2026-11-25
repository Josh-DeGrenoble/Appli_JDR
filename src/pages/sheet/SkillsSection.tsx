// Fiche : les 18 compétences. Tap = jet ; en mode modifier, tap sur le rond = rien → maîtrise → expertise.
import { SKILLS, abilityShort } from '../../lib/dnd/data';
import { fmtBonus, skillBonus } from '../../lib/dnd/rules';
import type { ProfLevel } from '../../lib/dnd/sheet';
import type { SheetCtx } from './useSheet';

const MARK = ['○', '●', '◆'];
const MARK_LABEL = ['non maîtrisée', 'maîtrisée', 'expertise'];

export function SkillsSection({ ctx }: { ctx: SheetCtx }) {
  const { s, editing, patch, rollD20 } = ctx;

  const cycle = (key: string) => {
    const next = (((s.skills[key] ?? 0) + 1) % 3) as ProfLevel;
    patch({ skills: { ...s.skills, [key]: next } });
  };

  return (
    <section className="card stack-sm">
      <h3 className="section-title">Compétences</h3>
      <ul className="skills">
        {SKILLS.map((sk) => {
          const lvl = s.skills[sk.key] ?? 0;
          const bonus = skillBonus(s, sk.key);
          return (
            <li key={sk.key}>
              {editing ? (
                <button className="skill-row" onClick={() => cycle(sk.key)} aria-label={`${sk.label} : ${MARK_LABEL[lvl]}, changer`}>
                  <span className={`prof-mark p${lvl}`}>{MARK[lvl]}</span>
                  <span className="skill-name">{sk.label}</span>
                  <span className="muted small">{abilityShort(sk.ability)}</span>
                  <span className="skill-bonus">{fmtBonus(bonus)}</span>
                </button>
              ) : (
                <button className="skill-row" onClick={() => rollD20(sk.label, bonus, 'check', sk.ability)} aria-label={`Jet de ${sk.label} ${fmtBonus(bonus)}`}>
                  <span className={`prof-mark p${lvl}`} aria-hidden>
                    {MARK[lvl]}
                  </span>
                  <span className="skill-name">{sk.label}</span>
                  <span className="muted small">{abilityShort(sk.ability)}</span>
                  <span className="skill-bonus">{fmtBonus(bonus)}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {editing && <p className="muted small">○ rien · ● maîtrise · ◆ expertise (maîtrise doublée)</p>}
    </section>
  );
}
