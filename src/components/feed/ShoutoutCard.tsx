import React, { useEffect, useRef, useState } from 'react';
import { Crown, Heart, Pencil, ThumbsUp } from 'lucide-react';
import { EmployeeSummary, ShoutoutDto } from './feedTypes';
import { ClampedText } from './ClampedText';
import { formatFullDate, formatRelativeTime } from './relativeTime';
import { valueImage } from './valueImages';

/** Individual names shown before the rest collapse into "+N more". */
const MAX_NAMES = 3;

/** Number of banner colours defined in feed.css (os-banner-0 to os-banner-4). */
const BANNER_COLOURS = 5;

/** Who an SLT shout-out is shown as coming from. */
const SLT_NAME = 'Senior Leadership Team';

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

/** A person's name. It links to their profile when the card is given somewhere to send people. */
const PersonName = React.forwardRef<
  HTMLElement,
  { person: EmployeeSummary; onOpenProfile?: (employeeId: string) => void; focusTarget?: boolean }
>(({ person, onOpenProfile, focusTarget }, ref) =>
  onOpenProfile ? (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      className="os-name-btn"
      onClick={() => onOpenProfile(person.employeeId)}
    >
      {person.name}
    </button>
  ) : (
    <strong ref={ref} tabIndex={focusTarget ? -1 : undefined}>
      {person.name}
    </strong>
  ),
);
PersonName.displayName = 'PersonName';

/** The team name with its size, or the people by name, collapsing after MAX_NAMES. */
const Recipients: React.FC<{ shoutout: ShoutoutDto; onOpenProfile?: (employeeId: string) => void }> = ({
  shoutout,
  onOpenProfile,
}) => {
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
          <PersonName
            ref={index === MAX_NAMES ? firstRevealed : undefined}
            person={person}
            onOpenProfile={onOpenProfile}
            focusTarget={index === MAX_NAMES}
          />
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
  onLikeChange?: (shoutout: ShoutoutDto, liked: boolean) => void;
  onEdit?: (shoutout: ShoutoutDto) => void;
  /** Leaves out the like and edit buttons. Used for the preview while writing a shout-out. */
  hideActions?: boolean;
  /** When given, every name on the card links to that person's profile. */
  onOpenProfile?: (employeeId: string) => void;
}

/**
 * One shout-out on the newsfeed, laid out like a meeting card: the value's image as a banner,
 * the value's name, who gave it to whom, why and impact, the act-of-kindness badge, then a
 * footer row with the like toggle and Edit on your own posts.
 * React renders all text, so quotes, ampersands and apostrophes are safe exactly as typed.
 */
export const ShoutoutCard: React.FC<ShoutoutCardProps> = ({
  shoutout,
  onLikeChange,
  onEdit,
  hideActions = false,
  onOpenProfile,
}) => {
  // An id of 0 is the compose preview before a principle is picked: no colour, no image.
  const chosen = shoutout.principle.id > 0;
  const banner = chosen
    ? `os-banner os-banner-${(shoutout.principle.id - 1) % BANNER_COLOURS}`
    : 'os-banner os-banner-none';
  const image = valueImage(shoutout.principle.id);
  const likes = `${shoutout.likeCount} ${shoutout.likeCount === 1 ? 'like' : 'likes'}`;
  // An SLT shout-out is the highest recognition: an admin posts it on the Senior Leadership
  // Team's behalf, so the card is gold and names the leadership team, not the admin.
  const slt = shoutout.kind === 'SLT';

  return (
    <article
      className={slt ? 'os-card os-card-slt' : 'os-card'}
      aria-label={slt ? `SLT shout-out from the ${SLT_NAME}` : `Shout-out from ${shoutout.sender.name}`}
      tabIndex={-1}
      data-shoutout-id={shoutout.id}
    >
      {slt && (
        <div className="os-slt-ribbon">
          <Crown size={16} aria-hidden="true" />
          SLT shout-out
        </div>
      )}
      {/* Decorative: the value's name is the text right below it. */}
      {image && (
        // The whole picture, never cropped: it sits centred on a blurred copy of itself, which
        // fills the sides whatever the picture's shape.
        <div className="os-card-media" style={{ '--os-media': `url("${image}")` } as React.CSSProperties}>
          <img className="os-card-image" src={image} alt="" />
        </div>
      )}
      <div className={banner}>{shoutout.principle.name}</div>

      <div className="os-card-body">
        <div className="os-card-head">
          {slt ? (
            <div className="os-avatar os-avatar-slt" aria-hidden="true">
              <Crown size={20} />
            </div>
          ) : (
            <div className="os-avatar" aria-hidden="true" style={{ overflow: 'hidden' }}>
              {shoutout.sender.avatarUrl ? (
                <img
                  src={shoutout.sender.avatarUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials(shoutout.sender.name)
              )}
            </div>
          )}
          <div className="os-who">
            <p className="os-people">
              {slt ? <strong>{SLT_NAME}</strong> : <PersonName person={shoutout.sender} onOpenProfile={onOpenProfile} />}{' '}
              to <Recipients shoutout={shoutout} onOpenProfile={onOpenProfile} />
            </p>
            <p className="os-meta">
              <time dateTime={shoutout.createdAt} title={formatFullDate(shoutout.createdAt)}>
                {formatRelativeTime(shoutout.createdAt)}
              </time>
              {shoutout.editedAt && ' · edited'}
            </p>
          </div>
        </div>

        {/* Keyed by the text so an edited paragraph starts collapsed again. */}
        <ClampedText key={`why-${shoutout.reason}`} label="Why" text={shoutout.reason} />
        <ClampedText key={`impact-${shoutout.impact}`} label="Impact" text={shoutout.impact} />

        {shoutout.actOfKindness && (
          <span className="os-badge">
            <Heart size={13} fill="currentColor" aria-hidden="true" />
            Act of kindness
          </span>
        )}
      </div>

      {!hideActions && (
        <div className="os-card-foot">
          <button
            type="button"
            className="os-btn os-btn-quiet os-like"
            aria-pressed={shoutout.likedByMe}
            aria-label={`Like this shout-out. ${likes} so far`}
            onClick={() => onLikeChange?.(shoutout, !shoutout.likedByMe)}
          >
            <ThumbsUp size={16} fill={shoutout.likedByMe ? 'currentColor' : 'none'} aria-hidden="true" />
            {shoutout.likeCount}
          </button>
          {shoutout.canEdit && onEdit && (
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
      )}
    </article>
  );
};
