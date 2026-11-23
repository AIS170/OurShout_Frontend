// src/features/auction/AuctionPage.tsx
// Forza Auction House Experience:
// - Spotlight showcase for the currently selected auction lot
// - Left & Right arrow buttons and keyboard navigation (ArrowLeft / ArrowRight)
// - Horizontal lot carousel reel with smooth auto-scroll to the spotlight item
// - Unrevealed items (UPCOMING) display a mystery '?' question mark cover
// - Once out (LIVE or ENDED), the admin's uploaded photo replaces the '?'
import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Gavel,
  RefreshCw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { AuctionCard } from './AuctionCard';
import { AuctionSpotlight } from './AuctionSpotlight';
import type { AuctionItemDto, AuctionStatus } from './auctionTypes';
import { t } from './i18n';
import { useAuctions } from './useAuctions';
import './auction.css';

export interface AuctionPageProps {
  /** When given, bidders' names link to their profiles. */
  onOpenProfile?: (employeeId: string) => void;
  /** Called when the viewer's points total changes (an item they won has closed). */
  onPointsChanged?: () => void;
}

type FilterTab = 'ALL' | 'TRENDING' | 'LIVE' | 'UPCOMING' | 'ENDED';

export function AuctionPage({ onOpenProfile, onPointsChanged }: AuctionPageProps) {
  const { data, isLoading, error, reload, placeBid } = useAuctions();
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const carouselRef = useRef<HTMLUListElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Track points change to notify parent
  const spent = data?.balance.spent;
  const lastSpent = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (spent === undefined) return;
    if (lastSpent.current !== undefined && lastSpent.current !== spent) onPointsChanged?.();
    lastSpent.current = spent;
  }, [spent, onPointsChanged]);

  // Filter items
  const allItems = data?.items || [];

  // Trending/Popular items: ranked by bid count (descending), then current/starting bid
  const trendingItems = React.useMemo(() => {
    return allItems
      .filter((item) => item.bidCount > 0)
      .sort((a, b) => {
        if (b.bidCount !== a.bidCount) return b.bidCount - a.bidCount;
        return (b.currentBid ?? b.startingBid) - (a.currentBid ?? a.startingBid);
      });
  }, [allItems]);

  const filteredItems = React.useMemo(() => {
    if (filter === 'ALL') return allItems;
    if (filter === 'TRENDING') {
      return trendingItems.length > 0
        ? trendingItems
        : [...allItems].sort((a, b) => b.bidCount - a.bidCount);
    }
    return allItems.filter((item) => item.status === filter);
  }, [allItems, filter, trendingItems]);

  // Keep selected index in bounds when items or filter changes
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex]);

  // Smooth scroll active card into view
  useEffect(() => {
    if (filteredItems.length === 0) return;
    const cardEl = cardRefs.current[selectedIndex];
    if (cardEl && carouselRef.current) {
      cardEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedIndex, filteredItems]);

  // Arrow navigation handlers
  const handlePrev = () => {
    if (filteredItems.length === 0) return;
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
  };

  const handleNext = () => {
    if (filteredItems.length === 0) return;
    setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems.length]);

  if (isLoading && !data) {
    return (
      <main className="os-auc-page" id="main-content">
        <div className="os-forza-loading-box">
          <RefreshCw size={36} className="os-spinner" />
          <p>{t('loading')}</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="os-auc-page" id="main-content">
        <div className="os-auc-empty" role="alert">
          <p>{t('loadError')}</p>
          <button type="button" className="os-auc-btn os-auc-btn-quiet" onClick={reload}>
            {t('retry')}
          </button>
        </div>
      </main>
    );
  }

  if (allItems.length === 0) {
    return (
      <main className="os-auc-page" id="main-content">
        <div className="os-auc-empty">
          <Gavel size={44} strokeWidth={1.5} />
          <h2>{t('empty.title')}</h2>
          <p>{t('empty.body')}</p>
        </div>
      </main>
    );
  }

  const spotlightItem = filteredItems[selectedIndex] || filteredItems[0];
  const liveCount = allItems.filter((i) => i.status === 'LIVE').length;
  const upcomingCount = allItems.filter((i) => i.status === 'UPCOMING').length;
  const endedCount = allItems.filter((i) => i.status === 'ENDED').length;

  return (
    <main className="os-auc-page os-forza-theme" id="main-content">
      {/* Forza Header & Points HUD */}
      <div className="os-forza-header">
        <div className="os-forza-title-group">
          <div className="os-forza-badge-row">
            <span className="os-forza-top-pill">
              <Sparkles size={13} /> Sandoz Recognition Rewards
            </span>
          </div>
          <h1 className="os-forza-main-title">{t('pageTitle')}</h1>
          <p className="os-forza-main-intro">{t('pageIntro')}</p>
        </div>

        {/* Live Points Telemetry HUD */}
        <div className="os-forza-balance-hud" aria-live="polite">
          <div className="os-forza-hud-label">
            <Award size={16} aria-hidden="true" />
            <span>AVAILABLE TO BID</span>
          </div>
          <div className="os-forza-hud-points">
            <strong>{data.balance.available}</strong>
            <span>PTS</span>
          </div>
          <div className="os-forza-hud-sub">
            {data.balance.held > 0 && (
              <span className="os-forza-hud-tag held">
                {data.balance.held} pts held in leading bids
              </span>
            )}
            {data.balance.spent > 0 && (
              <span className="os-forza-hud-tag spent">
                {data.balance.spent} pts spent on won rewards
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Spotlight Section (The Featured Item) */}
      {spotlightItem && (
        <section aria-label="Spotlight Auction Item" className="os-forza-spotlight-wrapper">
          <div className="os-forza-spotlight-nav-header">
            <div className="os-forza-nav-hint">
              <span className="os-forza-spotlight-tag">
                <Flame size={14} /> ACTIVE SPOTLIGHT
              </span>
              <span className="os-forza-key-hint">
                Scroll with <kbd>◀</kbd> <kbd>▶</kbd> or click lots below
              </span>
            </div>

            {/* Carousel Arrow Controls */}
            <div className="os-forza-nav-arrows">
              <button
                type="button"
                onClick={handlePrev}
                className="os-forza-arrow-btn"
                aria-label="Previous auction lot"
                title="Previous lot (Left arrow key)"
              >
                <ChevronLeft size={22} />
              </button>
              <span className="os-forza-nav-counter">
                {selectedIndex + 1} / {filteredItems.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="os-forza-arrow-btn"
                aria-label="Next auction lot"
                title="Next lot (Right arrow key)"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>

          <AuctionSpotlight
            key={spotlightItem.id}
            item={spotlightItem}
            balance={data.balance}
            lotIndex={selectedIndex}
            totalLots={filteredItems.length}
            isTrendingTab={filter === 'TRENDING'}
            onBid={placeBid}
            onOpenProfile={onOpenProfile}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </section>
      )}

      {/* Carousel Track Section (Horizontal Reel of Auction Lots) */}
      <section className="os-forza-reel-section" aria-label="Auction Lots Carousel">
        <div className="os-forza-reel-header">
          <div className="os-forza-filter-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'ALL'}
              className={`os-forza-tab ${filter === 'ALL' ? 'is-active' : ''}`}
              onClick={() => {
                setFilter('ALL');
                setSelectedIndex(0);
              }}
            >
              All Lots ({allItems.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'TRENDING'}
              className={`os-forza-tab is-trending-tab ${filter === 'TRENDING' ? 'is-active' : ''}`}
              onClick={() => {
                setFilter('TRENDING');
                setSelectedIndex(0);
              }}
              title="Items with the most bids"
            >
              <Flame
                size={13}
                aria-hidden="true"
                style={{
                  color: filter === 'TRENDING' ? '#FDE68A' : '#F59E0B',
                  fill: filter === 'TRENDING' ? '#FDE68A' : 'none',
                  marginRight: '2px',
                }}
              />
              Trending ({trendingItems.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'LIVE'}
              className={`os-forza-tab ${filter === 'LIVE' ? 'is-active' : ''}`}
              onClick={() => {
                setFilter('LIVE');
                setSelectedIndex(0);
              }}
            >
              Live Bidding ({liveCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'UPCOMING'}
              className={`os-forza-tab ${filter === 'UPCOMING' ? 'is-active' : ''}`}
              onClick={() => {
                setFilter('UPCOMING');
                setSelectedIndex(0);
              }}
            >
              Coming Soon ({upcomingCount})
            </button>
            {endedCount > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'ENDED'}
                className={`os-forza-tab ${filter === 'ENDED' ? 'is-active' : ''}`}
                onClick={() => {
                  setFilter('ENDED');
                  setSelectedIndex(0);
                }}
              >
                Closed ({endedCount})
              </button>
            )}
          </div>

          {/* Reel Nav Controls */}
          <div className="os-forza-nav-arrows mini">
            <button
              type="button"
              onClick={handlePrev}
              className="os-forza-arrow-btn mini"
              aria-label="Previous auction lot"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="os-forza-arrow-btn mini"
              aria-label="Next auction lot"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Track */}
        <div className="os-forza-track-container">
          <ul ref={carouselRef} className="os-forza-carousel-track">
            {filteredItems.map((item, idx) => (
              <li
                key={item.id}
                ref={(el) => (cardRefs.current[idx] = el)}
                className="os-forza-track-item"
              >
                <AuctionCard
                  item={item}
                  balance={data.balance}
                  isSpotlight={idx === selectedIndex}
                  trendingRank={filter === 'TRENDING' ? idx + 1 : undefined}
                  onSelect={() => setSelectedIndex(idx)}
                  onOpenProfile={onOpenProfile}
                  onBid={placeBid}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
