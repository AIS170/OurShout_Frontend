import React, { useState, useEffect } from 'react';
import { Persona, Me, ApiError } from '../types';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  KeyRound
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (token: string, me: Me) => void;
  currentUser: Me | null;
}

/**
 * Generates an imaginary, realistic randomized bcrypt password hash:
 * Format: $2b$12$[22 random salt characters][31 random hash characters] (60 chars)
 */
const generateRandomBcryptHash = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./';
  let salt = '';
  for (let i = 0; i < 22; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let hash = '';
  for (let i = 0; i < 31; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `$2b$12$${salt}${hash}`;
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState<boolean>(true);

  // Form States
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [passwordHash, setPasswordHash] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Action / Feedback States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<{ code: string; message: string } | null>(null);
  const [loginSuccessNotice, setLoginSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    setLoadingPersonas(true);
    try {
      const res = await fetch('/api/auth/personas');
      if (res.ok) {
        const data: Persona[] = await res.json();
        setPersonas(data);
        // Default to the first standard employee persona (Priya Raman)
        if (data.length > 0) {
          const defaultPersona = data.find(p => p.personaId === 'employee') || data[0];
          setSelectedPersonaId(defaultPersona.personaId);
          setPasswordHash(generateRandomBcryptHash());
        }
      } else {
        setLoginError({
          code: 'SERVER_ERROR',
          message: 'Could not load directory accounts from backend API (port 3001).'
        });
      }
    } catch (err: any) {
      setLoginError({
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to backend server. Make sure Python Flask is running.'
      });
    } finally {
      setLoadingPersonas(false);
    }
  };

  // When username changes from dropdown, generate a brand new random hash
  const handleUserSelectChange = (newPersonaId: string) => {
    setSelectedPersonaId(newPersonaId);
    setPasswordHash(generateRandomBcryptHash());
    setLoginError(null);
    setLoginSuccessNotice(null);
  };

  // Re-roll password hash manually
  const handleRegeneratePassword = () => {
    setPasswordHash(generateRandomBcryptHash());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonaId) return;

    setSubmitting(true);
    setLoginError(null);
    setLoginSuccessNotice(null);

    const activePersona = personas.find(p => p.personaId === selectedPersonaId);

    try {
      const res = await fetch('/api/auth/mock-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: selectedPersonaId,
          username: activePersona?.email || selectedPersonaId,
          password: passwordHash
        })
      });

      const data = await res.json();

      if (res.ok) {
        setLoginSuccessNotice(`Authenticated as ${data.me.name} (${data.me.role} · ${data.me.teamName})`);
        setTimeout(() => {
          onLoginSuccess(data.token, data.me);
        }, 500);
      } else {
        const errorData = data as ApiError;
        setLoginError({
          code: errorData.error?.code || 'AUTH_REJECTED',
          message: errorData.error?.message || 'Access denied by single-tenant authentication policy.'
        });
      }
    } catch (err: any) {
      setLoginError({
        code: 'NETWORK_ERROR',
        message: 'Could not contact backend authentication service on localhost:3001.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPersona = personas.find(p => p.personaId === selectedPersonaId);

  // Group personas for structured dropdown
  const activeEmployees = personas.filter(p => p.expected === 'OK');
  const policyScenarios = personas.filter(p => p.expected !== 'OK');

  return (
    <div style={{
      flex: 1,
      backgroundColor: 'var(--sandoz-sand-bg)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 'calc(100vh - 72px)'
    }}>
      {/* Breadcrumb / Service Scope Indicator */}
      <div style={{
        maxWidth: '1320px',
        margin: '0 auto',
        padding: '1.25rem 2rem 0 2rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.82rem',
          fontWeight: 500,
          color: 'var(--sandoz-text-muted)'
        }}>
          <span>OurShout</span>
          <span>&gt;</span>
          <span style={{ color: 'var(--sandoz-navy)', fontWeight: 600 }}>Enterprise Single Sign-On</span>
        </div>
      </div>

      {/* Main Login Viewport */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem 4rem 1.5rem'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid var(--sandoz-border-grey)',
          boxShadow: '0 12px 40px rgba(0, 28, 74, 0.08)',
          padding: '2.75rem 2.5rem',
          boxSizing: 'border-box'
        }}>
          {/* Sandoz Identity & Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img
              src="/sandoz-logo.svg"
              alt="Sandoz"
              style={{ height: '30px', width: 'auto', display: 'inline-block', marginBottom: '1.25rem' }}
            />
            <h1 style={{
              fontFamily: 'var(--font-headline)',
              fontSize: '1.85rem',
              fontWeight: 700,
              color: 'var(--sandoz-navy)',
              margin: '0 0 0.5rem 0',
              letterSpacing: '-0.02rem'
            }}>
              Sign in to OurShout
            </h1>
            <p style={{
              fontSize: '0.95rem',
              color: 'var(--sandoz-text-muted)',
              margin: 0,
              lineHeight: 1.4
            }}>
              Sandoz Australia Internal Peer Recognition Platform
            </p>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--sandoz-blue)',
              backgroundColor: 'var(--sandoz-soft-blue-bg)',
              padding: '4px 12px',
              borderRadius: '3.125rem',
              border: '1px solid var(--sandoz-pill-blue)',
              marginTop: '1rem'
            }}>
              <ShieldCheck size={14} />
              Sandoz Single-Tenant Directory
            </div>
          </div>

          {/* Success Banner */}
          {loginSuccessNotice && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '8px',
              color: '#065F46',
              marginBottom: '1.5rem',
              fontSize: '0.88rem',
              fontWeight: 600
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{loginSuccessNotice}</span>
            </div>
          )}

          {/* Security Policy Rejection Banner (403 Forbidden) */}
          {loginError && (
            <div style={{
              padding: '1rem 1.15rem',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #F87171',
              borderRadius: '8px',
              color: '#991B1B',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#7F1D1D' }}>
                      Access Denied
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: '#FEE2E2',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #FCA5A5'
                    }}>
                      403 · {loginError.code}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.45, color: '#991B1B' }}>
                    {loginError.message}
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.76rem', color: '#B91C1C' }}>
                    Enforced by single-tenant security gate. Event recorded in <code>audit_events</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            {/* Username Dropdown Field */}
            <div style={{ marginBottom: '1.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--sandoz-navy)'
                }}>
                  <User size={15} color="var(--sandoz-blue)" />
                  Username / Sandoz Account
                </label>
                <span style={{ fontSize: '0.74rem', color: 'var(--sandoz-text-muted)' }}>
                  Dropdown Selector
                </span>
              </div>

              <select
                value={selectedPersonaId}
                onChange={(e) => handleUserSelectChange(e.target.value)}
                disabled={loadingPersonas || submitting}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  fontSize: '0.92rem',
                  fontWeight: 500,
                  color: 'var(--sandoz-text-dark)',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid var(--sandoz-border-input)',
                  borderRadius: '8px',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                {loadingPersonas ? (
                  <option value="">Loading Sandoz accounts...</option>
                ) : (
                  <>
                    <optgroup label="── Active Sandoz Employees (Access Granted) ──">
                      {activeEmployees.map((p) => (
                        <option key={p.personaId} value={p.personaId}>
                          {p.name} — {p.email} ({p.roles && p.roles.includes('Admin') ? 'Admin' : 'Employee'})
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="── Security & Policy Test Scenarios (Access Denied 403) ──">
                      {policyScenarios.map((p) => (
                        <option key={p.personaId} value={p.personaId}>
                          {p.name} — {p.email} [{p.expected}]
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>

              {/* Selected Account Detail Chip */}
              {selectedPersona && (
                <div style={{
                  marginTop: '0.45rem',
                  fontSize: '0.78rem',
                  color: 'var(--sandoz-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  backgroundColor: 'var(--sandoz-soft-blue-bg)',
                  borderRadius: '4px'
                }}>
                  <span>
                    <strong>Role:</strong> {selectedPersona.roles?.includes('Admin') ? 'System Admin' : 'Standard Employee'} ·{' '}
                    <strong>Expected:</strong> {selectedPersona.expected}
                  </span>
                  <span style={{ color: 'var(--sandoz-blue)', fontWeight: 600 }}>
                    {selectedPersona.employeeId}
                  </span>
                </div>
              )}
            </div>

            {/* Password Field (Randomized & Auto-filled Hash) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--sandoz-navy)'
                }}>
                  <Lock size={15} color="var(--sandoz-blue)" />
                  Password (Auto-hashed Credential)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    title="Generate another randomized hash"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--sandoz-blue)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: 0
                    }}
                  >
                    <RefreshCw size={12} />
                    Re-roll hash
                  </button>
                </div>
              </div>

              {/* Password Input with reveal eye & randomizer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--sandoz-border-input)',
                borderRadius: '8px',
                backgroundColor: '#F9FAFB',
                padding: '0 0.75rem',
                boxSizing: 'border-box'
              }}>
                <KeyRound size={16} color="var(--sandoz-text-muted)" style={{ flexShrink: 0, marginRight: '6px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordHash}
                  readOnly
                  title="Randomized simulated hashed password"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0',
                    border: 'none',
                    outline: 'none',
                    fontSize: showPassword ? '0.82rem' : '0.92rem',
                    fontFamily: showPassword ? 'monospace' : 'inherit',
                    color: 'var(--sandoz-navy)',
                    backgroundColor: 'transparent',
                    letterSpacing: showPassword ? '0' : '0.15rem'
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Mask hashed password' : 'Show randomized hash string'}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--sandoz-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Hash Preview Footnote */}
              <div style={{
                marginTop: '0.45rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--sandoz-text-muted)'
              }}>
                <span style={{ fontFamily: 'monospace', color: '#6B7280' }}>
                  {showPassword ? 'Revealed: Bcrypt $2b$12$' : '🔒 Simulated Bcrypt Hash (auto-filled & randomized)'}
                </span>
                <span style={{ color: 'var(--sandoz-blue)', fontWeight: 600 }}>
                  60-char hash
                </span>
              </div>
            </div>

            {/* Remember Me / Session Persistence */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.75rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--sandoz-text-body)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--sandoz-blue)', width: '16px', height: '16px' }}
                />
                Keep me signed in on this device
              </label>
              <span style={{ fontSize: '0.8rem', color: 'var(--sandoz-blue)', cursor: 'pointer' }}>
                Single Sign-On FAQ
              </span>
            </div>

            {/* Sign In Primary Capsule Button */}
            <button
              type="submit"
              disabled={submitting || loadingPersonas || !selectedPersonaId}
              style={{
                width: '100%',
                padding: '0.85rem 1.5rem',
                fontFamily: 'var(--font-headline)',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: 'var(--sandoz-blue)',
                border: 'none',
                borderRadius: '3.125rem',
                cursor: submitting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                boxShadow: '0 4px 14px rgba(28, 89, 181, 0.28)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!submitting) e.currentTarget.style.backgroundColor = '#154690';
              }}
              onMouseLeave={(e) => {
                if (!submitting) e.currentTarget.style.backgroundColor = 'var(--sandoz-blue)';
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Verifying with Sandoz Entra ID...
                </>
              ) : (
                <>
                  Sign In to OurShout
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Quick Persona Scenario Switcher Chips */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #ECEEF1'
          }}>
            <div style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--sandoz-navy)',
              textTransform: 'uppercase',
              letterSpacing: '0.04rem',
              marginBottom: '0.75rem'
            }}>
              Quick-Select Demo Personas:
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleUserSelectChange('employee')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '3.125rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: selectedPersonaId === 'employee' ? '1.5px solid var(--sandoz-blue)' : '1px solid #D1D5DB',
                  backgroundColor: selectedPersonaId === 'employee' ? 'var(--sandoz-soft-blue-bg)' : '#FFFFFF',
                  color: selectedPersonaId === 'employee' ? 'var(--sandoz-blue)' : 'var(--sandoz-text-dark)',
                  cursor: 'pointer'
                }}
              >
                ⭐ Priya (Sales)
              </button>

              <button
                type="button"
                onClick={() => handleUserSelectChange('admin')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '3.125rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: selectedPersonaId === 'admin' ? '1.5px solid var(--sandoz-blue)' : '1px solid #D1D5DB',
                  backgroundColor: selectedPersonaId === 'admin' ? 'var(--sandoz-soft-blue-bg)' : '#FFFFFF',
                  color: selectedPersonaId === 'admin' ? 'var(--sandoz-blue)' : 'var(--sandoz-text-dark)',
                  cursor: 'pointer'
                }}
              >
                👑 Natalie (Admin)
              </button>

              <button
                type="button"
                onClick={() => handleUserSelectChange('manager')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '3.125rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: selectedPersonaId === 'manager' ? '1.5px solid var(--sandoz-blue)' : '1px solid #D1D5DB',
                  backgroundColor: selectedPersonaId === 'manager' ? 'var(--sandoz-soft-blue-bg)' : '#FFFFFF',
                  color: selectedPersonaId === 'manager' ? 'var(--sandoz-blue)' : 'var(--sandoz-text-dark)',
                  cursor: 'pointer'
                }}
              >
                💼 Olivia (Commercial)
              </button>

              <button
                type="button"
                onClick={() => handleUserSelectChange('suspended')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '3.125rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: selectedPersonaId === 'suspended' ? '1.5px solid #DC2626' : '1px solid #FCA5A5',
                  backgroundColor: selectedPersonaId === 'suspended' ? '#FEF2F2' : '#FFFFFF',
                  color: '#DC2626',
                  cursor: 'pointer'
                }}
              >
                ⚠️ Oliver (Suspended)
              </button>

              <button
                type="button"
                onClick={() => handleUserSelectChange('left')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '3.125rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: selectedPersonaId === 'left' ? '1.5px solid #DC2626' : '1px solid #FCA5A5',
                  backgroundColor: selectedPersonaId === 'left' ? '#FEF2F2' : '#FFFFFF',
                  color: '#DC2626',
                  cursor: 'pointer'
                }}
              >
                🚫 Benjamin (Inactive)
              </button>
            </div>
          </div>

          {/* Help & Support Footnote */}
          <div style={{
            marginTop: '1.75rem',
            textAlign: 'center',
            fontSize: '0.78rem',
            color: 'var(--sandoz-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}>
            <HelpCircle size={14} />
            <span>Need assistance? Contact Sandoz Australia IT Helpdesk</span>
          </div>
        </div>
      </main>

      {/* Sandoz Corporate Dark Footer */}
      <footer style={{
        backgroundColor: 'var(--sandoz-navy)',
        color: '#FFFFFF',
        padding: '2rem 2rem 1.5rem 2rem',
        marginTop: 'auto'
      }}>
        <div style={{ maxWidth: '1320px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
            © 2026 Sandoz AG. All rights reserved. Sandoz Australia OurShout Recognition Platform · Localhost Single-Tenant Prototype
          </p>
        </div>
      </footer>
    </div>
  );
};
