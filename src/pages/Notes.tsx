// Onglet Notes : journal de campagne avec visibilité (table, MJ, privé). Le MJ prépare des notes cachées
// (« Préparées ») et les révèle au bon moment, à toute la table ou à certains joueurs.
import { favoritesFirst } from '../lib/dnd/places';
import { useState } from 'react';
import { useSession } from '../data/session';
import type { CampaignView } from '../data/useCampaign';
import { timeAgo } from '../lib/ids';
import type { Note, NoteVisibility } from '../lib/types';
import { ConfirmButton, Empty, Modal } from '../components/ui';
import { useToast } from '../components/Toast';

const VIS: Record<NoteVisibility, { label: string; icon: string }> = {
  all: { label: 'Toute la table', icon: '👥' },
  gm: { label: 'Moi + MJ', icon: '👑' },
  private: { label: 'Moi seul', icon: '🔒' },
};

export function NotesPage({ view }: { view: CampaignView }) {
  const { user } = useSession();
  const [editing, setEditing] = useState<Partial<Note> | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine' | 'prep'>('all');
  const list = view.data!.notes.filter((n) => filter === 'all' || (filter === 'mine' ? n.author_id === user?.id : isPrepared(n, user?.id)));
  // MJ : notes favorites du lieu actuel en premier (⭐)
  const place = (view.data!.secrets?.places ?? []).find((p) => p.id === view.data!.campaign.settings.place?.id);
  const notes = favoritesFirst(list, (n) => n.id, place?.notes);

  return (
    <div className="stack">
      <div className="row between">
        <div className="segmented small">
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            Toutes
          </button>
          <button className={filter === 'mine' ? 'on' : ''} onClick={() => setFilter('mine')}>
            Les miennes
          </button>
          {view.isGM && (
            <button className={filter === 'prep' ? 'on' : ''} onClick={() => setFilter('prep')}>
              🙈 Préparées
            </button>
          )}
        </div>
        <button className="btn primary small" onClick={() => setEditing({ visibility: view.isGM ? 'gm' : 'all' })}>
          {view.isGM ? '+ Note (cachée)' : '+ Note'}
        </button>
      </div>

      {notes.length === 0 ? (
        <Empty icon="📜" title="Journal vide">
          <p className="muted">Résumé de séance, indices, PNJ rencontrés… Tout ce que la table doit retenir.</p>
        </Empty>
      ) : (
        <ul className="notes">
          {notes.map(({ item: n, fav }) => (
            <li key={n.id}>
              <button className={`note-card ${fav ? 'fav' : ''}`} onClick={() => setEditing(n)}>
                <span className="row between">
                  <strong>
                    {fav && '⭐ '}
                    {n.title || 'Sans titre'}
                  </strong>
                  <span className="pill" title={VIS[n.visibility].label}>
                    {isPrepared(n, user?.id) ? '🙈 Préparée' : `${VIS[n.visibility].icon} ${VIS[n.visibility].label}`}
                    {n.visibility !== 'all' && (n.reader_ids?.length ?? 0) > 0 && ` · +${n.reader_ids!.length}`}
                  </span>
                </span>
                <span className="note-excerpt">{n.content}</span>
                <span className="muted small">
                  {n.author_name} · {timeAgo(n.updated_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && <NoteDialog view={view} note={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** Note du MJ encore cachée aux joueurs (ni « Toute la table », ni révélée à quelqu'un). */
const isPrepared = (n: Note, me?: string) => n.author_id === me && n.visibility !== 'all' && !(n.reader_ids?.length);

function NoteDialog({ view, note, onClose }: { view: CampaignView; note: Partial<Note>; onClose: () => void }) {
  const { store, user } = useSession();
  const toast = useToast();
  const [title, setTitle] = useState(note.title ?? '');
  const [content, setContent] = useState(note.content ?? '');
  const [visibility, setVisibility] = useState<NoteVisibility>(note.visibility ?? 'all');
  // MJ : destinataires choisis (message secret à certains joueurs, directement dans la note)
  const [readers, setReaders] = useState<string[]>(note.reader_ids ?? []);
  const players = view.data!.members.filter((m) => m.role === 'player');
  const mine = !note.id || note.author_id === user?.id;
  const canEdit = mine || (view.isGM && note.visibility !== 'private');
  const fail = (e: Error) => toast(e.message, 'error');

  return (
    <Modal title={note.id ? (canEdit ? 'Modifier la note' : note.title || 'Note') : 'Nouvelle note'} onClose={onClose}>
      {canEdit ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            store
              .saveNote({ id: note.id, campaign_id: view.data!.campaign.id, title: title.trim(), content, visibility, ...(view.isGM && mine && visibility === 'gm' ? { reader_ids: readers } : {}) })
              .then(() => {
                view.reload();
                onClose();
              })
              .catch(fail);
          }}
        >
          <label htmlFor="note-title">Titre</label>
          <input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Séance 3 : la crypte" autoFocus={!note.id} />
          <label htmlFor="note-content">Contenu</label>
          <textarea id="note-content" rows={9} value={content} onChange={(e) => setContent(e.target.value)} />
          <span className="label">Qui peut la lire ?</span>
          <div className="segmented">
            {(Object.keys(VIS) as NoteVisibility[]).map((v) => (
              <button type="button" key={v} className={visibility === v ? 'on' : ''} onClick={() => setVisibility(v)} disabled={!mine}>
                {v === 'gm' && view.isGM ? '👑 MJ seul' : `${VIS[v].icon} ${VIS[v].label}`}
              </button>
            ))}
          </div>
          {view.isGM && mine && visibility === 'gm' && players.length > 0 && (
            <div className="stack-xs">
              <span className="label">✉️ Aussi pour ces joueurs (message secret)</span>
              <div className="chips">
                {players.map((p) => (
                  <button type="button" key={p.user_id} className={`chip ${readers.includes(p.user_id) ? 'on' : ''}`} onClick={() => setReaders((w) => (w.includes(p.user_id) ? w.filter((x) => x !== p.user_id) : [...w, p.user_id]))}>
                    {p.display_name}
                  </button>
                ))}
              </div>
              <span className="muted small">{readers.length ? 'Seuls ces joueurs la verront (prévenus tout de suite).' : 'Personne de coché : note cachée, à révéler plus tard.'}</span>
            </div>
          )}
          <button className="btn primary" disabled={!title.trim() && !content.trim()}>
            {readers.length && visibility === 'gm' && view.isGM ? '✉️ Envoyer' : 'Enregistrer'}
          </button>
          {view.isGM && mine && note.id && note.visibility !== 'all' && <RevealNote view={view} note={note as Note} onDone={onClose} />}
          {note.id && (
            <ConfirmButton
              onConfirm={() =>
                store
                  .deleteNote(note.id!)
                  .then(() => {
                    view.reload();
                    onClose();
                  })
                  .catch(fail)
              }
            >
              Supprimer la note
            </ConfirmButton>
          )}
        </form>
      ) : (
        <div className="stack-sm">
          <p className="prewrap">{note.content}</p>
          <p className="muted small">Par {note.author_name}</p>
        </div>
      )}
    </Modal>
  );
}

/** MJ : révéler d'un coup une note préparée à toute la table (les destinataires choisis se règlent au-dessus). */
function RevealNote({ view, note, onDone }: { view: CampaignView; note: Note; onDone: () => void }) {
  const { store } = useSession();
  const toast = useToast();
  return (
    <div className="card stack-xs reveal">
      <span className="label">📣 Révéler</span>
      <button
        type="button"
        className="btn"
        onClick={() =>
          store
            .saveNote({ id: note.id, campaign_id: note.campaign_id, title: note.title, content: note.content, visibility: 'all', reader_ids: note.reader_ids })
            .then(() => (toast('📣 Note révélée à toute la table'), view.reload(), onDone()))
            .catch((e: Error) => toast(e.message, 'error'))
        }
      >
        À toute la table
      </button>
    </div>
  );
}
