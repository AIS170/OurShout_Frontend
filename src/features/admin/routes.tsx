// src/features/admin/routes.tsx
// The /admin/* route tree. Rakshil mounts it with one line in src/app/routes.tsx,
// e.g. children: [ ..., adminRoute ].
import { Navigate, type RouteObject } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { ComingSoon } from './ComingSoon';
import { PrinciplesPage } from './principles/PrinciplesPage';
import { ADMIN_SECTIONS } from './sections';

export const adminRoute: RouteObject = {
  path: 'admin',
  element: <AdminLayout />,
  children: [
    { index: true, element: <Navigate to="principles" replace /> },
    ...ADMIN_SECTIONS.map((section) => ({
      path: section,
      element: section === 'principles' ? <PrinciplesPage /> : <ComingSoon section={section} />,
    })),
  ],
};
