import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';

export const OPPONENT_LIST_ID = 'opponent-suggestions';

// Browser-native type-ahead for the opponent box: every team this account has
// scheduled before. Picking a saved name keeps opponent records + scouting from
// splitting over typos ("Palatine" vs "Palantine").
export default function OpponentSuggestions() {
  const names = useLiveQuery(async () => {
    const opps = await db.opponents.toArray();
    const seen = new Map();
    for (const o of opps) {
      const n = o.name?.trim();
      if (n && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, []) ?? [];
  return (
    <datalist id={OPPONENT_LIST_ID}>
      {names.map((n) => <option key={n} value={n} />)}
    </datalist>
  );
}
