export const BG      = '#000000';
export const SURFACE = '#1e293b';
export const SURFACE2= '#0f172a';
export const BORDER  = '#334155';
export const BORDER2 = '#475569';
export const TXT     = '#f8fafc';
export const TXT3    = '#cbd5e1';
export const TXT4    = '#94a3b8';
export const TXT5    = '#64748b';
export const PRIMARY = '#e8530b';
export const BLUE    = '#60a5fa';
export const GREEN   = '#34d399';
export const EMERALD = '#34d399';
export const RED     = '#f87171';
export const DANGER  = '#ef4444';
export const AMBER   = '#fbbf24';
export const LIME    = '#a3e635';
export const ROMAN_C = '#fb923c';

export function HelpStep({ number, title, note, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-primary text-black text-sm font-black flex items-center justify-center shrink-0">
          {number}
        </span>
        <span className="font-semibold text-white">{title}</span>
      </div>
      {note && <p className="text-sm text-slate-400 pl-10 leading-relaxed">{note}</p>}
      <div className="pl-10">{children}</div>
    </div>
  );
}
