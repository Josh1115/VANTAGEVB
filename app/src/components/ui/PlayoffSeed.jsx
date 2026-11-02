// NCAA-style opponent seed for playoff games: a small number ahead of the name, so it
// can't be mixed up with the "#12" state rank that follows the name.
export function PlayoffSeed({ match }) {
  if (match.match_type !== 'ihsa-playoffs' || match.opponent_playoff_seed == null) return null;
  return (
    <span className="text-[11px] font-bold text-amber-400 mr-1 align-[1px]" title="Playoff seed">
      {match.opponent_playoff_seed}
    </span>
  );
}
