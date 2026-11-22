// src/features/auction/AuctionCard.tsx
// One item on the Auction Table. What it shows depends on the item's state:
//   LIVE      the current bid and bidder, and a form to bid
//   UPCOMING  "Coming soon" with a gavel emblem and when bidding opens
//   ENDED     who won and for how much
// The server checks every bid (item open, high enough, points available); the checks here only
// save a round trip.
import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock, Gavel, Trophy } from 'lucide-react';
import { formatFullDate } from '../../components/feed/relativeTime';
import type { AuctionBalanceDto, AuctionBidder, AuctionItemDto } from './auctionTypes';
import { t } from './i18n';

interface AuctionCardProps {
  item: AuctionItemDto;
  balance: AuctionBalanceDto;
  onBid: (itemId: number, amount: number) => Promise<AuctionItemDto>;
  /** When given, the bidder's name links to their profile. */
  onOpenProfile?: (employeeId: string) => void;
}

const initials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

function Bidder({ person, onOpenProfile }: { person: AuctionBidder; onOpenProfile?: (employeeId: string) => void }) {
  return (
    <span className="os-auc-bidder">
      <span className="os-auc-avatar" aria-hidden="true">
        {person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : initials(person.name)}
      </span>
      {onOpenProfile ? (
        <button type="button" className="os-auc-name-link" onClick={() => onOpenProfile(person.employeeId)}>
          {person.name}
        </button>
      ) : (
        <strong>{person.name}</strong>
      )}
    </span>
  );
}

export function AuctionCard({ item, balance, onBid, onOpenProfile }: AuctionCardProps) {
  const [amount, setAmount] = useState(String(item.minNextBid));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState('');

  // Someone else bid while this card was open: never leave a bid in the box that is now too low.
  useEffect(() => {
    setAmount((current) => (Number(current) >= item.minNextBid ? current : String(item.minNextBid)));
  }, [item.minNextBid]);

  const inputId = `auction-bid-${item.id}`;
  const errorId = `auction-bid-error-${item.id}`;
  // Raising your own bid frees the points it holds, so they count towards the new one.
  const canSpend = balance.available + (item.leadingIsMe ? item.currentBid ?? 0 : 0);
  const canAfford = canSpend >= item.minNextBid;

  async function submit(event: FormEvent) {
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
      // The server's message says what's wrong (current bid, points available, bidding closed).
      setError(err instanceof Error && err.message ? err.message : t('live.failed'));
    } finally {
      setBusy(false);
    }
  }

  function media() {
    if (item.status === 'UPCOMING') {
      return (
        <div className="os-auc-media os-auc-media-soon">
          <span className="os-auc-emblem" aria-hidden="true">
            <Gavel size={44} strokeWidth={1.75} />
          </span>
          <span className="os-auc-soon-label">{t('upcoming.comingSoon')}</span>
        </div>
      );
    }
    if (item.imageUrl) {
      return (
        <div className="os-auc-media">
          <img src={item.imageUrl} alt="" />
        </div>
      );
    }
    return (
      <div className="os-auc-media os-auc-media-empty" aria-hidden="true">
        <Gavel size={36} strokeWidth={1.5} />
      </div>
    );
  }

  function details() {
    if (item.status === 'UPCOMING') {
      return (
        <>
          <p className="os-auc-when os-auc-when-strong">
            <Clock size={15} aria-hidden="true" />
            {t('upcoming.opens', { when: formatFullDate(item.startsAt) })}
          </p>
          <p className="os-auc-muted">{t('live.startingBid', { count: item.startingBid })}</p>
          <p className="os-auc-muted">{t('upcoming.closes', { when: formatFullDate(item.endsAt) })}</p>
        </>
      );
    }

    if (item.status === 'ENDED') {
      return (
        <>
          {item.currentBidder && item.currentBid !== null ? (
            <p className="os-auc-result">
              <Trophy size={16} aria-hidden="true" />
              {item.leadingIsMe ? (
                <strong>{t('ended.youWon', { count: item.currentBid })}</strong>
              ) : (
                <>
                  {t('ended.wonBy')} <Bidder person={item.currentBidder} onOpenProfile={onOpenProfile} />{' '}
                  {t('ended.wonFor', { count: item.currentBid })}
                </>
              )}
            </p>
          ) : (
            <p className="os-auc-result">{t('ended.noBids')}</p>
          )}
          <p className="os-auc-muted">{t('ended.closed', { when: formatFullDate(item.endsAt) })}</p>
        </>
      );
    }

    return (
      <>
        <div className="os-auc-bid">
          <span className="os-auc-bid-label">{t('live.currentBid')}</span>
          {item.currentBidder && item.currentBid !== null ? (
            <>
              <span className="os-auc-bid-value">{t('points', { count: item.currentBid })}</span>
              <span className="os-auc-bid-by">
                {t('live.by')} <Bidder person={item.currentBidder} onOpenProfile={onOpenProfile} />
              </span>
            </>
          ) : (
            <>
              <span className="os-auc-bid-value os-auc-bid-none">{t('live.noBids')}</span>
              <span className="os-auc-bid-by">{t('live.startingBid', { count: item.startingBid })}</span>
            </>
          )}
        </div>

        {item.leadingIsMe && (
          <p className="os-auc-leading">
            <CheckCircle2 size={15} aria-hidden="true" />
            {t('live.leading')}
          </p>
        )}

        <p className="os-auc-when">
          <Clock size={15} aria-hidden="true" />
          {t('live.closes', { when: formatFullDate(item.endsAt) })}
          {item.bidCount > 0 && <> · {t('live.bidCount', { count: item.bidCount })}</>}
        </p>

        <form className="os-auc-form" onSubmit={submit} noValidate>
          <label className="os-auc-sr-only" htmlFor={inputId}>
            {t('live.yourBid', { name: item.name })}
          </label>
          <input
            id={inputId}
            className="os-auc-input"
            type="number"
            inputMode="numeric"
            min={item.minNextBid}
            step={1}
            value={amount}
            disabled={busy || !canAfford}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : `${inputId}-hint`}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
            }}
          />
          <button type="submit" className="os-auc-btn" disabled={busy || !canAfford}>
            <Gavel size={15} aria-hidden="true" />
            {busy ? t('live.placing') : item.leadingIsMe ? t('live.raiseBid') : t('live.placeBid')}
          </button>
        </form>
        <p id={`${inputId}-hint`} className="os-auc-muted">
          {canAfford ? t('live.minimum', { count: item.minNextBid }) : t('live.notEnough', { count: item.minNextBid })}
        </p>
        {error && (
          <p id={errorId} className="os-auc-error" role="alert">
            {error}
          </p>
        )}
        <p className="os-auc-placed" role="status">
          {placed}
        </p>
      </>
    );
  }

  return (
    <article className={`os-auc-card os-auc-card-${item.status.toLowerCase()}`} aria-label={item.name}>
      {media()}
      <div className="os-auc-body">
        <h3 className="os-auc-name">{item.name}</h3>
        {item.description && <p className="os-auc-description">{item.description}</p>}
        {details()}
      </div>
    </article>
  );
}
