import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TermsGate } from './components/auth/TermsGate';
import { LoginPage } from './components/auth/LoginPage';
import { SignupWizard } from './components/auth/SignupWizard';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

function AppShell() {
  const { session, loading } = useAuth();
  const [view, setView] = useState('login'); // 'login' | 'signup'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
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
