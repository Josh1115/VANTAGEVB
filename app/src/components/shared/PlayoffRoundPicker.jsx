import { PLAYOFF_ROUND_CHOICES } from '../../utils/seasonUtils';

// Tap a round instead of typing it. The text box stays for custom names.
export function PlayoffRoundPicker({ value, onChange, inputClassName, placeholder = 'or type a custom round…' }) {
  const current = (value ?? '').trim().toLowerCase();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PLAYOFF_ROUND_CHOICES.map(r => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
              current === r.toLowerCase()
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-slate-300 border-slate-600 hover:border-slate-400'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </div>
  );
}
