export function Drawer({ title, children, onClose, centered = false }) {
  if (centered) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop-in" onClick={onClose} />
        <div className="relative bg-surface w-full max-w-lg max-h-[80dvh] rounded-2xl overflow-y-auto animate-modal-in shadow-2xl">
          <div className="sticky top-0 bg-surface flex items-center justify-between p-4 border-b border-slate-700">
            {title && <h3 className="font-semibold text-base">{title}</h3>}
            <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white ml-auto text-xl">&times;</button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-backdrop-in" onClick={onClose} />
      <div className="relative bg-surface w-full max-h-[80dvh] rounded-t-2xl overflow-y-auto animate-drawer-up">
        <div className="sticky top-0 bg-surface flex items-center justify-between p-4 border-b border-slate-700">
          {title && <h3 className="font-semibold text-base">{title}</h3>}
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white ml-auto text-xl">&times;</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
