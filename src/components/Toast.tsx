import React, {createContext, useCallback, useContext, useState} from 'react';

type Toast = { id: string; message: string; type?: 'info' | 'success' | 'error' };

const ToastContext = createContext<{
  showToast: (message: string, type?: Toast['type']) => void;
} | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, {id, message, type}]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Expose a small helper on window so top-level modules that cannot use hooks
  // (like App.tsx outside React render) can still trigger toasts.
  try {
    // @ts-ignore
    (window as any).__REACT_TOAST_SHOW__ = showToast;
  } catch (e) {
    // ignore (non-browser env)
  }

  return (
    <ToastContext.Provider value={{showToast}}>
      {children}
      <div aria-live="polite" role="status" style={{position: 'fixed', left: 0, right: 0, top: 16, zIndex: 9999, display: 'flex', justifyContent: 'center', pointerEvents: 'none'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'auto'}}>
          {toasts.map(t => (
            <div key={t.id} style={{
              padding: '10px 14px',
              borderRadius: 8,
              color: '#fff',
              minWidth: 240,
              maxWidth: 'min(90vw, 520px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              background: t.type === 'error' ? '#e11d48' : t.type === 'success' ? '#059669' : '#0ea5e9',
              textAlign: 'center'
            }}>
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
