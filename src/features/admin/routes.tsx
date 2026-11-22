// src/features/admin/routes.tsx
// The /admin/* route tree. Every page renders inside AdminLayout, which only shows admin pages
// to someone whose /api/me role is ADMIN (and every /api/admin route is behind require_admin).
import type { ReactElement } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { AlertsPage } from './alerts/AlertsPage';
import { AuctionsAdminPage } from './auctions/AuctionsAdminPage';
import { AuditLogPage } from './audit/AuditLogPage';
import { ComingSoon } from './ComingSoon';
import { PostDetailPage } from './posts/PostDetailPage';
import { PostsPage } from './posts/PostsPage';
import { ReportsPage } from './reports/ReportsPage';
import { ADMIN_SECTIONS, type AdminSection } from './sections';
import { SltShoutoutPage } from './slt/SltShoutoutPage';
import { UserDetailPage } from './users/UserDetailPage';
import { UsersPage } from './users/UsersPage';

const PAGES: Partial<Record<AdminSection, ReactElement>> = {
  posts: <PostsPage />,
  users: <UsersPage />,
  audit: <AuditLogPage />,
  reports: <ReportsPage />,
  alerts: <AlertsPage />,
  auctions: <AuctionsAdminPage />,
  slt: <SltShoutoutPage />,
};

export const adminRoute: RouteObject = {
  path: 'admin',
  element: <AdminLayout />,
  children: [
    { index: true, element: <Navigate to="reports" replace /> },
    ...ADMIN_SECTIONS.map((section) => ({
      path: section,
      element: PAGES[section] ?? <ComingSoon section={section} />,
    })),
    { path: 'posts/:id', element: <PostDetailPage /> },
    { path: 'users/:employeeId', element: <UserDetailPage /> },
  ],
};
