import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';

const BG      = '#000000';
const SURFACE = '#1e293b';
const SURFACE2= '#0f172a';
const BORDER  = '#334155';
const TXT     = '#f8fafc';
const TXT3    = '#cbd5e1';
const TXT4    = '#94a3b8';
const TXT5    = '#64748b';
const PRIMARY = '#f97316';
const EMERALD = '#34d399';
const BLUE    = '#60a5fa';

function Step({ number, title, note, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center shrink-0" style={{ background: PRIMARY }}>
          {number}
        </span>
        <span className="font-semibold text-white">{title}</span>
      </div>
      {note && <p className="text-sm text-slate-400 pl-10 leading-relaxed">{note}</p>}
      {children && <div className="pl-10">{children}</div>}
    </div>
  );
}

// ── Diagram: export menu buttons ──────────────────────────────────────────────
function DiagExportMenu() {
  const btns = [
    { label: '📄 Export PDF',     sub: 'Formatted stat sheet',      color: PRIMARY },
    { label: '📊 Export CSV',     sub: 'Spreadsheet-ready data',    color: BLUE    },
    { label: '🏆 MaxPreps CSV',   sub: 'Ready to upload',           color: EMERALD },
    { label: '📸 Share Card',     sub: 'Social image',              color: '#a855f7'},
  ];
  return (
    <svg viewBox="0 0 320 148" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="16" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">MATCH SUMMARY → EXPORT</text>
      {btns.map(({ label, sub, color }, i) => {
        const y = 24 + i * 31;
        return (
          <g key={label}>
            <rect x="8" y={y} width="304" height="26" rx="7"
              fill={`${color}15`} stroke={`${color}50`} strokeWidth="1" />
            <text x="20" y={y + 12} fill={color} fontSize="10" fontWeight="700">{label}</text>
            <text x="20" y={y + 22} fill={TXT5} fontSize="8">{sub}</text>
            <text x="305" y={y + 15} fill={TXT5} fontSize="12" textAnchor="end">›</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Diagram: share card preview ───────────────────────────────────────────────
function DiagShareCard() {
  return (
    <svg viewBox="0 0 320 140" className="w-full rounded-xl" style={{ background: BG }}>
      {/* card */}
      <rect x="40" y="6" width="240" height="128" rx="12" fill={SURFACE2} stroke={BORDER} strokeWidth="1" />
      {/* header */}
      <text x="160" y="24" fill={PRIMARY} fontSize="7" fontWeight="900" textAnchor="middle" letterSpacing="2">VANTAGE · MATCH RESULT</text>
      <text x="160" y="38" fill={TXT} fontSize="14" fontWeight="900" textAnchor="middle">vs. Lincoln HS</text>
      <text x="160" y="50" fill={TXT5} fontSize="8" textAnchor="middle">Oct 14 · Home · Conference</text>
      {/* result */}
      <text x="252" y="44" fill={EMERALD} fontSize="22" fontWeight="900" textAnchor="middle">W 3–1</text>
      {/* divider */}
      <line x1="56" y1="58" x2="264" y2="58" stroke={BORDER} strokeWidth="0.5" />
      {/* stat grid */}
      {[
        { label: 'HIT%', val: '.312', x: 80  },
        { label: 'ACE%', val: '7.4%', x: 133 },
        { label: 'APR',  val: '2.41', x: 186 },
        { label: 'SO%',  val: '68%',  x: 239 },
      ].map(({ label, val, x }) => (
        <g key={label}>
          <rect x={x - 24} y="64" width="48" height="36" rx="6" fill={SURFACE} />
          <text x={x} y="76" fill={TXT5} fontSize="7" textAnchor="middle">{label}</text>
          <text x={x} y="92" fill={PRIMARY} fontSize="13" fontWeight="900" textAnchor="middle">{val}</text>
        </g>
      ))}
      {/* footer */}
      <text x="160" y="122" fill={TXT5} fontSize="7" textAnchor="middle">Tracked with VANTAGE by SHUA</text>
    </svg>
  );
}

// ── Diagram: PDF preview ──────────────────────────────────────────────────────
function DiagPDF() {
  return (
    <svg viewBox="0 0 320 130" className="w-full rounded-xl" style={{ background: SURFACE }}>
      {/* page frame */}
      <rect x="60" y="8" width="200" height="114" rx="4" fill="white" stroke={BORDER} strokeWidth="1" />
      {/* header bar */}
      <rect x="60" y="8" width="200" height="20" rx="4" fill={SURFACE2} />
      <rect x="60" y="20" width="200" height="8" fill={SURFACE2} />
      <text x="160" y="21" fill={PRIMARY} fontSize="7" fontWeight="900" textAnchor="middle" letterSpacing="1">VANTAGE MATCH REPORT</text>
      {/* team row */}
      <text x="72" y="38" fill={SURFACE2} fontSize="7" fontWeight="700">Lincoln HS · Oct 14 · W 3–1</text>
      <line x1="68" y1="42" x2="252" y2="42" stroke="#e2e8f0" strokeWidth="0.5" />
      {/* stat rows */}
      {[
        ['Player','SA','ACE','K','HIT%','APR','VER'],
        ['Harris','18','3','14','.341','—','+22.1'],
        ['Kim','16','2','2','.180','2.6','+14.8'],
        ['Patel','4','0','8','.290','—','+11.2'],
        ['TOTALS','62','9','38','.298','2.4','—'],
      ].map((row, ri) => {
        const y = 52 + ri * 13;
        const isHeader = ri === 0;
        const isTotals = ri === 4;
        return (
          <g key={ri}>
            {(isHeader || isTotals) && <rect x="68" y={y - 9} width="184" height="12" fill={isHeader ? '#f1f5f9' : '#f8fafc'} />}
            {row.map((cell, ci) => {
              const xs = [72, 104, 122, 140, 158, 186, 214, 244];
              return (
                <text key={ci} x={xs[ci]} y={y}
                  fill={SURFACE2} fontSize="6"
                  fontWeight={isHeader || isTotals ? '700' : '400'}
                  textAnchor={ci === 0 ? 'start' : 'middle'}>{cell}</text>
              );
            })}
          </g>
        );
      })}
      <line x1="68" y1="115" x2="252" y2="115" stroke="#e2e8f0" strokeWidth="0.5" />
      <text x="160" y="122" fill="#94a3b8" fontSize="5" textAnchor="middle">Generated by VANTAGE</text>
    </svg>
  );
}

// ── Diagram: backup section ───────────────────────────────────────────────────
function DiagBackup() {
  const btns = [
    { label: '⬆ Export Backup',  sub: 'Download full .json backup', color: PRIMARY },
    { label: '⬇ Import Backup',  sub: 'Replace all data from file',  color: BLUE    },
    { label: '🔀 Merge Backup',  sub: 'Add data without replacing',  color: EMERALD },
  ];
  return (
    <svg viewBox="0 0 320 112" className="w-full rounded-xl" style={{ background: SURFACE }}>
      <text x="16" y="16" fill={TXT5} fontSize="8" fontWeight="900" letterSpacing="2">SETTINGS → DATA MANAGEMENT</text>
      {btns.map(({ label, sub, color }, i) => {
        const y = 24 + i * 29;
        return (
          <g key={label}>
            <rect x="8" y={y} width="304" height="24" rx="6"
              fill={`${color}12`} stroke={`${color}45`} strokeWidth="1" />
            <text x="20" y={y + 11} fill={color} fontSize="10" fontWeight="700">{label}</text>
            <text x="20" y={y + 21} fill={TXT5} fontSize="7.5">{sub}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function HelpExportingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Exporting & Sharing Stats" backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            VANTAGE can export individual match stats in multiple formats and back up your entire database for safekeeping. This guide covers every export option and when to use each one.
          </p>
        </div>

        <Step number={1} title="Open the export menu from Match Summary"
          note="After a match, navigate to Match Summary (tap the match on the Home or History screen). Tap the share / export icon in the top-right corner. The menu shows four options: PDF, CSV, MaxPreps CSV, and Share Card.">
          <DiagExportMenu />
        </Step>

        <Step number={2} title="PDF stat sheet — for printing and sending"
          note="PDF Export generates a formatted stat sheet showing all player stats for the match — serving, passing, attacking, blocking, defense, and VER. It's designed to be readable when printed on a single page. Share it with your athletic director, paste it into a team GroupMe, or email it to parents.">
          <DiagPDF />
        </Step>

        <Step number={3} title="Share Card — for social media"
          note="Share Card generates a clean graphical image showing the match result, set scores, and four key efficiency stats (HIT%, ACE%, APR, SO%). It's sized for posting on Instagram, Twitter, or any social platform. Tap Share Card, wait a moment for the image to render, then use your device's standard share sheet to send it anywhere.">
          <DiagShareCard />
        </Step>

        <Step number={4} title="CSV export — for spreadsheets"
          note="CSV Export downloads a comma-separated file with every player's raw stats for the match. Open it in Google Sheets, Excel, or Numbers. Useful if you want to do your own analysis, build a custom dashboard, or maintain an external season stats spreadsheet alongside VANTAGE." />

        <Step number={5} title="MaxPreps CSV — upload directly to MaxPreps"
          note="MaxPreps CSV formats the stats in the exact column order that MaxPreps expects for a box score upload. After downloading, log into maxpreps.com → your team's page → Statistics → Import. Browse to the downloaded file and upload. Stats will appear on your MaxPreps team page within minutes." />

        <Step number={6} title="Back up your entire database"
          note="All your data lives on-device. To protect it, open Settings → Data Management → Export Backup. This downloads a single .json file containing every team, player, season, match, and contact in your database. Store it in iCloud, Google Drive, or email it to yourself. If you get a new device or clear the app, use Import Backup to restore from that file.">
          <DiagBackup />
        </Step>

        <Step number={7} title="Merge backup — combine two devices"
          note="If you track stats on two devices (e.g., a phone during the match and a tablet for scouting), use Merge Backup to combine them. Open Settings → Data Management → Merge Backup. Browse to the backup from the second device. The app adds any records that don't already exist without overwriting your current data." />

        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips & notes</p>
          {[
            ['Export after every match', 'Make a habit of exporting a backup after each match. Since all data is on-device only, a backup is your only safety net if the browser cache is cleared or the device is lost.'],
            ['PDF includes team totals row', 'The PDF stat sheet has a Totals row at the bottom summing every column. This is the row most athletic directors and parents look at first — it gives the quick summary without needing to scan individual players.'],
            ['MaxPreps requires a free account', 'You need a free MaxPreps coach account to import box scores. If you don\'t have one, create it at maxpreps.com/coaches — it takes two minutes and unlocks the import feature.'],
            ['Share Card opens natively', 'On iOS, Share Card triggers the native iOS share sheet, so you can AirDrop it, save to Photos, or send via Messages directly. On Android it uses the native share intent with the same options.'],
          ].map(([title, body]) => (
            <div key={title} className="pl-10 flex gap-3">
              <span className="mt-0.5 shrink-0" style={{ color: PRIMARY }}>›</span>
              <div>
                <span className="text-slate-300 text-sm font-semibold">{title} — </span>
                <span className="text-slate-400 text-sm">{body}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
