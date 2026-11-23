import React, { useEffect, useState } from 'react';
import { Crown, Sparkles, ChevronLeft, ChevronRight, Award, AlertCircle } from 'lucide-react';
import { SltHonoree } from './feedTypes';
import { fetchSltLeaderboard } from './feedApi';

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
  const [period, setPeriod] = useState<'month' | 'all'>('month');
  const [honorees, setHonorees] = useState<SltHonoree[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchSltLeaderboard(period)
      .then((res) => {
        if (!cancelled) {
          setHonorees(res.honorees || []);
          setSelectedIndex(0);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load SLT leaderboard:', err);
          setError('Unable to load SLT honors.');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const activeHonoree: SltHonoree | undefined = honorees[selectedIndex] || honorees[0];

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : honorees.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < honorees.length - 1 ? prev + 1 : 0));
  };

  return (
    <section
      aria-label="Senior Leadership Team Leaderboard"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid var(--sandoz-border-grey)',
        boxShadow: '0 4px 20px rgba(0, 28, 74, 0.06)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        minWidth: 0,
      }}
    >
      {/* Header with Title and Period Toggle */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F6DC85 0%, #D4A72C 50%, #996515 100%)',
                color: '#4A3500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(212, 167, 44, 0.35)',
                flexShrink: 0,
              }}
            >
              <Crown size={17} aria-hidden="true" />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: 'var(--sandoz-navy)',
                  fontFamily: 'var(--font-headline)',
                  lineHeight: 1.2,
                }}
              >
                SLT Leaderboard
              </h2>
              <div style={{ fontSize: '0.72rem', color: 'var(--sandoz-text-muted)', fontWeight: 500 }}>
                Senior Leadership Team Honors
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: '0.67rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FCD34D',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Executive
          </span>
        </div>

        {/* This Month / All Time Switch */}
        <div
          role="group"
          aria-label="Filter SLT Leaderboard by timeframe"
          style={{
            display: 'flex',
            backgroundColor: 'var(--sandoz-soft-blue-bg)',
            borderRadius: '999px',
            padding: '3px',
            border: '1px solid var(--sandoz-border-grey)',
          }}
        >
          <button
            type="button"
            aria-pressed={period === 'month'}
            onClick={() => setPeriod('month')}
            style={{
              flex: 1,
              padding: '0.35rem 0.65rem',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 700,
              transition: 'all 0.15s ease',
              backgroundColor: period === 'month' ? 'var(--sandoz-blue)' : 'transparent',
              color: period === 'month' ? '#FFFFFF' : 'var(--sandoz-text-body)',
              boxShadow: period === 'month' ? '0 2px 6px rgba(28, 89, 181, 0.25)' : 'none',
            }}
          >
            This Month
          </button>
          <button
            type="button"
            aria-pressed={period === 'all'}
            onClick={() => setPeriod('all')}
            style={{
              flex: 1,
              padding: '0.35rem 0.65rem',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 700,
              transition: 'all 0.15s ease',
              backgroundColor: period === 'all' ? 'var(--sandoz-blue)' : 'transparent',
              color: period === 'all' ? '#FFFFFF' : 'var(--sandoz-text-body)',
              boxShadow: period === 'all' ? '0 2px 6px rgba(28, 89, 181, 0.25)' : 'none',
            }}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2.5rem 1rem',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              backgroundColor: '#F1F5F9',
              border: '4px solid #E2E8F0',
            }}
          />
          <div style={{ height: '16px', width: '60%', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
          <div style={{ height: '12px', width: '40%', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setPeriod((p) => p)}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FCA5A5',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '0.72rem',
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
      {!isLoading && !error && honorees.length === 0 && (
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
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>
            No SLT Honors Recorded
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#92400E' }}>
            {period === 'month' ? 'No leadership recognitions this month yet.' : 'No leadership recognitions posted yet.'}
          </p>
        </div>
      )}

      {/* Honoree in the Golden Frame */}
      {!isLoading && !error && activeHonoree && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Golden Frame Spotlight Card */}
          <div
            style={{
              position: 'relative',
              borderRadius: '16px',
              background: 'linear-gradient(180deg, #FFFCF2 0%, #FFFFFF 100%)',
              border: '1.5px solid #F3DF9A',
              boxShadow: '0 4px 16px rgba(212, 167, 44, 0.12)',
              padding: '1.35rem 1rem 1.1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Carousel navigation controls if more than 1 honoree */}
            {honorees.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '12px',
                  right: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  pointerEvents: 'none',
                }}
              >
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous SLT honoree"
                  title="Previous honoree"
                  style={{
                    pointerEvents: 'auto',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--sandoz-navy)',
                  }}
                >
                  <ChevronLeft size={14} />
                </button>

                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#92400E',
                    backgroundColor: '#FEF3C7',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    border: '1px solid #FCD34D',
                  }}
                >
                  Honoree {selectedIndex + 1} of {honorees.length}
                </span>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next SLT honoree"
                  title="Next honoree"
                  style={{
                    pointerEvents: 'auto',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--sandoz-navy)',
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* THE GOLDEN FRAME */}
            <div
              style={{
                marginTop: honorees.length > 1 ? '0.75rem' : '0.2rem',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Outer Golden Aura Ring */}
              <div
                style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  padding: '7px',
                  background:
                    'linear-gradient(135deg, #FFE896 0%, #D4A72C 24%, #8C5F03 50%, #FBE795 76%, #C29117 100%)',
                  boxShadow:
                    '0 0 25px rgba(212, 167, 44, 0.48), 0 8px 24px rgba(0, 0, 0, 0.16), inset 0 2px 5px rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                onClick={() => onOpenProfile(activeHonoree.employee.employeeId)}
                title={`View ${activeHonoree.employee.name}'s profile`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {/* Inner Beveled Bezel */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    padding: '2.5px',
                    background: 'linear-gradient(180deg, #7A5300 0%, #E8C15A 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Portrait / Photo Inside */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: 'var(--sandoz-navy)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.4rem',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 3px 8px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {activeHonoree.employee.avatarUrl ? (
                      <img
                        src={activeHonoree.employee.avatarUrl}
                        alt={activeHonoree.employee.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      initials(activeHonoree.employee.name)
                    )}
                  </div>
                </div>
              </div>

              {/* Gold Crown Medal Pinned to Bottom of Frame */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  background: 'linear-gradient(135deg, #FDE68A 0%, #D4A72C 50%, #996515 100%)',
                  border: '2.5px solid #FFFFFF',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4A3500',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.22)',
                }}
                title={`${activeHonoree.count} SLT Honor${activeHonoree.count > 1 ? 's' : ''}`}
              >
                <Crown size={15} aria-hidden="true" />
              </div>
            </div>

            {/* Person's Identity */}
            <div style={{ marginTop: '0.85rem', width: '100%' }}>
              <button
                type="button"
                onClick={() => onOpenProfile(activeHonoree.employee.employeeId)}
                title={`Open profile for ${activeHonoree.employee.name}`}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: 'var(--sandoz-navy)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-headline)',
                  letterSpacing: '-0.01em',
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
                {activeHonoree.employee.name}
              </button>

              <div
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--sandoz-text-muted)',
                  marginTop: '2px',
                  fontWeight: 500,
                }}
              >
                {[activeHonoree.employee.jobTitle, activeHonoree.employee.teamName]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>

            {/* Executive Honors Badge */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', marginTop: '0.65rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  color: '#92400E',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                <Award size={12} />
                {activeHonoree.count} SLT Recognition{activeHonoree.count > 1 ? 's' : ''}
              </span>

              {activeHonoree.latestPrinciple && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#1E40AF',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={11} />
                  {activeHonoree.latestPrinciple}
                </span>
              )}
            </div>

            {/* Citation Teaser / Quote */}
            {activeHonoree.latestReason && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  border: '1px solid #F3DF9A',
                  fontSize: '0.75rem',
                  lineHeight: 1.45,
                  color: '#475569',
                  fontStyle: 'italic',
                }}
              >
                "{activeHonoree.latestReason}"
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
