import { Link } from 'react-router-dom';
import { TERMS_STORAGE_KEY } from '../auth/TermsGate';

export function LegalTab() {
  return (
    <div className="p-4 flex flex-col gap-2">
      <Link
        to="/terms"
        className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 active:scale-95 border border-slate-600/50 text-slate-200 font-semibold text-sm transition-all duration-150"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="flex flex-col items-start">
            Terms &amp; Conditions
            {(() => {
              try {
                const raw = localStorage.getItem(TERMS_STORAGE_KEY);
                if (!raw) return null;
                let acceptedAt = null;
                try { acceptedAt = JSON.parse(raw).acceptedAt ?? null; } catch { /* old plain-string format */ }
                if (!acceptedAt) return <span className="text-xs font-normal text-slate-500">Agreed (date not recorded)</span>;
                const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
                return <span className="text-xs font-normal text-slate-500">Agreed {fmt.format(new Date(acceptedAt))}</span>;
              } catch { return null; }
            })()}
          </span>
        </span>
        <span className="text-slate-500 text-xs">›</span>
      </Link>
      <Link
        to="/privacy"
        className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 active:scale-95 border border-slate-600/50 text-slate-200 font-semibold text-sm transition-all duration-150"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Privacy Policy
        </span>
        <span className="text-slate-500 text-xs">›</span>
      </Link>
    </div>
  );
}
