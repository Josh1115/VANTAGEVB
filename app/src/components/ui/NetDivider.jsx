import { memo } from 'react';

export const NetDivider = memo(function NetDivider({ className = '' }) {
  return (
    <div className={`relative h-8 my-3 ${className}`} aria-hidden="true">
      <svg
        viewBox="0 -9 400 29"
        className="w-full h-full net-wave"
        preserveAspectRatio="none"
        style={{ opacity: 0.18 }}
      >
        {/* Vertical mesh cables */}
        {Array.from({ length: 22 }, (_, i) => (
          <line key={`v${i}`} x1={i * 19} y1="3" x2={i * 19} y2="17" stroke="white" strokeWidth="0.55" />
        ))}
        {/* Horizontal mesh cables */}
        {Array.from({ length: 4 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={5 + i * 3.5} x2="400" y2={5 + i * 3.5} stroke="white" strokeWidth="0.45" />
        ))}
        {/* Top tape */}
        <rect x="0" y="1" width="400" height="3" fill="white" opacity="0.65" />
        {/* Bottom tape */}
        <rect x="0" y="16" width="400" height="2" fill="white" opacity="0.4" />
        {/* Left antenna — alternating red/white stripes above the net */}
        <rect x="18" y="-8" width="2.5" height="11" fill="white" opacity="0.85" />
        <rect x="18" y="-8"   width="2.5" height="2.5" fill="#ef4444" opacity="0.95" />
        <rect x="18" y="-3.5" width="2.5" height="2.5" fill="#ef4444" opacity="0.95" />
        {/* Right antenna — alternating red/white stripes above the net */}
        <rect x="379.5" y="-8" width="2.5" height="11" fill="white" opacity="0.85" />
        <rect x="379.5" y="-8"   width="2.5" height="2.5" fill="#ef4444" opacity="0.95" />
        <rect x="379.5" y="-3.5" width="2.5" height="2.5" fill="#ef4444" opacity="0.95" />
      </svg>
    </div>
  );
});
