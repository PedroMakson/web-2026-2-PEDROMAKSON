import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type ToastContextValue = {
  toast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {message && (
        <div className="fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4">
          <div className="rounded-xl bg-navy px-5 py-3 text-sm font-medium text-white shadow-lg">
            {message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx.toast;
}
