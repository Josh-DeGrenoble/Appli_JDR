// Carte (grille, 1 case = 1,5 m), visible en combat et hors combat. MJ : déplace tous les pions, peint murs et
// terrain difficile, pose un plan en fond. Joueur : déplace son pion (hors combat librement, en combat pendant son
// tour selon son déplacement restant ; murs, terrain difficile et ennemis comptés). Action choisie : portée teintée,
// zone d'effet à viser (cases touchées en surbrillance), toucher un pion le désigne comme cible.
import { useRef, useState, type PointerEvent } from 'react';
import type { Combatant } from '../../lib/dnd/combat';
import { CELL, fmtDistance, mapOf, movementLeft, posOf, cellsBetween } from '../../lib/dnd/grid';
import { moveCosts } from '../../lib/dnd/movement';
import { blocksMove, isDoor, nextMaterial, playerKind , isTorch } from '../../lib/dnd/terrain';
import type { CellKind } from '../../lib/dnd/combat';
import { MapTools, type MapTool } from './MapTools';
import { TrapDialog } from './TrapDialog';
import { useMapZoom } from './useMapZoom';
import { useMapImage } from './useMapImage';
import type { ReactNode } from 'react';
import type { MapCtx } from './useCombat';

interface Props {
  cx: MapCtx;
  /** Panneau des plans enregistrés (outils du MJ). */
  scenes?: ReactNode;
  /** Pions affichés (joueur : seulement ceux qu'il voit). */
  tokens: Combatant[];
  /** Cases visibles pour un joueur dans le brouillard (null = tout visible). */
  fog: Set<string> | null;
  /** MJ : cases que les joueurs ne voient pas (assombries). */
  dim?: Set<string> | null;
  campaignId: string;
  /** Combattant qui agit (son tour, ou un monstre/PNJ pour le MJ). */
  actor: Combatant | null;
  /** Pions que je peux déplacer maintenant. */
  movable: (x: Combatant) => boolean;
  /** Vitesse (m) d'un pion. */
  speedOf: (x: Combatant) => number;
  /** Portée de l'action choisie (null = aucune action). */
  range: number | null;
  /** Zone d'effet en cours (cases « x,y »), et visée attendue. */
  area: Set<string> | null;
  aiming: boolean;
  onAim: (x: number, y: number) => void;
  targetState: (x: Combatant) => 'can' | 'no' | undefined;
  targeted: string[];
  onTokenTouch: (x: Combatant) => void;
}

export function BattleMap(p: Props) {
  const { cx } = p;
  const [picked, setPicked] = useState<string | null>(null);
  const [tool, setTool] = useState<MapTool>('move');
  const [material, setMaterial] = useState<CellKind>('wall');
  const [stroke, setStroke] = useState<Set<string> | null>(null);
  const [trapKey, setTrapKey] = useState<string | null>(null);
  const painting = useRef(false);
  const z = useMapZoom();
  const bg = useMapImage(p.campaignId, cx.combat.map?.bg, cx.imageKey);
  const { cols, rows, cells = {} } = mapOf(cx.combat);
  const byCell = new Map<string, Combatant>(p.tokens.map((x) => [`${posOf(x).x},${posOf(x).y}`, x]));
  const pickedC = p.tokens.find((x) => x.id === picked) ?? null;
  const free = !!pickedC && (cx.isGM || !cx.combat.active);
  const left = pickedC ? movementLeft(p.speedOf(pickedC), pickedC.used) : 0;
  const costs = pickedC && !free ? moveCosts(cx.combat, pickedC, Math.floor(left / CELL + 1e-9)) : null;
  const actorPos = p.actor ? posOf(p.actor) : null;

  const canReach = (k: string) => !!pickedC && !byCell.has(k) && !blocksMove(cells[k]) && (free || costs!.has(k));

  const touchToken = (x: Combatant) => {
    if (p.aiming) return p.onAim(posOf(x).x, posOf(x).y);
    if (p.range !== null) return p.onTokenTouch(x); // ciblage
    if (tool === 'move' && p.movable(x)) return setPicked(picked === x.id ? null : x.id);
    p.onTokenTouch(x);
  };

  const touchCell = (x: number, y: number) => {
    if (p.aiming) return p.onAim(x, y);
    const k = `${x},${y}`;
    // Porte : ouvrir/fermer (MJ, ou joueur avec un perso au contact) ; verrouillée : seul le MJ la déverrouille.
    if (!pickedC && (isDoor(cells[k]) || isTorch(cells[k]))) return cx.toggleDoor(x, y); // v0.22 : torche allumée / éteinte
    // MJ : toucher un piège ouvre ses réglages (carte affichée seulement).
    if (!pickedC && cx.isGM && cells[k] === 'trap' && cx.setTrap) return setTrapKey(k);
    // MJ : toucher un mur (sans pion choisi) change son matériau : pierre → brique → bois → glace → grille.
    const next = !pickedC && cx.isGM && cells[k] ? nextMaterial(cells[k]) : null;
    if (next) return cx.paint([k], next);
    if (!pickedC || !canReach(k)) return;
    cx.move(pickedC.id, x, y);
    setPicked(null);
  };

  // Peinture du décor (MJ) : on collecte les cases survolées puis on enregistre en une fois.
  const cellAt = (e: PointerEvent) => (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-cell]')?.dataset.cell;
  const paintStart = (e: PointerEvent) => {
    if (tool === 'move' || z.pinching()) return;
    painting.current = true;
    const k = cellAt(e);
    setStroke(new Set(k ? [k] : []));
  };
  const paintMove = (e: PointerEvent) => {
    if (!painting.current) return;
    if (z.pinching()) return (painting.current = false), setStroke(null); // deux doigts : zoom, pas peinture
    const k = cellAt(e);
    if (k) setStroke((s) => (s && !s.has(k) ? new Set(s).add(k) : s));
  };
  const paintEnd = () => {
    if (!painting.current) return;
    painting.current = false;
    if (stroke?.size) cx.paint([...stroke], tool === 'erase' ? null : material);
    setStroke(null);
  };
  const kindOf = (k: string) => (stroke?.has(k) ? (tool === 'erase' ? undefined : material) : cx.isGM ? cells[k] : playerKind(cells[k]));

  const hint = p.aiming
    ? 'Touche la case visée par la zone.'
    : pickedC
      ? free
        ? `Touche la case où placer ${pickedC.name}`
        : `Déplacement restant : ${fmtDistance(left).replace('contact', '1,5 m')}`
      : p.range !== null
        ? p.area
          ? 'Cibles prises dans la zone : touche-les pour en retirer.'
          : 'Zone teintée = à portée. Touche une cible.'
        : '1 case = 1,5 m';

  return (
    <section className="card stack-xs">
      <div className="row between gap">
        <span className="label">Carte</span>
        <span className="muted small grow map-hint">{hint}</span>
        <span className="zoom-btns">
          <button className="icon-btn" disabled={!z.canOut} onClick={() => z.step(-1)} aria-label="Dézoomer">
            −
          </button>
          <span className="small muted">×{z.zoom}</span>
          <button className="icon-btn" disabled={!z.canIn} onClick={() => z.step(1)} aria-label="Zoomer">
            +
          </button>
        </span>
      </div>
      <div
        className={`map-scroll ${z.zoom > 1 ? 'zoomed' : ''}`}
        ref={z.scroller}
        onPointerDownCapture={z.pinch.onPointerDown}
        onPointerMoveCapture={z.pinch.onPointerMove}
        onPointerUpCapture={z.pinch.onPointerUp}
        onPointerCancelCapture={z.pinch.onPointerUp}
      >
        <div
          className={`battle-map ${bg ? 'has-bg' : ''} ${tool !== 'move' ? 'painting' : ''}`}
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: `${z.zoom * 100}%`, ['--zoom' as string]: z.zoom, ...(bg ? { backgroundImage: `url(${bg})` } : {}) }}
          onPointerDown={paintStart}
          onPointerMove={paintMove}
          onPointerUp={paintEnd}
          onPointerLeave={paintEnd}
        >
          {Array.from({ length: rows * cols }, (_, i) => {
            const x = i % cols;
            const y = Math.floor(i / cols);
            const k = `${x},${y}`;
            const tok = byCell.get(k);
            const reachable = !tok && canReach(k);
            const inRange = p.range !== null && !p.area && actorPos && Math.max(1, cellsBetween(actorPos, { x, y })) * CELL <= p.range;
            const deco = kindOf(k);
            const dark = p.fog && !p.fog.has(k);
            const cls = ['cell', dark ? 'fog' : deco, p.dim && !p.dim.has(k) && 'gm-dim', !dark && reachable && 'reach', inRange && 'in-range', p.area?.has(k) && 'in-area'].filter(Boolean).join(' ');
            if (!tok)
              return (
                <div key={i} data-cell={k} className={cls} onClick={() => tool === 'move' && touchCell(x, y)} role={reachable || p.aiming || (!dark && isDoor(deco)) || (cx.isGM && deco === 'trap') ? 'button' : undefined} aria-label={reachable ? `Aller en ${x + 1},${y + 1}` : p.aiming ? `Viser ${x + 1},${y + 1}` : !dark && isDoor(deco) ? `Porte ${deco === 'door' ? 'fermée' : deco === 'door-locked' ? 'verrouillée' : 'ouverte'} ${x + 1},${y + 1}` : cx.isGM && deco === 'trap' ? `Piège ${x + 1},${y + 1}` : undefined} />
              );
            const ts = p.targetState(tok);
            return (
              <div key={i} data-cell={k} className={cls}>
                <button
                  className={['token', tok.kind, tok.id === p.actor?.id && 'me', tok.id === picked && 'picked', tok.status === 'vaincu' && 'out', tok.hidden && 'hidden-tok', ts && `t-${ts}`, p.targeted.includes(tok.id) && 'targeted', cx.current?.id === tok.id && 'active'].filter(Boolean).join(' ')}
                  onClick={() => tool === 'move' && touchToken(tok)}
                  aria-label={`${tok.name} (${x + 1},${y + 1})`}
                  title={tok.name}
                >
                  {tok.avatar}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {trapKey && cx.setTrap && <TrapDialog trap={cx.traps?.[trapKey]} onSave={(t) => cx.setTrap!(trapKey, t)} onClose={() => setTrapKey(null)} />}
      {cx.isGM && <MapTools cx={cx} campaignId={p.campaignId} scenes={p.scenes} tool={tool} onTool={(t) => (setTool(t), setPicked(null))} material={material} onMaterial={setMaterial} />}
    </section>
  );
}
