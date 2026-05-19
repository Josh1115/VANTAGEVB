import { getBoolStorage, STORAGE_KEYS } from './storage';

const SPEECH_MAP = {
  ace:   'ACE',
  kill:  'KILL',
  block: 'BLOCK',
};

function speakRobot(word) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(word);
  u.pitch  = 0.3;
  u.rate   = 0.75;
  u.volume = 1;
  synth.speak(u);
}

export function playSound(type) {
  if (!getBoolStorage(STORAGE_KEYS.SOUNDS)) return;
  const word = SPEECH_MAP[type];
  if (word) speakRobot(word);
}
