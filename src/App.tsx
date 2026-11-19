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
import { Shield } from 'lucide-react';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<Me | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [adminToast, setAdminToast] = useState<string | null>(null);
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

  const handleAvatarUpdated = (newAvatarUrl: string | null) => {
    setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: newAvatarUrl } : null));
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

  const handleAdminDashboardClick = () => {
    setAdminToast('Admin Dashboard is currently under development.');
    setTimeout(() => setAdminToast(null), 4000);
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
      <SandozHeader
        currentUser={currentUser}
        onSignOut={handleSignOut}
        currentView={view}
        onNavigate={navigate}
        onViewProfile={currentUser ? () => openProfile(currentUser.employeeId) : undefined}
        onAdminDashboard={currentUser?.role === 'ADMIN' ? () => navigate('admin') : undefined}
        onGoHome={currentUser ? () => setView('feed') : undefined}
      />

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
      ) : currentUser && (view === 'person' || view === 'profile') ? (
        <ProfilePage
          employeeId={view === 'person' && profileId ? profileId : currentUser.employeeId}
          currentUser={currentUser}
          onBack={() => setView('feed')}
          onOpenProfile={openProfile}
          onCompose={() => setView('compose')}
          onAdminDashboard={currentUser?.role === 'ADMIN' ? () => navigate('admin') : undefined}
          onAvatarUpdated={handleAvatarUpdated}
          onSessionEnded={handleSignOut}
        />
      ) : currentUser && view === 'feed' ? (
        <FeedPage
          currentUser={currentUser}
          onCompose={() => setView('compose')}
          onOpenProfile={openProfile}
          onSessionEnded={handleSignOut}
        />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} currentUser={currentUser} />
      )}
    </div>
  );
};
