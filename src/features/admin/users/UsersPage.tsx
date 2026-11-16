// src/features/admin/users/UsersPage.tsx
// /admin/users: search people and Suspend / Reinstate them. You can't suspend yourself.
// The server enforces both rules (admin only, not yourself) and writes
// USER_SUSPENDED / USER_REINSTATED audit rows.
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Field,
  Input,
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
  tokens,
} from '@fluentui/react-components';
import { SearchRegular } from '@fluentui/react-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminUserDto } from '../../../shared/types';
import { useAdminMe, useAdminUsers } from '../adminData';
import { ADMIN_NS } from '../i18n';
import { useDebouncedValue } from '../useDebouncedValue';

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
  tableWrap: { overflowX: 'auto' },
  table: { minWidth: '900px' },
  roleCol: { width: '100px' },
  directoryCol: { width: '120px' },
  statusCol: { width: '110px' },
  actionsCol: { width: '150px' },
  nameCell: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  email: { overflowWrap: 'anywhere' },
  muted: { color: tokens.colorNeutralForeground3 },
});

export function UsersPage() {
  const styles = useStyles();
  const { t } = useTranslation(ADMIN_NS);
  const { data: me } = useAdminMe();

  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search);
  const { data: users, isLoading, error, setStatus } = useAdminUsers(q);

  const [announcement, setAnnouncement] = useState('');
  const [actionError, setActionError] = useState('');
  const busy = useRef(false);

  // The Suspend/Reinstate button is one element whose label flips, and rows never leave the
  // list on a status change, so keyboard focus stays where it was.
  async function toggleStatus(user: AdminUserDto) {
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

  function renderRow(user: AdminUserDto) {
    const isMe = user.employeeId === me?.employeeId;
    const suspended = user.status === 'SUSPENDED';
    return (
      <TableRow key={user.employeeId}>
        <TableCell>
          <span className={styles.nameCell}>
            <span>{user.name}</span>
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
        <TableCell>
          {isMe && !suspended ? (
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
