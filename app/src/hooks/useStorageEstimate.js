import { useState, useEffect } from 'react';

// Reads the browser's storage-quota usage via the StorageManager API.
// Returns null until the first estimate resolves (or forever, on browsers
// that don't support it — e.g. iOS Private Mode). Pass a changing
// `refreshKey` to re-poll after an action that frees or uses storage
// (import, restore, clear data, etc).
export function useStorageEstimate(refreshKey = 0) {
  const [estimate, setEstimate] = useState(null);

  useEffect(() => {
    if (!navigator.storage?.estimate) return;
    navigator.storage.estimate().then((est) => {
      setEstimate({ usage: est.usage ?? 0, quota: est.quota ?? 0 });
    });
  }, [refreshKey]);

  return estimate;
}
