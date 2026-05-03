import { useNavigate } from 'react-router-dom';
import { TermsContent } from '../components/auth/TermsContent';

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-white">
      <div className="sticky top-0 z-10 bg-surface border-b border-slate-700 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white transition-colors p-1 -ml-1"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="font-bold text-lg tracking-wide">Terms &amp; Conditions</h1>
      </div>

      <TermsContent />
    </div>
  );
}
