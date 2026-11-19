import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  CalendarDays,
  Camera,
  Heart,
  Loader2,
  LogOut,
  Megaphone,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Me } from '../types';
import { ShoutoutCard } from '../components/feed/ShoutoutCard';
import { ApiRequestError, setLike } from '../components/feed/feedApi';
import { ProfileDto, ShoutoutDto } from '../components/feed/feedTypes';
import { deleteAvatar, fetchProfile, uploadAvatar } from '../components/profile/profileApi';
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
  /** Optional handler when Admin Dashboard is clicked */
  onAdminDashboard?: () => void;
  /** Called when the avatar is updated (uploaded or removed) */
  onAvatarUpdated?: (newAvatarUrl: string | null) => void;
  /** Called when the API says the session is no longer valid or user signs out. */
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
 * Merged Master Profile Page:
 * Combines the elegant Sandoz identity card & directory info with the complete
 * recognition metrics, insight tiles, and received shout-outs stream.
 */
export const ProfilePage: React.FC<ProfilePageProps> = ({
  employeeId,
  currentUser,
  onBack,
  onOpenProfile,
  onCompose,
  onAdminDashboard,
  onAvatarUpdated,
  onSessionEnded,
}) => {
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [actionError, setActionError] = useState<string>('');
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const isAdmin = currentUser.role === 'ADMIN';

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

  // Optimistic like toggle
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

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting the same file fires onChange
    e.target.value = '';

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Photo exceeds the 5 MB limit. Please select a smaller image.');
      return;
    }

    setUploadingAvatar(true);
    setAvatarError('');
    try {
      const result = await uploadAvatar(file);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              employee: {
                ...prev.employee,
                avatarUrl: result.avatarUrl,
              },
            }
          : prev,
      );
      if (onAvatarUpdated) {
        onAvatarUpdated(result.avatarUrl);
      }
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.sessionEnded) {
        sessionEndedRef.current();
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to upload photo. Please try again.';
      setAvatarError(message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;

    setUploadingAvatar(true);
    setAvatarError('');
    try {
      await deleteAvatar();
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              employee: {
                ...prev.employee,
                avatarUrl: null,
              },
            }
          : prev,
      );
      if (onAvatarUpdated) {
        onAvatarUpdated(null);
      }
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.sessionEnded) {
        sessionEndedRef.current();
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to remove photo.';
      setAvatarError(message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const topBackLink = (
    <button
      type="button"
      className="os-btn-link os-back"
      onClick={onBack}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        marginBottom: '1.25rem',
        background: 'none',
        border: 'none',
        color: 'var(--sandoz-blue)',
        fontWeight: 600,
        fontSize: '0.9rem',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Back to newsfeed
    </button>
  );

  if (loadState !== 'ready' || !profile) {
    return (
      <div className="os-feed-wrap">
        <main style={{ maxWidth: '1100px', margin: '2rem auto 4rem auto', padding: '0 1.5rem', width: '100%', boxSizing: 'border-box' }}>
          {topBackLink}
          {loadState === 'loading' && (
            <div className="os-empty" role="status">
              <RefreshCw size={22} className="os-spinner" color="var(--sandoz-blue)" aria-hidden="true" />
              <p>Loading profile...</p>
            </div>
          )}
          {loadState === 'missing' && (
            <div className="os-empty" role="alert">
              <h1 className="os-section-title">We couldn't find that person</h1>
              <p>They may no longer be in the directory.</p>
              <button type="button" className="os-btn" onClick={onBack}>
                Return to newsfeed
              </button>
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
    <div className="os-feed-wrap" style={{ flex: 1, backgroundColor: 'var(--sandoz-sand-bg)', paddingBottom: '4rem' }}>
      <main style={{ maxWidth: '1100px', margin: '2rem auto 0 auto', padding: '0 1.5rem', width: '100%', boxSizing: 'border-box' }}>
        {topBackLink}

        {/* Master Profile Card (Image 2 aesthetic, enriched with Image 1 metrics) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid var(--sandoz-border-grey)',
          padding: '2.5rem',
          boxShadow: '0 4px 20px rgba(0, 28, 74, 0.06)',
        }}>
          {/* Top Identity Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ position: 'relative', width: '74px', height: '74px', flexShrink: 0 }}>
                <div style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--sandoz-blue)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.75rem',
                  boxShadow: '0 4px 14px rgba(28, 89, 181, 0.25)',
                  overflow: 'hidden',
                  border: '2px solid #FFFFFF',
                }}>
                  {employee.avatarUrl ? (
                    <img
                      src={employee.avatarUrl}
                      alt={employee.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    initials(employee.name)
                  )}
                </div>

                {isMe && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      style={{ display: 'none' }}
                      onChange={handleAvatarFileChange}
                      disabled={uploadingAvatar}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      title={employee.avatarUrl ? 'Change profile photo' : 'Upload profile photo'}
                      aria-label="Upload profile photo"
                      style={{
                        position: 'absolute',
                        bottom: -3,
                        right: employee.avatarUrl ? 24 : -3,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--sandoz-navy)',
                        color: '#FFFFFF',
                        border: '2px solid #FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                        transition: 'transform 0.15s ease, background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!uploadingAvatar) {
                          e.currentTarget.style.backgroundColor = 'var(--sandoz-blue)';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!uploadingAvatar) {
                          e.currentTarget.style.backgroundColor = 'var(--sandoz-navy)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                    >
                      {uploadingAvatar ? <Loader2 size={14} className="os-spinner" /> : <Camera size={14} />}
                    </button>

                    {employee.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleAvatarDelete}
                        disabled={uploadingAvatar}
                        title="Remove profile photo"
                        aria-label="Remove profile photo"
                        style={{
                          position: 'absolute',
                          bottom: -3,
                          right: -3,
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#DC2626',
                          color: '#FFFFFF',
                          border: '2px solid #FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                          transition: 'transform 0.15s ease, background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!uploadingAvatar) {
                            e.currentTarget.style.backgroundColor = '#B91C1C';
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!uploadingAvatar) {
                            e.currentTarget.style.backgroundColor = '#DC2626';
                            e.currentTarget.style.transform = 'scale(1)';
                          }
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </>
                )}
              </div>

              <div>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontSize: '1.9rem',
                    fontWeight: 700,
                    color: 'var(--sandoz-navy)',
                    letterSpacing: '-0.015rem',
                    margin: 0,
                    outline: 'none',
                  }}
                >
                  {employee.name}
                </h1>
                <p style={{ color: 'var(--sandoz-text-muted)', fontSize: '1rem', marginTop: '4px', margin: '4px 0 0 0' }}>
                  {employee.jobTitle || 'Sandoz Australia Team Member'}
                </p>
                {avatarError && (
                  <div style={{ color: '#DC2626', fontSize: '0.82rem', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertCircle size={14} />
                    <span>{avatarError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recognition Points Pill Badge (1-to-1 with Image 2) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderRadius: '3.125rem',
              padding: '0.65rem 1.5rem',
            }}>
              <Award size={26} color="#B45309" />
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#92400E', lineHeight: 1 }}>
                  {profile.points} pts
                </div>
                <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 600 }}>
                  OurShout Recognition Points
                </div>
              </div>
            </div>
          </div>

          {/* Directory Details Panel (1-to-1 with Image 2) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            backgroundColor: 'var(--sandoz-soft-blue-bg)',
            borderRadius: '8px',
            padding: '1.25rem 1.5rem',
            border: '1px solid var(--sandoz-pill-blue)',
            marginBottom: '2rem',
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sandoz-blue)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Employee ID
              </span>
              <p style={{ fontWeight: 700, color: 'var(--sandoz-navy)', fontSize: '1rem', margin: '4px 0 0 0' }}>
                {employee.employeeId}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sandoz-blue)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Department / Team
              </span>
              <p style={{ fontWeight: 700, color: 'var(--sandoz-navy)', fontSize: '1rem', margin: '4px 0 0 0' }}>
                {employee.teamName} {employee.teamId ? `(${employee.teamId})` : ''}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sandoz-blue)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Role & Status
              </span>
              <p style={{ fontWeight: 700, color: 'var(--sandoz-navy)', fontSize: '1rem', margin: '4px 0 0 0' }}>
                {employee.role || (isMe ? currentUser.role : 'EMPLOYEE')} · {employee.status || (isMe ? currentUser.status : 'ACTIVE')}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sandoz-blue)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Location
              </span>
              <p style={{ fontWeight: 700, color: 'var(--sandoz-navy)', fontSize: '1rem', margin: '4px 0 0 0' }}>
                {employee.country || 'AU'} (Australia)
              </p>
            </div>
          </div>

          {/* Section: Recognition Impact & Numbers */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-headline)',
              fontSize: '1.15rem',
              fontWeight: 700,
              color: 'var(--sandoz-navy)',
              marginBottom: '1rem',
              margin: '0 0 1rem 0',
            }}>
              Recognition in Numbers
            </h2>

            {/* 4 Primary Counter Metric Tiles */}
            <ul className="os-tiles" style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 1rem 0',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '1rem',
            }}>
              <li>
                <div className="os-tile" style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1.1rem 1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  height: '100%',
                  boxSizing: 'border-box',
                }}>
                  <span className="os-tile-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--sandoz-blue)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Star size={14} aria-hidden="true" />
                    Shout-outs received
                  </span>
                  <span className="os-tile-number" style={{ fontFamily: 'var(--font-headline)', color: 'var(--sandoz-navy)', fontSize: '2.2rem', fontWeight: 700, lineHeight: 1 }}>
                    {profile.receivedCount}
                  </span>
                </div>
              </li>

              <li>
                <div className="os-tile" style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1.1rem 1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  height: '100%',
                  boxSizing: 'border-box',
                }}>
                  <span className="os-tile-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--sandoz-blue)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Send size={14} aria-hidden="true" />
                    Shout-outs given
                  </span>
                  <span className="os-tile-number" style={{ fontFamily: 'var(--font-headline)', color: 'var(--sandoz-navy)', fontSize: '2.2rem', fontWeight: 700, lineHeight: 1 }}>
                    {profile.givenCount}
                  </span>
                </div>
              </li>

              <li>
                <div className="os-tile" style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1.1rem 1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  height: '100%',
                  boxSizing: 'border-box',
                }}>
                  <span className="os-tile-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--sandoz-blue)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Heart size={14} aria-hidden="true" />
                    Acts of kindness received
                  </span>
                  <span className="os-tile-number" style={{ fontFamily: 'var(--font-headline)', color: 'var(--sandoz-navy)', fontSize: '2.2rem', fontWeight: 700, lineHeight: 1 }}>
                    {profile.kindnessReceivedCount}
                  </span>
                </div>
              </li>

              <li>
                <div className="os-tile" style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1.1rem 1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  height: '100%',
                  boxSizing: 'border-box',
                }}>
                  <span className="os-tile-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--sandoz-blue)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Sparkles size={14} aria-hidden="true" />
                    Top principle received
                  </span>
                  {profile.topPrincipleReceived ? (
                    <span className="os-tile-text" style={{ color: 'var(--sandoz-navy)', fontSize: '1rem', fontWeight: 600, lineHeight: 1.35, marginTop: '2px' }}>
                      {profile.topPrincipleReceived}
                    </span>
                  ) : (
                    none
                  )}
                </div>
              </li>
            </ul>

            {/* 3 Secondary Insight Tiles */}
            <ul className="os-tiles" style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
            }}>
              <li>
                <div className="os-tile" style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1.1rem 1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  height: '100%',
                  boxSizing: 'border-box',
                }}>
                  <span className="os-tile-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--sandoz-blue)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <UserCheck size={14} aria-hidden="true" />
                    Recognised most by
                  </span>
                  {profile.topRecommender ? (
                    <div style={{ marginTop: '2px' }}>
                      <button
                        type="button"
                        onClick={() => profile.topRecommender && onOpenProfile(profile.topRecommender.employee.employeeId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--sandoz-navy)',
                          fontSize: '1rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left',
                          textDecoration: 'underline',
                          textDecorationColor: 'var(--sandoz-pill-blue)',
                          display: 'block',
                        }}
                      >
                        {profile.topRecommender.employee.name}
                      </button>
                      <span style={{ fontSize: '0.8rem', color: 'var(--sandoz-text-muted)' }}>
                        {profile.topRecommender.count} {profile.topRecommender.count === 1 ? 'shout-out' : 'shout-outs'}
                      </span>
                    </div>
                  ) : (
                    none
                  )}
                </div>
              </li>

              <li>
                <div className="os-tile" style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1.1rem 1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  height: '100%',
                  boxSizing: 'border-box',
                }}>
                  <span className="os-tile-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--sandoz-blue)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <CalendarDays size={14} aria-hidden="true" />
                    Busiest month
                  </span>
                  {profile.busiestMonth ? (
                    <span className="os-tile-text" style={{ color: 'var(--sandoz-navy)', fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>
                      {formatMonth(profile.busiestMonth)}
                    </span>
                  ) : (
                    none
                  )}
                </div>
              </li>

              <li>
                <div className="os-tile" style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1.1rem 1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  height: '100%',
                  boxSizing: 'border-box',
                }}>
                  <span className="os-tile-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--sandoz-blue)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Award size={14} aria-hidden="true" />
                    Principle given most
                  </span>
                  {profile.topPrincipleGiven ? (
                    <span className="os-tile-text" style={{ color: 'var(--sandoz-navy)', fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>
                      {profile.topPrincipleGiven}
                    </span>
                  ) : (
                    none
                  )}
                </div>
              </li>
            </ul>
          </div>

          {/* Action Footer Bar (1-to-1 with Image 2) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--sandoz-border-grey)',
            paddingTop: '1.75rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            {/* Primary Action Buttons (Left side of the profile) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="os-btn os-btn-primary"
                onClick={onCompose}
                style={{
                  padding: '0.7rem 1.6rem',
                  borderRadius: '3.125rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  backgroundColor: 'var(--sandoz-blue)',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <Megaphone size={16} aria-hidden="true" />
                {isMe ? 'Give a shout-out' : `Recognise ${firstName}`}
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (onAdminDashboard) {
                      onAdminDashboard();
                    } else {
                      setAdminNotice('Admin Dashboard is currently under development.');
                    }
                  }}
                  title="Admin Dashboard (Administrators Only)"
                  style={{
                    padding: '0.7rem 1.6rem',
                    borderRadius: '3.125rem',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    border: '1.5px solid var(--sandoz-navy)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--sandoz-navy)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--sandoz-navy)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = 'var(--sandoz-navy)';
                  }}
                >
                  <Shield size={16} aria-hidden="true" />
                  Admin Dashboard
                </button>
              )}
            </div>

            {/* Navigation & Session Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onBack}
                style={{
                  padding: '0.7rem 1.6rem',
                  borderRadius: '3.125rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: '1.5px solid var(--sandoz-blue)',
                  backgroundColor: 'var(--sandoz-blue)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--sandoz-blue-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--sandoz-blue)')}
              >
                Back to newsfeed
                <ArrowRight size={16} />
              </button>

              {isMe && (
                <button
                  type="button"
                  onClick={onSessionEnded}
                  style={{
                    padding: '0.7rem 1.6rem',
                    borderRadius: '3.125rem',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    border: '1.5px solid var(--sandoz-border-input)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--sandoz-text-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--sandoz-sand-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <LogOut size={16} />
                  Switch Persona / Sign Out
                </button>
              )}
            </div>
          </div>

          {adminNotice && (
            <div
              role="status"
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem 1.25rem',
                backgroundColor: 'var(--sandoz-soft-blue-bg)',
                border: '1px solid var(--sandoz-pill-blue)',
                borderRadius: '8px',
                color: 'var(--sandoz-navy)',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} color="var(--sandoz-blue)" />
                <span>{adminNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setAdminNotice(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--sandoz-text-muted)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  lineHeight: 1,
                  padding: '0 4px',
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Section: Recent Shout-outs Received (from Image 1) */}
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '1.65rem',
            fontWeight: 700,
            color: 'var(--sandoz-navy)',
            marginBottom: '1.25rem',
            margin: '0 0 1.25rem 0',
          }}>
            Recent shout-outs received
          </h2>

          {actionError && (
            <div className="os-note os-note-error" role="alert" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} aria-hidden="true" />
              {actionError}
            </div>
          )}

          {profile.recentReceived.length === 0 ? (
            <div className="os-empty" style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px dashed var(--sandoz-pill-blue)',
              padding: '3rem 2rem',
              textAlign: 'center',
            }}>
              <p style={{ color: 'var(--sandoz-text-muted)', fontSize: '1rem', marginBottom: isMe ? 0 : '1rem' }}>
                {isMe ? "You haven't received a shout-out yet." : `${firstName} hasn't received a shout-out yet.`}
              </p>
              {!isMe && (
                <button type="button" className="os-btn os-btn-primary" onClick={onCompose}>
                  Be the first to recognise {firstName}
                </button>
              )}
            </div>
          ) : (
            <ul className="os-list" aria-label="Recent shout-outs received" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {profile.recentReceived.map((shoutout) => (
                <li key={shoutout.id} style={{ marginBottom: '1.25rem' }}>
                  <ShoutoutCard shoutout={shoutout} onLikeChange={handleLikeChange} onOpenProfile={onOpenProfile} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};
