// Fiche : les 6 caractéristiques (test en un tap) et les jets de sauvegarde (maîtrise cochable en mode modifier).
import { ABILITIES, type Ability } from '../../lib/dnd/data';
import { abilityMod, fmtBonus, saveBonus } from '../../lib/dnd/rules';
import type { SheetCtx } from './useSheet';

export function AbilitiesSection({ ctx }: { ctx: SheetCtx }) {
  const { s, editing, patch, rollD20 } = ctx;

  const setScore = (a: Ability, v: number) => patch({ abilities: { ...s.abilities, [a]: Math.min(30, Math.max(1, v)) } });
  const toggleSave = (a: Ability) =>
    patch({ saveProf: s.saveProf.includes(a) ? s.saveProf.filter((x) => x !== a) : [...s.saveProf, a] });

  return (
    <section className="card stack-sm">
      <h3 className="section-title">Caractéristiques</h3>
      <div className="abilities">
        {ABILITIES.map((ab) => {
          const score = s.abilities[ab.key];
          const mod = abilityMod(score);
          const save = saveBonus(s, ab.key);
          const prof = s.saveProf.includes(ab.key);
          return (
            <div key={ab.key} className="ability">
              <span className="ability-name" title={ab.label}>
                {ab.short}
              </span>
              {editing ? (
                <input
                  key={score}
                  className="ability-score-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={30}
                  defaultValue={score}
                  aria-label={`Valeur de ${ab.label}`}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v) && v !== score) setScore(ab.key, v);
                  }}
                />
              ) : (
                <button className="ability-mod" onClick={() => rollD20(`Test de ${ab.label}`, mod, 'check', ab.key)} aria-label={`Test de ${ab.label} ${fmtBonus(mod)}`}>
                  {fmtBonus(mod)}
                </button>
              )}
              <span className="ability-score">{editing ? fmtBonus(mod) : score}</span>
              {editing ? (
                <button className={`save-chip ${prof ? 'on' : ''}`} onClick={() => toggleSave(ab.key)} aria-pressed={prof}>
                  {prof ? '●' : '○'} JS
                </button>
              ) : (
                <button
                  className={`save-chip ${prof ? 'on' : ''}`}
                  onClick={() => rollD20(`Sauvegarde de ${ab.label}`, save, 'save', ab.key)}
                  aria-label={`Sauvegarde de ${ab.label} ${fmtBonus(save)}`}
                >
                  JS {fmtBonus(save)}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
