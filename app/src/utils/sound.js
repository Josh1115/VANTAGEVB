import { getBoolStorage, STORAGE_KEYS } from './storage';

const SPEECH_MAP = {
  ace:   'ACE',
  kill:  'KILL',
  block: 'BLOCK',
};

// Pick the most robotic-sounding available voice, fall back to default.
function getRobotVoice() {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  // Prefer known synthetic/robotic voices by name keyword
  const robotKeywords = ['fred', 'zarvox', 'bahh', 'bells', 'boing', 'bubbles',
                         'cellos', 'deranged', 'good news', 'hysterical', 'junior',
                         'kathy', 'organ', 'pipe organ', 'princess', 'ralph',
                         'trinoids', 'whisper', 'wobble', 'eddy', 'flo',
                         'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley'];
  for (const kw of robotKeywords) {
    const match = voices.find(v => v.name.toLowerCase().includes(kw));
    if (match) return match;
  }
  // Fall back to any English voice
  return voices.find(v => v.lang?.startsWith('en')) ?? voices[0] ?? null;
}

function speakRobot(word) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.pitch  = 0.3;   // very low = robotic
  u.rate   = 0.75;  // slightly slower = deliberate
  u.volume = 1;
  const voice = getRobotVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export function playSound(type) {
  if (!getBoolStorage(STORAGE_KEYS.SOUNDS)) return;
  const word = SPEECH_MAP[type];
  if (word) speakRobot(word);
}
