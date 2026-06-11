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
        className="fixed z-50 w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] flex flex-col bg-surface rounded-2xl animate-modal-up"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {title && (
          <div className="flex items-center justify-between shrink-0 px-6 pt-6 pb-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-2">
          {children}
        </div>
        {footer && <div className="shrink-0 px-6 py-4 flex gap-2 justify-end border-t border-slate-700/60">{footer}</div>}
      </div>
    </>,
    document.body
  );
}
