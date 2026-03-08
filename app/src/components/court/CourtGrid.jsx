import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMatchStore } from '../../store/matchStore';
import { PlayerTile } from './PlayerTile';

// Render order maps the 2×3 visual grid to lineup indices.
// Lineup index = position - 1 (S1=0, S2=1, S3=2, S4=3, S5=4, S6=5)
//
// Visual layout (facing net from bench):
//   Front row (top):    S4 | S3 | S2   → indices 3, 2, 1
//   Back row (bottom):  S5 | S6 | S1   → indices 4, 5, 0
const GRID_ORDER = [3, 2, 1, 4, 5, 0];

// Returns { attack, serve, pass, dig } each 'hot' | 'cold' | null.
// Each category requires its own minimum contact volume before showing anything.
function computeHeat(contacts, playerId, setId) {
  let atkK = 0, atkTA = 0, atkAE = 0;
  let srvAce = 0, srvErr = 0, srvTA = 0;
  let pasSum = 0, pasN = 0;
  let digOk = 0, digErr = 0;
  let blkPos = 0, blkErr = 0;

  for (const c of contacts) {
    if (c.player_id !== playerId || c.set_id !== setId || c.opponent_contact) continue;
    const { action, result } = c;
    if (action === 'attack') {
      atkTA++;
      if (result === 'kill')  atkK++;
      if (result === 'error') atkAE++;
    } else if (action === 'serve') {
      srvTA++;
      if (result === 'ace')   srvAce++;
      if (result === 'error') srvErr++;
    } else if (action === 'pass') {
      const v = Number(result);
      if (!isNaN(v)) { pasSum += v; pasN++; }
    } else if (action === 'dig') {
      if (result === 'success') digOk++;
      if (result === 'error')   digErr++;
    } else if (action === 'block') {
      if (result === 'solo' || result === 'assist') blkPos++;
      if (result === 'error') blkErr++;
    }
  }

  // Attack: hot = kill% ≥ 40%, cold = hit% ≤ 0%, min 3 attempts
  let attack = null;
  if (atkTA >= 3) {
    if (atkK / atkTA >= 0.40)          attack = 'hot';
    else if ((atkK - atkAE) / atkTA <= 0) attack = 'cold';
  }

  // Serve: hot = ace% ≥ 15%, cold = error% ≥ 35%, min 3 serves
  let serve = null;
  if (srvTA >= 3) {
    if (srvAce / srvTA >= 0.15)        serve = 'hot';
    else if (srvErr / srvTA >= 0.35)   serve = 'cold';
  }

  // Pass: hot = APR ≥ 2.3, cold = APR ≤ 1.25, min 3 passes
  let pass = null;
  if (pasN >= 3) {
    const apr = pasSum / pasN;
    if (apr >= 2.3)        pass = 'hot';
    else if (apr <= 1.25)  pass = 'cold';
  }

  // Dig: hot = success rate ≥ 75%, cold = ≤ 40%, min 3 digs
  let dig = null;
  const digTotal = digOk + digErr;
  if (digTotal >= 3) {
    const rate = digOk / digTotal;
    if (rate >= 0.75)      dig = 'hot';
    else if (rate <= 0.40) dig = 'cold';
  }

  // Block: hot = ≥2 solos/assists, cold = ≥2 errors
  let block = null;
  if (blkPos >= 2)       block = 'hot';
  else if (blkErr >= 2)  block = 'cold';

  return { attack, serve, pass, dig, block };
}

// Returns 6 slot objects ordered for base/system positions:
//   front row (cells 0-2): OH | MB | OPP/S
//   back row  (cells 3-5): MB/L | OH (pipe) | S/OPP
// frontRow = lineup[1,2,3] (positions 2,3,4); backRow = lineup[0,4,5] (positions 1,5,6)
function getBaseDisplayOrder(lineup) {
  const frontRow = [lineup[1], lineup[2], lineup[3]];
  const backRow  = [lineup[0], lineup[4], lineup[5]];

  function sortRow(row, picks) {
    const result = [null, null, null];
    const used   = new Set();
    picks.forEach((labels, cell) => {
      const idx = row.findIndex((s, i) => !used.has(i) && labels.includes(s?.positionLabel));
      if (idx !== -1) { result[cell] = row[idx]; used.add(idx); }
    });
    const leftover = row.filter((_, i) => !used.has(i));
    let li = 0;
    for (let i = 0; i < 3; i++) {
      if (result[i] === null && li < leftover.length) result[i] = leftover[li++];
    }
    return result;
  }

  const frontSorted = sortRow(frontRow, [['OH'], ['MB'], ['OPP', 'S']]);
  const backSorted  = sortRow(backRow,  [['MB', 'L'], ['OH'], ['S', 'OPP']]);
  return [...frontSorted, ...backSorted];
}

// Returns 6 slot objects rearranged for serve receive positioning (back-row setter rotations only).
function getServeReceiveDisplayOrder(lineup) {
  const setter = lineup.find(s => s?.positionLabel === 'S');
  if (!setter) return GRID_ORDER.map(i => lineup[i]);

  const sp = setter.position;
  if (sp === 1) return [lineup[3], lineup[2], lineup[0], lineup[4], lineup[5], lineup[1]];
  if (sp === 6) return [lineup[2], lineup[1], lineup[5], lineup[3], lineup[4], lineup[0]];
  if (sp === 5) return [lineup[4], lineup[2], lineup[1], lineup[3], lineup[5], lineup[0]];
  return GRID_ORDER.map(i => lineup[i]);
}

// Clockwise stagger from server position (pos1=gridIdx5 → pos2=2 → pos3=1 → pos4=0 → pos5=3 → pos6=4)
const ROTATION_DELAYS = [165, 110, 55, 220, 275, 0];

export const CourtGrid = memo(function CourtGrid() {
  const lineup            = useMatchStore((s) => s.lineup);
  const committedContacts = useMatchStore((s) => s.committedContacts);
  const currentSetId      = useMatchStore((s) => s.currentSetId);
  const rallyPhase        = useMatchStore((s) => s.rallyPhase);
  const serveSide         = useMatchStore((s) => s.serveSide);
  const rotationNum       = useMatchStore((s) => s.rotationNum);

  const inRally        = rallyPhase === 'in_rally';
  const inServeReceive = serveSide === 'them' && !inRally;

  // Rotation flash — sweep clockwise across tiles when rotationNum increments
  const [rotating, setRotating] = useState(false);
  const prevRotNumRef = useRef(rotationNum);
  useEffect(() => {
    if (prevRotNumRef.current !== rotationNum) {
      prevRotNumRef.current = rotationNum;
      setRotating(true);
      const t = setTimeout(() => setRotating(false), 600);
      return () => clearTimeout(t);
    }
  }, [rotationNum]);

  // Sub flash + sub ghost — detect which tile changed player without a rotation
  const [subFlashIds, setSubFlashIds] = useState(new Set());
  const [subGhosts,   setSubGhosts]   = useState({}); // { [gridIdx]: outgoingLastName }
  const prevCellsRef   = useRef(null);
  const prevRotForSub  = useRef(rotationNum);

  const cells = useMemo(() =>
    inRally
      ? getBaseDisplayOrder(lineup)
      : inServeReceive
        ? getServeReceiveDisplayOrder(lineup)
        : GRID_ORDER.map((i) => lineup[i]),
    [lineup, inRally, inServeReceive]
  );

  // Sub flash + ghost — runs after cells is computed
  useEffect(() => {
    const prev = prevCellsRef.current;
    if (prev && prevRotForSub.current === rotationNum) {
      const newIds   = new Set();
      const newGhosts = {};
      cells.forEach((cell, i) => {
        if (cell?.playerId && prev[i]?.playerId && cell.playerId !== prev[i].playerId) {
          newIds.add(cell.playerId);
          newGhosts[i] = prev[i].playerName?.split(' ').pop() ?? '';
        }
      });
      if (newIds.size > 0) {
        setSubFlashIds(newIds);
        setSubGhosts(newGhosts);
        setTimeout(() => setSubFlashIds(new Set()), 1100);
        setTimeout(() => setSubGhosts({}), 750);
      }
    }
    prevCellsRef.current = cells;
    prevRotForSub.current = rotationNum;
  }, [cells, rotationNum]);

  // FLIP slide — animate tiles to new positions when display mode changes
  const playerRefs   = useRef({}); // { [playerId]: HTMLElement }
  const prevRectsRef = useRef({}); // { [playerId]: DOMRect }
  const prevModeRef  = useRef({ inRally, inServeReceive });

  useLayoutEffect(() => {
    const prevMode    = prevModeRef.current;
    const modeChanged = prevMode.inRally !== inRally || prevMode.inServeReceive !== inServeReceive;
    prevModeRef.current = { inRally, inServeReceive };

    if (modeChanged) {
      cells.forEach((slot) => {
        if (!slot?.playerId) return;
        const el       = playerRefs.current[slot.playerId];
        const prevRect = prevRectsRef.current[slot.playerId];
        if (!el || !prevRect) return;
        const newRect = el.getBoundingClientRect();
        const dx = prevRect.left - newRect.left;
        const dy = prevRect.top  - newRect.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.style.transition = 'none';
          el.style.transform  = `translate(${dx}px,${dy}px)`;
          void el.offsetWidth;
          el.style.transition = 'transform 220ms ease-out';
          el.style.transform  = '';
        }
      });
    }

    // Capture current natural rects for next transition
    cells.forEach((slot) => {
      if (!slot?.playerId) return;
      const el = playerRefs.current[slot.playerId];
      if (el) prevRectsRef.current[slot.playerId] = el.getBoundingClientRect();
    });
  }, [cells]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute all 6 heat objects in one pass — avoids 6 separate O(n) contact scans per render
  const heatMap = useMemo(() =>
    Object.fromEntries(
      cells
        .filter((slot) => slot?.playerId)
        .map((slot) => [slot.playerId, computeHeat(committedContacts, slot.playerId, currentSetId)])
    ),
    [cells, committedContacts, currentSetId]
  );

  return (
    // gap-px with bg-slate-700 creates hairline dividers between tiles
    <div className="grid grid-cols-3 grid-rows-2 flex-1 min-h-0 w-full gap-px bg-slate-700">
      {cells.map((slot, gridIdx) => {
        const position   = slot?.position ?? (inRally ? gridIdx + 1 : GRID_ORDER[gridIdx] + 1);
        const isServer   = !inRally && !inServeReceive && slot?.position === 1;
        const heat       = slot?.playerId
          ? (heatMap[slot.playerId] ?? { attack: null, serve: null, pass: null, dig: null })
          : { attack: null, serve: null, pass: null, dig: null };
        const isSubFlash = subFlashIds.has(slot?.playerId);
        const cellClass  = `relative${rotating ? ' tile-rotating' : isSubFlash ? ' tile-sub-flash' : ''}`;
        const cellStyle  = rotating ? { animationDelay: `${ROTATION_DELAYS[gridIdx]}ms` } : undefined;
        return (
          <div
            key={slot?.position ?? gridIdx}
            className={cellClass}
            style={cellStyle}
            ref={(el) => { if (el && slot?.playerId) playerRefs.current[slot.playerId] = el; }}
          >
            <PlayerTile
              slot={slot}
              position={position}
              isServer={isServer}
              heat={heat}
              isSubIn={subFlashIds.has(slot?.playerId)}
            />
            {subGhosts[gridIdx] && (
              <div className="absolute top-0 inset-x-0 h-[38%] pointer-events-none flex items-center justify-center sub-ghost-exit">
                <span className="font-bold text-white/55 uppercase tracking-wider" style={{ fontSize: '3.15vmin', letterSpacing: '0.18em' }}>
                  {subGhosts[gridIdx]}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
