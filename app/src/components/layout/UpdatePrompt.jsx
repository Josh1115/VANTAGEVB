import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    if (needRefresh) updateServiceWorker(true);
  }, [needRefresh]);

  return null;
}
