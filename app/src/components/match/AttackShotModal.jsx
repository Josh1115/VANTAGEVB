import { useRef, useState } from 'react';
import { useMatchStore } from '../../store/matchStore';
import { usePlayerNameFormat } from '../../hooks/useSettingsStorage';
import { fmtPlayerName } from '../../stats/formatters';
import { AttackShotChart } from '../stats/AttackShotChart';
import { viewToCourt, courtToView, landingZone, flipTap, useShotFlip, SHOT_COLORS, VIEW_W, MARGIN, COURT_LEN, COURT_WID } from '../../utils/attackShot';

const KILL_TYPES = [
  ['pure', 'PURE'], ['touch', 'TOUCH'], ['tool', 'TOOL'],
  ['tip', 'TIP/ROLL'], ['bk', 'BACK ROW'], ['over', 'OVER PASS'],
];
const BACK_ROW_X = 1 / 3; // our 10-ft line, as a fraction of court length

// Kill extras (one-screen kill): kill type chips + who set it. Defaults are
// PURE and the setter on court, so the usual kill needs no taps here.
function KillOptions({ kill, attackerId, killType, onType, assistId, onAssist, big = false, compact = false }) {
  // Same name style as the live player buttons (Settings / Match Menu → Player Names)
  const [nameFormat] = usePlayerNameFormat();
  const nicknames = useMatchStore((st) => st.playerNicknames);
  const onCourt = (kill.lineup ?? []).filter((sl) => sl.playerId && sl.playerId !== attackerId);
  const setter = onCourt.find((sl) => sl.positionLabel === 'S');
  const libero = onCourt.find((sl) => sl.playerId === kill.liberoId);
  const ordered = [setter, libero, ...onCourt.filter((sl) => sl !== setter && sl !== libero)].filter(Boolean);
  const size = big ? 'px-3 py-2 text-sm' : compact ? 'px-[1.2vmin] py-[0.35vmin] text-[1.5vmin] leading-none' : 'px-2.5 py-1 text-xs';
  const chip = (active) => `pointer-events-auto rounded-full font-bold whitespace-nowrap select-none active:brightness-75 ${size} ${active ? 'bg-primary text-white' : 'bg-slate-800/90 text-slate-300'}`;
  const tag = `self-center font-black uppercase tracking-wider text-slate-400 mr-1 ${compact ? 'text-[1.3vmin]' : 'text-[11px]'}`;
  const gap = compact ? 'gap-[0.5vmin]' : 'gap-1.5';
  const rowGap = compact ? 'gap-[1vmin]' : 'gap-1.5'; // space between the KILL and SET BY rows
  const press = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
  return (
    <div className={`flex flex-col items-center w-full ${rowGap}`}>
      <div className={`flex flex-wrap justify-center ${gap}`}>
        <span className={tag}>Kill</span>
        {KILL_TYPES.map(([v, l]) => (
          <button key={v} className={chip(killType === v)} onPointerDown={press(() => onType(v))}>{l}</button>
        ))}
      </div>
      {killType !== 'over' && (
        <div className={`flex flex-wrap justify-center ${gap}`}>
          <span className={tag}>Set by</span>
          {ordered.map((sl) => (
            <button key={sl.playerId} className={chip(assistId === sl.playerId)} onPointerDown={press(() => onAssist(sl.playerId))}>
              #{sl.jersey} {fmtPlayerName(sl.playerName, nicknames?.[sl.playerId] ?? '', nameFormat)}{sl.positionLabel === 'S' ? ' ★' : ''}
            </button>
          ))}
          <button className={chip(assistId == null)} onPointerDown={press(() => onAssist(null))}>UNASSISTED</button>
        </div>
      )}
    </div>
  );
}

const ERROR_TYPES = [['ob', 'OB'], ['net', 'NET'], ['blk', 'BLK'], ['bra', 'BRA']];
// Landing outside every court line (either side) = out of bounds.
const isOutLanding = (x, y) => x < 0 || x > 1 || y < 0 || y > 1;
// NET / BLK lines stop at the net. Just short of 0.5 so the spot never counts
// as landing in one of their zones.
const NET_STOP_X = 0.4995;

// Attack-error reason pills (one-screen attack error).
function ErrorOptions({ errType, onType, big = false, compact = false }) {
  const size = big ? 'px-5 py-3 text-base' : compact ? 'px-[1.6vmin] py-[0.45vmin] text-[1.6vmin] leading-none' : 'px-3 py-1 text-xs';
  const chip = (active) => `pointer-events-auto rounded-full font-bold whitespace-nowrap select-none active:brightness-75 ${size} ${active ? 'bg-red-600 text-white' : 'bg-slate-800/90 text-slate-300'}`;
  const press = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
  return (
    <div className={`flex flex-wrap justify-center ${compact ? 'gap-[0.8vmin]' : 'gap-2'}`}>
      <span className={`self-center font-black uppercase tracking-wider text-slate-400 mr-1 ${compact ? 'text-[1.3vmin]' : 'text-[11px]'}`}>Error</span>
      {ERROR_TYPES.map(([v, l]) => (
        <button key={v} className={chip(errType === v)} onPointerDown={press(() => onType(v))}>{l}</button>
      ))}
    </div>
  );
}

// Live pop-up after an attack: tap 1 = where the hitter hit from,
// tap 2 = where the ball landed (skipped for NET/BLK errors).
// SKIP before tap 1 saves nothing; SKIP after tap 1 keeps the hit-from spot.
export function AttackShotModal({ pending, playerLabel, priorShots = [], showHint = false, onConfirm, onDismiss }) {
  const courtRef = useRef(null);
  const [from, setFrom] = useState(null);
  const [flipped, toggleFlip] = useShotFlip();
  const color = SHOT_COLORS[pending.result] ?? SHOT_COLORS.attempt;
  const resultLabel = pending.result === 'kill' ? 'KILL' : pending.result === 'error' ? 'ERR' : 'ATT';

  // Drag support: press on the hit-from spot, slide to the landing spot, lift.
  // A press that barely moves still works as tap 1 of tap-tap.
  const dragRef = useRef(null); // { startX, startY, moved } while a finger is down after tap 1
  const [dragTo, setDragTo] = useState(null);
  const DRAG_MIN = 0.04; // fraction of court width a finger must move to count as a drag

  // One-screen kill (pending.kill set by requestKillPopup)
  const kill = pending.kill ?? null;
  const [killType, setKillType] = useState('pure');
  const [typeTouched, setTypeTouched] = useState(false);
  const [assistId, setAssistId] = useState(() => {
    if (!kill) return null;
    const s = (kill.lineup ?? []).find((sl) => sl.positionLabel === 'S' && sl.playerId && sl.playerId !== pending.player_id);
    return s?.playerId ?? null;
  });
  const pickType = (v) => { setKillType(v); setTypeTouched(true); };

  // One-screen attack error (pending.aerr set by requestAttackErrorPopup)
  const aerr = pending.aerr ?? null;
  const [errType, setErrType] = useState(null);
  const extras = kill || aerr; // pills live in the strip above the court
  // NET / BLK errors: the line is drawn to where it hit the net / block, and
  // can't go past the net.
  const stopAtNet = !!aerr && (errType === 'net' || errType === 'blk');
  const needsLanding = aerr ? true : pending.needsLanding;
  const clampPt = (p) => (stopAtNet && p.x > NET_STOP_X ? { ...p, x: NET_STOP_X } : p);

  // Every save goes through here so a kill / error also carries its pills.
  function finish(patch, errOverride) {
    if (kill) onConfirm(pending.contactId, patch, { killType, assistId: killType === 'over' ? null : assistId });
    else if (aerr) {
      let type = errOverride ?? errType;
      if (!type && patch?.court_x != null && isOutLanding(patch.court_x, patch.court_y)) type = 'ob'; // landed out → OB
      onConfirm(pending.contactId, patch, { errorType: type });
    } else onConfirm(pending.contactId, patch);
  }

  function pickErr(v) { setErrType(v); }

  function toCourt(e) {
    const rect = courtRef.current.getBoundingClientRect();
    return viewToCourt(...flipTap((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height, flipped));
  }

  function landing(raw) {
    const p = clampPt(raw);
    return { from_x: from.x, from_y: from.y, court_x: p.x, court_y: p.y, zone: landingZone(p.x, p.y) };
  }

  function handleTap(e) {
    e.preventDefault();
    const p = toCourt(e);
    if (!from) {
      if (p.x > 0.5) return; // hit-from spot must be on our side of the net
      if (!needsLanding) { finish({ from_x: p.x, from_y: p.y }); return; }
      if (kill && !typeTouched && p.x < BACK_ROW_X) setKillType('bk'); // hit from behind the 10-ft line
      setFrom(p);
      dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      return;
    }
    finish(landing(p));
  }

  function handleMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const w = courtRef.current.getBoundingClientRect().width;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_MIN * w) return;
    d.moved = true;
    setDragTo(clampPt(toCourt(e)));
  }

  function handleUp(e) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.moved) finish(landing(toCourt(e)));
    // not moved: tap-tap mode, wait for the landing tap
  }

  function handleCancel() {
    dragRef.current = null;
    setDragTo(null);
  }

  function handleSkip(e) {
    e.preventDefault();
    if (from) finish({ from_x: from.x, from_y: from.y });
    else if (extras) finish(null); // keep the pill choices, no location
    else onDismiss();
  }

  const fromView = from ? courtToView(from.x, from.y) : null;

  // Shot chart off, attack error: tap a reason to save; tap outside = unclassified.
  if (aerr && !aerr.shotOn) {
    const save = (type) => onConfirm(pending.contactId, null, { errorType: type });
    return (
      <div
        className="fixed inset-0 z-[70] bg-black/75 flex items-center justify-center p-2"
        onPointerDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); save(null); } }}
      >
        <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-3 space-y-2 max-w-[95vw]">
          <p className="text-center font-black text-sm tracking-wide">
            <span style={{ color }}>ATTACK ERROR</span>{playerLabel && <span className="text-white">{` · ${playerLabel}`}</span>}
          </p>
          <ErrorOptions errType={null} onType={save} big />
          <p className="text-center text-[11px] text-slate-500">OB = out · NET = net · BLK = blocked · BRA = back-row attack</p>
        </div>
      </div>
    );
  }

  // Shot chart turned off: small kill pop-up only. Tapping a setter (or NO
  // ASSIST, or OVER PASS) saves; tapping outside saves with what's selected.
  if (kill && !kill.shotOn) {
    const save = (aid, type = killType) => onConfirm(pending.contactId, null, { killType: type, assistId: type === 'over' ? null : aid });
    return (
      <div
        className="fixed inset-0 z-[70] bg-black/75 flex items-center justify-center p-2"
        onPointerDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); save(assistId); } }}
      >
        <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-3 space-y-2 max-w-[95vw]">
          <p className="text-center font-black text-sm tracking-wide">
            <span style={{ color }}>KILL</span>{playerLabel && <span className="text-white">{` · ${playerLabel}`}</span>}
          </p>
          <KillOptions
            kill={kill} attackerId={pending.player_id} big
            killType={killType}
            onType={(v) => { if (v === 'over') save(null, 'over'); else pickType(v); }}
            assistId={assistId}
            onAssist={(aid) => save(aid)}
          />
          <p className="text-center text-[11px] text-slate-500">Tap who set it (or UNASSISTED), or tap outside to save</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 flex flex-col items-center justify-center gap-1.5 p-1.5">
      <p className="text-white font-bold text-sm tracking-wide text-center uppercase bg-black/80 px-3 py-1 rounded-md">
        {!from ? (needsLanding ? <><u>Tap</u> or <u>drag</u> from where they hit</> : <><u>Tap</u> where they hit from</>) : stopAtNet ? (dragTo ? 'Let go where it hit the net' : <><u>Tap</u> where it hit the net</>) : dragTo ? 'Let go where the ball landed' : <><u>Tap</u> where the ball landed</>}
      </p>
      {/* Outer box: on kills it adds room on top for the name + pills, pushing
          the court down toward US / THEM. Taps are measured on the inner court. */}
      <div
        className="relative rounded overflow-hidden"
        style={{ width: 'min(98vw, 145vh)', background: '#0b1220', paddingTop: kill ? '7vmin' : aerr ? '4.5vmin' : 0 }}
      >
      <div
        ref={courtRef}
        style={{ touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={handleTap}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleCancel}
      >
        <AttackShotChart
          sideLabelGap={extras ? 1.3 : undefined}
          sideLabelSize={extras ? 0.5 : undefined}
          shots={priorShots}
          showLegend={false}
          flipped={flipped}
          overlay={<>
            {/* Result + player, centered above the net (kills show it above the court instead, with the pills) */}
            {!extras && <text
              x={VIEW_W / 2}
              y={MARGIN - 1.0}
              textAnchor="middle" fontSize={0.9} fontWeight="bold" pointerEvents="none"
            >
              <tspan fill={color}>{resultLabel}</tspan>
              {playerLabel && <tspan fill="#ffffff">{` · ${playerLabel}`}</tspan>}
            </text>}
            {/* Hint above our half of the court (first few attacks of a match only) */}
            {showHint && !from && !extras && (
              <text
                x={flipped ? VIEW_W - MARGIN - COURT_LEN / 4 : MARGIN + COURT_LEN / 4}
                y={MARGIN - 0.45}
                textAnchor="middle" fill="#f97316" fontSize={0.6} fontWeight="bold" pointerEvents="none"
              >
                Place initial contact
              </text>
            )}
          </>}
        >
          {/* Their side is grayed out until the hit-from spot is placed on ours */}
          {!from && <rect x={MARGIN + COURT_LEN / 2 + 0.05} y={MARGIN} width={COURT_LEN / 2 - 0.05} height={COURT_WID} fill="#000" opacity={0.6} pointerEvents="none" />}
          {fromView && dragTo && (() => { const t = courtToView(dragTo.x, dragTo.y); return <>
            <line x1={fromView.vx} y1={fromView.vy} x2={t.vx} y2={t.vy} stroke={color} strokeWidth={0.12} pointerEvents="none" />
            <circle cx={t.vx} cy={t.vy} r={0.3} fill="none" stroke={color} strokeWidth={0.1} pointerEvents="none" />
          </>; })()}
          {fromView && <circle cx={fromView.vx} cy={fromView.vy} r={0.35} fill={color} stroke="white" strokeWidth={0.08} />}
        </AttackShotChart>
      </div>
        {/* Kill: name + KILL / SET BY pills sit in the strip above the court,
            where the name is for other attacks. Pills don't trigger court taps. */}
        {extras && (
          <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-[1.4vmin] pt-[0.6vmin] pointer-events-none">
            <p className="text-center font-black text-[2.85vmin] tracking-wide leading-none">
              <span style={{ color }}>{resultLabel}</span>{playerLabel && <span className="text-white">{` · ${playerLabel}`}</span>}
            </p>
            {kill ? (
              <KillOptions
                kill={kill} attackerId={pending.player_id} compact
                killType={killType} onType={pickType}
                assistId={assistId} onAssist={setAssistId}
              />
            ) : (
              <ErrorOptions errType={errType} onType={pickErr} compact />
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onPointerDown={(e) => { e.preventDefault(); toggleFlip(); }}
          className={`px-5 py-2 rounded text-sm font-semibold active:brightness-75 select-none ${flipped ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          ⇄ FLIP
        </button>
        <button
          onPointerDown={handleSkip}
          className="px-6 py-2 rounded bg-slate-700 text-slate-300 text-sm font-semibold active:brightness-75 select-none"
        >
          {extras ? 'SAVE (NO SHOT)' : 'SKIP'}
        </button>
      </div>
    </div>
  );
}
