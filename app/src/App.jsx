import { useState, useRef, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TermsGate } from './components/auth/TermsGate';
import { LoginPage } from './components/auth/LoginPage';
import { SignupWizard } from './components/auth/SignupWizard';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// sessionStorage key marking "already redirected home this tab" — see the
// redirect logic below. Also referenced (as the same literal, to avoid a
// circular import) by AuthContext's sign-out/switch, which clear it so a
// genuine new login still lands on the dashboard.
const HOME_REDIRECT_KEY = 'vbstat_home_redirected';

function AppShell() {
  const { session, loading, recoveryMode, clearRecoveryMode } = useAuth();
  const [view, setView] = useState('login'); // 'login' | 'signup'
  const hasRedirectedHome = useRef(false);

  useEffect(() => {
    if (!loading) {
      document.title = session ? 'VANTAGE' : 'Vantage: Immediate Impact Analytics';
    }
  }, [session, loading]);

  // The first time auth resolves to a logged-in session — whether from a
  // fresh login or an already-valid session restored on app boot — reset
  // the URL to home so the user never lands on whatever page happened to
  // be open last, on any device. sessionStorage (not localStorage) is the
  // signal for "already did this": it survives a plain refresh in the same
  // tab (so refreshing keeps you on the current page) but is empty again on
  // a brand-new tab/device, and is explicitly cleared on sign-out/account
  // switch in AuthContext so a genuine re-login still goes home.
  if (!loading && session && !hasRedirectedHome.current) {
    hasRedirectedHome.current = true;
    let alreadyThisTab = false;
    try { alreadyThisTab = sessionStorage.getItem(HOME_REDIRECT_KEY) === '1'; } catch { /* private mode etc */ }
    if (!alreadyThisTab) {
      try { sessionStorage.setItem(HOME_REDIRECT_KEY, '1'); } catch { /* best-effort */ }
      router.navigate('/', { replace: true });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (recoveryMode) {
    return <ResetPasswordPage onDone={clearRecoveryMode} />;
  }

  if (!session) {
    if (view === 'signup') {
      return (
        <SignupWizard
          onComplete={() => setView('login')}
          onBack={() => setView('login')}
        />
      );
    }
    return <LoginPage onSignup={() => setView('signup')} />;
  }

  return (
    <TermsGate>
      <RouterProvider router={router} />
    </TermsGate>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
