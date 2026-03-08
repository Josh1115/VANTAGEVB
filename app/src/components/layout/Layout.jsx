import { Outlet, useLocation } from 'react-router-dom';
import { NavBar } from './NavBar';
import { useUiStore, selectToast } from '../../store/uiStore';

// Hide NavBar on live match screen (full-screen immersive)
const HIDE_NAV = ['/live', '/set-lineup'];

export function Layout() {
  const { pathname } = useLocation();
  const toast = useUiStore(selectToast);
  const hideNav = HIDE_NAV.some((p) => pathname.includes(p));

  return (
    <div className="min-h-screen bg-bg text-white">
      <main className={hideNav ? '' : 'pb-20'}>
        <div className={hideNav ? '' : 'max-w-2xl mx-auto'}>
          <div key={pathname} className="animate-page-enter">
            <Outlet />
          </div>
        </div>
      </main>

      {!hideNav && <NavBar />}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg
          ${toast.variant === 'error' ? 'bg-red-600' : toast.variant === 'success' ? 'bg-green-600' : 'bg-slate-700'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
