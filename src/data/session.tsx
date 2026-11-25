// Contexte de session : donne à tous les écrans le Store actif et l'utilisateur connecté (useSession).
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../lib/types';
import { getStore, type Store } from './store';

interface Session {
  store: Store;
  user: User | null;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [store, setStore] = useState<Store | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    getStore().then(async (s) => {
      setStore(s);
      setUser(await s.currentUser());
      setReady(true);
      unsub = s.onAuthChange(setUser);
    });
    return () => unsub();
  }, []);

  if (!ready || !store) return <>{fallback}</>;
  const refreshUser = async () => setUser(await store.currentUser());
  return <Ctx.Provider value={{ store, user, refreshUser }}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession hors SessionProvider');
  return s;
}
