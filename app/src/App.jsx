import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { PinGate } from './components/auth/PinGate';
import { TermsGate } from './components/auth/TermsGate';

export default function App() {
  return (
    <PinGate>
      <TermsGate>
        <RouterProvider router={router} />
      </TermsGate>
    </PinGate>
  );
}
