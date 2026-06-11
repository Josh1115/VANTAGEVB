import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../db/schema';
import { PlanGate } from '../components/shared/PlanGate';
import { publishPvStats } from '../utils/supabase';
import { computeSnapshotPayload } from '../utils/pvSnapshot';
import { useMatchStore } from '../store/matchStore';
import { useUiStore } from '../store/uiStore';

function HubContent() {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [shareToken, setShareToken] = useState(null);
  const [lastPublished, setLastPublished] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  const broadcastEnabled = useMatchStore(s => s.broadcastEnabled);
  const startBroadcast   = useMatchStore(s => s.startBroadcast);
  const stopBroadcast    = useMatchStore(s => s.stopBroadcast);
  const matchId          = useMatchStore(s => s.matchId);
  const showToast        = useUiStore(s => s.showToast);

  useEffect(() => {
    db.teams.toArray().then(rows => {
      setTeams(rows);
      if (rows.length === 1) setSelectedTeamId(rows[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedTeamId) return;
    db.teams.get(selectedTeamId).then(team => {
      if (team?.share_token) {
        setShareToken(team.share_token);
      } else {
        generateToken(selectedTeamId, false);
      }
      setLastPublished(team?.pv_last_published ?? null);
    });
  }, [selectedTeamId]);

  const generateToken = useCallback(async (teamId, update = true) => {
    const token = crypto.randomUUID();
    await db.teams.update(teamId, { share_token: token });
    setShareToken(token);
    if (update) showToast('New share link generated', 'success');
  }, [showToast]);

  const shareUrl = shareToken
    ? `${window.location.origin}/pv/${shareToken}`
    : null;

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    if (!selectedTeamId || !shareToken) return;
    setPublishing(true);
    try {
      const team = await db.teams.get(selectedTeamId);
      const payload = await computeSnapshotPayload(selectedTeamId);
      await publishPvStats(shareToken, team?.name ?? '', payload);
      const now = new Date().toISOString();
      await db.teams.update(selectedTeamId, { pv_last_published: now });
      setLastPublished(now);
      showToast('Stats published to ParentVantage', 'success');
    } catch (err) {
      console.error('[PV] publish failed:', err);
      showToast('Publish failed — check your connection', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const toggleBroadcast = () => {
    if (!shareToken) return;
    if (broadcastEnabled) {
      stopBroadcast();
      showToast('Live broadcast stopped', 'info');
    } else {
      startBroadcast(shareToken);
      showToast('Live broadcast started', 'success');
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return null;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">ParentVantage HUB</h1>
        <p className="text-sm text-slate-400 mt-1">
          Share a live view with parents and fans — no account needed.
        </p>
      </div>

      {/* Team selector (shown only when multiple teams) */}
      {teams.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Team
          </label>
          <select
            value={selectedTeamId ?? ''}
            onChange={e => setSelectedTeamId(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm"
          >
            <option value="">Select a team…</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {selectedTeamId && shareToken && (
        <>
          {/* Share Link */}
          <div className="bg-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Share Link</span>
              <button
                onClick={() => setConfirmRegen(true)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Regenerate
              </button>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white rounded-xl p-3">
                <QRCodeSVG value={shareUrl} size={160} level="M" />
              </div>
            </div>

            {/* URL + Copy */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900/80 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono truncate">
                {shareUrl}
              </div>
              <button
                onClick={copyLink}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Publish Stats */}
          <div className="bg-slate-800 rounded-xl p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold text-white">Publish Stats</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Push season stats, charts, and match history to the parent view.
              </div>
            </div>
            {lastPublished && (
              <div className="text-xs text-slate-500">
                Last published: {fmtDate(lastPublished)}
              </div>
            )}
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-black tracking-wide disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {publishing ? 'Publishing…' : 'Publish Stats Now'}
            </button>
          </div>

          {/* Go Live */}
          <div className="bg-slate-800 rounded-xl p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold text-white">Live Broadcast</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Send real-time score and rally updates to parents during a match.
                {!matchId && ' Start a match to enable.'}
              </div>
            </div>
            <button
              onClick={toggleBroadcast}
              disabled={!matchId}
              className={`w-full py-2.5 rounded-xl text-sm font-black tracking-wide transition-all disabled:opacity-40 active:scale-[0.98] ${
                broadcastEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              {broadcastEnabled ? '● Broadcasting — Tap to Stop' : 'Go Live'}
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-slate-900/60 rounded-xl p-4">
            <div className="text-xs text-slate-400 leading-relaxed space-y-1">
              <div className="font-semibold text-slate-300 mb-2">How it works</div>
              <div>1. Share the QR code or link with parents before the match.</div>
              <div>2. Hit <strong className="text-white">Publish Stats</strong> to show season stats between matches.</div>
              <div>3. Hit <strong className="text-white">Go Live</strong> during a match to stream score updates in real time.</div>
            </div>
          </div>
        </>
      )}

      {/* Regen confirm modal */}
      {confirmRegen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="text-base font-black text-white">Regenerate Link?</div>
            <div className="text-sm text-slate-400">
              The old link will stop working immediately. Parents will need the new link to reconnect.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRegen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => { generateToken(selectedTeamId); setConfirmRegen(false); }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ParentVantageHubPage() {
  return (
    <PlanGate requires="core" feature="ParentVantage HUB">
      <HubContent />
    </PlanGate>
  );
}
