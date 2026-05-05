export function RotationSpotlight({ rows }) {
  if (!rows || rows.length === 0) return null;

  const weakSO = rows
    .filter(r => r.so_opp >= 5)
    .sort((a, b) => (a.so_pct ?? 0) - (b.so_pct ?? 0))[0];

  const weakBP = rows
    .filter(r => r.bp_opp >= 5)
    .sort((a, b) => (a.bp_pct ?? 0) - (b.bp_pct ?? 0))[0];

  // Qualified rotations need enough sample in both serving and receiving
  const qualified = rows.filter(r => r.so_opp >= 5 && r.bp_opp >= 5);
  const scored = qualified
    .map(r => ({ ...r, _composite: ((r.so_pct ?? 0) + (r.bp_pct ?? 0)) / 2 }))
    .sort((a, b) => b._composite - a._composite);

  const bestScore = scored[0]?._composite;
  const best = bestScore != null
    ? scored.filter(r => Math.abs(r._composite - bestScore) < 0.001)
    : [];

  const hasFocus = weakSO || weakBP;

  return (
    <div className="flex flex-col gap-2">
      {hasFocus && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2 text-sm">
          <span className="text-red-400 font-semibold">⚠ Focus Areas: </span>
          <span className="text-slate-300">
            {[
              weakSO && `${weakSO.name} SO% ${Math.round((weakSO.so_pct ?? 0) * 100)}%`,
              weakBP && `${weakBP.name} SP% ${Math.round((weakBP.bp_pct ?? 0) * 100)}%`,
            ].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}

      {best.length > 0 ? (
        <div className="bg-green-950/40 border border-green-700/50 rounded-lg px-3 py-2 text-sm">
          <span className="text-green-400 font-semibold">★ Recommended Starting Rotation: </span>
          <span className="text-slate-200 font-medium">
            {best.map(r => r.name).join(' / ')}
          </span>
          <span className="text-slate-400 ml-2">
            {best.map(r =>
              `SO% ${Math.round((r.so_pct ?? 0) * 100)}% · SP% ${Math.round((r.bp_pct ?? 0) * 100)}%`
            ).join(' | ')}
          </span>
          <div className="text-slate-500 text-xs mt-0.5">
            Best combined serve &amp; receive efficiency — highest statistical advantage to win the set
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-500">
          Starting rotation recommendation requires 5+ serve and receive opportunities in each rotation.
        </div>
      )}
    </div>
  );
}
