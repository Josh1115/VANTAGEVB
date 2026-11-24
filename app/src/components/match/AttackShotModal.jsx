import { useRef, useState } from 'react';
import { AttackShotChart } from '../stats/AttackShotChart';
import { viewToCourt, courtToView, landingZone, flipTap, useShotFlip, SHOT_COLORS, VIEW_W, MARGIN, COURT_LEN, COURT_WID } from '../../utils/attackShot';

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

  function toCourt(e) {
    const rect = courtRef.current.getBoundingClientRect();
    return viewToCourt(...flipTap((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height, flipped));
  }

  function landing(p) {
    return { from_x: from.x, from_y: from.y, court_x: p.x, court_y: p.y, zone: landingZone(p.x, p.y) };
  }

  function handleTap(e) {
    e.preventDefault();
    const p = toCourt(e);
    if (!from) {
      if (p.x > 0.5) return; // hit-from spot must be on our side of the net
      if (!pending.needsLanding) { onConfirm(pending.contactId, { from_x: p.x, from_y: p.y }); return; }
      setFrom(p);
      dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      return;
    }
    onConfirm(pending.contactId, landing(p));
  }

  function handleMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const w = courtRef.current.getBoundingClientRect().width;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_MIN * w) return;
    d.moved = true;
    setDragTo(toCourt(e));
  }

  function handleUp(e) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.moved) onConfirm(pending.contactId, landing(toCourt(e)));
    // not moved: tap-tap mode, wait for the landing tap
  }

  function handleCancel() {
    dragRef.current = null;
    setDragTo(null);
  }

  function handleSkip(e) {
    e.preventDefault();
    if (from) onConfirm(pending.contactId, { from_x: from.x, from_y: from.y });
    else onDismiss();
  }

  const fromView = from ? courtToView(from.x, from.y) : null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 flex flex-col items-center justify-center gap-1.5 p-1.5">
      <p className="text-white font-bold text-sm tracking-wide text-center uppercase bg-black/80 px-3 py-1 rounded-md">
        {!from ? (pending.needsLanding ? <><u>Tap</u> or <u>drag</u> from where they hit</> : <><u>Tap</u> where they hit from</>) : dragTo ? 'Let go where the ball landed' : <><u>Tap</u> where the ball landed</>}
      </p>
      <div
        ref={courtRef}
        className="rounded overflow-hidden"
        style={{ width: 'min(98vw, 145vh)', touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={handleTap}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleCancel}
      >
        <AttackShotChart
          shots={priorShots}
          showLegend={false}
          flipped={flipped}
          overlay={<>
            {/* Result + player, centered above the net */}
            <text
              x={VIEW_W / 2}
              y={MARGIN - 1.15}
              textAnchor="middle" fontSize={0.6} fontWeight="bold" pointerEvents="none"
            >
              <tspan fill={color}>{resultLabel}</tspan>
              {playerLabel && <tspan fill="#ffffff">{` · ${playerLabel}`}</tspan>}
            </text>
            {/* Hint above our half of the court (first few attacks of a match only) */}
            {showHint && !from && (
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
          SKIP
        </button>
      </div>
    </div>
  );
}
