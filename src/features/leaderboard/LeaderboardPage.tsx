// src/features/leaderboard/LeaderboardPage.tsx
// The /leaderboard page: the same <Leaderboard />, with room for the two boards side by side.
// The app switches pages with a `view` state in src/App.tsx, so adding it there is one view entry:
//   view === 'leaderboard' ? <LeaderboardPage onOpenProfile={openProfile} /> : ...
import { Leaderboard, type LeaderboardProps } from './Leaderboard';
import { t } from './i18n';
import './leaderboard.css';

export function LeaderboardPage({ onOpenProfile }: Pick<LeaderboardProps, 'onOpenProfile'>) {
  return (
    <main className="os-lb-page" id="main-content">
      <h1 className="os-lb-page-title">{t('pageTitle')}</h1>
      <p className="os-lb-page-intro">{t('pageIntro')}</p>
      <Leaderboard onOpenProfile={onOpenProfile} headingLevel={2} />
    </main>
  );
}
