import { useEffect, useState } from 'react';
import { loadColleges, findCollege, espnLogoUrl } from '../../utils/collegeLogos';

// Uploaded logo → picked ESPN logo → exact name match from the college list.
// Shows nothing if there is no logo or the image fails to load (e.g. offline).
export function CollegeLogo({ commit, size = 36 }) {
  const [matchId, setMatchId] = useState(null);
  const [failed, setFailed] = useState(false);
  const needsLookup = !commit?.logo_data && !commit?.logo_espn_id && !!commit?.college;

  useEffect(() => {
    if (!needsLookup) return undefined;
    let alive = true;
    loadColleges().then((list) => { if (alive) setMatchId(findCollege(list, commit.college)?.id ?? null); });
    return () => { alive = false; };
  }, [needsLookup, commit?.college]);

  useEffect(() => { setFailed(false); }, [commit?.logo_data, commit?.logo_espn_id, matchId]);

  const espnId = commit?.logo_espn_id ?? matchId;
  const src = commit?.logo_data || (espnId ? espnLogoUrl(espnId) : null);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}
