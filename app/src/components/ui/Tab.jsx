import clsx from 'clsx';
import { Fragment } from 'react';

// `centered` centers the tabs (still scrolls sideways if they don't fit);
// `dividers` puts a small '|' between each tab.
export function TabBar({ tabs, active, onChange, centered = false, dividers = false }) {
  return (
    <div className="flex overflow-x-auto scrollbar-none border-b border-slate-700">
      <div className={clsx('flex items-center', centered && 'w-max mx-auto')}>
        {tabs.map((tab, i) => (
          <Fragment key={tab.value}>
            {dividers && i > 0 && <span aria-hidden className="text-slate-600 select-none">|</span>}
            <button
              onClick={() => onChange(tab.value)}
              className={clsx(
                'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                active === tab.value
                  ? 'border-primary text-white'
                  : 'border-transparent text-white hover:text-white'
              )}
            >
              {tab.label}
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
