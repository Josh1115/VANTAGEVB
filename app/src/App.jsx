import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { PinGate } from './components/auth/PinGate';
import { TermsGate } from './components/auth/TermsGate';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <PinGate>
        <TermsGate>
          <RouterProvider router={router} />
        </TermsGate>
      </PinGate>
    </ErrorBoundary>
  );
}
