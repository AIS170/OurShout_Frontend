// src/features/admin/AdminLayout.tsx
// The /admin/* shell: a side nav and the current admin page. It renders inside Rakshil's
// Layout (which owns <main> and the skip link), so it doesn't add another <main>.
// Hiding this UI is a convenience only: every /api/admin route is checked by requireAdmin
// (the three report routes by require_reports_access: admins, SLT and managers).
import {
  CounterBadge,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  tokens,
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAdminMe, useOpenAlertCount } from './adminData';
import { ADMIN_NS } from './i18n';
import { ADMIN_SECTIONS } from './sections';

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateColumns: '220px minmax(0, 1fr)',
    gap: tokens.spacingHorizontalXXL,
    alignItems: 'start',
    '@media (max-width: 720px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gap: tokens.spacingVerticalL,
    },
  },
  list: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    '@media (max-width: 720px)': {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacingHorizontalXS,
    },
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    minHeight: '40px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground1,
    textDecorationLine: 'none',
    boxSizing: 'border-box',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
    ':focus-visible': {
      outlineWidth: tokens.strokeWidthThick,
      outlineStyle: 'solid',
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: '2px',
    },
  },
  linkActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover },
  },
  content: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
});

export function AdminLayout() {
  const styles = useStyles();
  const { t } = useTranslation(ADMIN_NS);
  const { data: me, isLoading, error } = useAdminMe();
  const location = useLocation();
  // Only ask for admin data once /api/me says this is an admin.
  const { data: alertCount = 0 } = useOpenAlertCount(me?.role === 'ADMIN');

  if (isLoading) return <Spinner label={t('shell.loading')} />;

  if (error || !me) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>{t('shell.loadError')}</MessageBarBody>
      </MessageBar>
    );
  }

  if (me.role !== 'ADMIN') {
    // The Senior Leadership Team and managers get the Reports page and nothing else: no side
    // nav, and any other admin address goes back to Reports. The server decides what the report
    // covers (everything for SLT, their own team for a manager).
    if (me.reportsAccess) {
      if (!/\/admin\/reports\/?$/.test(location.pathname)) return <Navigate to="/admin/reports" replace />;
      return (
        <div className={styles.content}>
          <Outlet />
        </div>
      );
    }
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>{t('shell.notAdminTitle')}</MessageBarTitle>
          {t('shell.notAdminBody')}
        </MessageBarBody>
      </MessageBar>
    );
  }

  return (
    <div className={styles.root}>
      <nav aria-label={t('nav.label')}>
        <ul className={styles.list}>
          {ADMIN_SECTIONS.map((section) => {
            const showBadge = section === 'alerts' && alertCount > 0;
            return (
              <li key={section}>
                <NavLink
                  to={section}
                  className={({ isActive }) => mergeClasses(styles.link, isActive && styles.linkActive)}
                  aria-label={showBadge ? t('nav.alertsWithCount', { count: alertCount }) : undefined}
                >
                  <span>{t(`nav.${section}`)}</span>
                  {showBadge && (
                    <CounterBadge count={alertCount} color="danger" size="small" aria-hidden />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.content}>
        {/* TODO: remove with sampleData.ts once the Audit log calls the real API. */}
        <MessageBar intent="info">
          <MessageBarBody>{t('shell.sampleData')}</MessageBarBody>
        </MessageBar>
        <Outlet />
      </div>
    </div>
  );
}
