// src/features/auction/AuctionSpotlight.tsx
// Forza-style hero spotlight for the currently selected auction lot.
// Features widescreen cinematic preview, real-time telemetry HUD, quick-bid chips,
// countdown timers, and bidder profile link.
import React, { useEffect, useState, type FormEvent } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Gavel,
  Lock,
  Sparkles,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import { formatFullDate } from '../../components/feed/relativeTime';
import { AuctionCover } from './AuctionCover';
import type { AuctionBalanceDto, AuctionBidder, AuctionItemDto } from './auctionTypes';
import { t } from './i18n';

interface AuctionSpotlightProps {
  item: AuctionItemDto;
  balance: AuctionBalanceDto;
  lotIndex: number;
  totalLots: number;
  onBid: (itemId: number, amount: number) => Promise<AuctionItemDto>;
  onOpenProfile?: (employeeId: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

const initials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

function formatTimeRemaining(targetIso: string): { label: string; urgent: boolean; isPast: boolean } {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return { label: '00:00:00', urgent: true, isPast: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const pad = (n: number) => String(n).padStart(2, '0');
  const urgent = days === 0 && hours < 2;

  if (days > 0) {
    return { label: `${days}d ${hours}h ${pad(minutes)}m`, urgent: false, isPast: false };
  }
  return { label: `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`, urgent, isPast: false };
}

export const AuctionSpotlight: React.FC<AuctionSpotlightProps> = ({
  item,
  balance,
  lotIndex,
  totalLots,
  onBid,
  onOpenProfile,
  onPrev,
  onNext,
}) => {
  const [amount, setAmount] = useState(String(item.minNextBid));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState('');

  // Live countdown state ticking every second
  const targetDate = item.status === 'UPCOMING' ? item.startsAt : item.endsAt;
  const [countdown, setCountdown] = useState(() => formatTimeRemaining(targetDate));

  useEffect(() => {
    setCountdown(formatTimeRemaining(targetDate));
    const timer = setInterval(() => {
      setCountdown(formatTimeRemaining(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  // Adjust amount input when minNextBid changes
  useEffect(() => {
    setAmount((cur) => (Number(cur) >= item.minNextBid ? cur : String(item.minNextBid)));
    setError('');
    setPlaced('');
  }, [item.id, item.minNextBid]);

  const canSpend = balance.available + (item.leadingIsMe ? item.currentBid ?? 0 : 0);
  const canAfford = canSpend >= item.minNextBid;

  const handleQuickAdd = (delta: number) => {
    const base = Number(amount) || item.minNextBid;
    setAmount(String(Math.max(item.minNextBid, base + delta)));
  };

  const handleSetExact = (val: number) => {
    setAmount(String(val));
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const value = Number(amount);
    setPlaced('');
    if (!Number.isInteger(value) || value < item.minNextBid) {
      setError(t('live.invalid', { count: item.minNextBid }));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onBid(item.id, value);
      setPlaced(t('live.placed', { count: value }));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('live.failed'));
    } finally {
      setBusy(false);
    }
  }

  const isLive = item.status === 'LIVE';
  const isUpcoming = item.status === 'UPCOMING';
  const isEnded = item.status === 'ENDED';

  return (
    <article className="os-forza-spotlight" aria-labelledby={`spotlight-title-${item.id}`}>
      {/* Top Telemetry / Status Ribbon */}
      <div className="os-forza-spotlight-topbar">
        <div className="os-forza-lot-badge">
          <span className="os-forza-lot-num">LOT {String(lotIndex + 1).padStart(2, '0')}</span>
          <span className="os-forza-lot-sep">/</span>
          <span className="os-forza-lot-total">{String(totalLots).padStart(2, '0')}</span>
        </div>

        <div className="os-forza-status-group">
          {isLive && (
            <span className="os-forza-status-pill is-live">
              <span className="os-forza-live-dot" />
              LIVE AUCTION
            </span>
          )}
          {isUpcoming && (
            <span className="os-forza-status-pill is-upcoming">
              <Clock size={13} aria-hidden="true" />
              COMING SOON
            </span>
          )}
          {isEnded && (
            <span className="os-forza-status-pill is-ended">
              <Trophy size={13} aria-hidden="true" />
              AUCTION CONCLUDED
            </span>
          )}
        </div>
      </div>

      <div className="os-forza-spotlight-grid">
        {/* Left Side: Cinematic Media Stage */}
        <div className="os-forza-stage">
          <div className="os-forza-stage-frame">
            <AuctionCover item={item} variant="spotlight" />

            {/* Stage HUD Overlays */}
            <div className="os-forza-stage-hud-bottom">
              <div className="os-forza-timer-badge">
                <Clock size={14} aria-hidden="true" />
                <span>
                  {isUpcoming ? 'OPENS IN' : isLive ? 'TIME LEFT' : 'ENDED'}
                </span>
                <strong className={countdown.urgent ? 'is-urgent' : ''}>
                  {isEnded ? formatFullDate(item.endsAt) : countdown.label}
                </strong>
              </div>

              {isLive && item.bidCount > 0 && (
                <div className="os-forza-bids-badge">
                  <Flame size={14} aria-hidden="true" />
                  <span>{item.bidCount} {item.bidCount === 1 ? 'Bid' : 'Bids'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Command & Telemetry Console */}
        <div className="os-forza-console">
          <div className="os-forza-console-header">
            <h2 id={`spotlight-title-${item.id}`} className="os-forza-spotlight-title">
              {item.name}
            </h2>
            <p className="os-forza-spotlight-desc">{item.description}</p>
          </div>

          {/* Telemetry Stats Grid */}
          <div className="os-forza-telemetry-grid">
            {/* Bid Metric */}
            <div className="os-forza-stat-card is-primary">
              <span className="os-forza-stat-label">
                {item.currentBid !== null ? 'Current Highest Bid' : 'Starting Bid'}
              </span>
              <div className="os-forza-stat-val">
                <span className="os-forza-pts-num">
                  {item.currentBid !== null ? item.currentBid : item.startingBid}
                </span>
                <span className="os-forza-pts-unit">PTS</span>
              </div>
              {item.currentBid !== null && (
                <span className="os-forza-stat-sub">
                  Starting reserve was {item.startingBid} pts
                </span>
              )}
            </div>

            {/* Bidder / Leader Metric */}
            <div className="os-forza-stat-card">
              <span className="os-forza-stat-label">
                {isEnded ? 'Auction Winner' : 'Highest Bidder'}
              </span>
              {item.currentBidder ? (
                <div className="os-forza-bidder-row">
                  <div className="os-forza-bidder-avatar" aria-hidden="true">
                    {item.currentBidder.avatarUrl ? (
                      <img src={item.currentBidder.avatarUrl} alt="" />
                    ) : (
                      initials(item.currentBidder.name)
                    )}
                  </div>
                  <div className="os-forza-bidder-info">
                    {onOpenProfile ? (
                      <button
                        type="button"
                        className="os-forza-bidder-name-btn"
                        onClick={() => onOpenProfile(item.currentBidder!.employeeId)}
                      >
                        {item.currentBidder.name}
                      </button>
                    ) : (
                      <strong className="os-forza-bidder-name">{item.currentBidder.name}</strong>
                    )}
                    <span className="os-forza-bidder-team">
                      {item.currentBidder.teamName || item.currentBidder.jobTitle || 'Sandoz Australia'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="os-forza-no-bids">
                  <User size={18} aria-hidden="true" />
                  <span>No bids placed yet</span>
                </div>
              )}

              {item.leadingIsMe && (
                <div className="os-forza-leading-tag">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  You hold the highest bid!
                </div>
              )}
            </div>
          </div>

          {/* Interactive Bidding Action Console */}
          <div className="os-forza-action-area">
            {isLive ? (
              <form onSubmit={handleSubmit} className="os-forza-bid-form">
                {/* Quick Add Chips */}
                <div className="os-forza-quick-row">
                  <span className="os-forza-quick-label">
                    <Zap size={13} /> Quick Bid:
                  </span>
                  <button
                    type="button"
                    className="os-forza-chip"
                    onClick={() => handleSetExact(item.minNextBid)}
                    disabled={busy}
                    title="Set to minimum next bid"
                  >
                    Min ({item.minNextBid})
                  </button>
                  <button
                    type="button"
                    className="os-forza-chip"
                    onClick={() => handleQuickAdd(5)}
                    disabled={busy}
                  >
                    +5 pts
                  </button>
                  <button
                    type="button"
                    className="os-forza-chip"
                    onClick={() => handleQuickAdd(10)}
                    disabled={busy}
                  >
                    +10 pts
                  </button>
                  <button
                    type="button"
                    className="os-forza-chip"
                    onClick={() => handleQuickAdd(25)}
                    disabled={busy}
                  >
                    +25 pts
                  </button>
                </div>

                {/* Input and Submit */}
                <div className="os-forza-input-row">
                  <div className="os-forza-input-wrapper">
                    <input
                      id={`bid-input-${item.id}`}
                      type="number"
                      min={item.minNextBid}
                      step={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={busy}
                      aria-label="Bid amount in points"
                      className="os-forza-input"
                    />
                    <span className="os-forza-input-suffix">PTS</span>
                  </div>

                  <button
                    type="submit"
                    className="os-forza-submit-btn"
                    disabled={busy || !canAfford}
                  >
                    <Gavel size={18} aria-hidden="true" />
                    <span>{busy ? t('live.placing') : t('live.placeBid')}</span>
                  </button>
                </div>

                {/* Balance Note */}
                <div className="os-forza-balance-hint">
                  <Award size={13} aria-hidden="true" />
                  <span>
                    You have <strong>{balance.available} pts</strong> available to bid.
                    {!canAfford && ` You need at least ${item.minNextBid} pts.`}
                  </span>
                </div>

                {placed && (
                  <div className="os-forza-alert is-success" role="status">
                    <CheckCircle2 size={16} />
                    <span>{placed}</span>
                  </div>
                )}
                {error && (
                  <div className="os-forza-alert is-error" role="alert">
                    <span>{error}</span>
                  </div>
                )}
              </form>
            ) : isUpcoming ? (
              <div className="os-forza-upcoming-box">
                <div className="os-forza-upcoming-header">
                  <Lock size={18} aria-hidden="true" />
                  <strong>Auction opens {formatFullDate(item.startsAt)}</strong>
                </div>
                <p>
                  Bidding will start at <strong>{item.startingBid} pts</strong>. The item image and
                  live bidding will unlock as soon as the countdown finishes!
                </p>
              </div>
            ) : (
              <div className="os-forza-ended-box">
                <Trophy size={18} aria-hidden="true" />
                <div>
                  <strong>Bidding on this lot has concluded</strong>
                  {item.currentBidder ? (
                    <p>
                      Won by <strong>{item.currentBidder.name}</strong> for{' '}
                      <strong>{item.currentBid} pts</strong>.
                    </p>
                  ) : (
                    <p>Closed with no bids placed.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
