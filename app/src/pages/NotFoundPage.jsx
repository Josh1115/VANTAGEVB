import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="text-5xl">🏐</div>

      <div className="space-y-1">
        <h1
          className="text-2xl font-black tracking-[0.25em] uppercase"
          style={{ color: '#f97316', textShadow: '0 0 8px #f97316, 0 0 20px rgba(249,115,22,0.4)' }}
        >
          VANTAGE
        </h1>
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500">
          Precision Sideline Analytics
        </p>
      </div>

      <div className="space-y-1">
        <p className="font-semibold text-white text-lg">Page not found</p>
        <p className="text-sm text-slate-400">That page doesn't exist or was moved.</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm text-black"
          style={{ background: '#f97316' }}
        >
          Go Home
        </button>
        <button
          onClick={() => navigate('/teams')}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white bg-slate-700 hover:bg-slate-600 transition-colors"
        >
          My Teams
        </button>
      </div>
    </div>
  );
}
