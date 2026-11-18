import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Me } from './types';
import { SandozHeader, type HeaderView } from './components/SandozHeader';
import { LoginPage } from './pages/LoginPage';
import { FeedPage } from './pages/FeedPage';
import { ComposePage } from './pages/ComposePage';
import { ProfilePage } from './pages/ProfilePage';
import { LeaderboardPage } from './features/leaderboard';

// Admin pages are only downloaded when an admin opens them.
const AdminApp = lazy(() => import('./features/admin/AdminApp'));
const isAdminPath = () => window.location.pathname.startsWith('/admin');
import { Award, Building, Mail, MapPin, User, LogOut, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<Me | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  // Signed-in users land on the newsfeed. The profile card is one click away.
  // 'profile' is the account and session card; 'person' is someone's recognition profile.
  // 'admin' and 'leaderboard' were added for Nathan's features. Opening /admin/... directly
  // (bookmark or reload) starts in the admin view; non-admins are sent back to the feed below.
  const [view, setView] = useState<'feed' | 'profile' | 'compose' | 'person' | 'leaderboard' | 'admin'>(
    () => (isAdminPath() ? 'admin' : 'feed')
  );
  const [profileId, setProfileId] = useState<string>('');

  // The admin area owns the /admin URLs. Leaving it puts the address back to "/", and using the
  // browser's Back button out of /admin returns to the feed.
  useEffect(() => {
    if (view !== 'admin' && isAdminPath()) window.history.replaceState(null, '', '/');
  }, [view]);
  useEffect(() => {
    const onPopState = () => {
      if (!isAdminPath()) setView((v) => (v === 'admin' ? 'feed' : v));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  // Only admins (Natalie in the mock data) can be in the admin view.
  useEffect(() => {
    if (view === 'admin' && currentUser && currentUser.role !== 'ADMIN') setView('feed');
  }, [view, currentUser]);

  const navigate = (target: HeaderView) => {
    if (target === 'admin' && !isAdminPath()) window.history.pushState(null, '', '/admin');
    setView(target);
  };

  useEffect(() => {
    if (token) {
      verifyCurrentSession(token);
    } else {
      setLoadingInitial(false);
    }
  }, [token]);

  const verifyCurrentSession = async (jwtToken: string) => {
    try {
      const res = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      if (res.ok) {
        const meData = await res.json();
        setCurrentUser(meData);
      } else {
        sessionStorage.removeItem('token');
        setToken(null);
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Session verification error:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const openProfile = (employeeId: string) => {
    setProfileId(employeeId);
    setView('person');
  };

  // Points change when you give a shout-out, so the header is refreshed after one is posted.
  const refreshCurrentUser = () => {
    if (token) verifyCurrentSession(token);
  };

  const handleLoginSuccess = (newToken: string, me: Me) => {
    sessionStorage.setItem('token', newToken);
    setToken(newToken);
    setCurrentUser(me);
    setView('feed');
  };

  const handleSignOut = () => {
    sessionStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setView('feed');
  };

  if (loadingInitial) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--sandoz-sand-bg)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/sandoz-logo.svg" alt="Sandoz" style={{ height: '32px', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--sandoz-text-muted)', fontSize: '0.95rem' }}>
            Connecting to Sandoz Entra ID...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
      <SandozHeader currentUser={currentUser} onSignOut={handleSignOut} currentView={view} onNavigate={navigate} />

      {currentUser && view === 'admin' && currentUser.role === 'ADMIN' ? (
        <Suspense
          fallback={
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--sandoz-text-muted)' }}>Loading admin…</p>
          }
        >
          <AdminApp />
        </Suspense>
      ) : currentUser && view === 'leaderboard' ? (
        <div className="os-feed-wrap">
          <LeaderboardPage onOpenProfile={openProfile} />
        </div>
      ) : currentUser && view === 'compose' ? (
        <ComposePage
          currentUser={currentUser}
          onDone={() => setView('feed')}
          onCreated={refreshCurrentUser}
          onSessionEnded={handleSignOut}
        />
      ) : currentUser && view === 'person' ? (
        <ProfilePage
          employeeId={profileId}
          currentUser={currentUser}
          onBack={() => setView('feed')}
          onOpenProfile={openProfile}
          onCompose={() => setView('compose')}
          onViewAccount={() => setView('profile')}
          onSessionEnded={handleSignOut}
        />
      ) : currentUser && view === 'feed' ? (
        <FeedPage
          currentUser={currentUser}
          onViewProfile={() => openProfile(currentUser.employeeId)}
          onCompose={() => setView('compose')}
          onOpenProfile={openProfile}
          onSessionEnded={handleSignOut}
        />
      ) : currentUser ? (
        /* Authenticated Welcome Screen */
        <main style={{ maxWidth: '1100px', margin: '3rem auto', padding: '0 2rem', width: '100%', flex: 1 }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid var(--sandoz-border-grey)',
            padding: '2.5rem',
            boxShadow: '0 4px 20px rgba(0, 28, 74, 0.06)'
          }}>
            {/* Top Identity Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--sandoz-blue)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.6rem',
                  boxShadow: '0 4px 12px rgba(28, 89, 181, 0.25)'
                }}>
                  {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h1 style={{
                      fontFamily: 'var(--font-headline)',
                      fontSize: '1.9rem',
                      fontWeight: 700,
                      color: 'var(--sandoz-navy)',
                      letterSpacing: '-0.015rem'
                    }}>
                      {currentUser.name}
                    </h1>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: '#ECFDF5',
                      color: '#065F46',
                      padding: '4px 12px',
                      borderRadius: '3.125rem',
                      border: '1px solid #A7F3D0'
                    }}>
                      <CheckCircle2 size={13} /> Active SSO Session
                    </span>
                  </div>
                  <p style={{ color: 'var(--sandoz-text-muted)', fontSize: '1rem', marginTop: '4px' }}>
                    {currentUser.jobTitle}
                  </p>
                </div>
              </div>

              {/* Points Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '3.125rem',
                padding: '0.65rem 1.5rem'
              }}>
                <Award size={26} color="#B45309" />
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#92400E', lineHeight: 1 }}>
                    {currentUser.points} pts
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 600 }}>
                    OurShout Recognition Points
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Directory Data Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              backgroundColor: 'var(--sandoz-soft-blue-bg)',
              borderRadius: '8px',
              padding: '1.5rem',
              border: '1px solid var(--sandoz-pill-blue)',
              marginBottom: '2.5rem'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sandoz-blue)', textTransform: 'uppercase' }}>
                  Employee ID
                </span>
                <p style={{ fontWeight: 700, color: 'var(--sandoz-navy)', fontSize: '1rem', marginTop: '4px' }}>
                  {currentUser.employeeId}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sandoz-blue)', textTransform: 'uppercase' }}>
                  Department / Team
                </span>
                <p style={{ fontWeight: 700, color: 'var(--sandoz-navy)', fontSize: '1rem', marginTop: '4px' }}>
                  {currentUser.teamName} ({currentUser.teamId})
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sandoz-blue)', textTransform: 'uppercase' }}>
                  Role & Status
                </span>
                <p style={{ fontWeight: 700, color: 'var(--sandoz-navy)', fontSize: '1rem', marginTop: '4px' }}>
                  {currentUser.role} · {currentUser.status}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sandoz-blue)', textTransform: 'uppercase' }}>
                  Location
                </span>
                <p style={{ fontWeight: 700, color: 'var(--sandoz-navy)', fontSize: '1rem', marginTop: '4px' }}>
                  {currentUser.country} (Australia)
                </p>
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--sandoz-border-grey)', paddingTop: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--sandoz-text-muted)' }}>
                <ShieldCheck size={18} color="var(--sandoz-blue)" />
                Single-tenant Entra ID session token valid for 8 hours.
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setView('feed')}
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
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--sandoz-blue-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--sandoz-blue)')}
                >
                  Back to newsfeed
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={handleSignOut}
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
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--sandoz-sand-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <LogOut size={16} />
                  Switch Persona / Sign Out
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} currentUser={currentUser} />
      )}
    </div>
  );
};
