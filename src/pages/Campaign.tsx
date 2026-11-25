// Écran d'une campagne : barre du haut, onglets du bas (Persos, Combat, Dés, Notes, MJ) et routage interne.
import { useCampaign, type CampaignView } from '../data/useCampaign';
import { Suspense, lazy, useEffect } from 'react';
import { navigate } from '../router';
import { Characters } from './Characters';
import { CharacterSheet } from './sheet/CharacterSheet';
import { NotesPage } from './Notes';
import { HistoryDrawer } from '../components/HistoryDrawer';
import { useSession } from '../data/session';
import { PlaceTitle } from './places/PlaceTitle';
import { RequestBanner } from './RequestBanner';
import { OfflineBadge } from '../components/OfflineBadge';

// Pages chargées à la demande (version en ligne : fichiers séparés, téléchargés au premier passage sur l'onglet).
const CombatPage = lazy(() => import('./combat/CombatPage').then((m) => ({ default: m.CombatPage })));
const ShopPage = lazy(() => import('./shop/ShopPage').then((m) => ({ default: m.ShopPage })));
const DicePage = lazy(() => import('./Dice').then((m) => ({ default: m.DicePage })));
const GmPanel = lazy(() => import('./gm/GmPanel').then((m) => ({ default: m.GmPanel })));
const GmScreen = lazy(() => import('./gm/GmScreen').then((m) => ({ default: m.GmScreen })));

const TABS = [
  { id: 'persos', label: 'Persos', icon: '🛡️' },
  { id: 'combat', label: 'Carte', icon: '🗺️' },
  { id: 'notes', label: 'Notes', icon: '📜' },
  { id: 'mj', label: 'MJ', icon: '👑', gmOnly: true },
];

export function Campaign({ id, rest }: { id: string; rest: string[] }) {
  const view = useCampaign(id);
  const tab = rest[0] ?? 'persos';
  const { data, error, loading, isGM, myCharacters } = view;
  const { user, store } = useSession();
  const mySheet = !isGM && myCharacters.length ? `/c/${id}/perso/${myCharacters[0].id}` : null;
  // Joueur : en arrivant dans la campagne, on ouvre directement sa fiche (la liste reste sur « ← »).
  useEffect(() => {
    if (!rest[0] && mySheet) navigate(mySheet, { replace: true });
  }, [rest, mySheet]);

  if (loading && !data) return <div className="splash">Ouverture du grimoire…</div>;
  if (error && !data)
    return (
      <div className="page">
        <main className="content stack">
          <p className="error">{error}</p>
          <button className="btn" onClick={() => navigate('/')}>
            Retour à l’accueil
          </button>
        </main>
      </div>
    );
  if (!data) return null;

  return (
    <div className="page with-tabs">
      <header className="topbar">
        <button className="icon-btn" onClick={() => navigate(tab === 'perso' ? `/c/${id}/persos` : '/')} aria-label={tab === 'perso' ? 'Tous les persos' : 'Retour'}>
          ←
        </button>
        <PlaceTitle view={view} />
        <TopIcon on={tab === 'des'} icon="🎲" label="Dés" onClick={() => navigate(`/c/${id}/des`)} />
        {!isGM && data.shops.length > 0 && <TopIcon on={tab === 'marche'} icon="🏪" label="Marché" onClick={() => navigate(`/c/${id}/marche`)} />}
        <HistoryDrawer campaignId={data.campaign.id} rolls={data.rolls} myId={user?.id} />
        {isGM && <span className="role-badge gm">MJ</span>}
      </header>

      <main className="content">
        {store.mode === 'supabase' && <OfflineBadge />}
        <RequestBanner view={view} />
        <Suspense fallback={<p className="muted">Chargement…</p>}>
          <Body view={view} tab={tab} rest={rest} />
        </Suspense>
      </main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.filter((t) => !t.gmOnly || isGM).map((t) => {
          const active = t.id === tab || (t.id === 'persos' && tab === 'perso');
          return (
            <button key={t.id} className={active ? 'on' : ''} aria-current={active ? 'page' : undefined} onClick={() => navigate(t.id === 'persos' && mySheet ? mySheet : `/c/${id}/${t.id}`)}>
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Bouton d'icône de la barre du haut (Dés, Marché). */
function TopIcon({ on, icon, label, onClick }: { on: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button className={`icon-btn top-icon ${on ? 'on' : ''}`} onClick={onClick} aria-label={label} aria-current={on ? 'page' : undefined}>
      {icon}
    </button>
  );
}

function Body({ view, tab, rest }: { view: CampaignView; tab: string; rest: string[] }) {
  switch (tab) {
    case 'perso':
      return (
        <>
          {!view.isGM && (
            <button className="link all-chars" onClick={() => navigate(`/c/${view.data!.campaign.id}/persos`)}>
              👥 Voir tous les persos
            </button>
          )}
          <CharacterSheet view={view} characterId={rest[1]} />
        </>
      );
    case 'combat':
      return <CombatPage view={view} />;
    case 'marche':
      return <ShopPage view={view} />;
    case 'des':
      return <DicePage view={view} />;
    case 'notes':
      return <NotesPage view={view} />;
    case 'mj':
      return view.isGM ? <GmPanel view={view} sub={rest[1]} /> : <Characters view={view} />;
    default:
      return view.isGM ? <GmScreen view={view} /> : <Characters view={view} />;
  }
}
