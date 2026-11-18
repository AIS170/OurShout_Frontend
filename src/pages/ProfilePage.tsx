import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CalendarDays,
  Heart,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  UserCheck,
} from 'lucide-react';
import { Me } from '../types';
import { ShoutoutCard } from '../components/feed/ShoutoutCard';
import { ApiRequestError, setLike } from '../components/feed/feedApi';
import { ProfileDto, ShoutoutDto } from '../components/feed/feedTypes';
import { fetchProfile } from '../components/profile/profileApi';
import '../components/feed/feed.css';
import '../components/profile/profile.css';

interface ProfilePageProps {
  /** Whose profile to show. */
  employeeId: string;
  currentUser: Me;
  /** Goes back to the newsfeed. */
  onBack: () => void;
  /** Opens another person's profile, from a name on a card or the "recognised most by" tile. */
  onOpenProfile: (employeeId: string) => void;
  /** Opens the "give a shout-out" screen. */
  onCompose: () => void;
  /** Opens the account and session card. Only offered on your own profile. */
  onViewAccount: () => void;
  /** Called when the API says the session is no longer valid. */
  onSessionEnded: () => void;
}

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

const initials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

/** '2026-11' -> 'November 2026'. */
const formatMonth = (month: string): string =>
  new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

/**
 * A person's recognition profile: who they are, their points, the numbers behind them, and the
 * shout-outs they've received most recently. Every figure counts visible shout-outs only, so it
 * always agrees with the newsfeed.
 */
export const ProfilePage: React.FC<ProfilePageProps> = ({
  employeeId,
  currentUser,
  onBack,
  onOpenProfile,
  onCompose,
  onViewAccount,
  onSessionEnded,
}) => {
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [actionError, setActionError] = useState<string>('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Kept in a ref so a new function from the parent doesn't load the profile again.
  const sessionEndedRef = useRef(onSessionEnded);
  sessionEndedRef.current = onSessionEnded;

  useEffect(() => {
    const controller = new AbortController();
    setLoadState('loading');
    setActionError('');
    fetchProfile(employeeId, controller.signal)
      .then((data) => {
        setProfile(data);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiRequestError && error.sessionEnded) sessionEndedRef.current();
        setLoadState(error instanceof ApiRequestError && error.status === 404 ? 'missing' : 'error');
      });
    return () => controller.abort();
  }, [employeeId, reloadKey]);

  // Moving between profiles starts at the top, with focus on the person's name.
  useEffect(() => {
    if (loadState !== 'ready') return;
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [loadState, employeeId]);

  const isMe = employeeId === currentUser.employeeId;

  const replaceCard = (id: number, change: (item: ShoutoutDto) => ShoutoutDto) =>
    setProfile((current) =>
      current
        ? { ...current, recentReceived: current.recentReceived.map((item) => (item.id === id ? change(item) : item)) }
        : current,
    );

  // Optimistic, the same as on the newsfeed: update the card, then confirm or roll back.
  const handleLikeChange = async (shoutout: ShoutoutDto, liked: boolean) => {
    setActionError('');
    replaceCard(shoutout.id, (item) => ({
      ...item,
      likedByMe: liked,
      likeCount: Math.max(0, item.likeCount + (liked === item.likedByMe ? 0 : liked ? 1 : -1)),
    }));
    try {
      const result = await setLike(shoutout.id, liked);
      replaceCard(shoutout.id, (item) => ({ ...item, ...result }));
    } catch (error) {
      replaceCard(shoutout.id, (item) => ({
        ...item,
        likedByMe: shoutout.likedByMe,
        likeCount: shoutout.likeCount,
      }));
      if (error instanceof ApiRequestError && error.sessionEnded) sessionEndedRef.current();
      setActionError(error instanceof ApiRequestError ? error.message : "That like didn't save. Try again.");
    }
  };

  const backLink = (
    <button type="button" className="os-btn-link os-back" onClick={onBack}>
      <ArrowLeft size={16} aria-hidden="true" />
      Back to newsfeed
    </button>
  );

  if (loadState !== 'ready' || !profile) {
    return (
      <div className="os-feed-wrap">
        <main className="os-feed">
          {backLink}
          {loadState === 'loading' && (
            <div className="os-empty" role="status">
              <RefreshCw size={22} className="os-spinner" color="var(--sandoz-blue)" aria-hidden="true" />
              <p>Loading the profile...</p>
            </div>
          )}
          {loadState === 'missing' && (
            <div className="os-empty" role="alert">
              <h1 className="os-section-title">We couldn't find that person</h1>
              <p>They may no longer be in the directory.</p>
            </div>
          )}
          {loadState === 'error' && (
            <div className="os-empty" role="alert">
              <AlertCircle size={24} color="#b42318" aria-hidden="true" />
              <h1 className="os-section-title">We couldn't load this profile</h1>
              <p>Check that the backend is running, then try again.</p>
              <button type="button" className="os-btn" onClick={() => setReloadKey((key) => key + 1)}>
                Try again
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  const { employee } = profile;
  const firstName = employee.name.split(' ')[0];
  const none = <span className="os-tile-text os-tile-none">None yet</span>;

  return (
    <div className="os-feed-wrap">
      <main className="os-feed">
        {backLink}

        <section className="os-profile-head" aria-label="Profile summary">
          <div className="os-profile-who">
            <div className="os-profile-avatar" aria-hidden="true">
              {initials(employee.name)}
            </div>
            <div>
              <h1 ref={headingRef} tabIndex={-1} className="os-profile-name">
                {employee.name}
                {isMe && <span className="os-badge os-profile-you">You</span>}
              </h1>
              <p className="os-profile-role">{[employee.jobTitle, employee.teamName].filter(Boolean).join(' · ')}</p>
            </div>
          </div>

          <div className="os-points" aria-label={`${profile.points} OurShout recognition points`}>
            <Award size={34} aria-hidden="true" />
            <div>
              <div className="os-points-number">{profile.points}</div>
              <div className="os-points-label">recognition points</div>
            </div>
          </div>
        </section>

        <div className="os-profile-actions">
          <button type="button" className="os-btn os-btn-primary" onClick={onCompose}>
            <Megaphone size={16} aria-hidden="true" />
            Give a shout-out
          </button>
          {isMe && (
            <button type="button" className="os-btn" onClick={onViewAccount}>
              Account details
            </button>
          )}
        </div>

        <ul className="os-tiles" aria-label={`${firstName}'s recognition in numbers`}>
          <li>
            <div className="os-tile">
              <span className="os-tile-label">
                <Star size={14} aria-hidden="true" />
                Shout-outs received
              </span>
              <span className="os-tile-number">{profile.receivedCount}</span>
            </div>
          </li>
          <li>
            <div className="os-tile">
              <span className="os-tile-label">
                <Send size={14} aria-hidden="true" />
                Shout-outs given
              </span>
              <span className="os-tile-number">{profile.givenCount}</span>
            </div>
          </li>
          <li>
            <div className="os-tile">
              <span className="os-tile-label">
                <Heart size={14} aria-hidden="true" />
                Acts of kindness received
              </span>
              <span className="os-tile-number">{profile.kindnessReceivedCount}</span>
            </div>
          </li>
          <li>
            <div className="os-tile">
              <span className="os-tile-label">
                <Sparkles size={14} aria-hidden="true" />
                Top principle received
              </span>
              {profile.topPrincipleReceived ? (
                <span className="os-tile-text">{profile.topPrincipleReceived}</span>
              ) : (
                none
              )}
            </div>
          </li>
          <li>
            <div className="os-tile">
              <span className="os-tile-label">
                <UserCheck size={14} aria-hidden="true" />
                Recognised most by
              </span>
              {profile.topRecommender ? (
                <>
                  <button
                    type="button"
                    className="os-name-btn os-tile-text"
                    onClick={() => profile.topRecommender && onOpenProfile(profile.topRecommender.employee.employeeId)}
                  >
                    {profile.topRecommender.employee.name}
                  </button>
                  <span className="os-tile-sub">
                    {profile.topRecommender.count} {profile.topRecommender.count === 1 ? 'shout-out' : 'shout-outs'}
                  </span>
                </>
              ) : (
                none
              )}
            </div>
          </li>
          <li>
            <div className="os-tile">
              <span className="os-tile-label">
                <CalendarDays size={14} aria-hidden="true" />
                Busiest month
              </span>
              {profile.busiestMonth ? <span className="os-tile-text">{formatMonth(profile.busiestMonth)}</span> : none}
            </div>
          </li>
          <li>
            <div className="os-tile">
              <span className="os-tile-label">
                <Award size={14} aria-hidden="true" />
                Principle given most
              </span>
              {profile.topPrincipleGiven ? <span className="os-tile-text">{profile.topPrincipleGiven}</span> : none}
            </div>
          </li>
        </ul>

        <h2 className="os-section-title">Recent shout-outs received</h2>

        {actionError && (
          <div className="os-note os-note-error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {actionError}
          </div>
        )}

        {profile.recentReceived.length === 0 ? (
          <div className="os-empty">
            <p>{isMe ? "You haven't received a shout-out yet." : `${firstName} hasn't received a shout-out yet.`}</p>
            {!isMe && (
              <button type="button" className="os-btn" onClick={onCompose}>
                Be the first to recognise {firstName}
              </button>
            )}
          </div>
        ) : (
          <ul className="os-list" aria-label="Recent shout-outs received">
            {profile.recentReceived.map((shoutout) => (
              <li key={shoutout.id}>
                <ShoutoutCard shoutout={shoutout} onLikeChange={handleLikeChange} onOpenProfile={onOpenProfile} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};
