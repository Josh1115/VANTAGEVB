import { memo } from 'react';
import clsx from 'clsx';

export const Badge = memo(function Badge({ children, color = 'gray' }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      {
        'bg-orange-900/40 text-orange-300': color === 'orange',
        'bg-green-900/40 text-green-300':   color === 'green',
        'bg-red-900/40 text-red-300':       color === 'red',
        'bg-slate-700 text-slate-300':      color === 'gray',
        'bg-blue-900/40 text-blue-300':     color === 'blue',
      }
    )}>
      {children}
    </span>
  );
});
