import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextValue {
  toast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      const id = ++idRef.current;

      setToasts((previous) => [...previous, { id, message, type }]);

      setTimeout(() => {
        setToasts((previous) => previous.filter((item) => item.id !== id));
      }, 3200);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div id="toasts">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`toast ${item.type === 'error' ? 'err' : ''}`}
          >
            <span className="material-symbols-rounded">
              {item.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}