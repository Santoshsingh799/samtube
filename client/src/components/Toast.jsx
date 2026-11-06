import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Check, Info, X } from 'lucide-react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback(id => {
    setToasts(current => current.filter(toast => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message, tone = 'info') => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts(current => [...current.slice(-2), { id, message, tone }]);
      const timer = setTimeout(() => dismiss(id), 3200);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            <span className="toast-icon">
              {toast.tone === 'success' ? <Check size={16} /> : <Info size={16} />}
            </span>
            <span>{toast.message}</span>
            <button className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
