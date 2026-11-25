// Outils du MJ sous la carte : déplacer les pions ou peindre le décor (mur, terrain difficile, gomme),
// image de fond (plan du donjon), taille de la carte, vider la carte.
import { useRef, useState } from 'react';
import { ConfirmButton } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { compressImage } from '../../lib/image';
import type { ReactNode } from 'react';
import type { MapCtx } from './useCombat';
import type { CellKind } from '../../lib/dnd/combat';
import { MATERIALS } from '../../lib/dnd/terrain';

export type MapTool = 'move' | 'paint' | 'erase';

/** Éléments dessinés en SVG (combat.css) plutôt qu'en émoji. */
const DRAWN = new Set<CellKind>(['chest', 'trap', 'trap-sprung']);

const TOOLS: [MapTool, string][] = [
  ['move', '✋ Pions'],
  ['paint', '🖌️ Décor'],
  ['erase', '🧽 Gomme'],
];
const SIZES = [
  [10, 12],
  [12, 16],
  [16, 20],
  [20, 24],
  [24, 30],
];

interface Props {
  cx: MapCtx;
  /** Plans enregistrés (carte affichée seulement). */
  scenes?: ReactNode;
  campaignId: string;
  tool: MapTool;
  onTool: (t: MapTool) => void;
  material: CellKind;
  onMaterial: (k: CellKind) => void;
}

export function MapTools({ cx, scenes, tool, onTool, material, onMaterial }: Props) {
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [more, setMore] = useState(false);
  const cols = cx.combat.map?.cols ?? 12;
  const hasBg = !!cx.combat.map?.bg;

  const pick = async (f: File | undefined) => {
    if (!f) return;
    try {
      await cx.setBackground(await compressImage(f));
      toast('🖼️ Plan ajouté');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div className="stack-xs map-tools">
      <div className="segmented small" aria-label="Outil de la carte">
        {TOOLS.map(([k, l]) => (
          <button key={k} className={tool === k ? 'on' : ''} onClick={() => onTool(k)}>
            {l}
          </button>
        ))}
      </div>
      <div className="row gap wrap">
        <button className="chip" onClick={() => file.current?.click()}>
          🖼️ {hasBg ? 'Changer l’image' : 'Image de fond (galerie)'}
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} aria-label="Image du plan" />
        <button className={`chip ${cx.combat.map?.dark ? 'on' : ''}`} onClick={() => cx.setDark(!cx.combat.map?.dark)} aria-pressed={!!cx.combat.map?.dark} title="Les joueurs ne voient que la lumière (torches allumées de la carte, torche ou lanterne équipée, sort Lumière) et leur vision dans le noir">
          🌑 Obscurité {cx.combat.map?.dark ? 'activée' : 'désactivée'}
        </button>
        <button className={`chip ${cx.combat.map?.fog ? 'on' : ''}`} onClick={() => cx.setFog(!cx.combat.map?.fog)} aria-pressed={!!cx.combat.map?.fog}>
          🌫️ Brouillard {cx.combat.map?.fog ? 'activé' : 'désactivé'}
        </button>
        {cx.combat.map?.fog && (
          <select value={cx.combat.map?.sight ?? 0} onChange={(e) => cx.setFog(true, parseFloat(e.target.value))} aria-label="Distance de vue">
            {[0, 9, 18, 36].map((m) => (
              <option key={m} value={m}>
                {m ? `Vue ${m} m` : 'Vue illimitée'}
              </option>
            ))}
          </select>
        )}
      </div>
      {tool === 'paint' && (
        <div className="stack-xs materials" aria-label="Matériau">
          {(['Murs', 'Terrain', 'Portes', 'Objets'] as const).map((g) => (
            <div key={g} className="chips">
              <span className="muted small mat-group">{g}</span>
              {MATERIALS.filter((m) => m.group === g).map((m) => (
                <button key={m.kind} className={`chip mat-${m.kind} ${material === m.kind ? 'on' : ''}`} onClick={() => onMaterial(m.kind)} title={m.hint}>
                  {DRAWN.has(m.kind) ? <span className={`mat-ico ${m.kind}`} aria-hidden /> : m.icon} {m.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <p className="muted small">
        {tool === 'move'
          ? 'Touche un pion puis une case. Touche un mur pour changer son matériau, une porte pour l’ouvrir ou la fermer.'
          : tool === 'paint'
            ? `${MATERIALS.find((m) => m.kind === material)?.label} : ${MATERIALS.find((m) => m.kind === material)?.hint}. Touche ou glisse sur les cases.`
            : 'Touche ou glisse sur les cases pour effacer.'}
      </p>
      <button className="link" onClick={() => setMore((v) => !v)} aria-expanded={more}>
        {more ? '▲' : '▼'} Plans enregistrés, taille, vider
      </button>
      {more && (
        <div className="stack-xs">
          {scenes}
          <div className="row gap wrap">
            {hasBg && (
              <button className="btn small ghost" onClick={() => cx.setBackground(null)}>
                Retirer le plan
              </button>
            )}
          </div>
          <div className="row gap map-size">
            <span className="muted small">Taille</span>
            {SIZES.map(([c, r]) => (
              <button key={c} className={`chip ${c === cols ? 'on' : ''}`} onClick={() => cx.setMapSize(c, r)}>
                {c}×{r}
              </button>
            ))}
          </div>
          <div className="row gap">
            <ConfirmButton className="btn small ghost grow" confirmLabel="Effacer murs et terrain ?" onConfirm={() => cx.paint(Object.keys(cx.combat.map?.cells ?? {}), null)}>
              Effacer le décor
            </ConfirmButton>
            {!cx.combat.active && (
              <ConfirmButton className="btn small ghost grow" confirmLabel="Retirer tous les pions ?" onConfirm={cx.clearBoard}>
                Vider la carte
              </ConfirmButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
