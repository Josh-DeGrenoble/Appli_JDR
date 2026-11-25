// Onglet Carte : plan (en combat et hors combat), ordre d'initiative (distance + ciblage), actions (joueur, ou MJ pour
// ses monstres/PNJ), zones d'effet à viser, attaques d'opportunité, contrôles du MJ.
import { useState } from 'react';
import type { CampaignView } from '../../data/useCampaign';
import { ConfirmButton, Empty } from '../../components/ui';
import { useToast } from '../../components/Toast';
import type { Combatant } from '../../lib/dnd/combat';
import { combatActions, monsterActions, type CombatAction } from '../../lib/dnd/combatActions';
import type { RollMode } from '../../lib/dnd/data';
import { effectiveSpeed } from '../../lib/dnd/rules';
import { normalizeSheet } from '../../lib/dnd/sheet';
import { posOf } from '../../lib/dnd/grid';
import { actionArea, canAim, inArea, needsAim, type Cell } from '../../lib/dnd/area';
import { playerView, visibleTokens } from '../../lib/dnd/sight';
import { ActionsPanel, targetable } from './ActionsPanel';
import { suggestMonster } from '../../lib/dnd/monsterAi';
import { partyVision } from '../../lib/dnd/vision';
import { CompanionsPanel } from './CompanionsPanel';
import type { MonsterSecret } from '../../lib/dnd/combat';
import { BattleMap } from './BattleMap';
import { PastMapView, PastMapsBar } from './PastMaps';
import { ScenesPanel } from './ScenesPanel';
import { CombatRow } from './CombatRow';
import { CombatantDialog } from './CombatantDialog';
import { CombatSetupDialog } from './CombatSetupDialog';
import { OpportunityPanel, choicesOf } from './OpportunityPanel';
import { useCombat } from './useCombat';
import { useCombatActions } from './useCombatActions';
import { DownPanel } from './DownPanel';
import { autoMode } from '../../lib/dnd/advantage';
import { distance } from '../../lib/dnd/grid';
import { hpOf } from '../../lib/templates';

export function CombatPage({ view }: { view: CampaignView }) {
  const toast = useToast();
  const [past, setPast] = useState<string | null>(null);
  const cx = useCombat(view);
  const { combat, isGM } = cx;
  // Brouillard et pions cachés : un joueur ne voit que ce que voient les persos du groupe.
  const vision = partyVision(combat.combatants.filter((x) => x.kind === 'pc'), view.data!.characters, view.data!.items);
  const fogView = isGM ? null : playerView(combat, vision);
  // MJ : cases que les joueurs ne voient pas (obscurité, brouillard), assombries pour lui
  const gmDim = isGM && (combat.map?.dark || combat.map?.fog) ? playerView(combat, vision) : null;
  const seen = new Set(visibleTokens(combat, fogView).map((x) => x.id));
  const order = isGM ? cx.order : cx.order.filter((x) => seen.has(x.id));
  const current = cx.current && (isGM || seen.has(cx.current.id)) ? cx.current : null;
  const campaignId = view.data!.campaign.id;
  const acts = useCombatActions(cx, campaignId);
  const [setup, setSetup] = useState(false);
  const [open, setOpen] = useState<Combatant | null>(null);
  const [selected, setSelected] = useState<CombatAction | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [aim, setAim] = useState<Cell | null>(null);
  const chars = view.data!.characters;
  const mine = (x?: Combatant | null) => !!x?.characterId && cx.myIds.has(x.characterId);
  /** Le MJ contrôle les monstres et ses propres PNJ. */
  const gmControls = (x?: Combatant | null) => !!x && (x.kind === 'monster' || mine(x));
  const controls = (x: Combatant) => (isGM ? gmControls(x) : mine(x));

  /** Fiche, actions et vitesse d'un combattant (perso : sa fiche ; monstre : ses secrets, MJ seulement). */
  const infoOf = (x: Combatant) => {
    const ch = x.characterId && !x.companion ? chars.find((c) => c.id === x.characterId) : undefined;
    const sheet = ch ? normalizeSheet(ch.sheet) : undefined;
    const sec = x.kind === 'monster' ? cx.secrets.monsters[x.id] : x.companion ? ({ ...x.companion, notes: '', multiattack: 1 } as MonsterSecret) : undefined;
    return {
      characterId: ch?.id,
      sheet,
      actions: sheet ? combatActions(sheet, view.data!.items.filter((i) => i.character_id === ch!.id)) : monsterActions(sec),
      attacksPerAction: sheet ? sheet.attacksPerAction : sec?.multiattack ?? 1,
      speed: sheet ? effectiveSpeed(sheet) : sec?.speed ?? 9,
    };
  };

  // Qui agit : joueur → son perso (actif, sinon pour ses réactions) ; MJ → le combattant actif s'il n'appartient pas à un joueur.
  const actor = combat.active ? (isGM ? (gmControls(cx.current) ? cx.current : null) : mine(cx.current) ? cx.current : order.find((x) => mine(x)) ?? null) : null;
  const info = actor ? infoOf(actor) : null;
  const charOf = (x?: Combatant | null) => (x?.characterId && !x.companion ? chars.find((c) => c.id === x.characterId) : undefined);
  /** Perso à 0 PV : plus d'action ni de déplacement (jet contre la mort, puis finir son tour). */
  const isDown = (x?: Combatant | null) => { if (x?.companion) return x.companion.hp <= 0; const ch = charOf(x); return !!ch && hpOf(ch).max > 0 && hpOf(ch).current <= 0; };
  /** États d'un combattant (pion + fiche). */
  const condsOf = (x: Combatant) => [...x.conditions, ...(charOf(x) ? normalizeSheet(charOf(x)!.sheet).conditions : [])];
  /** Avantage/désavantage automatique d'une attaque de `a` sur `t`. */
  const modeFor = (a: Combatant, t?: Combatant) =>
    autoMode({ kind: 'attack', self: condsOf(a), grant: charOf(a) ? normalizeSheet(charOf(a)!.sheet).grant : null, target: t ? condsOf(t) : undefined, melee: !!t && distance(a, t) <= 1.5, helped: !!a.helped, targetDodging: !!t?.used?.dodge });
  const isTurn = !!actor && actor.id === cx.current?.id;
  const area = selected?.shape && actor && (aim || !needsAim(selected.shape, selected.range)) ? actionArea(combat, selected.shape, selected.range, actor, aim) : null;
  const aiming = !!selected?.shape && needsAim(selected.shape, selected.range);
  const mineWaiting = combat.prep ? order.filter((x) => mine(x) && x.initiative === null) : [];
  const missing = order.filter((x) => x.initiative === null).length;
  const stateOf = (x: Combatant) => (selected && actor ? (targetable(selected, actor, x, area, combat) ? 'can' : 'no') : undefined);
  // MJ : suggestion pour le tour d'un monstre (ennemi le plus proche qu'une attaque peut viser)
  const sugg = isGM && isTurn && actor?.kind === 'monster' && info && !selected
    ? suggestMonster(combat, actor, info.actions, (a, x) => targetable(a, actor, x, null, combat), (x) => !isDown(x) && x.status !== 'vaincu')
    : null;
  const reactions = choicesOf(combat.reactions ?? [], order, (x) => infoOf(x).actions, (x) => controls(x) && !isDown(x));

  const selectAction = (a: CombatAction | null) => {
    setSelected(a);
    setAim(null);
    if (a?.targeting === 'self' && !a.shape) setTargets(actor ? [actor.id] : []);
    else if (a?.shape && actor && !needsAim(a.shape, a.range)) setTargets(inArea(combat, actionArea(combat, a.shape, a.range, actor, null)).map((x) => x.id));
    else setTargets((t) => (a && actor && !a.shape ? t.filter((id) => { const x = order.find((o) => o.id === id); return !!x && targetable(a, actor, x, null, combat); }) : []));
  };

  /** Visée d'une zone : les créatures prises dedans deviennent les cibles (retirables dans la liste). */
  const aimAt = (x: number, y: number) => {
    if (!selected?.shape || !actor) return;
    if (!canAim(posOf(actor), { x, y }, selected.range, combat)) return toast('Hors de portée ou hors de vue');
    setAim({ x, y });
    setTargets(inArea(combat, actionArea(combat, selected.shape, selected.range, actor, { x, y })).map((t) => t.id));
  };

  /** Toucher un combattant : cible pour qui agit ; sinon (MJ) ouvre sa fiche de combat. */
  const touch = (x: Combatant) => {
    if (!actor || (isGM && !selected)) return isGM && setOpen(x);
    if (selected && !targetable(selected, actor, x, area, combat)) return toast(`${x.name} : hors de portée, hors de vue ou cible impossible`);
    setTargets((t) => (t.includes(x.id) ? t.filter((id) => id !== x.id) : selected?.multi ? [...t, x.id] : [x.id]));
  };

  const launch = async (a: CombatAction, mode: RollMode, slot?: number) => {
    if (!actor || !info) return;
    const list = a.targeting === 'self' && !a.shape ? [actor] : order.filter((o) => targets.includes(o.id));
    await acts.execute(actor, info, a, list, mode, slot);
    setTargets([]);
    setAim(null);
  };

  const pastShown = past ? (view.data!.campaign.settings.maps ?? []).find((m) => m.id === past && m.shared) ?? null : null;
  const showMap = isGM || order.length > 0 || !!combat.map?.bg || Object.keys(combat.map?.cells ?? {}).length > 0;

  return (
    <div className="stack">
      <div className="combat-head">
        <div>
          <h2 className="section-title">{combat.active ? `Round ${combat.round}` : combat.prep ? 'Préparation du combat' : combat.map?.name ? `🗺️ ${combat.map.name}` : 'Carte'}</h2>
          {cx.current ? <p className="muted">Tour de <strong>{current?.name ?? 'un adversaire caché'}</strong></p> : !combat.active && order.length > 0 && <p className="muted">Exploration : {isGM ? 'déplace les pions librement' : 'déplace ton pion librement'}</p>}
        </div>
        {isGM && (
          <button className="btn small" onClick={() => setSetup(true)}>
            + Ajouter
          </button>
        )}
      </div>

      <OpportunityPanel
        list={reactions}
        onAttack={(c, a) => acts.execute(c.by, infoOf(c.by), a, [c.target], modeFor(c.by, c.target).mode, undefined, c.r.id).catch((e: Error) => toast(e.message, 'error'))}
        onIgnore={(c) => acts.dismiss(c.r.id)}
      />

      {!isGM && <PastMapsBar view={view} viewing={pastShown ? past : null} onPick={setPast} />}
      {pastShown ? (
        <PastMapView view={view} map={pastShown} />
      ) : showMap ? (
        <BattleMap
          cx={cx}
          scenes={isGM ? <ScenesPanel cx={cx} view={view} campaignId={campaignId} /> : undefined}
          tokens={order}
          fog={fogView}
          dim={gmDim}
          campaignId={campaignId}
          actor={actor}
          movable={(x) => isGM || (mine(x) && (!combat.active || (x.id === cx.current?.id && !isDown(x))))}
          speedOf={(x) => infoOf(x).speed}
          range={selected && actor ? selected.range : null}
          area={area}
          aiming={aiming}
          onAim={aimAt}
          targetState={stateOf}
          targeted={targets}
          onTokenTouch={touch}
        />
      ) : (
        <Empty icon="🗺️" title="Pas encore de carte">
          <p className="muted">Le MJ placera ici le plan et les pions.</p>
        </Empty>
      )}

      {!isGM && <CompanionsPanel view={view} />}
      {order.length > 0 && (
        <ol className="init-list">
          {order.map((x) => (
            <CombatRow key={x.id} cx={cx} view={view} x={x} active={current?.id === x.id} actor={actor} targetState={stateOf(x)} targeted={targets.includes(x.id)} onTouch={() => touch(x)} />
          ))}
        </ol>
      )}

      {mineWaiting.map((x) => (
        <button key={x.id} className="btn primary big" onClick={() => cx.rollMine(x)}>
          🎲 Initiative de {x.name}
        </button>
      ))}

      {actor && info && isDown(actor) && !actor.companion && <DownPanel view={view} ch={charOf(actor)!} isTurn={isTurn} round={combat.round} onEndTurn={isGM ? undefined : cx.endTurn} />}
      {sugg && (
        <button className="btn suggestion" onClick={() => (selectAction(sugg.action), setTargets([sugg.target.id]))}>
          💡 Suggestion : {sugg.action.name} sur {sugg.target.name} ({sugg.dist})
        </button>
      )}
      {actor && info && !isDown(actor) && (
        <ActionsPanel
          title={isTurn ? (isGM ? `Tour de ${actor.name}` : `À toi, ${actor.name} !`) : `Actions de ${actor.name}`}
          actor={actor}
          actions={info.actions}
          attacksPerAction={info.attacksPerAction}
          speed={info.speed}
          isTurn={isTurn}
          others={order}
          selected={selected}
          targets={targets}
          area={area}
          combat={combat}
          onSelect={selectAction}
          onLaunch={launch}
          auto={selected?.effect === 'attack' ? modeFor(actor, order.find((o) => targets.includes(o.id))) : null}
          canForce={isGM}
        />
      )}
      {actor && isTurn && !isGM && (!isDown(actor) || !!actor.companion) && (
        <button className="btn big end-turn" onClick={cx.endTurn}>
          ⏭️ Finir mon tour
        </button>
      )}

      {isGM && order.length > 0 && <GmControls cx={cx} missing={missing} onNext={() => (cx.next(), selectAction(null), setTargets([]))} />}

      {setup && <CombatSetupDialog cx={cx} view={view} onClose={() => setSetup(false)} />}
      {open && <CombatantDialog cx={cx} view={view} id={open.id} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Boutons du MJ : préparer (initiatives), démarrer, tours, terminer. */
function GmControls({ cx, missing, onNext }: { cx: ReturnType<typeof useCombat>; missing: number; onNext: () => void }) {
  const { combat } = cx;
  if (!combat.active && !combat.prep)
    return (
      <button className="btn primary big" onClick={cx.prepare}>
        ⚔️ Préparer un combat
      </button>
    );
  return (
    <div className="stack-sm">
      {missing > 0 && (
        <div className="row gap">
          <button className="btn grow" onClick={() => cx.rollMissing(true)}>
            🎲 Initiative des monstres
          </button>
          <button className="btn grow" onClick={() => cx.rollMissing(false)}>
            🎲 Pour tous ({missing})
          </button>
        </div>
      )}
      {combat.active ? (
        <div className="row gap">
          <button className="btn" onClick={cx.previous} aria-label="Tour précédent">
            ◀
          </button>
          <button className="btn primary big grow" onClick={onNext}>
            Tour suivant ▶
          </button>
        </div>
      ) : (
        <button className="btn primary big" disabled={missing > 0} onClick={cx.start}>
          ⚔️ Démarrer le combat
        </button>
      )}
      <ConfirmButton confirmLabel={combat.active ? 'Terminer le combat ?' : 'Annuler la préparation ?'} onConfirm={cx.end}>
        {combat.active ? 'Terminer le combat' : 'Annuler'}
      </ConfirmButton>
    </div>
  );
}
