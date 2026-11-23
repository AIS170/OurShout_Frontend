import React, { useEffect, useState } from 'react';
import { Crown, Sparkles, ThumbsUp, MessageCircle, Trophy, RefreshCw, AlertCircle, Users } from 'lucide-react';
import { ShoutoutDto } from './feedTypes';
import { fetchSltShoutouts, setLike } from './feedApi';
import { formatFullDate, formatRelativeTime } from './relativeTime';

export interface SltShoutoutsProps {
  onOpenProfile: (employeeId: string) => void;
  onViewLeaderboard?: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const SltShoutouts: React.FC<SltShoutoutsProps> = ({
  onOpenProfile,
  onViewLeaderboard,
}) => {
  const [items, setItems] = useState<ShoutoutDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await fetchSltShoutouts(10);
      setItems(res.items);
    } catch (err) {
      console.error('Failed to load SLT shoutouts:', err);
      setError('Unable to load SLT shout-outs.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleLike = async (post: ShoutoutDto) => {
    const nextLiked = !post.likedByMe;
    const nextCount = nextLiked ? post.likeCount + 1 : Math.max(0, post.likeCount - 1);

    // Optimistic UI update
    setItems((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? { ...item, likedByMe: nextLiked, likeCount: nextCount }
          : item
      )
    );

    try {
      const result = await setLike(post.id, nextLiked);
      setItems((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? { ...item, likedByMe: result.likedByMe, likeCount: result.likeCount }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to update like:', err);
      // Revert on error
      setItems((prev) =>
        prev.map((item) => (item.id === post.id ? post : item))
      );
    }
  };

  return (
    <section
      aria-label="Senior Leadership Team Shout-outs"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid var(--sandoz-border-grey)',
        boxShadow: '0 4px 20px rgba(0, 28, 74, 0.06)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.1rem',
        minWidth: 0,
      }}
    >
      {/* Executive Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F6DC85 0%, #D4A72C 50%, #B8860B 100%)',
              color: '#4A3500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(212, 167, 44, 0.35)',
              flexShrink: 0,
            }}
          >
            <Crown size={18} aria-hidden="true" />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 800,
                color: 'var(--sandoz-navy)',
                fontFamily: 'var(--font-headline)',
                lineHeight: 1.2,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              SLT Shout-outs
            </h2>
            <div
              style={{
                fontSize: '0.73rem',
                color: 'var(--sandoz-text-muted)',
                fontWeight: 500,
                marginTop: '1px',
              }}
            >
              Senior Leadership Team
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FCD34D',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            Executive
          </span>

          <button
            type="button"
            title="Refresh SLT shout-outs"
            aria-label="Refresh SLT shout-outs"
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isRefreshing || isLoading ? 'default' : 'pointer',
              color: 'var(--sandoz-text-muted)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'color 0.15s ease',
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  height: '14px',
                  width: '45%',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  height: '18px',
                  width: '80%',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  height: '36px',
                  width: '100%',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '6px',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FCA5A5',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#991B1B',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && items.length === 0 && (
        <div
          style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            borderRadius: '12px',
            backgroundColor: '#FFFAEB',
            border: '1.5px dashed #FCD34D',
            color: '#78350F',
          }}
        >
          <Sparkles size={24} style={{ color: '#D4A72C', marginBottom: '0.5rem' }} />
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>
            No SLT Shout-outs yet
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#92400E' }}>
            Milestone achievements recognized by the Executive Team will appear here.
          </p>
        </div>
      )}

      {/* List of SLT Cards */}
      {!isLoading && !error && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((post) => {
            const hasTargetTeam = Boolean(post.targetTeam);
            const mainRecipient = post.recipients[0];

            return (
              <article
                key={post.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  borderLeft: '4px solid #D4A72C',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Gold Leadership Ribbon */}
                <div
                  style={{
                    padding: '0.35rem 0.75rem',
                    background:
                      'linear-gradient(90deg, #C9981A 0%, #F6DC85 35%, #FFF5D0 50%, #F6DC85 65%, #C9981A 100%)',
                    color: '#4A3500',
                    fontSize: '0.67rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sparkles size={11} aria-hidden="true" />
                    Leadership Honor
                  </span>
                  <time
                    dateTime={post.createdAt}
                    title={formatFullDate(post.createdAt)}
                    style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.9 }}
                  >
                    {formatRelativeTime(post.createdAt)}
                  </time>
                </div>

                <div
                  style={{
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                  }}
                >
                  {/* Recipient Profile Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {hasTargetTeam ? (
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--sandoz-soft-blue-bg)',
                          border: '1.5px solid var(--sandoz-pill-blue)',
                          color: 'var(--sandoz-blue)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Users size={17} aria-hidden="true" />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--sandoz-blue)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {mainRecipient?.avatarUrl ? (
                          <img
                            src={mainRecipient.avatarUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          initials(mainRecipient?.name || 'SZ')
                        )}
                      </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      {hasTargetTeam ? (
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            color: 'var(--sandoz-navy)',
                            lineHeight: 1.2,
                          }}
                        >
                          Whole {post.targetTeam?.teamName} Team
                        </div>
                      ) : (
                        <div>
                          <button
                            type="button"
                            onClick={() => onOpenProfile(mainRecipient.employeeId)}
                            title={`View profile for ${mainRecipient.name}`}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              fontWeight: 700,
                              fontSize: '0.86rem',
                              color: 'var(--sandoz-navy)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              textDecoration: 'none',
                              lineHeight: 1.2,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--sandoz-blue)';
                              e.currentTarget.style.textDecoration = 'underline';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--sandoz-navy)';
                              e.currentTarget.style.textDecoration = 'none';
                            }}
                          >
                            {mainRecipient?.name}
                          </button>
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--sandoz-text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '1px',
                        }}
                      >
                        {hasTargetTeam
                          ? `${post.recipients.length} team members`
                          : [mainRecipient?.jobTitle, mainRecipient?.teamName]
                              .filter(Boolean)
                              .join(' · ')}
                      </div>
                    </div>
                  </div>

                  {/* Principle Tag */}
                  {post.principle && (
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#EFF6FF',
                          color: '#1E40AF',
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        {post.principle.name}
                      </span>
                    </div>
                  )}

                  {/* Reason Text */}
                  <div
                    style={{
                      fontSize: '0.81rem',
                      lineHeight: 1.45,
                      color: 'var(--sandoz-text-body)',
                      fontWeight: 500,
                    }}
                  >
                    "{post.reason}"
                  </div>

                  {/* Impact Box */}
                  {post.impact && (
                    <div
                      style={{
                        padding: '0.5rem 0.65rem',
                        borderRadius: '6px',
                        backgroundColor: '#F8FAFC',
                        borderLeft: '3px solid var(--sandoz-blue)',
                        fontSize: '0.75rem',
                        lineHeight: 1.4,
                        color: '#334155',
                      }}
                    >
                      <strong style={{ color: 'var(--sandoz-navy)', fontWeight: 700 }}>
                        Impact:{' '}
                      </strong>
                      {post.impact}
                    </div>
                  )}

                  {/* Social Footer Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.45rem',
                      borderTop: '1px solid #F1F5F9',
                      marginTop: '0.2rem',
                    }}
                  >
                    <button
                      type="button"
                      aria-pressed={post.likedByMe}
                      aria-label={`Like this SLT shout-out. ${post.likeCount} likes`}
                      onClick={() => handleToggleLike(post)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: post.likedByMe ? 'var(--sandoz-soft-blue-bg)' : 'transparent',
                        border: post.likedByMe
                          ? '1px solid var(--sandoz-pill-blue)'
                          : '1px solid transparent',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: post.likedByMe ? 'var(--sandoz-blue)' : 'var(--sandoz-text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <ThumbsUp
                        size={13}
                        fill={post.likedByMe ? 'currentColor' : 'none'}
                        aria-hidden="true"
                      />
                      <span>{post.likeCount}</span>
                    </button>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.72rem',
                        color: 'var(--sandoz-text-muted)',
                        fontWeight: 500,
                      }}
                    >
                      <MessageCircle size={13} aria-hidden="true" />
                      <span>{post.commentCount ?? 0}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Leaderboard Navigation Link Footer */}
      <div
        style={{
          marginTop: '0.25rem',
          padding: '0.75rem 0.9rem',
          borderRadius: '10px',
          backgroundColor: 'var(--sandoz-soft-blue-bg)',
          border: '1px solid var(--sandoz-pill-blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Trophy size={16} color="var(--sandoz-blue)" aria-hidden="true" />
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--sandoz-navy)',
            }}
          >
            Company Leaderboard
          </span>
        </div>

        {onViewLeaderboard && (
          <button
            type="button"
            onClick={onViewLeaderboard}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--sandoz-blue)',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: 'pointer',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              borderRadius: '4px',
            }}
          >
            View Rankings →
          </button>
        )}
      </div>
    </section>
  );
};
