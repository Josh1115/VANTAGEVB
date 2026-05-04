import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { exportBackup, importBackup, restoreAutoBackup } from '../stats/backup';
import { MergeBackupModal } from '../components/settings/MergeBackupModal';
import { TERMS_STORAGE_KEY } from '../components/auth/TermsGate';
import { db } from '../db/schema';
import { useUiStore } from '../store/uiStore';
import { FORMAT, ACCENT_COLORS } from '../constants';
import {
  getStorageItem, setStorageItem,
  getBoolStorage, setBoolStorage,
  getIntStorage, STORAGE_KEYS,
} from '../utils/storage';

// ─── Help illustrations (inline SVG mockups) ─────────────────────────────────

const HELP_ILLUSTRATIONS = {
  'live-layout': function LiveLayout() {
    return (
      <svg viewBox="0 0 400 190" className="w-full" aria-hidden="true">
        <rect width="400" height="190" fill="#0f172a"/>
        {/* Score header */}
        <rect width="400" height="36" fill="#1e293b"/>
        <circle cx="11" cy="18" r="5" fill="none" stroke="#64748b" strokeWidth="1.5"/>
        <circle cx="24" cy="18" r="5" fill="none" stroke="#64748b" strokeWidth="1.5"/>
        <text x="42" y="24" fill="white" fontSize="16" fontWeight="900" fontFamily="monospace">12</text>
        <text x="200" y="13" fill="#94a3b8" fontSize="8" textAnchor="middle" fontWeight="700">SET 2</text>
        <circle cx="200" cy="27" r="5" fill="#f97316"/>
        <text x="345" y="24" fill="white" fontSize="16" fontWeight="900" fontFamily="monospace">10</text>
        <circle cx="374" cy="18" r="5" fill="none" stroke="#64748b" strokeWidth="1.5"/>
        <circle cx="387" cy="18" r="5" fill="none" stroke="#64748b" strokeWidth="1.5"/>
        {/* Vertical dividers between tiles */}
        <rect x="133" y="38" width="1" height="116" fill="#334155"/>
        <rect x="267" y="38" width="1" height="116" fill="#334155"/>
        {/* Horizontal divider */}
        <rect x="0" y="96" width="400" height="1" fill="#334155"/>
        {/* Tile row 1 — S4 S3 S2 */}
        <rect x="0" y="38" width="133" height="58" fill="#1e293b"/>
        <text x="66" y="61" fill="#64748b" fontSize="8" textAnchor="middle">S4</text>
        <text x="66" y="75" fill="white" fontSize="9" textAnchor="middle" fontWeight="bold">#7 Emma</text>
        <rect x="134" y="38" width="133" height="58" fill="#1e293b"/>
        <text x="200" y="61" fill="#64748b" fontSize="8" textAnchor="middle">S3</text>
        <text x="200" y="75" fill="white" fontSize="9" textAnchor="middle" fontWeight="bold">#3 Sara</text>
        <rect x="268" y="38" width="132" height="58" fill="#1e293b"/>
        <text x="333" y="61" fill="#64748b" fontSize="8" textAnchor="middle">S2</text>
        <text x="333" y="75" fill="white" fontSize="9" textAnchor="middle" fontWeight="bold">#11 Ava</text>
        {/* Tile row 2 — S5 S6 S1★ */}
        <rect x="0" y="97" width="133" height="57" fill="#1e293b"/>
        <text x="66" y="120" fill="#64748b" fontSize="8" textAnchor="middle">S5</text>
        <text x="66" y="134" fill="white" fontSize="9" textAnchor="middle" fontWeight="bold">#15 Jess</text>
        <rect x="134" y="97" width="133" height="57" fill="#1e293b"/>
        <text x="200" y="120" fill="#64748b" fontSize="8" textAnchor="middle">S6</text>
        <text x="200" y="134" fill="white" fontSize="9" textAnchor="middle" fontWeight="bold">#4 Kate</text>
        {/* S1 server — highlighted */}
        <rect x="268" y="97" width="132" height="57" fill="#f97316" fillOpacity="0.08"/>
        <rect x="268" y="97" width="132" height="57" fill="none" stroke="#f97316" strokeWidth="1.5"/>
        <text x="333" y="115" fill="#f97316" fontSize="8" textAnchor="middle" fontWeight="bold">S1 ★ SERVER</text>
        <text x="333" y="129" fill="white" fontSize="9" textAnchor="middle" fontWeight="bold">#1 Lexi</text>
        <text x="333" y="144" fill="#f97316" fontSize="7" textAnchor="middle">tap to record stats</text>
        {/* Action bar */}
        <rect x="0" y="156" width="400" height="34" fill="#1e293b"/>
        <text x="40"  y="177" fill="#94a3b8" fontSize="8" textAnchor="middle">↺ ROT</text>
        <text x="112" y="177" fill="#94a3b8" fontSize="8" textAnchor="middle">↻ ROT</text>
        <text x="193" y="177" fill="#94a3b8" fontSize="8" textAnchor="middle">UNDO</text>
        <text x="278" y="177" fill="#94a3b8" fontSize="8" textAnchor="middle">SUB (6/18)</text>
        <text x="358" y="177" fill="#94a3b8" fontSize="8" textAnchor="middle">≡</text>
      </svg>
    );
  },

  'pass-ratings': function PassRatings() {
    const btns = [
      { num: '0', label: 'Aced',    sub: 'no pass',         stroke: '#ef4444', fill: 'rgba(239,68,68,0.12)',  text: '#ef4444' },
      { num: '1', label: 'Poor',    sub: 'setter limited',  stroke: '#f97316', fill: 'rgba(249,115,22,0.12)', text: '#f97316' },
      { num: '2', label: 'Good',    sub: '2–3 options',     stroke: '#eab308', fill: 'rgba(234,179,8,0.12)',  text: '#eab308' },
      { num: '3', label: 'Perfect', sub: 'all options open',stroke: '#22c55e', fill: 'rgba(34,197,94,0.12)',  text: '#22c55e' },
    ];
    return (
      <svg viewBox="0 0 320 104" className="w-full" aria-hidden="true">
        <rect width="320" height="104" fill="#0f172a" rx="8"/>
        <text x="160" y="16" fill="#94a3b8" fontSize="8" textAnchor="middle" fontWeight="700" letterSpacing="2">SERVE RECEIVE — PASS RATING</text>
        {btns.map(({ num, label, sub, stroke, fill, text }, i) => (
          <g key={num} transform={`translate(${8 + i * 78},0)`}>
            <rect x="0" y="22" width="70" height="46" rx="8" fill={fill} stroke={stroke} strokeWidth="1.5"/>
            <text x="35" y="52" fill={text} fontSize="22" fontWeight="900" textAnchor="middle">{num}</text>
            <text x="35" y="78" fill={text} fontSize="8" textAnchor="middle" fontWeight="bold">{label}</text>
            <text x="35" y="92" fill="#64748b" fontSize="7" textAnchor="middle">{sub}</text>
          </g>
        ))}
      </svg>
    );
  },

  'sub-panel': function SubPanel() {
    const courtPlayers = [
      { x: 10,  y: 52, name: '#7 Emma',  out: true  },
      { x: 114, y: 52, name: '#3 Sara',  out: false },
      { x: 218, y: 52, name: '#11 Ava',  out: false },
      { x: 10,  y: 90, name: '#15 Jess', out: false },
      { x: 114, y: 90, name: '#4 Kate',  out: false },
      { x: 218, y: 90, name: '#1 Lexi',  out: false },
    ];
    const benchPlayers = [
      { x: 10,  name: '#22 Mia',   in: true  },
      { x: 114, name: '#9 Grace',  in: false },
      { x: 218, name: '#5 Lily',   in: false },
    ];
    return (
      <svg viewBox="0 0 320 190" className="w-full" aria-hidden="true">
        <rect width="320" height="190" fill="#0f172a" rx="8"/>
        <rect width="320" height="32" fill="#1e293b" rx="8"/>
        <text x="160" y="20" fill="white" fontSize="11" textAnchor="middle" fontWeight="bold">Substitutions</text>
        <text x="298" y="20" fill="#94a3b8" fontSize="9" textAnchor="middle">6 / 18</text>
        <text x="10" y="46" fill="#94a3b8" fontSize="8" fontWeight="700" letterSpacing="1">ON COURT</text>
        {courtPlayers.map(({ x, y, name, out }) => (
          <g key={name}>
            <rect x={x} y={y} width="96" height="26" rx="6"
              fill={out ? 'rgba(99,102,241,0.2)' : '#1e293b'}
              stroke={out ? '#6366f1' : '#334155'}
              strokeWidth={out ? 1.5 : 1}/>
            <text x={x + 48} y={y + 17} fill={out ? '#a5b4fc' : 'white'} fontSize="8" textAnchor="middle" fontWeight={out ? 'bold' : 'normal'}>
              {name}{out ? ' ← OUT' : ''}
            </text>
          </g>
        ))}
        <line x1="10" y1="126" x2="310" y2="126" stroke="#334155" strokeWidth="1" strokeDasharray="5 4"/>
        <text x="10" y="142" fill="#94a3b8" fontSize="8" fontWeight="700" letterSpacing="1">BENCH</text>
        {benchPlayers.map(({ x, name, in: isIn }) => (
          <g key={name}>
            <rect x={x} y="148" width="96" height="26" rx="6"
              fill={isIn ? 'rgba(34,197,94,0.15)' : '#1e293b'}
              stroke={isIn ? '#22c55e' : '#334155'}
              strokeWidth={isIn ? 1.5 : 1}/>
            <text x={x + 48} y="165" fill={isIn ? '#86efac' : 'white'} fontSize="8" textAnchor="middle" fontWeight={isIn ? 'bold' : 'normal'}>
              {name}{isIn ? ' ← IN' : ''}
            </text>
          </g>
        ))}
        <text x="160" y="185" fill="#64748b" fontSize="7" textAnchor="middle">Select OUT then IN, then tap Confirm Sub</text>
      </svg>
    );
  },

  'action-bar': function ActionBar() {
    const btns = [
      { label: '↺ ROT',    sub: 'rotate back',   hi: false },
      { label: '↻ ROT',    sub: 'rotate forward', hi: false },
      { label: 'UNDO',     sub: 'remove last tap',hi: true  },
      { label: 'SUB',      sub: 'substitutions',  hi: false },
      { label: '≡',        sub: 'menu',           hi: false },
    ];
    return (
      <svg viewBox="0 0 320 96" className="w-full" aria-hidden="true">
        <rect width="320" height="96" fill="#0f172a" rx="8"/>
        <text x="160" y="16" fill="#94a3b8" fontSize="8" textAnchor="middle" fontWeight="700" letterSpacing="2">ACTION BAR</text>
        {btns.map(({ label, sub, hi }, i) => (
          <g key={label} transform={`translate(${6 + i * 62},0)`}>
            <rect x="0" y="22" width="56" height="40" rx="8"
              fill={hi ? 'rgba(249,115,22,0.18)' : '#1e293b'}
              stroke={hi ? '#f97316' : '#334155'}
              strokeWidth={hi ? 1.5 : 1}/>
            <text x="28" y="46" fill={hi ? '#f97316' : 'white'} fontSize={label === '≡' ? '14' : '9'}
              textAnchor="middle" fontWeight="bold">{label}</text>
            <text x="28" y="76" fill="#64748b" fontSize="7" textAnchor="middle">{sub}</text>
          </g>
        ))}
      </svg>
    );
  },

  'reports-filters': function ReportsFilters() {
    const row1 = [
      { label: 'All',    active: true  },
      { label: 'Wins',   active: false },
      { label: 'Losses', active: false },
      { label: 'Last 5', active: false },
    ];
    const row2 = [
      { label: 'All',     active: false },
      { label: 'Home',    active: false },
      { label: 'Away',    active: false },
      { label: 'Neutral', active: false },
    ];
    const chipW = (label) => label.length * 6.5 + 18;
    let x1 = 10;
    let x2 = 10;
    return (
      <svg viewBox="0 0 320 112" className="w-full" aria-hidden="true">
        <rect width="320" height="112" fill="#0f172a" rx="8"/>
        <text x="10" y="16" fill="#94a3b8" fontSize="8" fontWeight="700" letterSpacing="1">RESULT</text>
        {row1.map(({ label, active }) => {
          const w = chipW(label);
          const cx = x1;
          x1 += w + 6;
          return (
            <g key={label}>
              <rect x={cx} y="22" width={w} height="20" rx="10"
                fill={active ? 'rgba(249,115,22,0.22)' : '#1e293b'}
                stroke={active ? '#f97316' : '#334155'}
                strokeWidth={active ? 1.5 : 1}/>
              <text x={cx + w/2} y="36" fill={active ? '#f97316' : '#94a3b8'}
                fontSize="8" textAnchor="middle" fontWeight={active ? 'bold' : 'normal'}>{label}</text>
            </g>
          );
        })}
        <text x="10" y="58" fill="#94a3b8" fontSize="8" fontWeight="700" letterSpacing="1">LOCATION</text>
        {row2.map(({ label, active }) => {
          const w = chipW(label);
          const cx = x2;
          x2 += w + 6;
          return (
            <g key={label}>
              <rect x={cx} y="64" width={w} height="20" rx="10"
                fill={active ? 'rgba(249,115,22,0.22)' : '#1e293b'}
                stroke={active ? '#f97316' : '#334155'}
                strokeWidth={active ? 1.5 : 1}/>
              <text x={cx + w/2} y="78" fill={active ? '#f97316' : '#94a3b8'}
                fontSize="8" textAnchor="middle" fontWeight={active ? 'bold' : 'normal'}>{label}</text>
            </g>
          );
        })}
        <text x="10" y="102" fill="#64748b" fontSize="7">Filters can be combined — all stats recalculate instantly</text>
      </svg>
    );
  },

  'lineup-positions': function LineupPositions() {
    // Court grid: front row P4/P3/P2 (top), back row P5/P6/P1 (bottom)
    const cells = [
      { x: 4,   y: 54,  label: 'P4', sub: 'Front-Left',   hi: false },
      { x: 113, y: 54,  label: 'P3', sub: 'Front-Center',  hi: false },
      { x: 222, y: 54,  label: 'P2', sub: 'Front-Right',   hi: false },
      { x: 4,   y: 124, label: 'P5', sub: 'Back-Left',     hi: false },
      { x: 113, y: 124, label: 'P6', sub: 'Back-Center',   hi: false },
      { x: 222, y: 124, label: 'P1', sub: 'Back-Right',    hi: true  },
    ];
    return (
      <svg viewBox="0 0 320 210" className="w-full" aria-hidden="true">
        <rect width="320" height="210" fill="#0f172a" rx="8"/>
        {/* Net */}
        <rect x="4" y="46" width="312" height="5" fill="#334155" rx="2"/>
        <text x="160" y="43" fill="#64748b" fontSize="7" textAnchor="middle" fontWeight="700" letterSpacing="1">NET ↑</text>
        {/* Court outline */}
        <rect x="4" y="51" width="312" height="144" fill="none" stroke="#334155" strokeWidth="1" rx="2"/>
        {/* Cells */}
        {cells.map(({ x, y, label, sub, hi }) => (
          <g key={label}>
            <rect x={x} y={y} width="105" height="62" rx="6"
              fill={hi ? 'rgba(249,115,22,0.12)' : '#1e293b'}
              stroke={hi ? '#f97316' : '#334155'}
              strokeWidth={hi ? 1.5 : 1}/>
            <text x={x + 52} y={y + 27} fill={hi ? '#f97316' : 'white'}
              fontSize="15" fontWeight="900" textAnchor="middle">{label}</text>
            <text x={x + 52} y={y + 42} fill={hi ? '#f97316' : '#64748b'}
              fontSize="7" textAnchor="middle">{sub}</text>
            {hi && <text x={x + 52} y={y + 55} fill="#f97316" fontSize="7" textAnchor="middle" fontWeight="bold">★ 1st Server</text>}
          </g>
        ))}
        {/* Rotation arrow (clockwise curved) */}
        <path d="M 275 115 A 50 50 0 1 1 275 116" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 3"/>
        <polygon points="275,108 270,116 280,116" fill="#475569"/>
        <text x="160" y="198" fill="#64748b" fontSize="7" textAnchor="middle">Players rotate clockwise each time your team wins the serve</text>
      </svg>
    );
  },

  'lineup-load': function LineupLoad() {
    const lineups = [
      { name: 'Base 5-1',           players: '#1 · #7 · #3 · #11 · #15 · #4', active: false },
      { name: '6-2 Serve Receive',  players: '#1 · #22 · #3 · #11 · #15 · #7', active: true  },
      { name: 'Tournament Lineup',  players: '#7 · #3 · #11 · #1 · #15 · #4', active: false },
    ];
    return (
      <svg viewBox="0 0 320 170" className="w-full" aria-hidden="true">
        <rect width="320" height="170" fill="#0f172a" rx="8"/>
        <text x="10" y="18" fill="#94a3b8" fontSize="8" fontWeight="700" letterSpacing="1">SAVED LINEUPS</text>
        <text x="298" y="18" fill="#f97316" fontSize="8" textAnchor="end" fontWeight="bold">+ New</text>
        {lineups.map(({ name, players, active }, i) => (
          <g key={name}>
            <rect x="10" y={28 + i * 46} width="300" height="38" rx="8"
              fill={active ? 'rgba(249,115,22,0.12)' : '#1e293b'}
              stroke={active ? '#f97316' : '#334155'}
              strokeWidth={active ? 1.5 : 1}/>
            <text x="22" y={28 + i * 46 + 16} fill={active ? 'white' : '#cbd5e1'}
              fontSize="10" fontWeight={active ? 'bold' : 'normal'}>{name}</text>
            {active && (
              <text x="284" y={28 + i * 46 + 16} fill="#f97316" fontSize="8" textAnchor="end" fontWeight="bold">← tap to load</text>
            )}
            <text x="22" y={28 + i * 46 + 30} fill="#475569" fontSize="7">{players}</text>
          </g>
        ))}
        <text x="160" y="164" fill="#64748b" fontSize="7" textAnchor="middle">Tap any lineup to instantly fill all 6 positions — then adjust if needed</text>
      </svg>
    );
  },

  'serve-rec-session': function ServeRecSession() {
    const players = [
      { name: '#7 Emma', apr: '2.4', reps: 12, tap: null   },
      { name: '#3 Sara',  apr: '1.8', reps: 9,  tap: '2'   },
      { name: '#15 Jess', apr: '2.7', reps: 15, tap: null  },
    ];
    const btnColors = ['#ef4444','#f97316','#eab308','#22c55e'];
    const btnBg     = ['rgba(239,68,68,0.14)','rgba(249,115,22,0.14)','rgba(234,179,8,0.14)','rgba(34,197,94,0.14)'];
    return (
      <svg viewBox="0 0 320 180" className="w-full" aria-hidden="true">
        <rect width="320" height="180" fill="#0f172a" rx="8"/>
        {/* Session APR header */}
        <rect width="320" height="28" fill="#1e293b" rx="8"/>
        <text x="160" y="18" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">Session APR: <tspan fill="#f97316">2.26</tspan> · 36 reps</text>
        {/* Player cards */}
        {players.map(({ name, apr, reps, tap }, pi) => (
          <g key={name} transform={`translate(${6 + pi * 104},0)`}>
            <rect x="0" y="34" width="96" height="138" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
            <text x="48" y="50" fill="white" fontSize="8" textAnchor="middle" fontWeight="bold">{name}</text>
            <text x="48" y="62" fill="#f97316" fontSize="8" textAnchor="middle">APR <tspan fontWeight="bold">{apr}</tspan></text>
            <text x="48" y="73" fill="#64748b" fontSize="7" textAnchor="middle">{reps} reps</text>
            {/* Rating buttons 0-3 */}
            {['0','1','2','3'].map((n, bi) => {
              const isTapped = tap === n;
              return (
                <g key={n}>
                  <rect x="8" y={82 + bi * 22} width="80" height="18" rx="6"
                    fill={isTapped ? btnBg[bi] : 'rgba(255,255,255,0.04)'}
                    stroke={isTapped ? btnColors[bi] : '#334155'}
                    strokeWidth={isTapped ? 1.5 : 1}/>
                  <text x="48" y={82 + bi * 22 + 13} fill={isTapped ? btnColors[bi] : '#94a3b8'}
                    fontSize="10" textAnchor="middle" fontWeight={isTapped ? 'bold' : 'normal'}>{n}</text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    );
  },

  'serve-rec-history': function ServeRecHistory() {
    // Distribution bar: 0=8%, 1=22%, 2=38%, 3=32%
    const dist = [
      { pct: 8,  color: '#ef4444', label: '0' },
      { pct: 22, color: '#f97316', label: '1' },
      { pct: 38, color: '#eab308', label: '2' },
      { pct: 32, color: '#22c55e', label: '3' },
    ];
    const passers = [
      { rank: '1', name: '#7 Emma',  apr: '2.61', reps: 48 },
      { rank: '2', name: '#15 Jess', apr: '2.44', reps: 41 },
      { rank: '3', name: '#3 Sara',  apr: '2.18', reps: 37 },
    ];
    return (
      <svg viewBox="0 0 320 190" className="w-full" aria-hidden="true">
        <rect width="320" height="190" fill="#0f172a" rx="8"/>
        {/* Totals strip */}
        <rect x="10" y="10" width="300" height="34" fill="#1e293b" rx="8"/>
        <text x="80"  y="32" fill="white" fontSize="14" textAnchor="middle" fontWeight="900">126</text>
        <text x="80"  y="42" fill="#64748b" fontSize="7" textAnchor="middle">TOTAL REPS</text>
        <text x="160" y="32" fill="#f97316" fontSize="14" textAnchor="middle" fontWeight="900">2.34</text>
        <text x="160" y="42" fill="#64748b" fontSize="7" textAnchor="middle">TEAM APR</text>
        <text x="248" y="28" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">6</text>
        <text x="248" y="42" fill="#64748b" fontSize="7" textAnchor="middle">SESSIONS</text>
        {/* Distribution bar */}
        <text x="10" y="60" fill="#94a3b8" fontSize="8" fontWeight="700" letterSpacing="1">RATING DISTRIBUTION</text>
        {(() => {
          let barX = 10;
          return dist.map(({ pct, color, label }) => {
            const w = pct * 3;
            const el = (
              <g key={label}>
                <rect x={barX} y="64" width={w} height="16" fill={color} fillOpacity="0.8"/>
                <text x={barX + w/2} y="75" fill="white" fontSize="7" textAnchor="middle" fontWeight="bold">{label}: {pct}%</text>
              </g>
            );
            barX += w;
            return el;
          });
        })()}
        {/* Top passers */}
        <text x="10" y="96" fill="#94a3b8" fontSize="8" fontWeight="700" letterSpacing="1">TOP PASSERS</text>
        {passers.map(({ rank, name, apr, reps }, i) => (
          <g key={name}>
            <rect x="10" y={102 + i * 28} width="300" height="22" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
            <text x="22" y={102 + i * 28 + 15} fill="#64748b" fontSize="9" fontWeight="900">{rank}</text>
            <text x="36" y={102 + i * 28 + 15} fill="white" fontSize="9" fontWeight="bold">{name}</text>
            <text x="250" y={102 + i * 28 + 15} fill="#f97316" fontSize="9" fontWeight="900" textAnchor="end">{apr} APR</text>
            <text x="300" y={102 + i * 28 + 15} fill="#475569" fontSize="7" textAnchor="end">{reps} reps</text>
          </g>
        ))}
        <text x="160" y="188" fill="#64748b" fontSize="7" textAnchor="middle">Cumulative across all sessions this season</text>
      </svg>
    );
  },
};

// ─── FAQ content ──────────────────────────────────────────────────────────────

const FAQ_TOPICS = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: '🏐',
    content: [
      {
        heading: '1. Create a Team',
        body: 'Go to Teams (bottom nav) → tap + New Team. Enter your team name, abbreviation (used on scoreboards), and school/club. You can create multiple teams — one for varsity, one for JV, etc.',
      },
      {
        heading: '2. Add Players to Your Roster',
        body: 'Inside the team page, tap + Add Player. Enter the player\'s name, jersey number, and primary position (OH, OPP, MB, S, L, DS, RS). Mark active players so they appear in lineups. You can also mark your libero here.',
      },
      {
        heading: '3. Create a Season',
        body: 'Inside your team, open Seasons → + New Season. Give it a name (e.g. "2025 Varsity") and a year. All matches and stats belong to a season, so create one before scheduling any matches.',
      },
      {
        heading: '4. Add Opponents',
        body: 'Go to Opponents (bottom nav) → + Add Opponent. You only need to add each school or team once — they\'re shared across all your teams and seasons.',
      },
      {
        heading: '5. Schedule or Start a Match',
        body: 'Home screen → + New Match. Choose your team, season, opponent, date, and format (Best of 3 or 5). Save it as scheduled, or tap Start immediately to go straight into lineup setup.',
      },
      {
        heading: '6. Set Your Defaults',
        body: 'Settings → Personalization → Default Team and Default Season. These pre-fill dropdowns across the app so you don\'t have to re-select every time.',
      },
      {
        heading: 'Tip: Install as an App',
        body: 'On iOS: tap the Share button in Safari → Add to Home Screen. On Android: tap the menu (⋮) → Install App. Running as an installed app gives you full-screen mode and faster load times.',
      },
    ],
  },
  {
    id: 'recording',
    label: 'Recording a Match',
    icon: '📋',
    content: [
      {
        heading: 'Setting Your Lineup',
        body: 'Before each set, you\'ll fill 6 court positions in serve order. Position 1 (P1) is your starting server. Drag players into each slot, or use the dropdown to assign. You can also designate your libero from this screen.',
      },
      {
        heading: 'The Live Screen Layout',
        screenshot: 'live-layout',
        body: 'The scoreboard sits at the top. Below it are your 6 player tiles arranged by court position. Tap a player tile to log a contact for them. The action buttons on the right column let you log opponent actions or adjust the rally.',
      },
      {
        heading: 'Serve Actions',
        body: 'Tap the serving player → Serve. Choose Float or Topspin, then the result: Ace (point), In (rally continues), Net error, Out of bounds error, or Foot fault. Service errors end the rally and give the opponent a point.',
      },
      {
        heading: 'Pass Ratings (0–3)',
        screenshot: 'pass-ratings',
        body: 'After an opponent serve, tap the receiver → Pass. Rate the pass quality: 0 = we were aced (no pass), 1 = poor (setter has limited options), 2 = good (setter has 2–3 options), 3 = perfect (all options open). APR is the average of all pass ratings.',
      },
      {
        heading: 'Attack Results',
        body: 'Tap the attacker → Attack. Result options: Kill (point), Error (attack fault — choose OB, Net, or Blocked), or In Play (kept live). Kill subtypes include Pure, Tool (off the block), Tip, Back-row, and Overhand.',
      },
      {
        heading: 'Block Actions',
        body: 'Tap a blocker → Block. Solo Block (BS) = one player blocks it for a point. Block Assist (BA) = two or more players, counts as 0.5 BS each. Block Error (BE) = blocker hit the net or reached over.',
      },
      {
        heading: 'Digs & Defense',
        body: 'Tap the defender → Dig. A dig keeps the ball alive. Digs don\'t end the rally — log them and continue logging contacts until the rally ends with a point.',
      },
      {
        heading: 'Serve Side Indicator',
        body: 'The US / THEM indicator at the top shows who is serving. It flips automatically as points are scored. If it ever gets out of sync (e.g. after an out-of-system sequence), tap it to manually toggle.',
      },
      {
        heading: 'Opponent Actions',
        body: 'Use the OPP buttons (right column) to log opponent aces, kills, and errors when those actions end the rally without any of your players touching the ball.',
      },
      {
        heading: 'Undoing a Contact',
        screenshot: 'action-bar',
        body: 'Tap UNDO in the action bar to remove the last logged contact. You can undo multiple contacts to walk back through a rally. The undo does not cross set boundaries.',
      },
      {
        heading: 'Ending a Set',
        body: 'Sets end automatically when one team reaches the win score (25, or 15 for the deciding set). Tap End Set to confirm. You\'ll then set the next lineup before starting the following set.',
      },
      {
        heading: 'Match Summary',
        body: 'After the final set, you\'ll land on the Match Summary screen showing final scores, team stats, and player leaders. Stats are immediately visible in Reports.',
      },
    ],
  },
  {
    id: 'substitutions',
    label: 'Substitutions',
    icon: '🔄',
    content: [
      {
        heading: 'Opening the Sub Panel',
        body: 'During a live set, tap the Sub button in the action bar (bottom of the screen). The sub panel shows your 6 court players and your bench.',
      },
      {
        heading: 'Making a Single Sub',
        screenshot: 'sub-panel',
        body: 'Tap the player coming OUT from the court grid (top section). The grid highlights them in blue. Then tap the player coming IN from the bench (bottom section). Tap Confirm Sub.',
      },
      {
        heading: 'Double Substitutions',
        body: 'After selecting your first sub pair, tap "+ Add 2nd Sub." Sub 1 is highlighted in blue, Sub 2 in amber so you can clearly track which pair is which. Both confirm together and consume 2 subs from your limit.',
      },
      {
        heading: 'Return Sub Suggestions',
        body: 'Once a sub has been made in the current set, the original pairing is remembered. When you next open the sub panel, the return partner shows a ↩ Return badge in green (or amber for the second pair). Tap it to instantly reverse the sub.',
      },
      {
        heading: 'Position Role Override',
        body: 'After selecting a player in, you\'ll see position chips (OH, MB, S, etc.). Select the role they\'re playing this set. This affects their VER score because the position multiplier changes based on what role they fill on the court.',
      },
      {
        heading: 'Exhausted Players',
        body: 'In some rule sets, a player who has been subbed out cannot re-enter. Exhausted players are marked in yellow in the bench grid — they can still be selected but you\'ll see the warning.',
      },
      {
        heading: 'Sub Limits',
        body: 'The Confirm button always shows how many subs remain after confirming. The limit is set in Settings → Match Rules (default 18 per set for IHSA). When the limit is reached, the panel will show a red warning and the button is disabled.',
      },
      {
        heading: 'Libero',
        body: 'The libero is locked in the court grid and cannot be pulled as a regular sub — they\'re displayed as greyed out. Libero defensive swaps happen silently outside the substitution system and don\'t count against your sub total.',
      },
    ],
  },
  {
    id: 'stats-glossary',
    label: 'Stat Abbreviations',
    icon: '🔤',
    content: [
      {
        heading: 'Serving',
        body: 'SA = Serve Attempts. ACE = Aces (serve not returned). SE = Service Errors. SRV% = In-play serve rate (SA − SE) / SA. ACE% = Ace rate per serve attempt.',
      },
      {
        heading: 'Passing / Receiving',
        body: 'REC = Receptions (times you passed a serve). APR = Average Pass Rating (scale 0–3). Higher is better: 3.0 is perfect, 2.0 is average, below 1.5 is poor. P0/P1/P2/P3 = count of each rating.',
      },
      {
        heading: 'Attacking',
        body: 'ATT = Attack Attempts. K = Kills (attack that scores). AE = Attack Errors (ball out or blocked). HIT% = (K − AE) / ATT — can be negative. K% = Kills per attempt. K:AE = Kill-to-error ratio.',
      },
      {
        heading: 'Blocking',
        body: 'BS = Block Solos. BA = Block Assists (0.5 each). BE = Block Errors. BPS = Blocks Per Set (BS + BA×0.5) divided by sets played.',
      },
      {
        heading: 'Defense & Setting',
        body: 'DIG = Digs (defensive plays that keep the ball alive). AST = Assists (sets that result in a kill). BHE = Ball Handling Errors (lift, double, etc.).',
      },
      {
        heading: 'Team / Rotation',
        body: 'SO% = Sideout Percentage — how often you score when the opponent is serving. BP% = Break Point Percentage — how often you score when you are serving. These are the two most important team efficiency metrics.',
      },
      {
        heading: 'MP / SP',
        body: 'MP = Matches Played. SP = Sets Played. Per-set averages in Reports divide totals by SP, not MP.',
      },
      {
        heading: 'VER',
        body: 'VER = Volleyball Efficiency Rating. A composite score that weights all a player\'s actions (kills, aces, errors, passes, blocks, digs) by position. See the VER Score guide for full detail.',
      },
    ],
  },
  {
    id: 'ver',
    label: 'VER Score Explained',
    icon: '⚡',
    content: [
      {
        heading: 'What is VER?',
        body: 'VER (Volleyball Efficiency Rating) is a single composite number that grades a player\'s overall contribution to winning. It combines every tracked action — serving, passing, attacking, blocking, and defense — into one score.',
      },
      {
        heading: 'Why Use It?',
        body: 'Raw stats like kill count don\'t account for errors, playing time, or position. A setter\'s 45 assists looks very different from an OH\'s 12 kills, but VER puts them on the same scale so you can compare across positions.',
      },
      {
        heading: 'Position Multipliers',
        body: 'Each position has a different weight because different positions touch the ball differently. An Outside Hitter is expected to attack frequently; a Defensive Specialist is judged more on passing and digging. The multiplier is set by the role the player fills on the court — which is why the position override in the Sub panel matters.',
      },
      {
        heading: 'Positive vs Negative Actions',
        body: 'Kills, aces, blocks, and high pass ratings add to VER. Service errors, attack errors, ball handling errors, and aced passes subtract. The net result relative to sets played produces the VER score.',
      },
      {
        heading: 'Reading VER',
        body: 'VER is color-coded by position tier. A positive VER means the player contributed more good plays than bad. Higher is always better. Use it to compare players within the same role across the season or to track improvement over time.',
      },
      {
        heading: 'VER in Reports',
        body: 'The Player Stats tab shows each player\'s VER with a colored badge. You can filter by match result or conference to see how VER changes in big games vs. regular matches.',
      },
    ],
  },
  {
    id: 'rotation',
    label: 'Rotation Analysis',
    icon: '🔁',
    content: [
      {
        heading: 'What is Rotation Analysis?',
        body: 'Every rally is tagged with which rotation your team was in when the rally started. Rotation analysis groups all rallies by rotation (1–6) and shows sideout % and break-point % for each one.',
      },
      {
        heading: 'Rotation Numbering',
        body: 'Rotation 1 = your P1 (server) is in the right-back position. The rotation number advances by 1 each time you win the serve. So rotation 2 is the next server, and so on through rotation 6.',
      },
      {
        heading: 'SO% by Rotation',
        body: 'Sideout % shows how often you score when receiving in each rotation. A low SO% in rotation 3 means your lineup struggles to side out when a specific player is in P3 — the front-row in that rotation may have a weak passer.',
      },
      {
        heading: 'BP% by Rotation',
        body: 'Break Point % shows how often you score points while serving in each rotation. A low BP% in rotation 5 might mean the server in P5 is giving away too many points, or the blocking scheme is weak from that rotation.',
      },
      {
        heading: 'Live Rotation Tab',
        body: 'During a match, open the Stats modal → ROTATION tab. It compares your current-game rotation performance against your season average. Rotations that are 10+ percentage points below baseline are flagged with a ⚠ banner and a suggestion to call a timeout or sub.',
      },
      {
        heading: 'Using It Strategically',
        body: 'Before matches, check the Reports → Rotation Analysis tab from recent games. If rotation 2 consistently underperforms (low SO%), plan a sub to strengthen that rotation before the match starts, or build a specific play pattern for it.',
      },
      {
        heading: 'Rotation Radar Chart',
        body: 'The Rotation Analysis tab also includes a radar chart showing all 6 rotations at once. A balanced hexagon means consistent performance. A lopsided shape immediately shows which rotations are outliers.',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reading Reports',
    icon: '📊',
    content: [
      {
        heading: 'Selecting Your Data Range',
        body: 'Reports → pick your team and season. By default it loads all matches. Tap individual match chips at the top to focus on one or more specific games. All stats recalculate instantly.',
      },
      {
        heading: 'Result & Conference Filters',
        screenshot: 'reports-filters',
        body: 'Use the filter chips to narrow data: Result (Wins / Losses / Last 5), Conference (conf vs. non-conf), Location (Home / Away / Neutral), and Match Type (Regular / Tournament / IHSA Playoffs). Filters can be combined.',
      },
      {
        heading: 'Team Stats Tab',
        body: 'Shows totals, per-set averages, or per-match averages for all tracked team stats. Use "Avg / Set" view for rate stats like APR and HIT% — these are more meaningful than raw totals across different match counts.',
      },
      {
        heading: 'Player Stats Tab',
        body: 'One row per player. Tap any column header to sort descending. Tap again to sort ascending. VER badge is colored by position tier. Players with fewer than 1 set played are grayed out.',
      },
      {
        heading: 'Rotation Analysis Tab',
        body: 'Shows SO% and BP% by rotation with a radar chart and per-rotation breakdown. The "Rotation Spotlight" section highlights your best and worst performing rotations with trend context.',
      },
      {
        heading: 'Trends Tab',
        body: 'Line charts showing how key stats have moved across matches in chronological order. Useful for spotting improvement arcs or regressions over the season.',
      },
      {
        heading: 'Heat Map Tab',
        body: 'Shows where on the court your serves are landing and which zones you\'re targeting with attacks. Useful for scouting prep — see if you\'re serving the same zone repeatedly.',
      },
      {
        heading: 'Insights Tab',
        body: 'Requires at least 2 wins and 2 losses in the selected season. Shows 8 key metrics (Pass Rating, SO%, BP%, Kill %, Hitting Efficiency, Ace %, Serve Error %, Blocks/Set) comparing your win averages vs. your loss averages. The bar shows where your season average sits between those two extremes.',
      },
      {
        heading: 'Insights Status Labels',
        body: '✓ On track = your season average is 65%+ of the way toward your win average. ⚡ Close = 35–64%. ✗ Below threshold = below 35% — this metric may be costing you matches.',
      },
      {
        heading: 'Win/Loss Shortcut',
        body: 'On the Home screen, tap the W or L number in your season summary card to jump directly into Reports pre-filtered to wins or losses.',
      },
    ],
  },
  {
    id: 'live-tips',
    label: 'Live Match Tips',
    icon: '⚡',
    content: [
      {
        heading: 'Prioritize High-Value Actions',
        body: 'If rallies move too fast, log in this order: serve result (ace/error/in), kill/attack error, block. Passes and digs add depth but the above 4 capture most of the meaningful data.',
      },
      {
        heading: 'Keep Screen Awake',
        body: 'Enable Settings → Live Match → Keep Screen Awake so the phone doesn\'t lock mid-rally. This uses more battery, so consider keeping a charger nearby during long matches.',
      },
      {
        heading: 'Use Haptic Feedback',
        body: 'Enable Settings → Live Match → Haptic Feedback. A short vibration confirms each tap, so you know the contact registered without looking down at the screen.',
      },
      {
        heading: 'Undo Is Your Best Friend',
        body: 'Tapped the wrong player? Hit ↩ immediately. You can undo multiple contacts in sequence. Don\'t try to "fix" it by adding a compensating action — just undo and redo correctly.',
      },
      {
        heading: 'Opponent Actions',
        body: 'If the opponent scores off an ace or an attack without any of your players touching the ball, use the OPP buttons. This keeps the serve-side indicator and rotation tracker accurate.',
      },
      {
        heading: 'Serve Side Sync',
        body: 'After a timeout, net violation, or long replay review, double-check the serve indicator. If it\'s wrong, tap it once to flip. Everything downstream (rotation tracking, SO%/BP%) depends on this being correct.',
      },
      {
        heading: 'Between Sets',
        body: 'The app does not auto-rotate your lineup between sets — you set it fresh each set. This is intentional since coaches often change the starting rotation. Take 30 seconds during the break to enter it.',
      },
      {
        heading: 'Stats Modal During a Match',
        body: 'Tap the chart icon to open the Stats modal without leaving the live screen. Check the ROTATION tab mid-match to spot struggling rotations. Close it and you\'re back exactly where you were.',
      },
    ],
  },
  {
    id: 'saved-lineups',
    label: 'Saved Lineups',
    icon: '📋',
    content: [
      {
        heading: 'What Are Saved Lineups?',
        body: 'Saved lineups let you store your most-used rotation setups by name so you can load them instantly at the start of any set — instead of re-assigning all 6 players from scratch every time.',
      },
      {
        heading: 'Creating a Saved Lineup',
        body: 'Go to Teams → tap your team → scroll to the Saved Lineups section → tap + New Lineup. Give it a descriptive name like "Base 5-1" or "6-2 Serve Receive." Then assign a player to each of the 6 serve-order positions (P1 through P6).',
      },
      {
        heading: 'Serve Order (P1–P6)',
        screenshot: 'lineup-positions',
        body: 'P1 is your first server — the player who serves first when the set begins. P2 through P6 follow in rotation order. Think of it as the order players will rotate through the serving position during the set.',
      },
      {
        heading: 'Position Labels',
        body: 'For each slot you can set a position label (OH, MB, S, OPP, L, DS, RS). This tells the stat engine what role each player is filling in that rotation, which affects their VER score calculation.',
      },
      {
        heading: 'Start Zone',
        body: 'Start Zone tells the app which zone on the court your P1 player begins in. Zone 1 is right-back (standard). Adjust this if your team starts a set with a rotational offset — for example if you\'re receiving to start and your setter is in a different zone.',
      },
      {
        heading: 'Setting the Libero',
        body: 'You can designate a libero directly in the saved lineup. That player will be locked as the libero for every set you load this lineup into, so you don\'t have to set it manually each time.',
      },
      {
        heading: 'Loading a Saved Lineup',
        screenshot: 'lineup-load',
        body: 'When setting up a lineup before a set — either during match setup or at the start of a new set — you\'ll see a "Saved Lineups" section at the top. Tap any saved lineup to instantly fill all 6 positions. You can still make individual adjustments after loading.',
      },
      {
        heading: 'Editing or Deleting',
        body: 'Go to Teams → your team → Saved Lineups. Tap a lineup to edit it, or swipe left to delete. Changes take effect immediately for any future sets — lineups already recorded are unaffected.',
      },
      {
        heading: 'Tips for Naming',
        body: 'Use names that describe the situation: "Base 5-1", "6-2 Rotation A", "Tournament Serve Receive", "Sub Pattern — Emily In". Clear names save time mid-match when you\'re looking for the right lineup fast.',
      },
    ],
  },
  {
    id: 'serve-receive',
    label: 'Serve Receive Practice Tool',
    icon: '🎯',
    content: [
      {
        heading: 'What Is This Tool?',
        body: 'The Serve Receive tool is a standalone practice tracker found under Tools → Serve Receive. Use it during practice to log every pass rep your players take and track APR (Average Pass Rating) over time — separate from match stat recording.',
      },
      {
        heading: 'Starting a Session',
        body: 'Select your team from the dropdown. A checklist of your active players appears. Check off everyone participating in the drill — you can include as many or as few as you want. Tap "Start Session" when ready.',
      },
      {
        heading: 'Recording Passes',
        screenshot: 'serve-rec-session',
        body: 'Each player gets their own card with four large buttons: 0, 1, 2, 3. Tap the rating immediately after each serve they receive. 0 = aced (no pass), 1 = poor pass, 2 = good pass, 3 = perfect pass. The session APR updates live as you go.',
      },
      {
        heading: 'Pass Rating Scale',
        body: '3 = perfect: setter has all options, can run any offense. 2 = good: setter has 2–3 options. 1 = poor: offense is limited, likely a free ball. 0 = ace: player was aced, no pass attempted. Use the same scale you use during match recording for consistency.',
      },
      {
        heading: 'Undoing a Rep',
        body: 'Tap the Undo button at the top of the session screen to remove the last recorded pass. Useful when you tap the wrong player\'s card or misread the quality of a pass. There is no limit on how many times you can undo.',
      },
      {
        heading: 'Auto-Save (Draft)',
        body: 'The session is auto-saved as a draft after every tap. If you close the app or navigate away mid-drill, you\'ll see a "Resume unsaved session?" banner when you come back. Tap Resume to pick up exactly where you left off, or Discard to start fresh.',
      },
      {
        heading: 'Saving a Session',
        body: 'When the drill is done, tap Save Session. The session is stored with the date, all player pass data, and the overall APR. It appears in the Recent Sessions list on the setup screen.',
      },
      {
        heading: 'Viewing History',
        screenshot: 'serve-rec-history',
        body: 'The setup screen shows a summary of all sessions ever recorded: total reps, overall APR, a rating distribution bar (how many 0s, 1s, 2s, 3s across all drills), and a Top Passers leaderboard showing the 5 highest-APR non-middle-blockers with at least 10 reps.',
      },
      {
        heading: 'Deleting a Session',
        body: 'Swipe left on any session in the Recent Sessions list and tap Delete to remove it. This also removes it from the cumulative APR summary and Top Passers leaderboard.',
      },
      {
        heading: 'Tracking Improvement Over Time',
        body: 'Run this drill consistently — daily or weekly — with the same players. The overall APR in the summary tells you if your team\'s passing is improving across the season. Compare individual player APR between early-season and late-season sessions to see who developed most.',
      },
    ],
  },
  {
    id: 'backup',
    label: 'Backing Up Data',
    icon: '💾',
    content: [
      {
        heading: 'Why Backup?',
        body: 'All data lives in your browser\'s local storage on this device. Clearing your browser data, switching browsers, or reinstalling the app can erase everything. Regular exports are your only safety net.',
      },
      {
        heading: 'Export a Full Backup',
        body: 'Settings → Data Management → Export Full Backup (JSON). A file named vantage-backup-[date].json downloads to your device. Email it to yourself or save it to iCloud / Google Drive after every match.',
      },
      {
        heading: 'Auto-Saves',
        body: 'The app automatically saves a snapshot every time you open it and after every match ends. Up to 5 auto-saves are kept in the list under Data Management. Tap Restore on any of them to roll back.',
      },
      {
        heading: 'Restoring a Backup',
        body: 'Settings → Import Backup (JSON). IMPORTANT: this completely replaces all existing data with the backup file. Always export your current data first before importing anything.',
      },
      {
        heading: 'Merging Backups',
        body: 'Merge from Backup brings data from a backup file into your existing data without overwriting. Useful when two coaches have been recording on separate devices and want to combine records.',
      },
      {
        heading: 'Sharing Between Devices',
        body: 'Export on device A → send the file → import or merge on device B. There is no cloud sync. Both devices will have the same data after the merge, but future changes don\'t sync automatically.',
      },
      {
        heading: 'MaxPreps Export',
        body: 'Settings → Exports → paste your MaxPreps Team ID (found in your team\'s MaxPreps URL). Once set, the Match Summary page will offer a MaxPreps .txt export formatted for direct upload.',
      },
      {
        heading: 'What\'s Included in the Export',
        body: 'Everything: teams, players, seasons, matches, all contact-by-contact stat data, records, opponents, college commits, practice sessions, and settings. The JSON file is a complete snapshot of the app.',
      },
    ],
  },
];

function HelpModal({ topic, onClose }) {
  if (!topic) return null;
  return (
    <Modal title={`${topic.icon} ${topic.label}`} onClose={onClose}>
      <div className="space-y-0 max-h-[65vh] overflow-y-auto -mx-1 px-1 no-scrollbar">
        {topic.content.map(({ heading, body, screenshot }, i) => {
          const Illustration = screenshot ? HELP_ILLUSTRATIONS[screenshot] : null;
          return (
            <div key={heading} className={`py-3.5 ${i < topic.content.length - 1 ? 'border-b border-slate-700/50' : ''}`}>
              <p className="text-xs font-black uppercase tracking-wide text-primary mb-1.5">{heading}</p>
              {Illustration && (
                <div className="mb-2.5 rounded-lg overflow-hidden border border-slate-700/50">
                  <Illustration />
                </div>
              )}
              <p className="text-sm text-slate-300 leading-relaxed">{body}</p>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function useStorageEstimate() {
  const [estimate, setEstimate] = useState(null);

  useEffect(() => {
    if (!navigator.storage?.estimate) return;
    navigator.storage.estimate().then((est) => {
      setEstimate({ usage: est.usage ?? 0, quota: est.quota ?? 0 });
    });
  }, []);

  return estimate;
}

const fmtMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

const DEFAULT_MAX_SUBS   = 18;
const DEFAULT_FORMAT     = FORMAT.BEST_OF_3;


function useMaxSubs() {
  const [maxSubs, setMaxSubsState] = useState(() => {
    const saved = getIntStorage(STORAGE_KEYS.MAX_SUBS);
    return !isNaN(saved) && saved > 0 ? saved : DEFAULT_MAX_SUBS;
  });
  const save = (val) => {
    const n = Math.max(1, Math.min(99, Number(val)));
    setStorageItem(STORAGE_KEYS.MAX_SUBS, n);
    setMaxSubsState(n);
  };
  return [maxSubs, save];
}

function useDefaultFormat() {
  const [defaultFormat, setDefaultFormatState] = useState(() => {
    const saved = getStorageItem(STORAGE_KEYS.DEFAULT_FORMAT);
    return saved === FORMAT.BEST_OF_5 ? FORMAT.BEST_OF_5 : DEFAULT_FORMAT;
  });
  const save = (val) => {
    setStorageItem(STORAGE_KEYS.DEFAULT_FORMAT, val);
    setDefaultFormatState(val);
  };
  return [defaultFormat, save];
}

function useAmoledMode() {
  const [amoled, setAmoledState] = useState(() => getBoolStorage(STORAGE_KEYS.AMOLED));
  const save = (val) => {
    setBoolStorage(STORAGE_KEYS.AMOLED, val);
    document.documentElement.classList.toggle('amoled', val);
    setAmoledState(val);
  };
  return [amoled, save];
}

function useToggleSetting(key) {
  const [val, setVal] = useState(() => getBoolStorage(key));
  const save = (next) => { setBoolStorage(key, next); setVal(next); };
  return [val, save];
}

function useAccentColor() {
  const [accent, setAccent] = useState(() => getStorageItem(STORAGE_KEYS.ACCENT, 'orange'));
  const save = (id) => {
    const c = ACCENT_COLORS.find((x) => x.id === id) ?? ACCENT_COLORS[0];
    setStorageItem(STORAGE_KEYS.ACCENT, id);
    document.documentElement.style.setProperty('--color-primary', c.hex);
    document.documentElement.style.setProperty('--color-primary-rgb', c.rgb);
    setAccent(id);
  };
  return [accent, save];
}


const ROSTER_SORT_OPTIONS = [
  { id: 'jersey',    label: 'Jersey #',    example: '#12'  },
  { id: 'first',     label: 'First Name',  example: 'Alex' },
  { id: 'last',      label: 'Last Name',   example: 'Smith'},
];

const PLAYER_NAME_FORMATS = [
  { id: 'initial_last', label: 'Initial + Last',   example: 'J. Smith'   },
  { id: 'last',         label: 'Last Name',         example: 'Smith'      },
  { id: 'first',        label: 'First Name',        example: 'John'       },
  { id: 'first_last',   label: 'First + Last',      example: 'John Smith' },
  { id: 'nickname',     label: 'Nickname',          example: 'Johnny'     },
];

function useStrSetting(key, dflt) {
  const [val, setVal] = useState(() => getStorageItem(key, dflt));
  const save = (v) => { setStorageItem(key, v); setVal(v); };
  return [val, save];
}

function useTrimSetting(key) {
  const [val, setVal] = useState(() => getStorageItem(key, ''));
  const save = (v) => { setStorageItem(key, v.trim() || null); setVal(v); };
  return [val, save];
}

function useNullableIntSetting(key) {
  const [val, setVal] = useState(() => { const s = getIntStorage(key); return !isNaN(s) ? s : null; });
  const save = (id) => { setStorageItem(key, id); setVal(id); };
  return [val, save];
}

function useLastSetScore() {
  const [val, setVal] = useState(() => getIntStorage(STORAGE_KEYS.LAST_SET_SCORE, 15));
  const save = (n) => { setStorageItem(STORAGE_KEYS.LAST_SET_SCORE, n); setVal(n); };
  return [val, save];
}

export function SettingsPage() {
  const showToast    = useUiStore((s) => s.showToast);
  const fileInputRef = useRef(null);
  const [maxSubs, saveMaxSubs]           = useMaxSubs();
  const [defaultFormat, saveDefaultFormat] = useDefaultFormat();
  const [lastSetScore, saveLastSetScore] = useLastSetScore();

  const [amoled,      saveAmoled]      = useAmoledMode();
  const [accent,      saveAccent]      = useAccentColor();
  const [defaultTeamId,    saveDefaultTeam]    = useNullableIntSetting(STORAGE_KEYS.DEFAULT_TEAM_ID);
  const [defaultSeasonId,  saveDefaultSeason]  = useNullableIntSetting(STORAGE_KEYS.DEFAULT_SEASON_ID);
  const [scoreDetail,      saveScoreDetail]    = useStrSetting(STORAGE_KEYS.SCORE_DETAIL, 'sets');
  const [matchViewDefault, saveMatchViewDefault] = useStrSetting(STORAGE_KEYS.MATCH_VIEW_DEFAULT, 'recent');
  const [playerNameFormat, savePlayerNameFormat] = useStrSetting(STORAGE_KEYS.PLAYER_NAME_FORMAT, 'initial_last');
  const [rosterSort,       saveRosterSort]       = useStrSetting(STORAGE_KEYS.ROSTER_SORT, 'jersey');
  const teams = useLiveQuery(() => db.teams.orderBy('name').toArray(), []);
  const defaultTeamSeasons = useLiveQuery(
    () => defaultTeamId ? db.seasons.where('team_id').equals(defaultTeamId).sortBy('year') : Promise.resolve([]),
    [defaultTeamId]
  );
  const [maxPrepsId,  saveMaxPrepsId]  = useTrimSetting(STORAGE_KEYS.MAXPREPS_TEAM_ID);
  const [winMessage,   saveWinMessage]  = useTrimSetting(STORAGE_KEYS.WIN_MESSAGE);
  const [programName,  saveProgramName] = useTrimSetting(STORAGE_KEYS.PROGRAM_NAME);
  const [coachName,    saveCoachName]   = useTrimSetting(STORAGE_KEYS.COACH_NAME);
  const [wakeLock,     saveWakeLock]    = useToggleSetting('vbstat_wake_lock');
  const [hapticOn,     saveHaptic]      = useToggleSetting('vbstat_haptic');
  const [soundsOn,     saveSounds]      = useToggleSetting(STORAGE_KEYS.SOUNDS);
  const [flipLayout,   saveFlipLayout]  = useToggleSetting('vbstat_flip_layout');
  const [confirmClear,   setConfirmClear]   = useState(false);
  const [confirmImport,  setConfirmImport]  = useState(false);
  const [pendingFile,    setPendingFile]    = useState(null);
  const [importing,      setImporting]      = useState(false);
  const [showMerge,      setShowMerge]      = useState(false);
  const [restoringId,    setRestoringId]    = useState(null);
  const [helpTopic,      setHelpTopic]      = useState(null);

  const autoBackups = useLiveQuery(
    () => db.auto_backups.orderBy('created_at').reverse().limit(5).toArray(),
    []
  );

  const { canInstall, isIOS, isInstalled, promptInstall } = useInstallPrompt();
  const storage = useStorageEstimate();

  const usagePct = storage?.quota ? storage.usage / storage.quota : 0;
  const showStorageWarning = usagePct > 0.8;

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleExport() {
    try {
      await exportBackup();
      showToast('Backup exported', 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    }
  }

  function handleImportPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setConfirmImport(true);
    e.target.value = '';
  }

  async function handleRestoreAutoBackup(id) {
    setRestoringId(id);
    try {
      await restoreAutoBackup(id);
      showToast('Backup restored', 'success');
      window.location.reload();
    } catch (e) {
      showToast(e.message ?? 'Restore failed', 'error');
    } finally {
      setRestoringId(null);
    }
  }

  async function handleImportConfirm() {
    if (!pendingFile) return;
    setImporting(true);
    setConfirmImport(false);
    try {
      await importBackup(pendingFile);
      showToast('Backup imported successfully', 'success');
    } catch (e) {
      showToast(e.message ?? 'Import failed', 'error');
    } finally {
      setImporting(false);
      setPendingFile(null);
    }
  }

  async function handleClearAll() {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) await table.clear();
    });
    showToast('All data cleared', 'info');
    setConfirmClear(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="p-4 space-y-4">

        {/* Storage warning */}
        {showStorageWarning && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-sm">
            <p className="font-semibold text-red-300">Storage almost full</p>
            <p className="text-red-400 mt-0.5">
              {fmtMB(storage.usage)} MB used of {fmtMB(storage.quota)} MB —
              export a backup and consider clearing old data.
            </p>
          </div>
        )}

        {/* Install banner */}
        {!isInstalled && (canInstall || isIOS) && (
          <section className="bg-surface rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="font-semibold">Install App</h2>
              <p className="text-xs text-slate-400 mt-0.5">Add VBAPPv.2 to your home screen for the best experience</p>
            </div>
            <div className="p-4">
              {canInstall && (
                <Button className="w-full" onClick={promptInstall}>
                  Add to Home Screen
                </Button>
              )}
              {isIOS && !canInstall && (
                <div className="text-sm text-slate-300 space-y-1">
                  <p>To install on iOS:</p>
                  <ol className="list-decimal list-inside text-slate-400 space-y-1 ml-1">
                    <li>Tap the <span className="text-white font-medium">Share</span> button in Safari</li>
                    <li>Tap <span className="text-white font-medium">Add to Home Screen</span></li>
                    <li>Tap <span className="text-white font-medium">Add</span></li>
                  </ol>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Storage info */}
        {storage && !showStorageWarning && (
          <div className="text-xs text-slate-500 px-1">
            Storage: {fmtMB(storage.usage)} MB used of {fmtMB(storage.quota)} MB
            {' '}({(usagePct * 100).toFixed(1)}%)
          </div>
        )}

        {/* Personalization */}
        <section className="bg-surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="font-semibold">Personalization</h2>
          </div>
          <div className="p-4 space-y-5">

            {/* Program name */}
            <div>
              <label className="block text-sm font-medium mb-1">Program Name</label>
              <div className="text-xs text-slate-400 mb-2">
                Used in PDF report headers and export filenames (e.g. "Lincoln Wildcats").
              </div>
              <input
                type="text"
                value={programName}
                onChange={(e) => saveProgramName(e.target.value)}
                placeholder="e.g. Lincoln Wildcats"
                maxLength={60}
                className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
              />
            </div>

            {/* Coach name */}
            <div>
              <label className="block text-sm font-medium mb-1">Coach Name</label>
              <div className="text-xs text-slate-400 mb-2">
                Appears on PDF reports and CSV exports.
              </div>
              <input
                type="text"
                value={coachName}
                onChange={(e) => saveCoachName(e.target.value)}
                placeholder="e.g. Coach Johnson"
                maxLength={60}
                className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
              />
            </div>

            {/* Win message */}
            <div>
              <label className="block text-sm font-medium mb-1">Win Message</label>
              <div className="text-xs text-slate-400 mb-2">
                Shown on the confetti screen after winning a match. Leave blank to use team abbreviation + WIN MATCH.
              </div>
              <textarea
                rows={2}
                value={winMessage}
                onChange={(e) => saveWinMessage(e.target.value)}
                placeholder={'WILDCATS\nWIN MATCH'}
                maxLength={60}
                className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600 resize-none"
              />
            </div>

            {/* Default team */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Default Team</label>
                <Link to="/help/default-team" className="text-[10px] text-slate-500 hover:text-slate-300 underline">
                  what does this do?
                </Link>
              </div>
              <div className="text-xs text-slate-400 mb-2">Pre-selected in tool pages and session setup</div>
              <select
                value={defaultTeamId ?? ''}
                onChange={(e) => {
                  saveDefaultTeam(Number(e.target.value) || null);
                  saveDefaultSeason(null);
                }}
                className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              >
                <option value="">No default</option>
                {(teams ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Default season — only shown when a default team is set */}
            {defaultTeamId && (
              <div>
                <label className="block text-sm font-medium mb-1">Default Season</label>
                <div className="text-xs text-slate-400 mb-2">Pre-selected in Reports and tool pages for this team</div>
                <select
                  value={defaultSeasonId ?? ''}
                  onChange={(e) => saveDefaultSeason(Number(e.target.value) || null)}
                  className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">No default</option>
                  {(defaultTeamSeasons ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name ?? s.year}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Match card score display */}
            <div>
              <div className="text-sm font-medium mb-0.5">Match Card Scores</div>
              <div className="text-xs text-slate-400 mb-2">How scores appear on match cards</div>
              <div className="flex gap-2">
                {[
                  { val: 'sets',   label: 'Set Count',   example: '●●○' },
                  { val: 'scores', label: 'Set Scores',  example: '25-18 · 25-22' },
                ].map(({ val, label, example }) => (
                  <button
                    key={val}
                    onClick={() => saveScoreDetail(val)}
                    className={`flex-1 py-2 px-2 rounded-lg text-sm font-semibold border transition-colors flex flex-col items-center gap-0.5 ${
                      scoreDetail === val
                        ? 'bg-primary text-white border-primary'
                        : 'bg-bg text-slate-300 border-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-[10px] font-normal font-mono ${scoreDetail === val ? 'text-orange-100/70' : 'text-slate-500'}`}>{example}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Default match view */}
            <div>
              <div className="text-sm font-medium mb-0.5">Home Screen Match List</div>
              <div className="text-xs text-slate-400 mb-2">Default view when opening the app</div>
              <div className="flex gap-2">
                {[
                  { val: 'recent',  label: 'Recent',  example: 'newest first' },
                  { val: 'closest', label: 'Closest', example: 'near today'   },
                ].map(({ val, label, example }) => (
                  <button
                    key={val}
                    onClick={() => saveMatchViewDefault(val)}
                    className={`flex-1 py-2 px-2 rounded-lg text-sm font-semibold border transition-colors flex flex-col items-center gap-0.5 ${
                      matchViewDefault === val
                        ? 'bg-primary text-white border-primary'
                        : 'bg-bg text-slate-300 border-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-[10px] font-normal ${matchViewDefault === val ? 'text-orange-100/70' : 'text-slate-500'}`}>{example}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent color */}
            <div>
              <div className="text-sm font-medium mb-1">Accent Color</div>
              <div className="text-xs text-slate-400 mb-3">Applied to buttons, badges, and highlights throughout the app</div>
              <div className="flex gap-3">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => saveAccent(c.id)}
                    className="flex flex-col items-center gap-1.5"
                    title={c.label}
                  >
                    <span
                      className="w-9 h-9 rounded-full block transition-transform"
                      style={{
                        background: c.hex,
                        boxShadow: accent === c.id ? `0 0 0 3px #000, 0 0 0 5px ${c.hex}` : 'none',
                        transform: accent === c.id ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                    <span className={`text-[10px] font-semibold ${accent === c.id ? 'text-white' : 'text-slate-500'}`}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Display */}
        <section className="bg-surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="font-semibold">Display</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">AMOLED Mode</div>
                <div className="text-xs text-slate-400 mt-0.5">Pure black background — saves battery on OLED screens</div>
              </div>
              <button
                onClick={() => saveAmoled(!amoled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${amoled ? 'bg-primary' : 'bg-slate-600'}`}
                aria-checked={amoled}
                role="switch"
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${amoled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Live Match */}
        <section className="bg-surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="font-semibold">Live Match</h2>
            <p className="text-xs text-slate-400 mt-0.5">Applied during active stat recording</p>
          </div>
          <div className="p-4 divide-y divide-slate-700/60 space-y-0">

            {/* Keep Screen Awake */}
            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <div className="text-sm font-medium">Keep Screen Awake</div>
                <div className="text-xs text-slate-400 mt-0.5">Prevent the screen from sleeping during a match</div>
              </div>
              <button
                onClick={() => saveWakeLock(!wakeLock)}
                className={`relative w-11 h-6 rounded-full transition-colors ${wakeLock ? 'bg-primary' : 'bg-slate-600'}`}
                aria-checked={wakeLock}
                role="switch"
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${wakeLock ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Haptic Feedback */}
            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <div className="text-sm font-medium">Haptic Feedback</div>
                <div className="text-xs text-slate-400 mt-0.5">Brief vibration on each point scored</div>
              </div>
              <button
                onClick={() => saveHaptic(!hapticOn)}
                className={`relative w-11 h-6 rounded-full transition-colors ${hapticOn ? 'bg-primary' : 'bg-slate-600'}`}
                aria-checked={hapticOn}
                role="switch"
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${hapticOn ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Sound Effects */}
            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <div className="text-sm font-medium">Sound Effects</div>
                <div className="text-xs text-slate-400 mt-0.5">Audio cues for aces, kills, and blocks</div>
              </div>
              <button
                onClick={() => saveSounds(!soundsOn)}
                className={`relative w-11 h-6 rounded-full transition-colors ${soundsOn ? 'bg-primary' : 'bg-slate-600'}`}
                aria-checked={soundsOn}
                role="switch"
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${soundsOn ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Player name format */}
            <div className="py-3 first:pt-0 last:pb-0">
              <div className="text-sm font-medium mb-0.5">Player Name Format</div>
              <div className="text-xs text-slate-400 mb-3">How names appear on the player badge bar during a match</div>
              <div className="flex flex-col gap-1.5">
                {PLAYER_NAME_FORMATS.map(({ id, label, example }) => (
                  <button
                    key={id}
                    onClick={() => savePlayerNameFormat(id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                      playerNameFormat === id
                        ? 'bg-primary/20 border-primary text-white'
                        : 'bg-bg border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="font-medium">{label}</span>
                    <span className={`font-mono text-xs ${playerNameFormat === id ? 'text-primary' : 'text-slate-500'}`}>
                      {example}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lineup roster sort */}
            <div className="py-3 first:pt-0 last:pb-0">
              <div className="text-sm font-medium mb-0.5">Lineup Roster Sort</div>
              <div className="text-xs text-slate-400 mb-3">Order of players in the lineup builder dropdown</div>
              <div className="flex gap-2">
                {ROSTER_SORT_OPTIONS.map(({ id, label, example }) => (
                  <button
                    key={id}
                    onClick={() => saveRosterSort(id)}
                    className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border text-sm transition-colors ${
                      rosterSort === id
                        ? 'bg-primary/20 border-primary text-white'
                        : 'bg-bg border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="font-medium text-xs">{label}</span>
                    <span className={`font-mono text-[10px] ${rosterSort === id ? 'text-primary' : 'text-slate-500'}`}>{example}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Flip team layout */}
            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <div className="text-sm font-medium">Flip Team Layout</div>
                <div className="text-xs text-slate-400 mt-0.5">Show your team on the right side of the scoreboard</div>
              </div>
              <button
                onClick={() => saveFlipLayout(!flipLayout)}
                className={`relative w-11 h-6 rounded-full transition-colors ${flipLayout ? 'bg-primary' : 'bg-slate-600'}`}
                aria-checked={flipLayout}
                role="switch"
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${flipLayout ? 'translate-x-5' : ''}`} />
              </button>
            </div>

          </div>
        </section>

        {/* Match Rules */}
        <section className="bg-surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="font-semibold">Match Rules</h2>
            <p className="text-xs text-slate-400 mt-0.5">Applied to all future matches</p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Best of Sets</label>
              <div className="flex gap-2">
                {[FORMAT.BEST_OF_3, FORMAT.BEST_OF_5].map((f) => (
                  <button
                    key={f}
                    onClick={() => saveDefaultFormat(f)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                      ${defaultFormat === f
                        ? 'bg-primary text-white border-primary'
                        : 'bg-bg text-slate-300 border-slate-600 hover:border-slate-400'
                      }`}
                  >
                    {f === FORMAT.BEST_OF_3 ? 'Best of 3' : 'Best of 5'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Last Set Plays To</label>
              <div className="text-xs text-slate-500 mb-2">The deciding set win score (sets 1–{defaultFormat === FORMAT.BEST_OF_3 ? '2' : '4'} always play to 25)</div>
              <div className="flex gap-2">
                {[15, 25].map((n) => (
                  <button
                    key={n}
                    onClick={() => saveLastSetScore(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                      ${lastSetScore === n
                        ? 'bg-primary text-white border-primary'
                        : 'bg-bg text-slate-300 border-slate-600 hover:border-slate-400'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Max Substitutions per Set</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  className="w-24 bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
                  value={maxSubs}
                  min={1}
                  max={99}
                  onChange={(e) => saveMaxSubs(e.target.value)}
                />
                <span className="text-sm text-slate-400">per set</span>
                {maxSubs !== DEFAULT_MAX_SUBS && (
                  <button
                    className="text-xs text-slate-500 hover:text-slate-300 underline"
                    onClick={() => saveMaxSubs(DEFAULT_MAX_SUBS)}
                  >
                    Reset to {DEFAULT_MAX_SUBS}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Exports */}
        <section className="bg-surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="font-semibold">Exports</h2>
          </div>
          <div className="p-4">
            <label className="block text-sm font-medium mb-1">MaxPreps Team ID</label>
            <div className="text-xs text-slate-400 mb-2">
              Required for MaxPreps .txt export. Find it in your team's MaxPreps URL or stat import settings.
            </div>
            <input
              type="text"
              value={maxPrepsId}
              onChange={(e) => saveMaxPrepsId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-primary placeholder:text-slate-600"
            />
          </div>
        </section>

        {/* Data management */}
        <section className="bg-surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="font-semibold">Data Management</h2>
          </div>
          <div className="p-4 space-y-3">
            <Button className="w-full" variant="secondary" onClick={handleExport}>
              Export Full Backup (JSON)
            </Button>

            <Button
              className="w-full"
              variant="secondary"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? 'Importing…' : 'Import Backup (JSON)'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportPick}
            />

            <Button
              className="w-full"
              variant="secondary"
              onClick={() => setShowMerge(true)}
            >
              Merge from Backup (JSON)
            </Button>

            {autoBackups && autoBackups.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1.5">Auto-Saves</p>
                <div className="flex flex-col gap-1.5">
                  {autoBackups.map((b) => (
                    <div key={b.id} className="flex items-center justify-between bg-bg rounded-lg px-3 py-2 border border-slate-700">
                      <div>
                        <span className="text-xs font-semibold text-slate-300">
                          {b.label === 'match_end' ? 'Match End' : 'App Open'}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-2">
                          {new Date(b.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRestoreAutoBackup(b.id)}
                        disabled={restoringId === b.id}
                        className="text-xs font-semibold text-primary hover:text-orange-300 transition-colors disabled:opacity-50"
                      >
                        {restoringId === b.id ? 'Restoring…' : 'Restore'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full" variant="danger" onClick={() => setConfirmClear(true)}>
              Clear All Data
            </Button>
          </div>
        </section>

        {/* About */}
        <section className="bg-surface rounded-xl p-4">
          <h2 className="font-semibold mb-1">About</h2>
          <p className="text-sm text-slate-400">VANTAGE — Volleyball Stat Tracker</p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            VANTAGE is a comprehensive volleyball statistics platform built for coaches who want a competitive edge. Record every contact live during a match — serves, passes, attacks, blocks, and digs — and instantly access deep analytics: rotation efficiency, player VER ratings, win correlation insights, and real-time performance alerts. All data lives on your device, works offline, and requires no account or subscription. From pre-match lineup prep to post-match film review, VANTAGE gives your program the same data-driven tools used at the highest levels of the sport.
          </p>
          <p className="text-xs text-slate-500 mt-2">All data stored locally on this device. No account required.</p>

          {/* Help / FAQ */}
          <div className="mt-4">
            <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">Help &amp; Guide</p>
            <div className="space-y-1">
              {/* Step-by-step visual guides */}
              {[
                { to: '/help/default-team',   icon: '🏠', label: 'Setting Up Default Team & Season' },
                { to: '/help/serve-receive',  icon: '📐', label: 'Serve-Receive Formation Setup'    },
              ].map(({ to, icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg border border-primary/40 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base">{icon}</span>
                    <span className="text-sm font-medium text-slate-200">{label}</span>
                    <span className="text-[9px] font-bold text-primary border border-primary/50 rounded px-1 py-px">GUIDE</span>
                  </span>
                  <span className="text-slate-500 text-sm">›</span>
                </Link>
              ))}
              {/* FAQ modals */}
              {FAQ_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setHelpTopic(topic)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg border border-slate-700 hover:border-primary/60 hover:bg-primary/5 transition-colors text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base">{topic.icon}</span>
                    <span className="text-sm font-medium text-slate-200">{topic.label}</span>
                  </span>
                  <span className="text-slate-500 text-sm">›</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-4 flex-wrap">
            <Link to="/terms" className="text-xs text-primary hover:text-orange-300 transition-colors underline underline-offset-2">
              Terms &amp; Conditions
            </Link>
            {(() => {
              try {
                const raw = localStorage.getItem(TERMS_STORAGE_KEY);
                if (!raw) return null;
                let acceptedAt = null;
                try { acceptedAt = JSON.parse(raw).acceptedAt ?? null; } catch { /* old plain-string format */ }
                if (!acceptedAt) return <span className="text-xs text-slate-500">Agreed (date not recorded)</span>;
                const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
                return <span className="text-xs text-slate-500">Agreed {fmt.format(new Date(acceptedAt))}</span>;
              } catch { return null; }
            })()}
          </div>
        </section>

      </div>

      {/* Dialogs */}
      {confirmClear && (
        <ConfirmDialog
          title="Clear All Data"
          message="This will permanently delete all teams, players, matches, and stats. This cannot be undone."
          confirmLabel="Clear Everything"
          danger
          onConfirm={handleClearAll}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {confirmImport && (
        <ConfirmDialog
          title="Import Backup"
          message="This will REPLACE all existing data with the backup file. This cannot be undone. Export a backup first if you want to preserve current data."
          confirmLabel="Import & Replace"
          danger
          onConfirm={handleImportConfirm}
          onCancel={() => { setConfirmImport(false); setPendingFile(null); }}
        />
      )}

      {showMerge && (
        <MergeBackupModal
          onClose={() => setShowMerge(false)}
          onSuccess={() => showToast('Merge complete', 'success')}
        />
      )}

      <HelpModal topic={helpTopic} onClose={() => setHelpTopic(null)} />
    </div>
  );
}
