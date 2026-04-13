import { Drawer } from '../ui/Drawer';
import { STAT_GLOSSARY } from '../../stats/glossary';

/**
 * Slide-up drawer showing definitions for the stat columns visible in a table.
 *
 * Props:
 *   columns  — the same `columns` array passed to <StatTable>
 *   onClose  — callback to close the drawer
 *
 * Only entries whose `key` exists in STAT_GLOSSARY are shown.
 * Columns with no glossary entry (e.g. "name", "Rotation") are silently skipped.
 */
export function StatGlossaryDrawer({ columns, onClose }) {
  const entries = columns
    .filter((col) => STAT_GLOSSARY[col.key])
    .map((col) => ({ key: col.key, ...STAT_GLOSSARY[col.key] }));

  return (
    <Drawer title="Stat Glossary" onClose={onClose}>
      {entries.length === 0 ? (
        <p className="text-slate-500 text-sm">No definitions available for these columns.</p>
      ) : (
        <ul className="space-y-4">
          {entries.map((e) => (
            <li key={e.key} className="flex gap-3 items-start">
              <span className="w-16 shrink-0 font-mono text-sm font-bold text-primary pt-px">
                {e.abbr}
              </span>
              <div>
                <div className="text-sm font-semibold text-white leading-snug">{e.full}</div>
                <div className="text-xs text-slate-400 mt-0.5 leading-relaxed whitespace-pre-line">{e.def}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
