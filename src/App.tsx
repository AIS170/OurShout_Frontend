import React, { useState, useEffect } from 'react';
import { Me } from './types';
import { SandozHeader } from './components/SandozHeader';
import { LoginPage } from './pages/LoginPage';
import { FeedPage } from './pages/FeedPage';
import { ComposePage } from './pages/ComposePage';
import { ProfilePage } from './pages/ProfilePage';
import { Shield } from 'lucide-react';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<Me | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [adminToast, setAdminToast] = useState<string | null>(null);
  // Signed-in users land on the newsfeed. The profile card is one click away.
  // 'profile' is the account and session card; 'person' is someone's recognition profile.
  const [view, setView] = useState<'feed' | 'profile' | 'compose' | 'person'>('feed');
  const [profileId, setProfileId] = useState<string>('');

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
        onViewProfile={currentUser ? () => openProfile(currentUser.employeeId) : undefined}
        onAdminDashboard={currentUser?.role === 'ADMIN' ? handleAdminDashboardClick : undefined}
        onGoHome={currentUser ? () => setView('feed') : undefined}
      />

      {adminToast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: '84px',
            right: '24px',
            zIndex: 1000,
            backgroundColor: 'var(--sandoz-navy)',
            color: '#FFFFFF',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 28, 74, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}
        >
          <Shield size={16} color="#60A5FA" />
          <span>{adminToast}</span>
          <button
            type="button"
            onClick={() => setAdminToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '1.1rem',
              lineHeight: 1,
              cursor: 'pointer',
              marginLeft: '8px',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {currentUser && view === 'compose' ? (
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
          onAdminDashboard={currentUser?.role === 'ADMIN' ? handleAdminDashboardClick : undefined}
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
