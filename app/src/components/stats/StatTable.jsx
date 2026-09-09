import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { StatGlossaryDrawer } from './StatGlossaryDrawer';

/**
 * Sortable stat table.
 *
 * columns: [{ key, label, fmt?, defaultDesc? }]
 * rows:    [{ id, name, ...statValues }]
 */
export function StatTable({ columns, rows, totalsRow, totalsRowLabel, onRowClick, onNameClick, selectedRowId, showGlossary = false }) {
  const [sortKey,      setSortKey]      = useState(columns[1]?.key ?? columns[0].key);
  const [desc,         setDesc]         = useState(true);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  function handleSort(key) {
    if (sortKey === key) {
      setDesc((d) => !d);
    } else {
      setSortKey(key);
      setDesc(true);
    }
  }

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (sortKey === 'name') {
      return desc
        ? (b.name ?? '').localeCompare(a.name ?? '')
        : (a.name ?? '').localeCompare(b.name ?? '');
    }
    const av = a[sortKey] ?? -Infinity;
    const bv = b[sortKey] ?? -Infinity;
    return desc ? bv - av : av - bv;
  }), [rows, sortKey, desc]);

  return (
    <div>
      {showGlossary && (
        <div className="flex justify-end mb-1">
          <button
            onClick={() => setGlossaryOpen(true)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span className="border border-slate-600 rounded px-1.5 py-px font-mono text-[10px] leading-none">?</span>
            <span>Glossary</span>
          </button>
        </div>
      )}
      {glossaryOpen && (
        <StatGlossaryDrawer columns={columns} onClose={() => setGlossaryOpen(false)} />
      )}
    <div className="overflow-x-auto">
      <table className="text-sm w-full">
        <thead>
          <tr className="border-b border-slate-700">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={clsx(
                  'px-8 py-2 text-center font-semibold cursor-pointer select-none whitespace-nowrap',
                  col.key === 'name' ? 'text-left sticky left-0 z-10 bg-slate-900' : '',
                  sortKey === col.key ? 'text-primary' : 'text-slate-400'
                )}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1 text-xs">{desc ? '↓' : '↑'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                'border-b border-slate-800',
                onRowClick && 'cursor-pointer active:brightness-110',
                selectedRowId !== undefined && String(row.id) === String(selectedRowId)
                  ? 'bg-primary/10'
                  : i % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/40'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  onClick={col.key === 'name' && onNameClick ? (e) => { e.stopPropagation(); onNameClick(row); } : undefined}
                  className={clsx(
                    'px-8 py-2 tabular-nums',
                    col.key === 'name' ? 'text-left font-medium sticky left-0 z-10 bg-slate-900' : clsx('text-center', !col.cellClass && 'text-slate-300'),
                    col.key === 'name' && onNameClick && 'cursor-pointer hover:text-primary transition-colors',
                    col.cellClass?.(row[col.key], row)
                  )}
                >
                  {col.render ? col.render(row[col.key], row) : col.fmt ? col.fmt(row[col.key]) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-slate-500">
                No data
              </td>
            </tr>
          )}
        </tbody>
        {totalsRow && (
          <tfoot>
            <tr className={clsx(
              'border-t-2 border-slate-600 bg-slate-800/70',
              totalsRowLabel != null && 'italic',
            )}>
              {columns.map((col, i) => {
                // When a label is supplied, the first cell shows it instead of
                // that column's value (used for the projected-totals row, where
                // the stat tables have no 'name' column to hang a label on).
                const showLabel = i === 0 && totalsRowLabel != null;
                return (
                  <td
                    key={col.key}
                    className={clsx(
                      'px-8 py-2 font-bold',
                      showLabel
                        ? 'text-left text-slate-300 whitespace-nowrap sticky left-0 z-10 bg-slate-800'
                        : col.key === 'name'
                          ? 'text-left text-slate-300 tabular-nums sticky left-0 z-10 bg-slate-800'
                          : 'text-center text-white tabular-nums',
                    )}
                  >
                    {showLabel
                      ? totalsRowLabel
                      : col.fmt ? col.fmt(totalsRow[col.key]) : (totalsRow[col.key] ?? '—')}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
    </div>
  );
}
