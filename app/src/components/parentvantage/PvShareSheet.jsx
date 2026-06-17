import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
};

export function PvShareSheet({ match, teamName, logoDataUrl, onClose, onContinue, continueLabel }) {
  const [copied, setCopied] = useState(false);

  if (!match?.pv_token) return null;

  const shareUrl = `${window.location.origin}/fs/${match.pv_token}`;

  const status =
    match.status === 'in_progress' ? 'live' :
    match.status === 'complete'    ? 'final' :
    'scheduled';

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-slate-900 rounded-t-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center -mt-1 mb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-black text-white">FamilyScope</div>
            <div className="text-sm text-slate-400 mt-0.5">
              {teamName ? `${teamName} vs ${match.opponent_name}` : `vs ${match.opponent_name}`}
            </div>
            {match.date && (
              <div className="text-xs text-slate-500 mt-0.5">{fmtDate(match.date)}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status === 'live' && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
            {status === 'final' && (
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Final</span>
            )}
            {status === 'scheduled' && (
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Scheduled</span>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 text-xl leading-none ml-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="relative bg-white rounded-xl p-3">
            <QRCodeSVG value={shareUrl} size={180} level="M" />
            {logoDataUrl && (
              <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white border-2 border-slate-200 shadow-md flex items-center justify-center overflow-hidden">
                <img src={logoDataUrl} alt="Team logo" className="max-w-full max-h-full object-contain p-0.5" />
              </div>
            )}
          </div>
        </div>

        {/* URL + Copy */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono truncate">
            {shareUrl}
          </div>
          <button
            onClick={copyLink}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 ${
              copied ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Note */}
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          Parents open this link on their phone. Stats stream live while you&rsquo;re recording &mdash; no account needed.
        </p>

        {onContinue && (
          <button
            onClick={onContinue}
            className="w-full py-3 rounded-xl bg-primary text-white text-sm font-black tracking-wide active:scale-[0.98] transition-transform"
          >
            {continueLabel ?? 'Continue'}
          </button>
        )}
      </div>
    </div>
  );
}
