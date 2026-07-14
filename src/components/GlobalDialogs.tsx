'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ToastMsg = { id: number; message: string; type: 'success' | 'error' | 'info' };
let toastId = 0;
let listeners: ((msg: ToastMsg) => void)[] = [];

export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const msg = { id: ++toastId, message, type };
  listeners.forEach(l => l(msg));
};

type ConfirmDialog = { id: number; message: string; resolve: (val: boolean) => void };
let confirmListeners: ((dialog: ConfirmDialog) => void)[] = [];
export const customConfirm = (message: string): Promise<boolean> => {
  return new Promise(resolve => {
    const dialog = { id: ++toastId, message, resolve };
    confirmListeners.forEach(l => l(dialog));
  });
};

export default function GlobalDialogs() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null);

  useEffect(() => {
    const onToast = (msg: ToastMsg) => {
      setToasts(prev => [...prev, msg]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== msg.id)), 4000);
    };
    listeners.push(onToast);
    
    const onConfirm = (dialog: ConfirmDialog) => {
      setConfirm(dialog);
    };
    confirmListeners.push(onConfirm);
    
    return () => {
      listeners = listeners.filter(l => l !== onToast);
      confirmListeners = confirmListeners.filter(l => l !== onConfirm);
    };
  }, []);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <>
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 999999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'error' ? '#ef4444' : t.type === 'success' ? '#10b981' : '#3b82f6',
            color: 'white', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            fontSize: '14px', fontWeight: 600, animation: 'fadeIn 0.3s ease-out', pointerEvents: 'auto'
          }}>
            {t.message}
          </div>
        ))}
      </div>
      
      {confirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--surface-color)', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            maxWidth: '420px', width: '90%', border: '1px solid var(--border-color)', animation: 'scaleIn 0.2s ease-out'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>Confirmation Required</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.5, fontWeight: 500 }}>{confirm.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => { confirm.resolve(false); setConfirm(null); }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancel</button>
              <button onClick={() => { confirm.resolve(true); setConfirm(null); }} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </>,
    document.body
  );
}
