import { wrapSvgText } from '../../utils/historyUtils';

export const BANNER_COLORS = {
  black:  { bg: '#0f172a', trim: '#fbbf24', text: '#fbbf24', bright: '#94a3b8' },
  white:  { bg: '#e2e8f0', trim: '#334155', text: '#1e293b', bright: '#f8fafc' },
  gray:   { bg: '#374151', trim: '#fbbf24', text: '#fbbf24', bright: '#94a3b8' },
  red:    { bg: '#7f1d1d', trim: '#fca5a5', text: '#fef2f2', bright: '#ef4444' },
  orange: { bg: '#7c2d12', trim: '#fdba74', text: '#fff7ed', bright: '#e8530b' },
  yellow: { bg: '#713f12', trim: '#fde047', text: '#fefce8', bright: '#eab308' },
  green:  { bg: '#14532d', trim: '#86efac', text: '#f0fdf4', bright: '#22c55e' },
  blue:   { bg: '#1e3a8a', trim: '#93c5fd', text: '#eff6ff', bright: '#3b82f6' },
  purple: { bg: '#3b0764', trim: '#d8b4fe', text: '#faf5ff', bright: '#a855f7' },
  pink:   { bg: '#831843', trim: '#f9a8d4', text: '#fdf2f8', bright: '#ec4899' },
};
const BANNER_DEFAULT = { bg: '#1e3a8a', trim: '#fbbf24', text: '#fef9c3', bright: '#93c5fd' };

export function ChampionshipBanner({ title, year, orgName, primaryColorId, secondaryColorId, className = 'w-40' }) {
  const primary   = BANNER_COLORS[primaryColorId] ?? BANNER_DEFAULT;
  const trimColor = secondaryColorId && BANNER_COLORS[secondaryColorId]
    ? BANNER_COLORS[secondaryColorId].bright
    : primary.trim;

  const yearStr      = String(year ?? '').toUpperCase();
  const yearFontSize = yearStr.length <= 4 ? 28 : yearStr.length <= 5 ? 22 : 16;

  const orgFontSize     = 12;
  const orgLineHeight   = 20;
  const orgBaselineOff  = 17;

  const orgLines   = wrapSvgText(orgName, 9);
  const titleLines = wrapSvgText(title,   13);

  const orgBlockH   = orgLines.length * orgLineHeight;
  const orgStartY   = Math.round(26 + (46 - orgBlockH) / 2) + orgBaselineOff;
  const titleBlockH = titleLines.length * 13;
  const titleStartY = Math.round(132 + (33 - titleBlockH) / 2) + 10;

  return (
    <svg viewBox="0 0 120 220" className={className} aria-hidden="true"
      style={{ filter: `drop-shadow(0 6px 20px ${primary.bg}cc)` }}>
      <line x1="10" y1="12" x2="110" y2="12" stroke={trimColor} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="22" cy="12" r="6" fill={primary.bg} stroke={trimColor} strokeWidth="1.8"/>
      <circle cx="98" cy="12" r="6" fill={primary.bg} stroke={trimColor} strokeWidth="1.8"/>
      <path d="M 10,18 L 110,18 L 110,168 L 60,200 L 10,168 Z" fill={primary.bg}/>
      <path d="M 18,26 L 102,26 L 102,161 L 60,188 L 18,161 Z"
        fill="none" stroke={trimColor} strokeWidth="1.4" strokeOpacity="0.7"/>
      <text x="60" y={orgStartY} fill={primary.text} fontSize={orgFontSize} fontWeight="900"
        textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
        {orgLines.map((line, i) => <tspan key={i} x="60" dy={i === 0 ? 0 : orgLineHeight}>{line}</tspan>)}
      </text>
      <line x1="24" y1="74" x2="96" y2="74" stroke={trimColor} strokeWidth="0.8" strokeOpacity="0.5"/>
      <text x="60" y="116" fill={primary.text} fontSize={yearFontSize} fontWeight="900"
        textAnchor="middle" fontFamily="system-ui, sans-serif">
        {yearStr}
      </text>
      <line x1="24" y1="130" x2="96" y2="130" stroke={trimColor} strokeWidth="0.8" strokeOpacity="0.5"/>
      <text x="60" y={titleStartY} fill={primary.text} fontSize="8" fontWeight="900"
        textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="0.3">
        {titleLines.map((line, i) => <tspan key={i} x="60" dy={i === 0 ? 0 : 13}>{line}</tspan>)}
      </text>
    </svg>
  );
}

export function ChampionshipBannersSection({ titledSeasons, orgName, primaryColorId, secondaryColorId, bannerClassName }) {
  if (!titledSeasons.length) return null;
  const counts = countTitleTypes(titledSeasons);
  return (
    <div className="bg-surface rounded-xl px-4 py-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-white mb-4 text-center">Titles &amp; Championships</p>
      {counts.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-3 mb-4">
          {counts.map(([n, name]) => (
            <span key={name} className="text-xs font-bold text-white whitespace-nowrap"><span className="tabular-nums">{n}</span> <span className="text-slate-400 font-semibold">{name}</span></span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-5 justify-center">
        {titledSeasons.map((s, idx) => (
          <div
            key={`${s.year}-${s.title}-${idx}`}
            className="animate-slide-up-fade"
            style={{ animationDelay: `${idx * 70}ms` }}
          >
            <ChampionshipBanner
              title={s.title}
              year={s.year}
              orgName={orgName}
              primaryColorId={primaryColorId}
              secondaryColorId={secondaryColorId}
              className={bannerClassName}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Tally banners by level for the summary bar. Super-Sectional is checked
// before Sectional; every state finish (title, runner-up, placing) counts as State.
export function countTitleTypes(titledSeasons) {
  const c = { regional: 0, sectional: 0, superSectional: 0, state: 0 };
  for (const { title } of titledSeasons) {
    const t = String(title ?? '').toLowerCase();
    if (/state/.test(t)) c.state++;
    else if (/super[\s-]?sectional/.test(t)) c.superSectional++;
    else if (/sectional/.test(t)) c.sectional++;
    else if (/regional/.test(t)) c.regional++;
  }
  return [
    [c.regional, c.regional === 1 ? 'Regional' : 'Regionals'],
    [c.sectional, c.sectional === 1 ? 'Sectional' : 'Sectionals'],
    [c.superSectional, c.superSectional === 1 ? 'Super-Sectional' : 'Super-Sectionals'],
    [c.state, 'State'],
  ].filter(([n]) => n > 0);
}
