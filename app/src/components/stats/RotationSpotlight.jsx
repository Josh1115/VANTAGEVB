// Markov-chain DP: expected points scored when starting in `startRot`.
//
// State: (our, opp, rot, serving)
// Transitions:
//   Receiving in R:  sideout (so%) → score, rotate to R+1, serve
//                    fail   (1-so%) → opp scores, stay receiving in R
//   Serving in R:    break  (bp%)  → score, stay serving in R
//                    lose  (1-bp%) → opp scores, stay receiving in R (same rotation)
//
// All 6 rotations are included in the simulation; sparse rotations fall back to the
// team average so the sequence is never broken by missing data.
function computeOptimalStart(rows) {
  if (!rows || rows.length === 0) return null;

  const validSo = rows.filter(r => r.so_pct != null);
  const validBp = rows.filter(r => r.bp_pct != null);
  const avgSo = validSo.length ? validSo.reduce((s, r) => s + r.so_pct, 0) / validSo.length : 0.5;
  const avgBp = validBp.length ? validBp.reduce((s, r) => s + r.bp_pct, 0) / validBp.length : 0.5;

  const statMap = {};
  for (let i = 1; i <= 6; i++) statMap[i] = { so: avgSo, bp: avgBp };
  for (const r of rows) {
    statMap[Number(r.id)] = { so: r.so_pct ?? avgSo, bp: r.bp_pct ?? avgBp };
  }

  // Flat cache: our(0-24) × opp(0-24) × rot(1-6) × serving(0-1) = 7,500 states
  const TARGET = 25;
  const cache  = new Float32Array(TARGET * TARGET * 6 * 2).fill(-1);
  const idx    = (our, opp, rot, srv) =>
    our * 300 + opp * 12 + (rot - 1) * 2 + (srv ? 1 : 0);

  function dp(our, opp, rot, srv) {
    if (our >= TARGET || opp >= TARGET) return our;
    const i = idx(our, opp, rot, srv);
    if (cache[i] >= 0) return cache[i];
    const { so, bp } = statMap[rot];
    const val = srv
      ? bp       * dp(our + 1, opp,     rot,             true)
        + (1-bp) * dp(our,     opp + 1, rot,             false)
      : so       * dp(our + 1, opp,     (rot % 6) + 1,   true)
        + (1-so) * dp(our,     opp + 1, rot,             false);
    cache[i] = val;
    return val;
  }

  const qualified = rows.filter(r => (r.so_opp ?? 0) >= 5 && (r.bp_opp ?? 0) >= 5);
  if (qualified.length === 0) return null;

  // Only surface a second rotation if it's within 0.01 pts/set — a genuine tie
  const TIE_THRESHOLD = 0.01;

  const scoredReceive = qualified
    .map(r => ({ ...r, _exp: dp(0, 0, Number(r.id), false) }))
    .sort((a, b) => b._exp - a._exp);
  const bestReceive = scoredReceive[0]._exp;

  const scoredServe = qualified
    .map(r => ({ ...r, _exp: dp(0, 0, Number(r.id), true) }))
    .sort((a, b) => b._exp - a._exp);
  const bestServe = scoredServe[0]._exp;

  return {
    receive: {
      top:       scoredReceive.filter(r => Math.abs(r._exp - bestReceive) < TIE_THRESHOLD),
      allScored: scoredReceive,
    },
    serve: {
      top:       scoredServe.filter(r => Math.abs(r._exp - bestServe) < TIE_THRESHOLD),
      allScored: scoredServe,
    },
    avgSo,
    avgBp,
    statMap,
  };
}

function rotSeq(startId) {
  const seq = [];
  for (let i = 0; i < 6; i++) seq.push(((startId - 1 + i) % 6) + 1);
  return seq;
}

function StrengthDot({ so, bp, avgSo, avgBp }) {
  const composite = (so + bp) / 2;
  const avg       = (avgSo + avgBp) / 2;
  const delta     = composite - avg;
  const cls = delta >  0.04 ? 'bg-green-500'
            : delta < -0.04 ? 'bg-red-500'
            :                  'bg-yellow-500';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${cls} shrink-0`} />;
}

function RotationCard({ label, scenario, rows, avgSo, avgBp, statMap }) {
  return (
    <div className="bg-green-950/40 border border-green-700/50 rounded-lg px-3 py-2 text-sm space-y-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-green-400 font-semibold">★ {label}:</span>
        <span className="text-slate-100 font-bold">{scenario.top.map(r => r.name).join(' / ')}</span>
        <span className="text-slate-400 text-xs tabular-nums">
          ~{scenario.top[0]._exp.toFixed(1)} pts/set expected
        </span>
      </div>

      {scenario.top.map(topRot => {
        const seq = rotSeq(Number(topRot.id));
        return (
          <div key={topRot.id} className="space-y-1">
            <div className="flex gap-1">
              {seq.map((rotNum, i) => {
                const s     = statMap[rotNum];
                const row   = rows.find(r => Number(r.id) === rotNum);
                const soTxt = row?.so_pct != null ? `${Math.round(row.so_pct * 100)}%` : '—';
                const bpTxt = row?.bp_pct != null ? `${Math.round(row.bp_pct * 100)}%` : '—';
                const isStart = i === 0;
                return (
                  <div
                    key={rotNum}
                    className={`flex-1 rounded-md px-1 py-1.5 text-center text-[10px] leading-tight border ${
                      isStart
                        ? 'border-green-600 bg-green-900/40'
                        : 'border-slate-700 bg-slate-800/50'
                    }`}
                  >
                    <div className={`font-bold text-xs mb-0.5 ${isStart ? 'text-green-300' : 'text-slate-300'}`}>
                      R{rotNum}
                    </div>
                    <StrengthDot so={s.so} bp={s.bp} avgSo={avgSo} avgBp={avgBp} />
                    <div className="text-slate-400 tabular-nums mt-0.5">SO {soTxt}</div>
                    <div className="text-slate-400 tabular-nums">SP {bpTxt}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-600">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>above avg</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block"/>near avg</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>below avg</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RotationSpotlight({ rows }) {
  if (!rows || rows.length === 0) return null;

  const weakSO = rows
    .filter(r => (r.so_opp ?? 0) >= 5)
    .sort((a, b) => (a.so_pct ?? 0) - (b.so_pct ?? 0))[0];

  const weakBP = rows
    .filter(r => (r.bp_opp ?? 0) >= 5)
    .sort((a, b) => (a.bp_pct ?? 0) - (b.bp_pct ?? 0))[0];

  const rec = computeOptimalStart(rows);

  return (
    <div className="flex flex-col gap-2">

      {(weakSO || weakBP) && (
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

      {rec ? (
        <>
          <RotationCard
            label="Best Rotation to Start Serving"
            scenario={rec.serve}
            rows={rows}
            avgSo={rec.avgSo}
            avgBp={rec.avgBp}
            statMap={rec.statMap}
          />
          <RotationCard
            label="Best Rotation to Start Receiving"
            scenario={rec.receive}
            rows={rows}
            avgSo={rec.avgSo}
            avgBp={rec.avgBp}
            statMap={rec.statMap}
          />
          <div className="text-slate-500 text-xs px-1">
            Sequence-optimized — simulates the full set so stronger rotations get more at-bats, like a batting order.
          </div>
        </>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-500">
          Starting rotation recommendation requires 5+ serve and receive opportunities per rotation.
        </div>
      )}
    </div>
  );
}
