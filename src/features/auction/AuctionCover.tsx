// src/features/auction/AuctionCover.tsx
// Renders the auction lot cover:
// - If the item is UPCOMING (not yet out on the auction table for bidding),
//   it displays a stylized mystery Question Mark '?' cover.
// - Once the auction is out (LIVE or ENDED), the actual image uploaded by the admin
//   replaces the question mark.
import React from 'react';
import { Award, Lock, Sparkles } from 'lucide-react';
import type { AuctionItemDto } from './auctionTypes';

interface AuctionCoverProps {
  item: AuctionItemDto;
  variant?: 'spotlight' | 'thumbnail';
}

export const AuctionCover: React.FC<AuctionCoverProps> = ({ item, variant = 'thumbnail' }) => {
  const isUpcoming = item.status === 'UPCOMING';
  const isSpotlight = variant === 'spotlight';

  // 1. When not available yet (UPCOMING): Mystery Question Mark cover
  if (isUpcoming) {
    return (
      <div
        className={`os-forza-mystery-cover ${isSpotlight ? 'is-spotlight' : 'is-thumb'}`}
        role="img"
        aria-label={`Unrevealed auction item: ${item.name}`}
      >
        <div className="os-forza-carbon-bg" aria-hidden="true" />
        <div className="os-forza-crosshair top-left" aria-hidden="true" />
        <div className="os-forza-crosshair top-right" aria-hidden="true" />
        <div className="os-forza-crosshair bottom-left" aria-hidden="true" />
        <div className="os-forza-crosshair bottom-right" aria-hidden="true" />

        <div className="os-forza-mystery-content">
          <div className="os-forza-qm-wrapper">
            <span className="os-forza-qm-glow">?</span>
            <span className="os-forza-qm-text">?</span>
          </div>

          {isSpotlight && (
            <div className="os-forza-mystery-meta">
              <span className="os-forza-mystery-pill">
                <Lock size={13} aria-hidden="true" />
                CLASSIFIED REWARD
              </span>
              <p className="os-forza-mystery-hint">
                <Sparkles size={12} aria-hidden="true" />
                Admin image & full item reveal when bidding opens
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Once out (LIVE or ENDED): The actual image uploaded by admin replaces the question mark
  if (item.imageUrl) {
    return (
      <div className={`os-forza-image-cover ${isSpotlight ? 'is-spotlight' : 'is-thumb'} ${item.status === 'ENDED' ? 'is-ended' : ''}`}>
        <img
          src={item.imageUrl}
          alt={item.name}
          className="os-forza-cover-img"
          loading={isSpotlight ? 'eager' : 'lazy'}
        />
        <div className="os-forza-cover-overlay" aria-hidden="true" />
      </div>
    );
  }

  // 3. Fallback when out but admin didn't upload a picture: sleek Sandoz reward emblem
  return (
    <div className={`os-forza-fallback-cover ${isSpotlight ? 'is-spotlight' : 'is-thumb'} ${item.status === 'ENDED' ? 'is-ended' : ''}`}>
      <div className="os-forza-fallback-icon">
        <Award size={isSpotlight ? 54 : 32} strokeWidth={1.5} />
      </div>
      <span className="os-forza-fallback-label">OurShout Reward</span>
    </div>
  );
};

