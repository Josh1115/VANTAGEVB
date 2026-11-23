// Shown in place of a live-match pop-up that crashed, so one broken pop-up
// closes cleanly instead of replacing the whole court with the reload screen.
export function PopupErrorFallback({ onClose, label = 'Close' }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-xs w-full text-center space-y-3">
        <p className="text-white font-bold">This screen ran into a problem.</p>
        <p className="text-slate-400 text-sm">Your match and stats are safe.</p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold text-sm"
        >
          {label}
        </button>
      </div>
    </div>
  );
}
