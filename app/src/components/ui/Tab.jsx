import clsx from 'clsx';

export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex overflow-x-auto scrollbar-none border-b border-slate-700">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={clsx(
            'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
            active === tab.value
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
