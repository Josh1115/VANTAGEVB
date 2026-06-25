import { useState, useRef, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TermsGate } from './components/auth/TermsGate';
import { LoginPage } from './components/auth/LoginPage';
import { SignupWizard } from './components/auth/SignupWizard';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

function AppShell() {
  const { session, loading, recoveryMode, clearRecoveryMode } = useAuth();
  const [view, setView] = useState('login'); // 'login' | 'signup'
  const wasLoggedOut = useRef(false);

  if (!loading && !session) wasLoggedOut.current = true;

  useEffect(() => {
    if (!loading) {
      document.title = session ? 'VANTAGE' : 'Vantage: Immediate Impact Analytics';
    }
  }, [session, loading]);

  // When transitioning from logged-out → logged-in, reset URL to home
  // so the router doesn't land on whatever page was open before login.
  if (!loading && session && wasLoggedOut.current) {
    wasLoggedOut.current = false;
    window.history.replaceState(null, '', '/');
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
