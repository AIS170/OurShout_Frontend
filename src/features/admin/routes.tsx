// src/features/admin/routes.tsx
// The /admin/* route tree. Rakshil mounts it with one line in src/app/routes.tsx,
// e.g. children: [ ..., adminRoute ].
import type { ReactElement } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { ComingSoon } from './ComingSoon';
import { PostsPage } from './posts/PostsPage';
import { PrinciplesPage } from './principles/PrinciplesPage';
import { ADMIN_SECTIONS, type AdminSection } from './sections';
import { UsersPage } from './users/UsersPage';

// Sections that are built; the rest show a placeholder.
const PAGES: Partial<Record<AdminSection, ReactElement>> = {
  principles: <PrinciplesPage />,
  posts: <PostsPage />,
  users: <UsersPage />,
};

export const adminRoute: RouteObject = {
  path: 'admin',
  element: <AdminLayout />,
  children: [
    { index: true, element: <Navigate to="principles" replace /> },
    ...ADMIN_SECTIONS.map((section) => ({
      path: section,
      element: PAGES[section] ?? <ComingSoon section={section} />,
    })),
  ],
};
