import { useRef, useEffect, useState, useCallback } from 'react';

const COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#000000', label: 'Black' },
  { value: '#ef4444', label: 'Red'   },
  { value: '#3b82f6', label: 'Blue'  },
  { value: '#facc15', label: 'Yellow'},
];

export function CourtWhiteboard({ onClose, secondsLeft = 0 }) {
  const canvasRef  = useRef(null);
  const drawing    = useRef(false);
  const [color, setColor] = useState('#ffffff');
  const colorRef   = useRef('#ffffff');

  useEffect(() => { colorRef.current = color; }, [color]);

  // Size canvas to match its CSS display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width  = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const stopDrawing = useCallback(() => { drawing.current = false; }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col select-none">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 border-b border-slate-700 shrink-0">
        <button
          onPointerDown={(e) => { e.preventDefault(); onClose(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold"
        >
          ✕ Close
        </button>

        <span className={`text-sm font-black tabular-nums tracking-wide ${
          secondsLeft <= 15 ? 'text-red-400' : secondsLeft <= 30 ? 'text-yellow-400' : 'text-emerald-400'
        }`}>
          {Math.max(secondsLeft, 0)}s
        </span>

        <div className="flex items-center gap-2 ml-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onPointerDown={(e) => { e.preventDefault(); setColor(c.value); }}
              style={{ backgroundColor: c.value }}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                color === c.value
                  ? 'border-primary scale-125'
                  : 'border-slate-600 hover:scale-110'
              }`}
              title={c.label}
            />
          ))}
        </div>

        <button
          onPointerDown={(e) => { e.preventDefault(); clearCanvas(); }}
          className="ml-auto px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-red-900/60 text-slate-300 hover:text-red-300 text-xs font-bold"
        >
          CLEAR
        </button>
      </div>

      {/* Court + canvas */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center bg-black">

        {/* SVG full court */}
        <svg
          viewBox="0 0 200 100"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        >
          {/* Background */}
          <rect width={200} height={100} fill="#d4b896" />

          {/* Outer boundary */}
          <rect x={5} y={5} width={190} height={90} fill="none" stroke="#3b2a1a" strokeWidth={0.8} />

          {/* Net (center) */}
          <line x1={100} y1={5} x2={100} y2={95} stroke="#3b2a1a" strokeWidth={1.5} strokeDasharray="3 1.5" />

          {/* Attack lines (10-foot line) — 3m from net each side */}
          {/* Each half is 95px wide (5→100, 100→195). 3/9 of 95 ≈ 31.7 */}
          <line x1={68.3} y1={5} x2={68.3} y2={95} stroke="#3b2a1a" strokeWidth={0.5} strokeOpacity={0.7} />
          <line x1={131.7} y1={5} x2={131.7} y2={95} stroke="#3b2a1a" strokeWidth={0.5} strokeOpacity={0.7} />

          {/* Labels */}
          <text x={52.5} y={2.5} textAnchor="middle" fill="rgba(59,42,26,0.5)" fontSize={3.5}>US</text>
          <text x={147.5} y={2.5} textAnchor="middle" fill="rgba(59,42,26,0.5)" fontSize={3.5}>THEM</text>
          <text x={100} y={99} textAnchor="middle" fill="rgba(59,42,26,0.6)" fontSize={3}>NET</text>
        </svg>

        {/* Drawing canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>
    </div>
  );
}
