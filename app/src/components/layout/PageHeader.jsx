import { useNavigate } from 'react-router-dom';

export function PageHeader({ title, backTo, action }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 bg-bg border-b border-slate-800 px-4 py-3 flex items-center gap-3">
      {backTo !== undefined && (
        <button
          onClick={() => backTo ? navigate(backTo) : navigate(-1)}
          className="text-slate-400 hover:text-white text-2xl leading-none"
        >
          ←
        </button>
      )}
      <h1 className="text-lg md:text-xl font-bold flex-1">{title}</h1>
      {action && <div>{action}</div>}
    </header>
  );
}
