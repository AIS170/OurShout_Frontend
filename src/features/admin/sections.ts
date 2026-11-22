// src/features/admin/sections.ts
// The admin side-nav sections, in order. Each is a child route of /admin and an i18n key under nav.*
// Principles was removed on request; Emails is hidden until the backend has an email queue (outbox).
// Reports comes first: it is the admin landing page (see the index redirect in routes.tsx).
// 'auctions' is the "Add auction item" page; 'slt' is where an admin posts an SLT shout-out.
// The Senior Leadership Team and managers only get 'reports' (see AdminLayout).
export const ADMIN_SECTIONS = ['reports', 'posts', 'users', 'audit', 'alerts', 'auctions', 'slt'] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
