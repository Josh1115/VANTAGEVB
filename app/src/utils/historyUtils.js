// Shared utilities for season history display used by HistoryPage and RecordsPage.

export function toTitleArr(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  return val ? [String(val)] : [];
}

// Word-wrap helper for SVG text — returns array of uppercase lines
export function wrapSvgText(text, maxChars) {
  if (!text) return [];
  const words = String(text).toUpperCase().split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length > maxChars && line) { lines.push(line); line = word; }
    else { line = test; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// Handles edge cases: 11th, 12th, 13th, 21st, etc.
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function titlePriority(title) {
  const t = String(title).toLowerCase();
  if (t.includes('super sectional') || t.includes('supersectional')) return 4;
  if (t.includes('state'))      return 5;
  if (t.includes('sectional'))  return 3;
  if (t.includes('regional'))   return 2;
  if (t.includes('conference')) return 1;
  return 6;
}
