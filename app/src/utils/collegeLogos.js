// College logos for commits. public/colleges.json is a list of ~800 schools
// ({ id, n: school, d: school + mascot }) built from ESPN's college team lists;
// `id` is ESPN's team id, which names the logo image on their CDN.
// A coach-uploaded logo (small data URL) always wins over the ESPN one.

let collegesPromise = null;

export function loadColleges() {
  if (!collegesPromise) {
    collegesPromise = fetch('/colleges.json')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => { collegesPromise = null; return []; });
  }
  return collegesPromise;
}

export const espnLogoUrl = (id) => `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;

// "University of Wisconsin–Madison" / "Wisconsin" / "wisconsin badgers" → "wisconsin"
export function normalizeCollege(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[–—-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\b(the|university|univ|of|college)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Exact (normalized) match on school or school+mascot name, for commits that
// were typed in without picking from the list.
export function findCollege(list, name) {
  const key = normalizeCollege(name);
  if (!key) return null;
  return list.find((c) => normalizeCollege(c.n) === key || normalizeCollege(c.d) === key) ?? null;
}

// Up to `limit` suggestions: names starting with the query first, then contains.
export function searchColleges(list, query, limit = 8) {
  const q = normalizeCollege(query);
  if (q.length < 2) return [];
  const starts = [];
  const contains = [];
  for (const c of list) {
    const n = normalizeCollege(c.d);
    if (n.startsWith(q)) starts.push(c);
    else if (n.includes(q)) contains.push(c);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

// Shrinks an uploaded image to a small square-fit PNG data URL so it stays
// light enough to sync with the rest of the commit record.
export function imageFileToLogoDataUrl(file, size = 128) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(size / img.width, size / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Not an image')); };
    img.src = url;
  });
}
