// src/features/admin/users/UsersPage.tsx
// /admin/users: search people, see how many shout-outs each gave and received over a chosen
// period, open a person's page, and Suspend / Reinstate them. You can't suspend yourself,
// and people who have left Sandoz can't be changed.
// The server enforces these rules (admin only, not yourself, not leavers) and writes
// USER_SUSPENDED / USER_REINSTATED audit rows.
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Field,
  Input,
  Label,
  Link,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Title1,
  ToggleButton,
  tokens,
} from '@fluentui/react-components';
import { SearchRegular } from '@fluentui/react-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { monthsBackRange, useAdminMe, useAdminUsers, USER_PERIODS, type UserPeriod } from '../adminData';
import { ADMIN_NS } from '../i18n';
import { useDebouncedValue } from '../useDebouncedValue';
import type { AdminUserStatsDto } from '../userTypes';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  searchRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalL,
  },
  searchField: { flexGrow: 1, minWidth: '200px', maxWidth: '420px' },
  periodBlock: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  periods: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS, minHeight: '32px', alignItems: 'center' },
  tableWrap: { overflowX: 'auto' },
  table: { minWidth: '1120px' },
  row: { cursor: 'pointer' },
  roleCol: { width: '100px' },
  directoryCol: { width: '120px' },
  statusCol: { width: '110px' },
  countCol: { width: '130px' },
  actionsCol: { width: '150px' },
  nameCell: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  email: { overflowWrap: 'anywhere' },
  num: { fontVariantNumeric: 'tabular-nums' },
  muted: { color: tokens.colorNeutralForeground3 },
});

export function UsersPage() {
  const styles = useStyles();
  const { t } = useTranslation(ADMIN_NS);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me } = useAdminMe();

  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search);
  const [period, setPeriod] = useState<UserPeriod>(1);
  const { data: users, isLoading, error, setStatus } = useAdminUsers(q, monthsBackRange(period));

  const [announcement, setAnnouncement] = useState('');
  const [actionError, setActionError] = useState('');
  const busy = useRef(false);
  const basePath = location.pathname.replace(/\/+$/, '');
  const periodLabel = t(`users.period.m${period}`);

  // The Suspend/Reinstate button is one element whose label flips, and rows never leave the
  // list on a status change, so keyboard focus stays where it was.
  async function toggleStatus(user: AdminUserStatsDto) {
    if (busy.current) return;
    busy.current = true;
    setActionError('');
    const suspending = user.status === 'ACTIVE';
    try {
      await setStatus(user.employeeId, suspending ? 'SUSPENDED' : 'ACTIVE');
      setAnnouncement(t(suspending ? 'users.announce.suspended' : 'users.announce.reinstated', { name: user.name }));
    } catch {
      setAnnouncement('');
      setActionError(t('users.actionError'));
    } finally {
      busy.current = false;
    }
  }

  function renderRow(user: AdminUserStatsDto) {
    const isMe = user.employeeId === me?.employeeId;
    const suspended = user.status === 'SUSPENDED';
    const href = `${basePath}/${encodeURIComponent(user.employeeId)}`;
    return (
      <TableRow
        key={user.employeeId}
        className={styles.row}
        // The whole row opens the person's page; the name link does the same for keyboards.
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a, button')) return;
          navigate(href);
        }}
      >
        <TableCell>
          <span className={styles.nameCell}>
            {/* A real link (opens in a new tab with Ctrl+click), routed in-app on a plain click. */}
            <Link
              href={href}
              aria-label={t('users.viewLabel', { name: user.name })}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                navigate(href);
              }}
            >
              {user.name}
            </Link>
            {isMe && (
              <Badge appearance="outline" size="small">
                {t('users.you')}
              </Badge>
            )}
          </span>
        </TableCell>
        <TableCell className={styles.email}>{user.email}</TableCell>
        <TableCell>{[user.jobTitle, user.teamName].filter(Boolean).join(' · ')}</TableCell>
        <TableCell>
          <Badge appearance="tint" color={user.role === 'ADMIN' ? 'brand' : 'subtle'}>
            {t(`users.role.${user.role}`)}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge appearance="tint" color={user.isActive ? 'subtle' : 'warning'}>
            {t(user.isActive ? 'users.directory.active' : 'users.directory.left')}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge appearance="tint" color={suspended ? 'danger' : 'success'}>
            {t(`users.status.${user.status}`)}
          </Badge>
        </TableCell>
        <TableCell className={styles.num}>{user.givenCount}</TableCell>
        <TableCell className={styles.num}>{user.receivedCount}</TableCell>
        <TableCell>
          {!user.isActive ? (
            <Caption1 className={styles.muted}>{t('users.actions.leftNoChange')}</Caption1>
          ) : isMe && !suspended ? (
            <Caption1 className={styles.muted}>{t('users.actions.cantSuspendSelf')}</Caption1>
          ) : (
            <Button
              size="small"
              aria-label={t(suspended ? 'users.actions.reinstateLabel' : 'users.actions.suspendLabel', {
                name: user.name,
              })}
              onClick={() => toggleStatus(user)}
            >
              {t(suspended ? 'users.actions.reinstate' : 'users.actions.suspend')}
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  }

  function renderBody() {
    if (isLoading) return <Spinner label={t('users.loading')} />;
    if (error || !users) {
      return (
        <MessageBar intent="error">
          <MessageBarBody>{t('users.loadError')}</MessageBarBody>
        </MessageBar>
      );
    }
    if (users.length === 0) return <Body1 as="p">{t('users.empty')}</Body1>;

    return (
      <div className={styles.tableWrap}>
        <Table aria-label={t('users.tableLabel')} className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{t('users.col.name')}</TableHeaderCell>
              <TableHeaderCell>{t('users.col.email')}</TableHeaderCell>
              <TableHeaderCell>{t('users.col.jobAndTeam')}</TableHeaderCell>
              <TableHeaderCell className={styles.roleCol}>{t('users.col.role')}</TableHeaderCell>
              <TableHeaderCell className={styles.directoryCol}>{t('users.col.directory')}</TableHeaderCell>
              <TableHeaderCell className={styles.statusCol}>{t('users.col.status')}</TableHeaderCell>
              <TableHeaderCell className={styles.countCol}>{t('users.col.given', { period: periodLabel })}</TableHeaderCell>
              <TableHeaderCell className={styles.countCol}>
                {t('users.col.received', { period: periodLabel })}
              </TableHeaderCell>
              <TableHeaderCell className={styles.actionsCol}>{t('users.col.actions')}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>{users.map(renderRow)}</TableBody>
        </Table>
      </div>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="users-title">
      <Title1 as="h1" id="users-title">
        {t('users.title')}
      </Title1>
      <Body1 as="p">{t('users.intro')}</Body1>

      <form className={styles.searchRow} role="search" onSubmit={(e) => e.preventDefault()}>
        <Field label={t('users.search')} className={styles.searchField}>
          <Input
            type="search"
            value={search}
            placeholder={t('users.searchPlaceholder')}
            contentBefore={<SearchRegular aria-hidden />}
            onChange={(_, d) => setSearch(d.value)}
          />
        </Field>
        <div className={styles.periodBlock}>
          <Label id="users-period-label">{t('users.periodLabel')}</Label>
          <div className={styles.periods} role="group" aria-labelledby="users-period-label">
            {USER_PERIODS.map((p) => (
              <ToggleButton key={p} size="small" checked={period === p} onClick={() => setPeriod(p)}>
                {t(`users.period.m${p}`)}
              </ToggleButton>
            ))}
          </div>
        </div>
        {users && (
          <Caption1 className={styles.muted} aria-live="polite">
            {t('users.resultCount', { count: users.length })}
          </Caption1>
        )}
      </form>

      <div role="status" aria-live="polite">
        {announcement && (
          <MessageBar intent="success">
            <MessageBarBody>{announcement}</MessageBarBody>
          </MessageBar>
        )}
      </div>
      {actionError && (
        <MessageBar intent="error">
          <MessageBarBody>{actionError}</MessageBarBody>
        </MessageBar>
      )}

      {renderBody()}
    </section>
  );
}
