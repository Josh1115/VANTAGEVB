import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ title, children, onClose, footer }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-backdrop-in"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto bg-surface rounded-2xl p-6 animate-modal-up"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
          </div>
        )}
        {children}
        {footer && <div className="mt-4 flex gap-2 justify-end">{footer}</div>}
      </div>
    </>,
    document.body
  );
}
