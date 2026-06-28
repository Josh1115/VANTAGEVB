import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ title, children, onClose, footer, hideClose = false }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-backdrop-in"
      onClick={hideClose ? undefined : onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="w-full max-w-lg flex flex-col bg-surface rounded-2xl animate-modal-up"
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between shrink-0 px-6 pt-6 pb-4">
              <h2 className="text-lg font-bold">{title}</h2>
              {!hideClose && <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>}
            </div>
          )}
          <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-2">
            {children}
          </div>
          {footer && <div className="shrink-0 px-6 py-4 flex gap-2 justify-end border-t border-slate-700/60">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}
