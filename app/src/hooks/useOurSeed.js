import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getOurSeed, saveOurSeed } from '../utils/seasonUtils';

// "Our Seed" box on playoff game screens. Shows the season's saved seed until
// the coach types; save() writes only what they typed.
export function useOurSeed(seasonId) {
  const saved = useLiveQuery(() => getOurSeed(seasonId), [seasonId]) ?? '';
  const [typed, setTyped] = useState(null);
  return {
    value: typed ?? saved,
    onChange: e => setTyped(e.target.value),
    save: () => (typed != null ? saveOurSeed(seasonId, typed) : Promise.resolve()),
    reset: () => setTyped(null),
  };
}
