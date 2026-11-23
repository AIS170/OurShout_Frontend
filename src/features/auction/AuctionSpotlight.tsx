// src/features/auction/AuctionSpotlight.tsx
// Forza-style hero spotlight for the currently selected auction lot.
// Features widescreen cinematic preview, real-time telemetry HUD, quick-bid chips,
// countdown timers, and bidder profile link.
import React, { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Award,
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Flame,
  Gavel,
  Lock,
  Mail,
  Package,
  ShieldCheck,
  Sparkles,
  Trophy,
  Undo2,
  User,
  X,
  Zap,
} from 'lucide-react';
import { formatFullDate, formatRelativeTime } from '../../components/feed/relativeTime';
import { AuctionCover } from './AuctionCover';
import type { AuctionBalanceDto, AuctionBidder, AuctionItemDto } from './auctionTypes';
import { t } from './i18n';

interface AuctionSpotlightProps {
  item: AuctionItemDto;
  balance: AuctionBalanceDto;
  lotIndex: number;
  totalLots: number;
  isTrendingTab?: boolean;
  isNotified?: boolean;
  onToggleNotification?: (itemId: number) => void;
  onBid: (itemId: number, amount: number) => Promise<AuctionItemDto>;
  onWithdrawBid?: (itemId: number) => Promise<AuctionItemDto>;
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

export function formatTimeRemaining(targetIso: string): { label: string; urgent: boolean; isPast: boolean } {
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

function getLotMeta(item: AuctionItemDto) {
  const name = item.name.toLowerCase();
  if (name.includes('coaching') || name.includes('clint')) {
    return {
      category: '🎓 Leadership & Mentorship',
      sku: 'SKU #SNDZ-EXP-001',
      retailEst: 'Priceless Session',
      warranty: '1-on-1 Executive Coaching',
    };
  }
  if (name.includes('cooking') || name.includes('liz')) {
    return {
      category: '🍳 Culinary Masterclass',
      sku: 'SKU #SNDZ-EXP-002',
      retailEst: 'Exclusive Experience',
      warranty: 'Personalized Cooking Session',
    };
  }
  if (name.includes('warehouse') || name.includes('wendy')) {
    return {
      category: '🏭 Behind-the-Scenes Tour',
      sku: 'SKU #SNDZ-EXP-003',
      retailEst: 'VIP Facility Access',
      warranty: 'Guided Supply Chain Tour',
    };
  }
  if (name.includes('dinner') || name.includes('mel')) {
    return {
      category: '🍷 Executive Dining',
      sku: 'SKU #SNDZ-EXP-004',
      retailEst: 'Fine Dining Experience',
      warranty: 'Evening Discussion & Dinner',
    };
  }
  if (name.includes('headphone') || name.includes('quietcomfort') || name.includes('audio')) {
    return {
      category: '🎧 Audio & Wearables',
      sku: 'SKU #SNDZ-AUD-045',
      retailEst: '$399 AUD',
      warranty: '2-Year Bose Warranty',
    };
  }
  if (name.includes('parking') || name.includes('vip')) {
    return {
      category: '🚗 Workplace Perks',
      sku: 'SKU #SNDZ-PRK-001',
      retailEst: 'Exclusive Priority',
      warranty: 'Reserved 1 Month',
    };
  }
  if (name.includes('hoodie') || name.includes('jacket') || name.includes('apparel')) {
    return {
      category: '⚡ Sandoz Apparel',
      sku: 'SKU #SNDZ-APP-012',
      retailEst: '$120 AUD',
      warranty: 'Embroidered Cotton',
    };
  }
  if (name.includes('lunch') || name.includes('dining') || name.includes('restaurant')) {
    return {
      category: '🍽 Dining & Events',
      sku: 'SKU #SNDZ-EXP-008',
      retailEst: '$450 AUD',
      warranty: 'All-Inclusive Dining',
    };
  }
  if (name.includes('espresso') || name.includes('coffee') || name.includes('barista')) {
    return {
      category: '☕ Kitchen & Lifestyle',
      sku: 'SKU #SNDZ-KIT-023',
      retailEst: '$850 AUD',
      warranty: '3-Year Manufacturer',
    };
  }
  if (name.includes('hydro') || name.includes('flask') || name.includes('bottle')) {
    return {
      category: '💧 Wellness & Office',
      sku: 'SKU #SNDZ-WEL-006',
      retailEst: '$65 AUD',
      warranty: 'Lifetime Bottle Guarantee',
    };
  }
  return {
    category: '🎁 Sandoz Reward',
    sku: `SKU #SNDZ-LOT-${String(item.id).padStart(3, '0')}`,
    retailEst: `${Math.round(item.startingBid * 1.5)} AUD Est.`,
    warranty: 'Official Sandoz Reward',
  };
}

export const AuctionSpotlight: React.FC<AuctionSpotlightProps> = ({
  item,
  balance,
  lotIndex,
  totalLots,
  isTrendingTab = false,
  isNotified = false,
  onToggleNotification,
  onBid,
  onWithdrawBid,
  onOpenProfile,
  onPrev,
  onNext,
}) => {
  const [amount, setAmount] = useState(String(item.minNextBid));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState('');
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

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

  // Adjust amount input when minNextBid changes or item changes
  useEffect(() => {
    setAmount((cur) => (Number(cur) >= item.minNextBid ? cur : String(item.minNextBid)));
    setError('');
    setPlaced('');
    setShowWithdrawConfirm(false);
    setWithdrawing(false);
    setWithdrawSuccess('');
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

  async function handleWithdraw() {
    if (!onWithdrawBid || withdrawing) return;
    setWithdrawing(true);
    setError('');
    setPlaced('');
    setWithdrawSuccess('');
    try {
      const bidAmount = item.currentBid;
      await onWithdrawBid(item.id);
      setShowWithdrawConfirm(false);
      setWithdrawSuccess(`Your leading bid of ${bidAmount} pts was successfully withdrawn. Held points have returned to your balance!`);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to withdraw bid.');
    } finally {
      setWithdrawing(false);
    }
  }

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
  const meta = getLotMeta(item);

  return (
    <article className="os-forza-spotlight" aria-labelledby={`spotlight-title-${item.id}`}>
      {/* Top Telemetry / Status Ribbon */}
      <div className="os-forza-spotlight-topbar">
        <div className="os-forza-top-left-badges">
          <div className="os-forza-lot-badge">
            <span className="os-forza-lot-num">LOT {String(lotIndex + 1).padStart(2, '0')}</span>
            <span className="os-forza-lot-sep">/</span>
            <span className="os-forza-lot-total">{String(totalLots).padStart(2, '0')}</span>
          </div>
          <span className="os-forza-category-tag">{meta.category}</span>
          <span className="os-forza-sku-tag">{meta.sku}</span>
        </div>

        <div className="os-forza-top-center-banner">
          <ShieldCheck size={14} className="os-forza-shield-icon" />
          <span>Sandoz Employee Benefit · Verified Campus Fulfillment</span>
        </div>

        <div className="os-forza-status-group">
          {isTrendingTab ? (
            <span className="os-forza-status-pill is-trending">
              <Flame size={13} aria-hidden="true" />
              #{lotIndex + 1} MOST POPULAR
            </span>
          ) : item.bidCount >= 3 ? (
            <span className="os-forza-status-pill is-trending">
              <Flame size={13} aria-hidden="true" />
              TRENDING LOT
            </span>
          ) : null}

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

          {/* Mock Watch / Email Notification Pill Toggle */}
          <button
            type="button"
            onClick={() => onToggleNotification?.(item.id)}
            className={`os-forza-top-notif-btn ${isNotified ? 'is-active' : ''}`}
            title={
              isNotified
                ? 'Email updates active · Click cross emblem to disable'
                : 'Set email updates for this auction (mock simulation)'
            }
          >
            {isNotified ? (
              <>
                <X size={13} className="os-forza-cross-icon" aria-hidden="true" />
                <span>Alerts Active (Disable)</span>
              </>
            ) : (
              <>
                <Bell size={13} aria-hidden="true" />
                <span>Notify on Bids</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="os-forza-spotlight-grid">
        {/* Left Side: Cinematic Media Stage + Lot Specifications */}
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

          {/* Lot Specifications & Fulfillment Box (Fills space under the preview image!) */}
          <div className="os-forza-specs-box">
            <div className="os-forza-specs-header">
              <Package size={14} />
              <span>LOT SPECIFICATIONS & REWARD PERKS</span>
            </div>
            <div className="os-forza-specs-grid">
              <div className="os-forza-spec-item">
                <span className="os-forza-spec-label">EST. RETAIL VALUE</span>
                <strong className="os-forza-spec-val">{meta.retailEst}</strong>
              </div>
              <div className="os-forza-spec-item">
                <span className="os-forza-spec-label">CONDITION</span>
                <strong className="os-forza-spec-val">Factory Sealed · New</strong>
              </div>
              <div className="os-forza-spec-item">
                <span className="os-forza-spec-label">COLLECTION</span>
                <strong className="os-forza-spec-val">HR Desk / Site Courier</strong>
              </div>
              <div className="os-forza-spec-item">
                <span className="os-forza-spec-label">WARRANTY</span>
                <strong className="os-forza-spec-val">{meta.warranty}</strong>
              </div>
            </div>
            <div className="os-forza-specs-perks">
              <div className="os-forza-perk-row">
                <CheckCircle2 size={13} className="os-forza-perk-check" />
                <span>Points only deducted from your balance if you hold the winning bid at close.</span>
              </div>
              <div className="os-forza-perk-row">
                <CheckCircle2 size={13} className="os-forza-perk-check" />
                <span>Official Sandoz recognition reward with zero out-of-pocket employee expense.</span>
              </div>
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
                <div className="os-forza-leading-group">
                  <div className="os-forza-leading-tag">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    You hold the highest bid!
                  </div>
                  {isLive && !showWithdrawConfirm && (
                    <button
                      type="button"
                      onClick={() => setShowWithdrawConfirm(true)}
                      className="os-forza-withdraw-link-btn"
                      title="Withdraw this bid"
                    >
                      <Undo2 size={12} />
                      <span>Withdraw Bid</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Live Bidding Activity Feed (Recent Bids Log) */}
          <div className="os-forza-bid-feed-card">
            <div className="os-forza-bid-feed-header">
              <div className="os-forza-feed-title-line">
                <Flame size={14} className="os-forza-feed-flame" />
                <strong>LIVE BIDDING ACTIVITY</strong>
                <span className="os-forza-feed-count">{item.bidCount} {item.bidCount === 1 ? 'Bid' : 'Bids'} Placed</span>
              </div>
              <span className="os-forza-live-pulse-indicator">
                <span className="os-forza-pulse-ring" />
                REAL-TIME
              </span>
            </div>

            <div className="os-forza-bid-feed-list">
              {item.recentBids && item.recentBids.length > 0 ? (
                item.recentBids.map((b, idx) => (
                  <div key={b.id} className={`os-forza-feed-entry ${idx === 0 ? 'is-leading' : ''}`}>
                    <div className="os-forza-feed-rank">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </div>
                    <div className="os-forza-feed-bidder">
                      <div className="os-forza-feed-avatar">
                        {b.bidder.avatarUrl ? (
                          <img src={b.bidder.avatarUrl} alt="" />
                        ) : (
                          initials(b.bidder.name)
                        )}
                      </div>
                      <div className="os-forza-feed-names">
                        {onOpenProfile ? (
                          <button
                            type="button"
                            className="os-forza-feed-btn"
                            onClick={() => onOpenProfile(b.bidder.employeeId)}
                          >
                            {b.bidder.name}
                          </button>
                        ) : (
                          <span className="os-forza-feed-person-name">{b.bidder.name}</span>
                        )}
                        <span className="os-forza-feed-dept">{b.bidder.teamName || b.bidder.jobTitle}</span>
                      </div>
                    </div>
                    <div className="os-forza-feed-time">
                      {formatRelativeTime(b.createdAt)}
                    </div>
                    <div className="os-forza-feed-amount">
                      <strong>{b.amount}</strong>
                      <span>PTS</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="os-forza-feed-empty">
                  <User size={16} />
                  <span>No bids placed yet · Starting reserve is <strong>{item.startingBid} pts</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Mock Email Bid Updates Panel (Simulates email notifications, fills console empty space) */}
          <div className={`os-forza-notif-card ${isNotified ? 'is-active' : ''}`}>
            <div className="os-forza-notif-header">
              <div className="os-forza-notif-title-group">
                <div className={`os-forza-notif-icon-bubble ${isNotified ? 'is-active' : ''}`}>
                  {isNotified ? (
                    <BellRing size={16} aria-hidden="true" />
                  ) : (
                    <Bell size={16} aria-hidden="true" />
                  )}
                </div>
                <div className="os-forza-notif-info">
                  <div className="os-forza-notif-badge-line">
                    <strong className="os-forza-notif-heading">Email Bid Updates</strong>
                    <span className="os-forza-notif-pill">MOCK SIMULATION</span>
                  </div>
                  <p className="os-forza-notif-subtitle">
                    {isNotified
                      ? 'Email alerts active · You will receive email notifications on new bids and outbids.'
                      : 'Set email notifications to get alerted whenever someone bids or you get outbid.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleNotification?.(item.id)}
                className={`os-forza-notif-action-btn ${isNotified ? 'is-active' : ''}`}
                title={
                  isNotified
                    ? 'Click cross emblem to disable email notifications'
                    : 'Click to enable mock email bid updates'
                }
              >
                {isNotified ? (
                  <>
                    <X size={14} className="os-forza-cross-icon" aria-hidden="true" />
                    <span>Disable Alerts</span>
                  </>
                ) : (
                  <>
                    <Bell size={14} aria-hidden="true" />
                    <span>Enable Alerts</span>
                  </>
                )}
              </button>
            </div>

            {isNotified && (
              <div className="os-forza-notif-email-bar">
                <Mail size={12} aria-hidden="true" />
                <span>Simulated alerts sent to: <strong>employee@sandoz.com</strong></span>
                <span className="os-forza-notif-live-pulse" />
              </div>
            )}
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

                {/* Withdraw Leading Bid Action (Only available if you hold the highest bid) */}
                {item.leadingIsMe && (
                  showWithdrawConfirm ? (
                    <div className="os-forza-withdraw-confirm-box" role="alert">
                      <div className="os-forza-withdraw-confirm-text">
                        <AlertCircle size={18} className="os-forza-withdraw-icon" aria-hidden="true" />
                        <div>
                          <strong>Withdraw leading bid on {item.name}?</strong>
                          <p>
                            Your current bid of <strong>{item.currentBid} pts</strong> will be cancelled and returned to your available points.
                          </p>
                        </div>
                      </div>
                      <div className="os-forza-withdraw-confirm-actions">
                        <button
                          type="button"
                          onClick={handleWithdraw}
                          className="os-forza-btn-confirm-withdraw"
                          disabled={withdrawing}
                        >
                          <Undo2 size={14} />
                          <span>{withdrawing ? 'Withdrawing…' : 'Yes, Withdraw Bid'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowWithdrawConfirm(false)}
                          className="os-forza-btn-cancel-withdraw"
                          disabled={withdrawing}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="os-forza-withdraw-row">
                      <button
                        type="button"
                        onClick={() => setShowWithdrawConfirm(true)}
                        className="os-forza-withdraw-main-btn"
                        title="Withdraw your highest bid and release held points"
                      >
                        <Undo2 size={14} />
                        <span>Withdraw Leading Bid ({item.currentBid} pts)</span>
                      </button>
                    </div>
                  )
                )}

                {placed && (
                  <div className="os-forza-alert is-success" role="status">
                    <CheckCircle2 size={16} />
                    <span>{placed}</span>
                  </div>
                )}
                {withdrawSuccess && (
                  <div className="os-forza-alert is-success" role="status">
                    <CheckCircle2 size={16} />
                    <span>{withdrawSuccess}</span>
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

