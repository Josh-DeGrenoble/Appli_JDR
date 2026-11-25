// Notifications éphémères en bas de l'écran (au-dessus des onglets) : ToastProvider + hook useToast().
// 3 au plus, sans doublon ; toucher une notification la ferme.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Tone = 'gift' | 'hurt' | 'error' | undefined;
type ToastFn = (msg: string, tone?: Tone) => void;
interface T {
  id: number;
  msg: string;
  tone: Tone;
}

const Ctx = createContext<ToastFn>(() => {});
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<T[]>([]);
  const push = useCallback<ToastFn>((msg, tone) => {
    const id = ++seq;
    // Pas de doublon (même message déjà affiché), 3 notifications au plus à l'écran
    setList((l) => (l.some((t) => t.msg === msg) ? l : [...l.slice(-2), { id, msg, tone }]));
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), tone === 'error' ? 5000 : 3000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.tone ?? ''}`} onClick={() => setList((l) => l.filter((x) => x.id !== t.id))}>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
