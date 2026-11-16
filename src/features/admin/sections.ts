// src/features/admin/sections.ts
// The admin side-nav sections (B3), in order. Each is a child route of /admin and an i18n key under nav.*
export const ADMIN_SECTIONS = [
  'principles',
  'posts',
  'users',
  'audit',
  'reports',
  'emails',
  'alerts',
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
