import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Spinner } from './components/ui/Spinner';
import { PlanGate } from './components/shared/PlanGate';

// Eagerly loaded — tiny pages or always needed on first paint
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

// Lazily loaded — heavy pages only fetched when navigated to
const TeamsPage           = lazy(() => import('./pages/TeamsPage').then(m => ({ default: m.TeamsPage })));
const AllTimeRosterPage   = lazy(() => import('./pages/AllTimeRosterPage').then(m => ({ default: m.AllTimeRosterPage })));
const TeamDetailPage   = lazy(() => import('./pages/TeamDetailPage').then(m => ({ default: m.TeamDetailPage })));
const PlayerStatsPage       = lazy(() => import('./pages/PlayerStatsPage').then(m => ({ default: m.PlayerStatsPage })));
const RotationOptimizerPage = lazy(() => import('./pages/RotationOptimizerPage').then(m => ({ default: m.RotationOptimizerPage })));
const OpponentListPage      = lazy(() => import('./pages/OpponentListPage').then(m => ({ default: m.OpponentListPage })));
const OpponentDetailPage    = lazy(() => import('./pages/OpponentDetailPage').then(m => ({ default: m.OpponentDetailPage })));
const MatchSetupPage   = lazy(() => import('./pages/MatchSetupPage').then(m => ({ default: m.MatchSetupPage })));
const LiveMatchPage    = lazy(() => import('./pages/LiveMatchPage').then(m => ({ default: m.LiveMatchPage })));
const SetLineupPage    = lazy(() => import('./pages/SetLineupPage').then(m => ({ default: m.SetLineupPage })));
const MatchSummaryPage = lazy(() => import('./pages/MatchSummaryPage').then(m => ({ default: m.MatchSummaryPage })));
const SeasonsPage      = lazy(() => import('./pages/SeasonsPage').then(m => ({ default: m.SeasonsPage })));
const SeasonDetailPage  = lazy(() => import('./pages/SeasonDetailPage').then(m => ({ default: m.SeasonDetailPage })));
const TeamSeasonPage    = lazy(() => import('./pages/TeamSeasonPage').then(m => ({ default: m.TeamSeasonPage })));
const RecordsPage      = lazy(() => import('./pages/RecordsPage').then(m => ({ default: m.RecordsPage })));
const HistoryPage      = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const ReportsPage      = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage     = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const UpgradePage      = lazy(() => import('./pages/UpgradePage').then(m => ({ default: m.UpgradePage })));
const ToolsPage        = lazy(() => import('./pages/ToolsPage').then(m => ({ default: m.ToolsPage })));
const ServeReceivePage = lazy(() => import('./pages/tools/ServeReceivePage').then(m => ({ default: m.ServeReceivePage })));
const ServeTrackerPage = lazy(() => import('./pages/tools/ServeTrackerPage').then(m => ({ default: m.ServeTrackerPage })));
const PracticeGamePage = lazy(() => import('./pages/tools/PracticeGamePage').then(m => ({ default: m.PracticeGamePage })));
const TermsPage                = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const HelpServeReceivePage     = lazy(() => import('./pages/HelpServeReceivePage').then(m => ({ default: m.HelpServeReceivePage })));
const HelpDefaultTeamPage      = lazy(() => import('./pages/HelpDefaultTeamPage').then(m => ({ default: m.HelpDefaultTeamPage })));
const HelpMatchSummaryPage     = lazy(() => import('./pages/HelpMatchSummaryPage').then(m => ({ default: m.HelpMatchSummaryPage })));
const HelpPreMatchPrepPage     = lazy(() => import('./pages/HelpPreMatchPrepPage').then(m => ({ default: m.HelpPreMatchPrepPage })));
const HelpExportingPage        = lazy(() => import('./pages/HelpExportingPage').then(m => ({ default: m.HelpExportingPage })));
const HelpFirstMatchPage       = lazy(() => import('./pages/HelpFirstMatchPage').then(m => ({ default: m.HelpFirstMatchPage })));
const HelpLiveMatchPage        = lazy(() => import('./pages/HelpLiveMatchPage').then(m => ({ default: m.HelpLiveMatchPage })));
const HelpPlayerReportPage     = lazy(() => import('./pages/HelpPlayerReportPage').then(m => ({ default: m.HelpPlayerReportPage })));
const HelpReportsPage          = lazy(() => import('./pages/HelpReportsPage').then(m => ({ default: m.HelpReportsPage })));
const HelpRosterPage           = lazy(() => import('./pages/HelpRosterPage').then(m => ({ default: m.HelpRosterPage })));
const HelpSeasonHistoryPage    = lazy(() => import('./pages/HelpSeasonHistoryPage').then(m => ({ default: m.HelpSeasonHistoryPage })));
const HelpSubstitutionsPage    = lazy(() => import('./pages/HelpSubstitutionsPage').then(m => ({ default: m.HelpSubstitutionsPage })));
const HelpEndSeasonPage           = lazy(() => import('./pages/HelpEndSeasonPage').then(m => ({ default: m.HelpEndSeasonPage })));
const HelpVantageWinFactorsPage   = lazy(() => import('./pages/HelpVantageWinFactorsPage').then(m => ({ default: m.HelpVantageWinFactorsPage })));
const HelpVantageRotationsPage    = lazy(() => import('./pages/HelpVantageRotationsPage').then(m => ({ default: m.HelpVantageRotationsPage })));
const HelpVantageAttackPage       = lazy(() => import('./pages/HelpVantageAttackPage').then(m => ({ default: m.HelpVantageAttackPage })));

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-48">
      <Spinner />
    </div>
  );
}

function S({ children }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true,                         element: <HomePage /> },
      { path: 'teams',                       element: <S><TeamsPage /></S> },
      { path: 'orgs/:orgId/all-time-roster', element: <S><AllTimeRosterPage /></S> },
      { path: 'teams/:teamId',               element: <S><TeamDetailPage /></S> },
      { path: 'teams/:teamId/players/:playerId', element: <S><PlayerStatsPage /></S> },
      { path: 'teams/:teamId/optimizer',        element: <S><RotationOptimizerPage /></S> },
      { path: 'opponents',                      element: <PlanGate requires="core" feature="Opponent scouting"><S><OpponentListPage /></S></PlanGate> },
      { path: 'opponents/:oppId',               element: <PlanGate requires="core" feature="Opponent scouting"><S><OpponentDetailPage /></S></PlanGate> },
      { path: 'seasons',                     element: <S><SeasonsPage /></S> },
      { path: 'seasons/:seasonId',            element: <S><SeasonDetailPage /></S> },
      { path: 'seasons/:seasonId/team',      element: <S><TeamSeasonPage /></S> },
      { path: 'matches/new',                 element: <S><MatchSetupPage /></S> },
      { path: 'matches/:matchId/live',        element: <S><LiveMatchPage /></S> },
      { path: 'matches/:matchId/set-lineup', element: <S><SetLineupPage /></S> },
      { path: 'matches/:matchId/summary',    element: <S><MatchSummaryPage /></S> },
      { path: 'records',                     element: <PlanGate requires="core" feature="Career records"><S><RecordsPage /></S></PlanGate> },
      { path: 'history',                     element: <PlanGate requires="core" feature="Season history"><S><HistoryPage /></S></PlanGate> },
      { path: 'reports',                     element: <PlanGate requires="core" feature="Analytics & reports"><S><ReportsPage /></S></PlanGate> },
      { path: 'settings',                    element: <S><SettingsPage /></S> },
      { path: 'upgrade',                     element: <S><UpgradePage /></S> },
      { path: 'tools',                       element: <PlanGate requires="core" feature="Practice tools"><S><ToolsPage /></S></PlanGate> },
      { path: 'tools/serve-receive',         element: <PlanGate requires="core" feature="Practice tools"><S><ServeReceivePage /></S></PlanGate> },
      { path: 'tools/serve-tracker',         element: <PlanGate requires="core" feature="Practice tools"><S><ServeTrackerPage /></S></PlanGate> },
      { path: 'tools/practice-game',         element: <PlanGate requires="core" feature="Practice tools"><S><PracticeGamePage /></S></PlanGate> },
      { path: 'terms',                       element: <S><TermsPage /></S> },
      { path: 'help/serve-receive',          element: <S><HelpServeReceivePage /></S> },
      { path: 'help/default-team',           element: <S><HelpDefaultTeamPage /></S> },
      { path: 'help/match-summary',          element: <S><HelpMatchSummaryPage /></S> },
      { path: 'help/pre-match-prep',         element: <S><HelpPreMatchPrepPage /></S> },
      { path: 'help/exporting',              element: <S><HelpExportingPage /></S> },
      { path: 'help/first-match',           element: <S><HelpFirstMatchPage /></S> },
      { path: 'help/live-match',            element: <S><HelpLiveMatchPage /></S> },
      { path: 'help/player-report',         element: <S><HelpPlayerReportPage /></S> },
      { path: 'help/reports',               element: <S><HelpReportsPage /></S> },
      { path: 'help/roster',                element: <S><HelpRosterPage /></S> },
      { path: 'help/season-history',        element: <S><HelpSeasonHistoryPage /></S> },
      { path: 'help/substitutions',         element: <S><HelpSubstitutionsPage /></S> },
      { path: 'help/end-season',            element: <S><HelpEndSeasonPage /></S> },
      { path: 'help/vantage-win-factors',   element: <S><HelpVantageWinFactorsPage /></S> },
      { path: 'help/vantage-rotations',     element: <S><HelpVantageRotationsPage /></S> },
      { path: 'help/vantage-attack',        element: <S><HelpVantageAttackPage /></S> },
      { path: '*',                           element: <NotFoundPage /> },
    ],
  },
]);
