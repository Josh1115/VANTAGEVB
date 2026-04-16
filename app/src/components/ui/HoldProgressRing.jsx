import { useEffect, useRef } from 'react';

const SIZE   = 28;
const RADIUS = 11;
const CIRC   = 2 * Math.PI * RADIUS; // ≈ 69.1

/**
 * SVG circular progress ring for hold-to-confirm buttons.
 *
 * Renders a clockwise arc that fills from 0 → full over `durationMs`.
 * Renders nothing when `active` is false — zero cost when idle.
 *
 * Usage:
 *   Place inside a `relative` button. The ring centers itself absolutely.
 *
 *   <button className="relative ...">
 *     <HoldProgressRing active={held} durationMs={450} />
 *     Label
 *   </button>
 */
export function HoldProgressRing({ active, durationMs = 450 }) {
  const circleRef = useRef(null);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    if (active) {
      // Reset instantly, then animate to full over durationMs
      el.style.transition = 'none';
      el.style.strokeDashoffset = String(CIRC);
      void el.getBoundingClientRect(); // force reflow before transition
      el.style.transition = `stroke-dashoffset ${durationMs}ms linear`;
      el.style.strokeDashoffset = '0';
    } else {
      el.style.transition = 'none';
      el.style.strokeDashoffset = String(CIRC);
    }
  }, [active, durationMs]);

  if (!active) return null;

  return (
    <svg
      aria-hidden="true"
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
    >
      {/* Track */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-slate-600"
      />
      {/* Progress arc — starts at 12 o'clock, fills clockwise */}
      <circle
        ref={circleRef}
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={CIRC}
        className="text-orange-400"
        style={{
          transform:       'rotate(-90deg)',
          transformOrigin: `${SIZE / 2}px ${SIZE / 2}px`,
        }}
      />
    </svg>
  );
}
