import React from 'react';
import { Me } from '../types';
import { Award, BarChart3, Gavel, LogOut, Newspaper, ShieldCheck, Trophy } from 'lucide-react';

/** The pages the header can switch to. */
export type HeaderView = 'feed' | 'auction' | 'leaderboard' | 'admin' | 'person' | 'profile' | 'compose';

interface SandozHeaderProps {
  currentUser: Me | null;
  onSignOut: () => void;
  /** Opens the current user's profile when clicking the profile badge. */
  onViewProfile?: () => void;
  /** Navigates back to the main newsfeed when clicking the brand / logo. */
  onGoHome?: () => void;
  /** The view currently on screen, to mark the matching nav button. */
  currentView?: string;
  /** Switches page. When it's missing, the header shows no nav. */
  onNavigate?: (view: HeaderView) => void;
}

const navButtonStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.5rem 0.95rem',
  fontSize: '0.82rem',
  fontWeight: 600,
  borderRadius: '3.125rem',
  cursor: 'pointer',
  border: active ? '1.5px solid var(--sandoz-blue)' : '1.5px solid transparent',
  backgroundColor: active ? 'var(--sandoz-soft-blue-bg)' : 'transparent',
  color: active ? 'var(--sandoz-blue)' : 'var(--sandoz-text-body)',
});

export const SandozHeader: React.FC<SandozHeaderProps> = ({
  currentUser,
  onSignOut,
  onViewProfile,
  onGoHome,
  currentView,
  onNavigate,
}) => {
  // Admin appears only for people whose /api/me role is ADMIN (Natalie in the mock data).
  // The Senior Leadership Team and managers get the same button named Reports: it opens the
  // admin area's Reports page, which is all they can see of it (/api/me reportsAccess).
  const navItems: { view: HeaderView; label: string; icon: React.ReactNode }[] = [
    { view: 'feed', label: 'Newsfeed', icon: <Newspaper size={15} aria-hidden="true" /> },
    { view: 'auction', label: 'Auction Table', icon: <Gavel size={15} aria-hidden="true" /> },
    { view: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={15} aria-hidden="true" /> },
    ...(currentUser?.role === 'ADMIN'
      ? [{ view: 'admin' as const, label: 'Admin', icon: <ShieldCheck size={15} aria-hidden="true" /> }]
      : currentUser?.reportsAccess
        ? [{ view: 'admin' as const, label: 'Reports', icon: <BarChart3 size={15} aria-hidden="true" /> }]
        : []),
  ];
  return (
    <header style={{
      width: '100%',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid var(--sandoz-border-grey)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        maxWidth: '1320px',
        margin: '0 auto',
        padding: '1.1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '72px',
        boxSizing: 'border-box'
      }}>
        {/* Brand Logo & Service Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <a
            href="/"
            onClick={(e) => {
              if (onGoHome) {
                e.preventDefault();
                onGoHome();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              cursor: onGoHome ? 'pointer' : 'default'
            }}
            title={onGoHome ? 'Back to newsfeed' : 'Sandoz OurShout'}
          >
            <img
              src="/sandoz-logo.svg"
              alt="Sandoz Logo"
              style={{ height: '24px', width: 'auto', display: 'block' }}
            />
          </a>

          <div style={{ height: '22px', width: '1px', backgroundColor: 'var(--sandoz-border-grey)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              onClick={onGoHome}
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--sandoz-navy)',
                letterSpacing: '-0.01rem',
                cursor: onGoHome ? 'pointer' : 'default'
              }}
              title={onGoHome ? 'Back to newsfeed' : undefined}
            >
              OurShout
            </span>
          </div>

          {currentUser && onNavigate && (
            <nav aria-label="Main" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
              {navItems.map((item) => {
                const active = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onNavigate(item.view)}
                    style={navButtonStyle(active)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right side: Session / User info when logged in, empty when logged out */}
        <div>
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {/* Profile Pill Button: clicks to open profile */}
              <button
                type="button"
                onClick={onViewProfile}
                title={currentUser.teamName ? `${currentUser.name} · ${currentUser.teamName} (View Profile)` : `View recognition profile for ${currentUser.name}`}
                aria-label={`View recognition profile for ${currentUser.name}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.35rem 0.85rem',
                  backgroundColor: 'var(--sandoz-soft-blue-bg)',
                  borderRadius: '3.125rem',
                  border: '1px solid var(--sandoz-pill-blue)',
                  cursor: onViewProfile ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  outline: 'none',
                  minHeight: '38px',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  if (onViewProfile) {
                    e.currentTarget.style.backgroundColor = '#e1efff';
                    e.currentTarget.style.borderColor = 'var(--sandoz-blue)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(28, 89, 181, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (onViewProfile) {
                    e.currentTarget.style.backgroundColor = 'var(--sandoz-soft-blue-bg)';
                    e.currentTarget.style.borderColor = 'var(--sandoz-pill-blue)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--sandoz-blue)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)
                  )}
                </div>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--sandoz-navy)',
                  whiteSpace: 'nowrap'
                }}>
                  {currentUser.name}
                </span>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '3px 9px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  borderRadius: '3.125rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  <Award size={13} />
                  {currentUser.points} pts
                </div>
              </button>

              <button
                type="button"
                onClick={onSignOut}
                title="Sign out of Sandoz SSO"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--sandoz-blue)',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid var(--sandoz-blue)',
                  borderRadius: '3.125rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--sandoz-blue)';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = 'var(--sandoz-blue)';
                }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
