// src/features/admin/AdminApp.tsx
// The whole admin area as one self-contained component for the app shell (src/App.tsx):
//   view === 'admin' && currentUser.role === 'ADMIN' ? <AdminApp /> : ...
// It brings its own providers (Fluent theme, TanStack Query, i18n, router), so nothing else in
// the app needs them. The router owns /admin/* URLs, so admin pages can be bookmarked and reloaded.
// Access: App.tsx only renders it for admins, AdminLayout checks /api/me again, and every
// /api/admin route is behind require_admin on the server.
import { FluentProvider } from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createInstance } from 'i18next';
import { useState } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { sandozAdminTheme } from './adminTheme';
import { ADMIN_NS, adminEn } from './i18n';
import { adminRoute } from './routes';

// A private i18next instance: the rest of the app doesn't use i18next, so admin keeps its own.
const i18n = createInstance();
void i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { [ADMIN_NS]: adminEn } },
  defaultNS: ADMIN_NS,
  initImmediate: false,
  interpolation: { escapeValue: false }, // React escapes output already
});

function AdminRoutes() {
  // Anything outside /admin renders nothing: App.tsx switches back to the feed when that happens.
  return useRoutes([adminRoute, { path: '*', element: null }]);
}

export default function AdminApp() {
  // One query cache per admin visit, so nothing fetched as one user leaks to the next.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }),
  );

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <FluentProvider theme={sandozAdminTheme} style={{ flex: 1, backgroundColor: 'var(--sandoz-sand-bg)' }}>
          <BrowserRouter>
            <main
              id="main-content"
              style={{ maxWidth: '1320px', margin: '0 auto', padding: '2rem 1.25rem 4rem', boxSizing: 'border-box' }}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--sandoz-border-grey)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0, 28, 74, 0.06)',
                  padding: '1.75rem',
                }}
              >
                <AdminRoutes />
              </div>
            </main>
          </BrowserRouter>
        </FluentProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
