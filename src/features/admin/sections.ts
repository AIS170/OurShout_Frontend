// src/features/admin/sections.ts
// The admin side-nav sections, in order. Each is a child route of /admin and an i18n key under nav.*
// Principles was removed on request; Emails is hidden until the backend has an email queue (outbox).
export const ADMIN_SECTIONS = ['posts', 'users', 'audit', 'reports', 'alerts'] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
