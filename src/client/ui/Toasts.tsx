import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface Toast { id: number; text: string; error?: boolean }

const ToastContext = createContext<(text: string, opts?: { error?: boolean }) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const push = useCallback((text: string, opts?: { error?: boolean }) => {
    const id = next.current++;
    setToasts((list) => [...list.slice(-3), { id, text, error: opts?.error }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3300);
  }, []);
  const value = useMemo(() => push, [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.error ? "is-error" : ""}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
