import { useLayoutEffect, useRef, useState, useCallback } from 'react';

const LETTERS = 'VANTAGE'.split('');
const FONT_PX = 66;
const BASELINE = FONT_PX + 4; // SVG y coordinate of text baseline

// Animation timing (ms)
const PER_LETTER = 1742;  // total trace duration per letter
const STEP       = 800;   // ms between each letter's start — overlap eliminates dead time between letters
const UL_DUR    = 360;    // draw underline
const HOLD      = 650;    // hold complete state
const FADE      = 380;    // fade out
const TRACE_END = (LETTERS.length - 1) * STEP + PER_LETTER; // when last letter finishes
const CYCLE = TRACE_END + UL_DUR + HOLD + FADE + 240;

const CYCLE_S = (CYCLE / 1000).toFixed(4);

// Safe upper-bound for any Orbitron Bold uppercase glyph outline perimeter at 81px.
// Must be >= the longest glyph path so the full draw spans the animation duration.
// N, G, E have the longest perimeters at this size (~1200–1350px scaled from reference).
const LETTER_DASH = 1400;

const FONT_OBJ = {
  fontFamily: "'Orbitron', sans-serif",
  fontWeight: '900',
  fontSize: `${FONT_PX}px`,
  letterSpacing: '0.132em',
};

// totalWidth is the measured SVG text width — used for the underline dash.
function buildCSS(totalWidth) {
  const p   = (ms) => `${((ms / CYCLE) * 100).toFixed(4)}%`;
  const fsMs = TRACE_END + UL_DUR + HOLD;
  const feMs = fsMs + FADE;
  const ulS  = TRACE_END;
  const ulE  = ulS + UL_DUR;
  const ld   = LETTER_DASH;
  const tw   = totalWidth.toFixed(2);

  const lKFs = LETTERS.map((_, i) => {
    const s = i * STEP, e = s + PER_LETTER;
    return (
      `@keyframes vt-l${i}{` +
      `0%,${p(s)}{stroke-dashoffset:${ld};opacity:0}` +
      `${p(s + 1)}{stroke-dashoffset:${ld};opacity:1}` +
      `${p(e)}{stroke-dashoffset:0;opacity:1}` +
      `${p(fsMs)}{stroke-dashoffset:0;opacity:1}` +
      `${p(feMs)}{stroke-dashoffset:0;opacity:0}` +
      `100%{stroke-dashoffset:${ld};opacity:0}}`
    );
  });

  const ulKF =
    `@keyframes vt-ul{` +
    `0%,${p(ulS)}{stroke-dashoffset:${tw};opacity:0}` +
    `${p(ulS + 1)}{stroke-dashoffset:${tw};opacity:1}` +
    `${p(ulE)}{stroke-dashoffset:0;opacity:1}` +
    `${p(fsMs)}{stroke-dashoffset:0;opacity:1}` +
    `${p(feMs)}{stroke-dashoffset:0;opacity:0}` +
    `100%{stroke-dashoffset:${tw};opacity:0}}`;

  return [...lKFs, ulKF].join('');
}

export function VantageLogo({ animated = true, onClick, onPointerDown, onPointerUp, onPointerLeave, onMeasure, svgStyle }) {
  const measureRef = useRef(null);
  const [m, setM] = useState(null); // { chars: [{x}], bbox }

  const doMeasure = useCallback(() => {
    const el = measureRef.current;
    if (!el) return;
    try {
      const chars = LETTERS.map((_, i) => ({ x: el.getStartPositionOfChar(i).x }));
      const bbox  = el.getBBox();
      if (bbox.width > 10) {
        setM({ chars, bbox });
        onMeasure?.(bbox.width + 4); // +4 matches vbW calculation
      }
    } catch {
      // SVG measurement APIs unavailable (e.g. hidden/unmounted)
    }
  }, [onMeasure]);

  useLayoutEffect(() => {
    doMeasure();
    document.fonts?.ready?.then(doMeasure);
  }, [doMeasure]);

  const handlers = { onClick, onPointerDown, onPointerUp, onPointerLeave };

  const bbox  = m?.bbox;
  const vbY   = bbox ? Math.floor(bbox.y) - 2     : -2;
  const vbH   = bbox ? Math.ceil(bbox.height) + 14 : FONT_PX + 14;
  const vbW   = bbox ? Math.ceil(bbox.width) + 4   : Math.round(FONT_PX * 5.5);
  const ulY   = bbox ? bbox.y + bbox.height + 5    : BASELINE + 5;
  const ulX2  = bbox ? bbox.width + 2              : vbW - 2;
  const totalW = bbox?.width ?? 0;

  // CSS depends on measured underline width — computed after measurement.
  const css = (animated && m) ? buildCSS(totalW) : '';

  return (
    <svg
      className={`${animated ? 'scoreboard-flicker' : ''} cursor-pointer select-none`}
      style={{ overflow: 'visible', ...svgStyle }}
      width={vbW}
      height={vbH}
      viewBox={`0 ${vbY} ${vbW} ${vbH}`}
      aria-label="VANTAGE"
      role="img"
      {...handlers}
    >
      {css && <style>{css}</style>}

      {/* Hidden measurement text */}
      <text
        ref={measureRef}
        x={2}
        y={BASELINE}
        fill="none"
        style={{ ...FONT_OBJ, visibility: 'hidden' }}
      >
        VANTAGE
      </text>

      {/* Static orange fill — always visible */}
      <text x={2} y={BASELINE} fill="#e8530b" style={FONT_OBJ}>
        VANTAGE
      </text>

      {/* Animated white stroke — one element per letter */}
      {m && LETTERS.map((letter, i) => (
        <text
          key={i}
          x={m.chars[i].x + 2}
          y={BASELINE}
          fill="none"
          stroke="white"
          strokeWidth="2.25"
          style={{
            ...FONT_OBJ,
            letterSpacing: '0',
            strokeDasharray: LETTER_DASH,
            strokeDashoffset: LETTER_DASH,
            opacity: 0,
            animation: `vt-l${i} ${CYCLE_S}s linear infinite`,
          }}
        >
          {letter}
        </text>
      ))}

      {/* Underline — draws left-to-right using exact measured width */}
      {m && (
        <line
          x1={2}    y1={ulY}
          x2={ulX2} y2={ulY}
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            strokeDasharray: totalW.toFixed(2),
            strokeDashoffset: totalW.toFixed(2),
            opacity: 0,
            animation: `vt-ul ${CYCLE_S}s linear infinite`,
          }}
        />
      )}
    </svg>
  );
}
