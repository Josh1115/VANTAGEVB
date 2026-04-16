import { getBoolStorage, STORAGE_KEYS } from './storage';

function getCtx() {
  // Re-create if the browser closed the context (resource pressure, etc.)
  if (window._vbAudioCtx?.state === 'closed') delete window._vbAudioCtx;
  if (!window._vbAudioCtx) {
    window._vbAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  const ac = window._vbAudioCtx;
  // Resume if the browser suspended the context after backgrounding the tab
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(ac, freq, startTime, duration, gainPeak = 0.28, type = 'sine') {
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.connect(g);
  g.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

export function playSound(type) {
  if (!getBoolStorage(STORAGE_KEYS.SOUNDS)) return;
  try {
    const ac = getCtx();
    const t  = ac.currentTime;
    switch (type) {
      case 'ace':
        // Two ascending bright tones — celebratory "woo"
        tone(ac, 880,  t,        0.13, 0.22, 'sine');
        tone(ac, 1320, t + 0.11, 0.18, 0.28, 'sine');
        break;
      case 'kill':
        // Short punchy descending thud
        tone(ac, 300, t,        0.08, 0.25, 'sawtooth');
        tone(ac, 180, t + 0.06, 0.12, 0.20, 'sawtooth');
        break;
      case 'block':
        // Low solid thump
        tone(ac, 120, t,        0.18, 0.30, 'square');
        tone(ac, 90,  t + 0.05, 0.14, 0.15, 'sine');
        break;
    }
  } catch {
    // AudioContext unavailable (SSR, restrictive browser policy, etc.)
  }
}
