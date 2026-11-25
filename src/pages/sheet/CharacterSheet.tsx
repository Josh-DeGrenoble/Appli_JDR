// Fiche D&D d'un personnage : en-tête, barre d'outils (avantage/désavantage, modifier), niveau et 4 sous-onglets (Combat inclut attaques et sorts).
import { useState } from 'react';
import { useSession } from '../../data/session';
import type { CampaignView } from '../../data/useCampaign';
import type { RollMode } from '../../lib/dnd/data';
import { LevelBar } from './LevelBar';
import type { Character } from '../../lib/types';
import { navigate } from '../../router';
import { ConfirmButton, Empty, LazyInput } from '../../components/ui';
import { Inventory } from '../Inventory';
import { WornPanel } from './Equipment';
import { AbilitiesSection } from './AbilitiesSection';
import { AttacksSection } from './AttacksSection';
import { FeaturesSection } from './FeaturesSection';
import { SpellsSection } from './SpellsSection';
import { CoinsSection } from './CoinsSection';
import { IdentitySection, SheetHeader } from './IdentitySection';
import { SkillsSection } from './SkillsSection';
import { StatusSection } from './StatusSection';
import { CompanionsSection } from './CompanionsSection';
import { useSheet, type SheetCtx } from './useSheet';
import { VitalsSection } from './VitalsSection';

type Part = 'combat' | 'caracs' | 'sac' | 'perso';
const PARTS: [Part, string][] = [
  ['combat', 'Combat'],
  ['caracs', 'Caracs'],
  ['sac', 'Sac'],
  ['perso', 'Perso'],
];

export function CharacterSheet({ view, characterId }: { view: CampaignView; characterId?: string }) {
  const c = view.data!.characters.find((x) => x.id === characterId);
  if (!c)
    return (
      <Empty icon="🌫️" title="Ce personnage n’existe plus">
        <button className="btn" onClick={() => navigate(`/c/${view.data!.campaign.id}`)}>
          Retour
        </button>
      </Empty>
    );
  return <Sheet view={view} c={c} />;
}

function Sheet({ view, c }: { view: CampaignView; c: Character }) {
  const ctx = useSheet(view, c);
  const [part, setPart] = useState<Part>('combat');

  return (
    <div className="stack sheet">
      <SheetHeader ctx={ctx} />
      <Toolbar ctx={ctx} />
      <LevelBar ctx={ctx} />
      <div className="segmented sheet-tabs" role="tablist">
        {PARTS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={part === k} className={part === k ? 'on' : ''} onClick={() => setPart(k)}>
            {l}
          </button>
        ))}
      </div>

      {part === 'combat' && (
        <>
          <VitalsSection ctx={ctx} />
          <AttacksSection ctx={ctx} />
          <SpellsSection ctx={ctx} />
          <FeaturesSection ctx={ctx} />
          <StatusSection ctx={ctx} />
          <CompanionsSection ctx={ctx} />
        </>
      )}
      {part === 'caracs' && (
        <>
          <AbilitiesSection ctx={ctx} />
          <SkillsSection ctx={ctx} />
        </>
      )}
      {part === 'sac' && (
        <>
          <CoinsSection ctx={ctx} />
          <WornPanel view={view} c={c} />
          <Inventory view={view} c={c} canEdit={ctx.can.inv} />
        </>
      )}
      {part === 'perso' && (
        <>
          <IdentitySection ctx={ctx} />
          <NotesAndDelete ctx={ctx} />
        </>
      )}
    </div>
  );
}

/**
 * Avantage / désavantage : appliqués automatiquement (états) ; le MJ peut en donner un (valable jusqu'à ce qu'il le
 * retire). Le joueur voit seulement ce qui s'applique. Et bouton « Modifier ».
 */
function Toolbar({ ctx }: { ctx: SheetCtx }) {
  const g = ctx.s.grant ?? null;
  const grants: [RollMode, string][] = [
    ['dis', 'Désav.'],
    ['normal', 'Normal'],
    ['adv', 'Avantage'],
  ];
  return (
    <div className="sheet-toolbar">
      {ctx.gm ? (
        <div className="segmented small roll-mode" aria-label="Avantage donné par le MJ">
          {grants.map(([m, l]) => {
            const on = (g ?? 'normal') === m;
            return (
              <button key={m} className={`${on ? 'on' : ''} m-${m}`} onClick={() => ctx.patch({ grant: m === 'normal' ? null : m })} aria-pressed={on} title="Donné par le MJ pour tous ses jets d20">
                {l}
              </button>
            );
          })}
        </div>
      ) : (
        <span className={`grant-badge ${g ?? ''}`}>{g === 'adv' ? '🎯 Avantage (MJ)' : g === 'dis' ? '⚠️ Désavantage (MJ)' : '🎲 Avantage auto'}</span>
      )}
      {ctx.can.stats && (
        <button className={`btn small ${ctx.editing ? 'primary' : 'ghost'}`} onClick={() => ctx.setEditing(!ctx.editing)}>
          {ctx.editing ? '✓ Terminé' : '✏️ Modifier'}
        </button>
      )}
    </div>
  );
}

function NotesAndDelete({ ctx }: { ctx: SheetCtx }) {
  const { store } = useSession();
  const { c, can, view, fail } = ctx;
  return (
    <>
      <section className="card stack-sm">
        <h3 className="section-title">Notes du personnage</h3>
        {can.id ? (
          <LazyInput
            id="sheet-notes"
            multiline
            rows={6}
            value={c.notes}
            placeholder="Histoire, traits, aptitudes, dons, alliés…"
            onCommit={(notes) => store.updateCharacter(c.id, { notes }).then(view.reload).catch(fail)}
            aria-label="Notes du personnage"
          />
        ) : (
          <p className="prewrap">{c.notes || '—'}</p>
        )}
      </section>
      {can.id && (
        <ConfirmButton
          confirmLabel={`Supprimer définitivement ${c.name} ?`}
          onConfirm={() =>
            store
              .deleteCharacter(c.id)
              .then(() => navigate(`/c/${c.campaign_id}`))
              .catch(fail)
          }
        >
          Supprimer ce personnage
        </ConfirmButton>
      )}
    </>
  );
}
