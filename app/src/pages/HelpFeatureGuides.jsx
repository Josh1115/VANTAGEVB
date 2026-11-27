import { PageHeader } from '../components/layout/PageHeader';
import { BG, HelpStep as Step } from './helpTheme';

// Text-first guides for newer features. Each page = intro + numbered steps + tips,
// the same layout as the other Help pages.
function GuidePage({ title, intro, steps, tips = [] }) {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title={title} backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">
        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">What this guide covers</p>
          <p className="text-slate-400 text-sm leading-relaxed">{intro}</p>
        </div>
        {steps.map(([t, note], i) => <Step key={t} number={i + 1} title={t} note={note} />)}
        {tips.length > 0 && (
          <div className="space-y-3">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider pl-10">Tips</p>
            {tips.map(([t, body]) => (
              <div key={t} className="pl-10 flex gap-3">
                <span className="text-primary mt-0.5 shrink-0">›</span>
                <div>
                  <span className="text-slate-300 text-sm font-semibold">{t} — </span>
                  <span className="text-slate-400 text-sm">{body}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HelpSprayChartsPage() {
  return (
    <GuidePage
      title="Spray Charts"
      intro="Spray charts show where your attacks and serves go. Vantage builds them while you stat — this guide covers turning them on, recording shots, and reading the charts afterward."
      steps={[
        ['Turn the charts on or off', 'Settings → Live Match → Charts has two switches: Attack Shot Chart and Serve Attempt / Ace Spray Chart. You can also flip them mid-match from SETTINGS → Display in the match menu. When a chart is off, stats are still recorded — you just skip the court pop-up.'],
        ['Record an attack', 'After an attack (K, AE or ATT), the court pops up. Tap where the hitter hit from, then where the ball landed — or press where it was hit and drag to where it landed in one motion. For kills, the kill type and SET BY pills sit right above the court; for attack errors, the OB / NET / BLK / BRA pills do. Tap SAVE (NO SHOT) to skip charting.'],
        ['Record a serve', 'With the serve chart on, after a serve that lands in (ATT or ACE), tap where it landed on the opponent\'s court.'],
        ['Flip the court', 'Use FLIP to show your side on the right instead of the left. The app remembers your choice.'],
        ['Read the attack chart', 'Each line runs from where the ball was hit to where it landed: green circle = kill, red X = error, gray = kept in play. Above the court, the six zone boxes show kills, kill % and hitting % for balls that landed in each zone. Use the ALL / KILLS / ERRORS / IN PLAY pills to filter, and the player pills to look at one hitter.'],
        ['Read the serve chart', 'Serve placement shows where each serve landed, with ALL / FLOAT / TOP SPIN pills and a pill for each server (sorted by jersey number), plus ace and in-play counts.'],
        ['Where to find them', 'Stats → Players → Attacking (team shot chart) and Serving, the Match Summary, the timeout screen during a match, each player\'s page (Season tab), and the season page. The setter version, "Kills Off Sets", shows where a setter\'s sets were put away.'],
      ]}
      tips={[
        ['Out-of-bounds errors', 'A ball hit out never landed in a zone, so it doesn\'t count toward any zone\'s hitting %.'],
        ['Back row is automatic', 'If a kill was hit from behind the 10-foot line, BACK ROW is picked for you.'],
      ]}
    />
  );
}

export function HelpRecordsAwardsPage() {
  return (
    <GuidePage
      title="Records, Awards & History"
      intro="Every match you stat feeds your program's record book. This guide covers the Records and History tabs and each player's Awards tab — all filled in automatically."
      steps={[
        ['Records tab', 'Tap Records in the bottom bar for single-match, season and career leaders in kills, aces, blocks, assists, digs and more. Records you track from before Vantage can be typed in too.'],
        ['History tab', 'Tap History for every season\'s card: record, finish, titles (🏆 on championship rounds won), and top-3 season records. Pills at the top show program bests like Most Wins, Best Win %, Longest Playoff Run and Biggest Turnaround.'],
        ['Player Awards tab', 'Open any player → Awards. Filter by All, Awards, Records, Career or Milestones. Medals show the records a player holds; Career Club tracks totals (Kills, Digs and Assists from 100 to 1,000; Aces and Blocks from 25 to 200); Milestones count double-doubles, triple-doubles and 10+ games.'],
        ['All-time ranks', 'Once a season ends, the dashboard\'s SRV%, ACE% and HIT% boxes show where that season ranks all-time.'],
      ]}
      tips={[
        ['Back it up', 'The Records and History pages each have a CSV export at the bottom.'],
        ['End seasons properly', 'Ending a season (see How to End a Season) is what moves it into History and locks in its finish.'],
      ]}
    />
  );
}

export function HelpScoutingPage() {
  return (
    <GuidePage
      title="Opponent Scouting"
      intro="Scouting & Opponents keeps everything you know about each team in one place — your history against them and what they like to do."
      steps={[
        ['Open scouting', 'Tap Scouting & Opponents on the Dashboard to see every team you\'ve played or scheduled.'],
        ['History tab', 'Your all-time record against the opponent and every past match, with links to each match summary.'],
        ['Tendencies tab', 'Scouting notes by category — Serve Target, Attack Pattern, Defense Style, Rotation Strength and Rotation Weakness. After you stat a match against a team, Vantage offers to write notes for you from the stats; you review them before they\'re saved.'],
        ['Notes tab', 'Free-form notes for anything else — players to watch, coach habits, gym quirks.'],
      ]}
      tips={[
        ['Before the match', 'Check the opponent the morning of the game; the Next Match card on the Dashboard shows who\'s up next.'],
      ]}
    />
  );
}

export function HelpBenchToolsPage() {
  return (
    <GuidePage
      title="Between Sets & Timeouts"
      intro="Vantage is built to help you adjust during the match, not just after it. Two screens do most of that work: the timeout screen and the between-set lineup screen."
      steps={[
        ['Timeout screen', 'Call a timeout with one tap on the timeout box in the score header. A stats screen opens with tabs for Scoring, Insights, Trends, Serving, Passing, Attacking, Blocking, Defense, VER, Compare and Opp — switch between this SET and the whole MATCH. Tapped a timeout by mistake? Hit UNDO.'],
        ['Whiteboard during a timeout', 'The timeout screen includes a court whiteboard so you can draw up a play while players are in the huddle.'],
        ['Between sets', 'When a set ends you go to the next set\'s lineup screen. Alongside the lineup, stat boards show the score line, each player\'s stats with VER, how each rotation did, and a recap of the set.'],
        ['Live alerts', 'During play, the STATS button shows an orange dot when something needs your attention, like a rotation that\'s struggling compared to your season average.'],
      ]}
    />
  );
}

export function HelpCloudSyncPage() {
  return (
    <GuidePage
      title="Cloud Sync & Devices"
      intro="When you're signed in, Vantage keeps your data in sync across your phone, tablet and computer. This guide covers how that works and what to do if something looks off."
      steps={[
        ['It syncs on its own', 'Every time the app opens, and whenever your device comes back online, Vantage merges this device\'s data with the cloud. No internet in the gym? Keep statting — it syncs later.'],
        ['Sync Now', 'Settings → Data Management → Sync Now does the same thing on demand. Use it if a match isn\'t showing up on another device yet.'],
        ['Restore from Cloud', 'Replaces this device\'s data with the cloud copy — no merging. Only use it to set up a brand-new device.'],
        ['Backup files', 'Export Backup (Data Management) saves a file with all your data. Keep one after big matches as an extra safety net.'],
      ]}
      tips={[
        ['One device at a time', 'If two devices are statting at the exact same time, let one finish and sync before the other syncs.'],
        ['Sharing a login', 'A JV and Varsity coach can share one account; each sync folds the other coach\'s games in.'],
      ]}
    />
  );
}

export function HelpWhiteboardToolsPage() {
  return (
    <GuidePage
      title="Whiteboard & Practice Tools"
      intro="Vantage isn't only for matches. The Whiteboard and Practice Tools are on the Dashboard for drawing up plays and running drills."
      steps={[
        ['Whiteboard', 'Tap Whiteboard on the Dashboard to draw on a court — plays, rotations, serve-receive patterns. It\'s also built into the timeout screen during a match.'],
        ['Practice Game', 'Record kills, errors, digs and passes in a scrimmage without creating a real match.'],
        ['Serve Receive', 'Track pass ratings and averages during serve-receive drills.'],
        ['Serve Tracker', 'Log serves by zone, including net and out errors.'],
        ['Setter Reads', 'Randomize set calls for setter and block-reading drills.'],
      ]}
    />
  );
}
