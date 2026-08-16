import { Link } from 'react-router-dom';

const GUIDE_LINK_CLS = 'w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg border border-primary/40 hover:border-primary hover:bg-primary/5 transition-colors text-left';
const VANTAGE_LINK_CLS = 'w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg border border-blue-500/40 hover:border-blue-400 hover:bg-blue-500/5 transition-colors text-left';

function GuideLink({ to, icon, label, desc, isVantage }) {
  return (
    <Link to={to} className={isVantage ? VANTAGE_LINK_CLS : GUIDE_LINK_CLS}>
      <span className="flex items-center gap-2.5 min-w-0">
        <span className="text-base shrink-0">{icon}</span>
        <span className="min-w-0">
          <span className="text-sm font-medium text-slate-200 block leading-tight">{label}</span>
          {desc && <span className="text-[10px] text-slate-500">{desc}</span>}
        </span>
        {!isVantage && <span className="text-[9px] font-bold text-primary border border-primary/50 rounded px-1 py-px shrink-0">GUIDE</span>}
      </span>
      <span className="text-slate-500 text-sm shrink-0 ml-2">›</span>
    </Link>
  );
}

export function GuideGroup({ title, groupDesc, items, isVantage }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1.5 px-1">{title}</p>
      {groupDesc && <p className="text-[11px] text-slate-500 mb-2 px-1">{groupDesc}</p>}
      <div className="space-y-1">
        {items.map(({ to, icon, label, desc }) => (
          <GuideLink key={to} to={to} icon={icon} label={label} desc={desc} isVantage={isVantage} />
        ))}
      </div>
    </div>
  );
}
