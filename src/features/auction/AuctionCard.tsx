// src/features/auction/AuctionCard.tsx
// Compact lot card used in the Forza Auction House horizontal carousel.
// Clicking puts the lot into the main Spotlight.
// Shows a mystery '?' cover when UPCOMING, or the admin's uploaded photo when LIVE/ENDED.
import React from 'react';
import { Award, Clock, Flame, Trophy } from 'lucide-react';
import { AuctionCover } from './AuctionCover';
import type { AuctionBalanceDto, AuctionItemDto } from './auctionTypes';
import { t } from './i18n';

export interface AuctionCardProps {
  item: AuctionItemDto;
  balance?: AuctionBalanceDto;
  isSpotlight?: boolean;
  onSelect?: () => void;
  /** Legacy props for backward compatibility */
  onBid?: (itemId: number, amount: number) => Promise<AuctionItemDto>;
  onOpenProfile?: (employeeId: string) => void;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({
  item,
  isSpotlight = false,
  onSelect,
}) => {
  const isLive = item.status === 'LIVE';
  const isUpcoming = item.status === 'UPCOMING';
  const isEnded = item.status === 'ENDED';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={`os-forza-card ${isSpotlight ? 'is-spotlight-active' : ''} ${isEnded ? 'is-ended' : ''}`}
      aria-label={`${item.name}, ${isLive ? 'Live auction' : isUpcoming ? 'Coming soon' : 'Ended'}`}
      aria-current={isSpotlight ? 'true' : undefined}
    >
      {/* Thumbnail Stage with Question Mark if UPCOMING, or uploaded image if LIVE/ENDED */}
      <div className="os-forza-card-media-wrapper">
        <AuctionCover item={item} variant="thumbnail" />

        {/* Status Pill Badge */}
        <div className="os-forza-card-badge-pos">
          {isLive && (
            <span className="os-forza-card-pill is-live">
              <span className="os-forza-dot" /> LIVE
            </span>
          )}
          {isUpcoming && (
            <span className="os-forza-card-pill is-upcoming">
              <Clock size={11} /> SOON
            </span>
          )}
          {isEnded && (
            <span className="os-forza-card-pill is-ended">
              <Trophy size={11} /> CLOSED
            </span>
          )}
        </div>

        {isSpotlight && (
          <div className="os-forza-card-active-tag">
            <span>SPOTLIGHT</span>
          </div>
        )}
      </div>

      {/* Lot Details */}
      <div className="os-forza-card-content">
        <h3 className="os-forza-card-title" title={item.name}>
          {item.name}
        </h3>

        <div className="os-forza-card-bid-row">
          <div className="os-forza-card-bid-block">
            <span className="os-forza-card-bid-label">
              {item.currentBid !== null ? 'Top Bid' : 'Starting Bid'}
            </span>
            <div className="os-forza-card-bid-val">
              <strong>{item.currentBid !== null ? item.currentBid : item.startingBid}</strong>
              <span className="os-forza-card-pts">pts</span>
            </div>
          </div>

          {isLive && item.bidCount > 0 && (
            <div className="os-forza-card-bids-count" title={`${item.bidCount} bids`}>
              <Flame size={12} />
              <span>{item.bidCount}</span>
            </div>
          )}
        </div>

        {item.leadingIsMe && (
          <div className="os-forza-card-leading-badge">
            Leading
          </div>
        )}
      </div>
    </div>
  );
};
