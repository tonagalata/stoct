'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            pointerEvents: 'auto',
            padding: '10px 14px',
            borderRadius: '10px',
            color: t.type === 'error' ? '#fff' : '#000',
            background: t.type === 'error'
              ? 'rgba(244,67,54,0.9)'
              : t.type === 'success'
              ? 'linear-gradient(135deg, #ffffff, #f0f0f0)'
              : 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            minWidth: '200px',
            textAlign: 'center',
            fontSize: '0.95rem',
            fontWeight: 600
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}


