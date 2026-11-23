// src/features/leaderboard/Leaderboard.tsx
// Two top-3 boards (Most shouted out, Most shout-outs given) with a This month / All time switch.
// Used in the feed's right column and on the /leaderboard page.
//
//   <Leaderboard onOpenProfile={openProfile} />
//
// Plain React + leaderboard.css (Sandoz variables from src/index.css): no extra packages.
import { useId, useState } from 'react';
import type { LeaderboardEntry } from '../../shared/types';
import { t } from './i18n';
import './leaderboard.css';
import { useLeaderboard, type LeaderboardPeriod } from './useLeaderboard';

export interface LeaderboardProps {
  /** Called with an employee ID when a name is clicked; names are plain text without it. */
  onOpenProfile?: (employeeId: string) => void;
  /** Heading level of the card title (the two board titles are one level below). Default 2. */
  headingLevel?: 2 | 3;
  defaultPeriod?: LeaderboardPeriod;
}

const PERIODS: LeaderboardPeriod[] = ['month', 'all'];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Leaderboard({ onOpenProfile, headingLevel = 2, defaultPeriod = 'month' }: LeaderboardProps) {
  const [period, setPeriod] = useState<LeaderboardPeriod>(defaultPeriod);
  const { data, isLoading, error, reload } = useLeaderboard(period);
  const titleId = useId();
  const Title = `h${headingLevel}` as 'h2' | 'h3';
  const BoardTitle = `h${headingLevel + 1}` as 'h3' | 'h4';

  function renderBoard(key: 'mostShoutedOut' | 'mostShoutOutsGiven', entries: LeaderboardEntry[]) {
    const boardTitleId = `${titleId}-${key}`;
    return (
      <section className="os-lb-board" aria-labelledby={boardTitleId}>
        <BoardTitle id={boardTitleId} className="os-lb-board-title">
          {t(key)}
        </BoardTitle>
        {entries.length === 0 ? (
          <p className="os-lb-empty">{t(period === 'month' ? 'emptyMonth' : 'emptyAll')}</p>
        ) : (
          <ol className="os-lb-list">
            {entries.map((entry, index) => (
              <li key={entry.employee.employeeId} className="os-lb-item">
                <span className={`os-lb-rank os-lb-rank-${index + 1}`}>{t('rank', { rank: index + 1 })}</span>
                {/* The person's profile picture, or their initials when they have none. */}
                <span className="os-lb-avatar" aria-hidden="true">
                  {entry.employee.avatarUrl ? (
                    <img src={entry.employee.avatarUrl} alt="" />
                  ) : (
                    initials(entry.employee.name)
                  )}
                </span>
                <span className="os-lb-person">
                  {onOpenProfile ? (
                    <button
                      type="button"
                      className="os-lb-name os-lb-name-link"
                      aria-label={t('openProfile', { name: entry.employee.name })}
                      onClick={() => onOpenProfile(entry.employee.employeeId)}
                    >
                      {entry.employee.name}
                    </button>
                  ) : (
                    <span className="os-lb-name">{entry.employee.name}</span>
                  )}
                  <span className="os-lb-team">{entry.employee.teamName}</span>
                </span>
                <span className="os-lb-count">{t('count', { count: entry.count })}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  }

  return (
    <section className="os-lb" aria-labelledby={titleId} aria-busy={isLoading}>
      <div className="os-lb-header">
        <Title id={titleId} className="os-lb-title">
          {t('title')}
        </Title>
        <div className="os-lb-switch" role="group" aria-label={t('period.label')}>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className="os-lb-switch-btn"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
            >
              {t(`period.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && !data ? (
        <p className="os-lb-status" role="status">
          {t('loading')}
        </p>
      ) : error || !data ? (
        <div className="os-lb-status os-lb-error" role="alert">
          <span>{t('loadError')}</span>
          <button type="button" className="os-lb-retry" onClick={reload}>
            {t('retry')}
          </button>
        </div>
      ) : (
        <div className="os-lb-boards">
          {renderBoard('mostShoutedOut', data.mostShoutedOut)}
          {renderBoard('mostShoutOutsGiven', data.mostShoutOutsGiven)}
        </div>
      )}
    </section>
  );
}
