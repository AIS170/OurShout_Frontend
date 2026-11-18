import React from 'react';
import { Me } from '../types';
import { Award, LogOut } from 'lucide-react';

interface SandozHeaderProps {
  currentUser: Me | null;
  onSignOut: () => void;
}

export const SandozHeader: React.FC<SandozHeaderProps> = ({ currentUser, onSignOut }) => {
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
          <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src="/sandoz-logo.svg"
              alt="Sandoz Logo"
              style={{ height: '24px', width: 'auto', display: 'block' }}
            />
          </a>

          <div style={{ height: '22px', width: '1px', backgroundColor: 'var(--sandoz-border-grey)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontFamily: 'var(--font-headline)',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--sandoz-navy)',
              letterSpacing: '-0.01rem'
            }}>
              OurShout
            </span>
          </div>
        </div>

        {/* Right side: Session / User info when logged in, empty when logged out */}
        <div>
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.4rem 0.9rem',
                backgroundColor: 'var(--sandoz-soft-blue-bg)',
                borderRadius: '3.125rem',
                border: '1px solid var(--sandoz-pill-blue)'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--sandoz-blue)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>
                  {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sandoz-navy)' }}>
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--sandoz-text-muted)' }}>
                    {currentUser.teamName} · {currentUser.role}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '3px 9px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  borderRadius: '3.125rem',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  <Award size={13} />
                  {currentUser.points} pts
                </div>
              </div>

              <button
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
                  transition: 'all 0.15s ease'
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
