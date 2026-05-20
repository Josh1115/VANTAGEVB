import { useEffect, useRef, useState } from 'react';

const FILL = 'white';
const S = { stroke: 'white', strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
const W = 2.5;
const w = 2.0;

function Idle() {
  return (
    <g>
      <circle cx="0" cy="-24" r="3.5" fill={FILL} />
      <path d="M-3.5,-20.5 L3.5,-20.5 L2.5,-12 L-2.5,-12 Z" fill={FILL} />
      <line x1="-3.5" y1="-20.5" x2="-6.5" y2="-15" {...S} strokeWidth={W} />
      <line x1="-6.5" y1="-15" x2="-5.5" y2="-10.5" {...S} strokeWidth={w} />
      <line x1="3.5" y1="-20.5" x2="6.5" y2="-15" {...S} strokeWidth={W} />
      <line x1="6.5" y1="-15" x2="5.5" y2="-10.5" {...S} strokeWidth={w} />
      <line x1="-2.5" y1="-12" x2="-3.5" y2="-5.5" {...S} strokeWidth={W} />
      <line x1="-3.5" y1="-5.5" x2="-2.5" y2="0" {...S} strokeWidth={w} />
      <line x1="2.5" y1="-12" x2="3.5" y2="-5.5" {...S} strokeWidth={W} />
      <line x1="3.5" y1="-5.5" x2="2.5" y2="0" {...S} strokeWidth={w} />
    </g>
  );
}

function Attack() {
  return (
    <g transform="translate(0,-5)">
      <circle cx="0" cy="-24" r="3.5" fill={FILL} />
      <path d="M-3.5,-20.5 L3.5,-20.5 L2.5,-12 L-2.5,-12 Z" fill={FILL} />
      <line x1="3.5" y1="-20.5" x2="8" y2="-28" {...S} strokeWidth={W} />
      <line x1="8" y1="-28" x2="10" y2="-33" {...S} strokeWidth={w} />
      <line x1="-3.5" y1="-20.5" x2="-7.5" y2="-16.5" {...S} strokeWidth={W} />
      <line x1="-7.5" y1="-16.5" x2="-7" y2="-12" {...S} strokeWidth={w} />
      <line x1="-2.5" y1="-12" x2="-5.5" y2="-5.5" {...S} strokeWidth={W} />
      <line x1="-5.5" y1="-5.5" x2="-4" y2="0" {...S} strokeWidth={w} />
      <line x1="2.5" y1="-12" x2="4.5" y2="-5.5" {...S} strokeWidth={W} />
      <line x1="4.5" y1="-5.5" x2="3" y2="0" {...S} strokeWidth={w} />
    </g>
  );
}

function Block() {
  return (
    <g>
      <circle cx="0" cy="-24" r="3.5" fill={FILL} />
      <path d="M-3.5,-20.5 L3.5,-20.5 L2.5,-12 L-2.5,-12 Z" fill={FILL} />
      <line x1="-3.5" y1="-20.5" x2="-6" y2="-27.5" {...S} strokeWidth={W} />
      <line x1="-6" y1="-27.5" x2="-5" y2="-33.5" {...S} strokeWidth={w} />
      <line x1="3.5" y1="-20.5" x2="6" y2="-27.5" {...S} strokeWidth={W} />
      <line x1="6" y1="-27.5" x2="5" y2="-33.5" {...S} strokeWidth={w} />
      <line x1="-2.5" y1="-12" x2="-3" y2="-5.5" {...S} strokeWidth={W} />
      <line x1="-3" y1="-5.5" x2="-2" y2="0" {...S} strokeWidth={w} />
      <line x1="2.5" y1="-12" x2="3" y2="-5.5" {...S} strokeWidth={W} />
      <line x1="3" y1="-5.5" x2="2" y2="0" {...S} strokeWidth={w} />
    </g>
  );
}

function SetPose() {
  return (
    <g>
      <circle cx="0" cy="-24" r="3.5" fill={FILL} />
      <path d="M-3.5,-20.5 L3.5,-20.5 L2.5,-12 L-2.5,-12 Z" fill={FILL} />
      <line x1="-3.5" y1="-20.5" x2="-5" y2="-26.5" {...S} strokeWidth={W} />
      <line x1="-5" y1="-26.5" x2="-2.5" y2="-31" {...S} strokeWidth={w} />
      <line x1="3.5" y1="-20.5" x2="5" y2="-26.5" {...S} strokeWidth={W} />
      <line x1="5" y1="-26.5" x2="2.5" y2="-31" {...S} strokeWidth={w} />
      <line x1="-2.5" y1="-12" x2="-3.5" y2="-5.5" {...S} strokeWidth={W} />
      <line x1="-3.5" y1="-5.5" x2="-2.5" y2="0" {...S} strokeWidth={w} />
      <line x1="2.5" y1="-12" x2="3.5" y2="-5.5" {...S} strokeWidth={W} />
      <line x1="3.5" y1="-5.5" x2="2.5" y2="0" {...S} strokeWidth={w} />
    </g>
  );
}

function Dig() {
  return (
    <g>
      <circle cx="3.5" cy="-13.5" r="3.5" fill={FILL} />
      <path d="M0,-10.5 L6,-10.5 L4.5,-5 L-1.5,-5 Z" fill={FILL} />
      <line x1="0" y1="-10.5" x2="-3.5" y2="-6.5" {...S} strokeWidth={W} />
      <line x1="-3.5" y1="-6.5" x2="-5.5" y2="-2.5" {...S} strokeWidth={w} />
      <line x1="6" y1="-10.5" x2="9" y2="-6.5" {...S} strokeWidth={W} />
      <line x1="9" y1="-6.5" x2="11" y2="-2.5" {...S} strokeWidth={w} />
      <line x1="-1.5" y1="-5" x2="-5.5" y2="0" {...S} strokeWidth={W} />
      <line x1="4.5" y1="-5" x2="7" y2="0" {...S} strokeWidth={W} />
    </g>
  );
}

const POSES = [Idle, Attack, Block, SetPose, Dig];
const NUM_PLAYERS = 4;
const FLOOR_Y = 57;

const BASE_POSITIONS = [
  { x: 97,  flipX: false },
  { x: 190, flipX: false },
  { x: 410, flipX: true  },
  { x: 503, flipX: true  },
];

const CYCLE_MS = 3500; // shared tick interval

export function VBPlayerScene() {
  const [players, setPlayers] = useState(() =>
    BASE_POSITIONS.map((p) => ({
      ...p,
      x: p.x + (Math.random() * 18 - 9),
      poseIdx: Math.floor(Math.random() * POSES.length),
      animKey: 0,
    }))
  );

  // nextTick[i] = how many ticks until player i changes pose
  const nextTickRef = useRef(BASE_POSITIONS.map(() => 1 + Math.floor(Math.random() * 2)));
  const tickCountRef = useRef(0);
  const hiddenRef = useRef(false);

  useEffect(() => {
    function onVisibility() {
      hiddenRef.current = document.hidden;
    }
    document.addEventListener('visibilitychange', onVisibility);

    const id = setInterval(() => {
      if (hiddenRef.current) return;
      tickCountRef.current += 1;
      const tick = tickCountRef.current;

      setPlayers((prev) => {
        let changed = false;
        const next = prev.map((p, i) => {
          if (tick < nextTickRef.current[i]) return p;
          // schedule next change 1–3 ticks from now
          nextTickRef.current[i] = tick + 1 + Math.floor(Math.random() * 3);
          let newPose;
          do { newPose = Math.floor(Math.random() * POSES.length); }
          while (newPose === p.poseIdx);
          changed = true;
          return { ...p, poseIdx: newPose, animKey: p.animKey + 1 };
        });
        return changed ? next : prev;
      });
    }, CYCLE_MS);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
      aria-hidden="true"
      viewBox="0 0 600 66"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: 0.18 }}
    >
      {players.map((p, i) => {
        const PoseComp = POSES[p.poseIdx];
        return (
          <g key={i} transform={`translate(${p.x},${FLOOR_Y})${p.flipX ? ' scale(-1,1)' : ''}`}>
            <g key={p.animKey} className="vb-pose-in">
              <PoseComp />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
