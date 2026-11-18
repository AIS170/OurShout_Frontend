import React, { useEffect, useRef, useState } from 'react';
import { Heart, Pencil, ThumbsUp } from 'lucide-react';
import { ShoutoutDto } from './feedTypes';
import { ClampedText } from './ClampedText';
import { formatFullDate, formatRelativeTime } from './relativeTime';

/** Individual names shown before the rest collapse into "+N more". */
const MAX_NAMES = 3;

/** Number of banner colours defined in feed.css (os-banner-0 to os-banner-4). */
const BANNER_COLOURS = 5;

const initials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

/** "Human Resources team (5)" or "Priya Raman, Aisha Rahman, Olivia Chen +2 more", as plain text. */
export const recipientsSummary = (shoutout: ShoutoutDto): string => {
  const { recipients, targetTeam } = shoutout;
  if (targetTeam) return `${targetTeam.teamName} team (${recipients.length})`;
  const names = recipients
    .slice(0, MAX_NAMES)
    .map((person) => person.name)
    .join(', ');
  const hidden = recipients.length - MAX_NAMES;
  return hidden > 0 ? `${names} +${hidden} more` : names;
};

/** The team name with its size, or the people by name, collapsing after MAX_NAMES. */
const Recipients: React.FC<{ shoutout: ShoutoutDto }> = ({ shoutout }) => {
  const { recipients, targetTeam } = shoutout;
  const [showAll, setShowAll] = useState<boolean>(false);

  // "+N more" disappears once it's used, so hand focus to the first name it revealed.
  const firstRevealed = useRef<HTMLElement>(null);
  useEffect(() => {
    if (showAll) firstRevealed.current?.focus();
  }, [showAll]);

  if (targetTeam) {
    return (
      <strong>
        {targetTeam.teamName} team ({recipients.length})
      </strong>
    );
  }

  const shown = showAll ? recipients : recipients.slice(0, MAX_NAMES);
  const hidden = recipients.length - shown.length;
  return (
    <>
      {shown.map((person, index) => (
        <React.Fragment key={person.employeeId}>
          {index > 0 && ', '}
          <strong ref={index === MAX_NAMES ? firstRevealed : undefined} tabIndex={index === MAX_NAMES ? -1 : undefined}>
            {person.name}
          </strong>
        </React.Fragment>
      ))}
      {hidden > 0 && (
        <>
          {' '}
          <button
            type="button"
            className="os-btn-link"
            aria-label={`Show ${hidden} more ${hidden === 1 ? 'person' : 'people'}`}
            onClick={() => setShowAll(true)}
          >
            +{hidden} more
          </button>
        </>
      )}
    </>
  );
};

interface ShoutoutCardProps {
  shoutout: ShoutoutDto;
  onLikeChange: (shoutout: ShoutoutDto, liked: boolean) => void;
  onEdit: (shoutout: ShoutoutDto) => void;
}

/**
 * One shout-out on the newsfeed: principle banner, who gave it to whom, why and impact,
 * the act-of-kindness badge, a like toggle, and Edit on your own posts.
 * React renders all text, so quotes, ampersands and apostrophes are safe exactly as typed.
 */
export const ShoutoutCard: React.FC<ShoutoutCardProps> = ({ shoutout, onLikeChange, onEdit }) => {
  const banner = `os-banner os-banner-${(shoutout.principle.id - 1) % BANNER_COLOURS}`;
  const likes = `${shoutout.likeCount} ${shoutout.likeCount === 1 ? 'like' : 'likes'}`;

  return (
    <article
      className="os-card"
      aria-label={`Shout-out from ${shoutout.sender.name}`}
      tabIndex={-1}
      data-shoutout-id={shoutout.id}
    >
      <div className={banner}>{shoutout.principle.name}</div>

      <div className="os-card-body">
        <div className="os-card-head">
          <div className="os-avatar" aria-hidden="true">
            {initials(shoutout.sender.name)}
          </div>
          <div className="os-who">
            <p className="os-people">
              <strong>{shoutout.sender.name}</strong> to <Recipients shoutout={shoutout} />
            </p>
            <p className="os-meta">
              <time dateTime={shoutout.createdAt} title={formatFullDate(shoutout.createdAt)}>
                {formatRelativeTime(shoutout.createdAt)}
              </time>
              {shoutout.editedAt && ' · edited'}
            </p>
          </div>
          {shoutout.actOfKindness && (
            <span className="os-badge">
              <Heart size={13} fill="currentColor" aria-hidden="true" />
              Act of kindness
            </span>
          )}
        </div>

        {/* Keyed by the text so an edited paragraph starts collapsed again. */}
        <ClampedText key={`why-${shoutout.reason}`} label="Why" text={shoutout.reason} />
        <ClampedText key={`impact-${shoutout.impact}`} label="Impact" text={shoutout.impact} />

        <div className="os-card-foot">
          <button
            type="button"
            className="os-btn os-btn-quiet os-like"
            aria-pressed={shoutout.likedByMe}
            aria-label={`Like this shout-out. ${likes} so far`}
            onClick={() => onLikeChange(shoutout, !shoutout.likedByMe)}
          >
            <ThumbsUp size={16} fill={shoutout.likedByMe ? 'currentColor' : 'none'} aria-hidden="true" />
            {shoutout.likeCount}
          </button>
          {shoutout.canEdit && (
            <button
              type="button"
              className="os-btn os-btn-quiet"
              aria-label={`Edit your shout-out to ${recipientsSummary(shoutout)}`}
              onClick={() => onEdit(shoutout)}
            >
              <Pencil size={15} aria-hidden="true" />
              Edit
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
