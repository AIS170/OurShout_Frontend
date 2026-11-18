import React from 'react';
import { Persona } from '../types';
import { ArrowRight, CheckCircle2, AlertOctagon, UserX, ShieldAlert, Globe, MapPin, Briefcase, Hash } from 'lucide-react';

interface PersonaCardProps {
  persona: Persona;
  isLoading: boolean;
  onSelect: (personaId: string) => void;
}

export const PersonaCard: React.FC<PersonaCardProps> = ({ persona, isLoading, onSelect }) => {
  const isHappyPath = persona.expected === 'OK';

  const getStatusBadge = () => {
    switch (persona.expected) {
      case 'OK':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: '3.125rem',
            border: '1px solid #A7F3D0'
          }}>
            <CheckCircle2 size={13} /> Active Verified Employee
          </span>
        );
      case 'ACCOUNT_SUSPENDED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: '3.125rem',
            border: '1px solid #FECACA'
          }}>
            <AlertOctagon size={13} /> Tests 403 Suspended
          </span>
        );
      case 'NOT_ACTIVE_EMPLOYEE':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#F3F4F6',
            color: '#374151',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: '3.125rem',
            border: '1px solid #D1D5DB'
          }}>
            <UserX size={13} /> Tests 403 Former Employee
          </span>
        );
      case 'GUEST_NOT_ALLOWED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FFFBEB',
            color: '#92400E',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: '3.125rem',
            border: '1px solid #FDE68A'
          }}>
            <ShieldAlert size={13} /> Tests 403 Guest Partner
          </span>
        );
      case 'WRONG_TENANT':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FDF2F8',
            color: '#9D174D',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: '3.125rem',
            border: '1px solid #FBCFE8'
          }}>
            <Globe size={13} /> Tests 403 External Tenant
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid var(--sandoz-border-grey)',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0, 28, 74, 0.04)',
        transition: 'all 0.22s ease-in-out',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--sandoz-blue)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(28, 89, 181, 0.09)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--sandoz-border-grey)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 28, 74, 0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div>
        {/* Top Badges Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--sandoz-blue)',
            backgroundColor: 'var(--sandoz-soft-blue-bg)',
            padding: '4px 12px',
            borderRadius: '3.125rem',
            border: '1px solid var(--sandoz-pill-blue)'
          }}>
            {persona.personaId.toUpperCase()}
          </span>
          {getStatusBadge()}
        </div>

        {/* Name / Title */}
        <h3 style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '1.35rem',
          fontWeight: 700,
          color: 'var(--sandoz-navy)',
          marginBottom: '0.65rem',
          letterSpacing: '-0.015rem'
        }}>
          {persona.label}
        </h3>

        {/* Metadata info row (Job search style) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          fontSize: '0.85rem',
          color: 'var(--sandoz-text-muted)',
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={14} color="var(--sandoz-blue)" /> Australia (AU)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Briefcase size={14} color="var(--sandoz-blue)" /> Sandoz Enterprise
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Hash size={14} color="var(--sandoz-blue)" /> Entra SSO
          </span>
        </div>

        {/* Description / Scenario Explanation */}
        <p style={{
          fontSize: '0.93rem',
          color: 'var(--sandoz-text-body)',
          lineHeight: 1.55,
          marginBottom: '1.75rem'
        }}>
          {persona.description}
        </p>
      </div>

      {/* Sandoz Signature Rounded Pill Button */}
      <button
        onClick={() => onSelect(persona.personaId)}
        disabled={isLoading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          padding: '0.75rem 1.5rem',
          borderRadius: '3.125rem',
          fontWeight: 600,
          fontSize: '0.92rem',
          border: 'none',
          backgroundColor: isHappyPath ? 'var(--sandoz-blue)' : '#4d4d57',
          color: '#FFFFFF',
          opacity: isLoading ? 0.7 : 1
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = isHappyPath ? 'var(--sandoz-blue-hover)' : '#221f1f';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = isHappyPath ? 'var(--sandoz-blue)' : '#4d4d57';
          }
        }}
      >
        {isLoading ? 'Verifying with Entra ID...' : (
          <>
            {isHappyPath ? 'Sign In with Sandoz SSO' : 'Simulate Security Scenario'}
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </div>
  );
};
