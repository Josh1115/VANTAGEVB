import { useState, useRef, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function floodFillTransparent(imageData, width, height, targetRgb, tolerance) {
  const data = imageData.data;
  const [tr, tg, tb] = targetRgb;
  const visited = new Uint8Array(width * height);
  const queue = [];

  const thresh = tolerance * 3;
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  for (const [cx, cy] of corners) {
    const idx = cy * width + cx;
    if (!visited[idx]) { visited[idx] = 1; queue.push(idx); }
  }

  while (queue.length) {
    const pos = queue.pop();
    const di = pos * 4;
    const r = data[di], g = data[di + 1], b = data[di + 2];
    if (Math.abs(r - tr) + Math.abs(g - tg) + Math.abs(b - tb) > thresh) continue;
    data[di + 3] = 0;
    const x = pos % width;
    const y = Math.floor(pos / width);
    if (x > 0             && !visited[pos - 1])     { visited[pos - 1]     = 1; queue.push(pos - 1); }
    if (x < width - 1     && !visited[pos + 1])     { visited[pos + 1]     = 1; queue.push(pos + 1); }
    if (y > 0             && !visited[pos - width]) { visited[pos - width] = 1; queue.push(pos - width); }
    if (y < height - 1    && !visited[pos + width]) { visited[pos + width] = 1; queue.push(pos + width); }
  }
}

function blobToCanvas(blob, maxSize = 512) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > maxSize || h > maxSize) {
        const scale = maxSize / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
}

export function LogoPickerModal({ onSave, onClose }) {
  const [url, setUrl] = useState('');
  const [fetchState, setFetchState] = useState('idle'); // idle | loading | error | done
  const [errorMsg, setErrorMsg] = useState('');
  const [showFileInput, setShowFileInput] = useState(false);
  const [rawDataUrl, setRawDataUrl] = useState(null);
  const [processedDataUrl, setProcessedDataUrl] = useState(null);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [tolerance, setTolerance] = useState(30);
  const fileInputRef = useRef(null);

  const loadBlob = useCallback(async (blob) => {
    try {
      const dataUrl = await blobToCanvas(blob);
      setRawDataUrl(dataUrl);
      setProcessedDataUrl(null);
      setFetchState('done');
    } catch {
      setFetchState('error');
      setErrorMsg('Could not load image.');
    }
  }, []);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setFetchState('loading');
    setErrorMsg('');
    setRawDataUrl(null);
    setProcessedDataUrl(null);
    try {
      const res = await fetch(url.trim(), { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      await loadBlob(blob);
    } catch {
      setFetchState('error');
      setErrorMsg("Couldn't fetch this URL (likely CORS blocked). Save the image to your device and upload it below.");
      setShowFileInput(true);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFetchState('loading');
    setErrorMsg('');
    loadBlob(file);
  };

  const handleRemoveBg = () => {
    if (!rawDataUrl) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      floodFillTransparent(imageData, canvas.width, canvas.height, hexToRgb(bgColor), tolerance);
      ctx.putImageData(imageData, 0, 0);
      setProcessedDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = rawDataUrl;
  };

  const preview = processedDataUrl ?? rawDataUrl;

  return (
    <Modal
      title="Add Logo"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(preview)} disabled={!preview}>Use This Logo</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Logo URL</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              placeholder="https://upload.wikimedia.org/…"
            />
            <Button onClick={handleFetch} disabled={fetchState === 'loading' || !url.trim()}>
              {fetchState === 'loading' ? '…' : 'Fetch'}
            </Button>
          </div>
          {errorMsg && <p className="text-red-400 text-xs mt-1">{errorMsg}</p>}
        </div>

        {showFileInput && (
          <div>
            <label className="block text-sm text-slate-400 mb-1">Or upload from device</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200 file:text-sm cursor-pointer"
            />
          </div>
        )}

        {!showFileInput && fetchState === 'idle' && (
          <button
            type="button"
            onClick={() => setShowFileInput(true)}
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Upload from device instead
          </button>
        )}

        {rawDataUrl && (
          <div className="space-y-3">
            <div className="flex gap-6 items-end">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Original</p>
                <div className="w-24 h-24 rounded-lg bg-slate-700 flex items-center justify-center overflow-hidden">
                  <img src={rawDataUrl} alt="original" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
              {processedDataUrl && (
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">After removal</p>
                  <div className="w-24 h-24 rounded-lg bg-slate-700 flex items-center justify-center overflow-hidden"
                    style={{ backgroundImage: 'repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%)', backgroundSize: '12px 12px' }}>
                    <img src={processedDataUrl} alt="processed" className="max-w-full max-h-full object-contain" />
                  </div>
                </div>
              )}
            </div>

            <div className="border border-slate-700 rounded-lg p-3 space-y-3">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Remove Background</p>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-400 w-20 shrink-0">BG color</label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 w-12 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs text-slate-500 font-mono">{bgColor}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-400 w-20 shrink-0">Tolerance</label>
                <input
                  type="range" min={0} max={60} value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-slate-400 w-6 text-right tabular-nums">{tolerance}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRemoveBg}>Remove BG</Button>
                {processedDataUrl && (
                  <Button size="sm" variant="ghost" onClick={() => setProcessedDataUrl(null)}>Reset</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
