// src/features/auction/AuctionPage.tsx
// The "Auction Table" page: every listed item, grouped into open for bids, coming soon and closed,
// with the viewer's points available to bid. The app switches pages with a `view` state in
// src/App.tsx, so it is one view entry there:
//   view === 'auction' ? <AuctionPage onOpenProfile={openProfile} onPointsChanged={refreshCurrentUser} /> : ...
import { useEffect, useRef } from 'react';
import { Award } from 'lucide-react';
import { AuctionCard } from './AuctionCard';
import type { AuctionStatus } from './auctionTypes';
import { t } from './i18n';
import { useAuctions } from './useAuctions';
import './auction.css';

const SECTIONS: AuctionStatus[] = ['LIVE', 'UPCOMING', 'ENDED'];

export interface AuctionPageProps {
  /** When given, bidders' names link to their profiles. */
  onOpenProfile?: (employeeId: string) => void;
  /** Called when the viewer's points total changes (an item they won has closed). */
  onPointsChanged?: () => void;
}

export function AuctionPage({ onOpenProfile, onPointsChanged }: AuctionPageProps) {
  const { data, isLoading, error, reload, placeBid } = useAuctions();

  // Winning an item spends points, which the header shows: tell the app when that total moves.
  const spent = data?.balance.spent;
  const lastSpent = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (spent === undefined) return;
    if (lastSpent.current !== undefined && lastSpent.current !== spent) onPointsChanged?.();
    lastSpent.current = spent;
  }, [spent, onPointsChanged]);

  function body() {
    if (isLoading && !data) {
      return (
        <p className="os-auc-status" role="status">
          {t('loading')}
        </p>
      );
    }
    if (error || !data) {
      return (
        <div className="os-auc-empty" role="alert">
          <p>{t('loadError')}</p>
          <button type="button" className="os-auc-btn os-auc-btn-quiet" onClick={reload}>
            {t('retry')}
          </button>
        </div>
      );
    }
    if (data.items.length === 0) {
      return (
        <div className="os-auc-empty">
          <h2>{t('empty.title')}</h2>
          <p>{t('empty.body')}</p>
        </div>
      );
    }

    return SECTIONS.map((status) => {
      const items = data.items.filter((item) => item.status === status);
      if (items.length === 0) return null;
      const headingId = `auction-${status.toLowerCase()}`;
      return (
        <section key={status} className="os-auc-section" aria-labelledby={headingId}>
          <h2 id={headingId} className="os-auc-section-title">
            {t(`sections.${status}`)}
          </h2>
          <ul className="os-auc-grid">
            {items.map((item) => (
              <li key={item.id}>
                <AuctionCard item={item} balance={data.balance} onBid={placeBid} onOpenProfile={onOpenProfile} />
              </li>
            ))}
          </ul>
        </section>
      );
    });
  }

  return (
    <main className="os-auc-page" id="main-content">
      <div className="os-auc-header">
        <div>
          <h1 className="os-auc-title">{t('pageTitle')}</h1>
          <p className="os-auc-intro">{t('pageIntro')}</p>
        </div>
        {data && (
          <div className="os-auc-balance" aria-live="polite">
            <span className="os-auc-balance-label">
              <Award size={15} aria-hidden="true" />
              {t('balance.label')}
            </span>
            <span className="os-auc-balance-value">{t('balance.points', { count: data.balance.available })}</span>
            {data.balance.held > 0 && <span className="os-auc-muted">{t('balance.held', { count: data.balance.held })}</span>}
            {data.balance.spent > 0 && <span className="os-auc-muted">{t('balance.spent', { count: data.balance.spent })}</span>}
          </div>
        )}
      </div>

      {body()}
    </main>
  );
}
