import { PageHeader } from '../components/layout/PageHeader';
import { SURFACE2 as BG, SURFACE, PRIMARY, TXT, TXT4, TXT5, GREEN, AMBER, RED, HelpStep as Step } from './helpTheme';

function DiagHittingScale() {
  const zones = [
    { label: 'Negative', range: 'below .000', color: RED,   desc: 'Errors > Kills' },
    { label: 'Struggling', range: '.000–.149', color: '#e8530b', desc: 'Breaking even' },
    { label: 'Average', range: '.150–.249',  color: AMBER,  desc: 'Competitive' },
    { label: 'Good',    range: '.250–.349',  color: '#86efac', desc: 'Strong offense' },
    { label: 'Elite',   range: '.350+',      color: GREEN,  desc: 'Dominant' },
  ];
  return (
    <svg viewBox="0 0 320 175" className="w-full rounded-xl" style={{ background: BG }}>
      <text x="16" y="18" fill={TXT5} fontSize="9" fontWeight="700" letterSpacing="1.5">HITTING EFFICIENCY (HIT%) SCALE</text>
      <text x="160" y="32" textAnchor="middle" fill={TXT4} fontSize="9">formula: (Kills − Errors) ÷ Attempts</text>
      {zones.map(({ label, range, color, desc }, i) => {
        const y = 42 + i * 26;
        return (
          <g key={label}>
            <rect x="12" y={y} width="296" height="22" rx="5" fill={`${color}18`} stroke={`${color}44`} strokeWidth="1" />
            <rect x="12" y={y} width="6" height="22" rx="3" fill={color} />
            <text x="26" y={y + 15} fill={color} fontSize="10" fontWeight="900">{label}</text>
            <text x="100" y={y + 15} fill={TXT4} fontSize="9" fontWeight="700">{range}</text>
            <text x="298" y={y + 15} textAnchor="end" fill={TXT5} fontSize="9">{desc}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DiagPassToAttack() {
  return (
    <svg viewBox="0 0 320 170" className="w-full rounded-xl" style={{ background: BG }}>
      <text x="16" y="18" fill={TXT5} fontSize="9" fontWeight="700" letterSpacing="1.5">PASS RATING → ATTACK EFFICIENCY</text>

      {[
        { pass: 'Pass 1', passColor: RED,   hit: '+.092', hitColor: RED,   k: '31%', w: '48%', note: 'Scramble attack' },
        { pass: 'Pass 2', passColor: AMBER, hit: '+.198', hitColor: AMBER, k: '38%', w: '58%', note: 'Limited sets' },
        { pass: 'Pass 3', passColor: GREEN, hit: '+.312', hitColor: GREEN, k: '47%', w: '71%', note: 'Full offense' },
      ].map(({ pass, passColor, hit, hitColor, k, w, note }, i) => {
        const y = 28 + i * 44;
        return (
          <g key={pass}>
            {/* Pass badge */}
            <rect x="12" y={y} width="52" height="36" rx="6" fill={`${passColor}22`} stroke={`${passColor}55`} strokeWidth="1" />
            <text x="38" y={y + 15} textAnchor="middle" fill={passColor} fontSize="10" fontWeight="900">{pass}</text>
            <text x="38" y={y + 28} textAnchor="middle" fill={passColor} fontSize="8">{note}</text>
            {/* Arrow */}
            <line x1="70" y1={y + 18} x2="84" y2={y + 18} stroke={TXT5} strokeWidth="1.5" />
            <polygon points={`84,${y+14} 90,${y+18} 84,${y+22}`} fill={TXT5} />
            {/* Stats */}
            <rect x="92" y={y} width="216" height="36" rx="6" fill={SURFACE} />
            <text x="148" y={y + 14} textAnchor="middle" fill={hitColor} fontSize="14" fontWeight="900">{hit}</text>
            <text x="148" y={y + 28} textAnchor="middle" fill={TXT5} fontSize="8" fontWeight="700">HIT%</text>
            <text x="210" y={y + 14} textAnchor="middle" fill={TXT4} fontSize="12" fontWeight="700">{k}</text>
            <text x="210" y={y + 28} textAnchor="middle" fill={TXT5} fontSize="8" fontWeight="700">K%</text>
            <text x="272" y={y + 14} textAnchor="middle" fill={TXT4} fontSize="12" fontWeight="700">{w}</text>
            <text x="272" y={y + 28} textAnchor="middle" fill={TXT5} fontSize="8" fontWeight="700">WIN%</text>
          </g>
        );
      })}

      <text x="160" y="162" textAnchor="middle" fill={TXT5} fontSize="9">Better passing → more attack options → more kills</text>
    </svg>
  );
}

function DiagISvsOOS() {
  return (
    <svg viewBox="0 0 320 155" className="w-full rounded-xl" style={{ background: BG }}>
      <text x="16" y="18" fill={TXT5} fontSize="9" fontWeight="700" letterSpacing="1.5">IN-SYSTEM vs OUT-OF-SYSTEM ATTACK</text>

      {/* Split bar */}
      <text x="16" y="36" fill={GREEN} fontSize="9" fontWeight="700">IS 68%</text>
      <rect x="54" y="26" width="210" height="10" rx="5" fill="#334155" />
      <rect x="54" y="26" width="143" height="10" rx="5" fill={GREEN} />
      <text x="272" y="36" fill={RED} fontSize="9" fontWeight="700">OOS 32%</text>

      {/* IS box */}
      <rect x="12" y="46" width="140" height="96" rx="8" fill={`${GREEN}18`} stroke={`${GREEN}44`} strokeWidth="1" />
      <text x="82" y="66" textAnchor="middle" fill={GREEN} fontSize="11" fontWeight="900">In System</text>
      <text x="82" y="82" textAnchor="middle" fill={TXT5} fontSize="8">Perfect pass (rated 3)</text>
      <text x="82" y="106" textAnchor="middle" fill={GREEN} fontSize="22" fontWeight="900">+.312</text>
      <text x="82" y="120" textAnchor="middle" fill={TXT5} fontSize="8" fontWeight="700">HIT%</text>
      <text x="82" y="135" textAnchor="middle" fill={TXT4} fontSize="9">47% K · 71% WIN</text>

      {/* OOS box */}
      <rect x="168" y="46" width="140" height="96" rx="8" fill={`${RED}18`} stroke={`${RED}44`} strokeWidth="1" />
      <text x="238" y="66" textAnchor="middle" fill={RED} fontSize="11" fontWeight="900">Out of System</text>
      <text x="238" y="82" textAnchor="middle" fill={TXT5} fontSize="8">Poor pass (rated 0–2)</text>
      <text x="238" y="106" textAnchor="middle" fill={RED} fontSize="22" fontWeight="900">+.118</text>
      <text x="238" y="120" textAnchor="middle" fill={TXT5} fontSize="8" fontWeight="700">HIT%</text>
      <text x="238" y="135" textAnchor="middle" fill={TXT4} fontSize="9">33% K · 52% WIN</text>
    </svg>
  );
}

function DiagPlayerAttack() {
  const players = [
    { name: 'KADEN',  hit: '+.348', k: '44%', color: GREEN },
    { name: 'TYLER',  hit: '+.241', k: '39%', color: AMBER },
    { name: 'MARCUS', hit: '+.156', k: '34%', color: AMBER },
    { name: 'DREW',   hit: '-.012', k: '28%', color: RED   },
  ];
  return (
    <svg viewBox="0 0 320 145" className="w-full rounded-xl" style={{ background: BG }}>
      <text x="16" y="18" fill={TXT5} fontSize="9" fontWeight="700" letterSpacing="1.5">PLAYER HITTING EFFICIENCY COMPARISON</text>
      <text x="220" y="18" textAnchor="end" fill={TXT5} fontSize="8">HIT%</text>
      <text x="298" y="18" textAnchor="end" fill={TXT5} fontSize="8">K%</text>
      {players.map(({ name, hit, k, color }, i) => {
        const y = 26 + i * 28;
        const barW = Math.max(0, (parseFloat(hit) + 0.05) / 0.45) * 160;
        return (
          <g key={name}>
            <rect x="12" y={y} width="296" height="24" rx="5" fill={SURFACE} />
            <text x="22" y={y + 16} fill={TXT4} fontSize="10" fontWeight="700">{name}</text>
            <rect x="80" y={y + 6} width="160" height="12" rx="3" fill="#334155" />
            <rect x="80" y={y + 6} width={barW} height="12" rx="3" fill={`${color}99`} />
            <text x="248" y={y + 16} textAnchor="end" fill={color} fontSize="11" fontWeight="900">{hit}</text>
            <text x="298" y={y + 16} textAnchor="end" fill={TXT4} fontSize="10" fontWeight="700">{k}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function HelpVantageAttackPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <PageHeader title="Attack Analytics" backTo="" />
      <div className="p-4 space-y-8 max-w-lg mx-auto pb-12">

        <div className="bg-surface rounded-xl p-4 border border-slate-700 space-y-2">
          <p className="text-white font-semibold">Score more points, give up fewer</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Attacking efficiency is the single biggest driver of set outcomes. The app breaks down your offense three ways: by efficiency (Hit%), by system quality (IS vs OOS), and by pass rating — giving you a complete picture of where kills come from and where errors leak.
          </p>
        </div>

        <div className="space-y-8">
          <Step number={1} title="Understand Hitting Efficiency"
            note="Hit% = (Kills − Errors) ÷ Attempts. It's the gold standard offensive metric because it penalizes errors and rewards kills in one number. A negative Hit% means your errors are hurting you more than your kills are helping.">
            <DiagHittingScale />
          </Step>

          <Step number={2} title="Find it in the app"
            note="Go to Reports → Team tab. Hit% appears in the Attacking section alongside K% and AE (attack errors). The Player Stats tab shows individual Hit% for every attacker — this is your most important per-player offensive metric." />

          <Step number={3} title="Compare your attackers"
            note="Use the Player Stats tab or the Hitting% bar chart in Reports to rank your hitters by efficiency. A player with low Hit% isn't just not scoring — their errors are actively giving the opponent points.">
            <DiagPlayerAttack />
          </Step>

          <Step number={4} title="Track In-System vs Out-of-System attack"
            note="In Reports → Team tab, the In System and Out of System boxes show how your offense performs when your passing is perfect vs. when it breaks down. The gap between these two numbers reveals how much your offense depends on good passing.">
            <DiagISvsOOS />
          </Step>

          <Step number={5} title="Follow the pass-to-attack chain"
            note="The Attack by Pass Rating section shows the direct connection between pass quality and attack efficiency. A Pass 3 attack should always outperform a Pass 1 attack — if the gap is small, your setter isn't leveraging perfect passes effectively.">
            <DiagPassToAttack />
          </Step>

          <Step number={6} title="Use the data in lineup decisions"
            note="If your IS Hit% is strong but OOS Hit% is weak, the fix is passing — not attacking. If both are weak, you have a hitting problem. Knowing which is the root cause tells you whether to work on serve receive or attack reps in practice." />
        </div>

        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pro Tips</p>
          {[
            ['AE/Set is as important as K/Set', 'A player with 8 kills and 4 errors (Hit% .200) helps less than a player with 6 kills and 1 error (Hit% .278). Fewer errors matter.'],
            ['Watch negative-HIT% attackers', 'If a player\'s Hit% drops negative in a match, their error rate has outpaced their kill rate. Consider a sub or a set distribution change before it compounds.'],
            ['IS Hit% should be .250+', 'If your In-System Hit% is below .250, your team isn\'t converting on its best offensive opportunities. This is a setter or hitter efficiency problem.'],
            ['Check the Transition boxes too', 'Free Ball attacks (after an opponent free ball) should be your highest-efficiency scenario — even better than IS. If they\'re not, your team isn\'t capitalizing on easy opportunities.'],
          ].map(([title, body]) => (
            <div key={title} className="flex gap-3">
              <span className="text-primary mt-0.5 shrink-0">›</span>
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
