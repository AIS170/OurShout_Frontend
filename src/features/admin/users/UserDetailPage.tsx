// src/features/admin/users/UserDetailPage.tsx
// /admin/users/:employeeId: one person's page. Shout-outs given and received over a chosen
// period, their points, and a log of every post they sent or received (any visibility):
// the latest 5 first, then pages of 20 behind "Show more".
// Admin only: it renders inside AdminLayout, and both routes it calls are behind require_admin.
import {
  Avatar,
  Badge,
  Body1,
  Button,
  Caption1,
  Label,
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
  ToggleButton,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { ArrowLeftRegular, ChevronLeftRegular, ChevronRightRegular, OpenRegular } from '@fluentui/react-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { ShoutoutDto } from '../../../shared/types';
import { AdminApiError } from '../adminApi';
import {
  monthsBackRange,
  useAdminMe,
  useAdminUser,
  useAdminUserShoutouts,
  USER_PERIODS,
  type UserPeriod,
} from '../adminData';
import { ADMIN_NS } from '../i18n';
import { recipientsLabel, VISIBILITY_COLOR } from '../posts/postFormat';

const PREVIEW_SIZE = 5;
const PAGE_SIZE = 20;

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  back: { alignSelf: 'flex-start' },
  header: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalL, flexWrap: 'wrap' },
  who: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS, minWidth: 0, flexGrow: 1 },
  title: { ...typographyStyles.title2, margin: 0 },
  badges: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
  muted: { color: tokens.colorNeutralForeground3 },
  periodBlock: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  periods: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
  tiles: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: tokens.spacingVerticalXXS,
    padding: tokens.spacingHorizontalL,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  tileLabel: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground3, textTransform: 'uppercase', letterSpacing: '0.03em' },
  tileValue: { ...typographyStyles.title1, margin: 0, fontVariantNumeric: 'tabular-nums' },
  log: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  logTitle: { ...typographyStyles.subtitle1, margin: 0 },
  tableWrap: { overflowX: 'auto' },
  table: { minWidth: '820px' },
  postedCol: { width: '130px' },
  typeCol: { width: '110px' },
  visibilityCol: { width: '100px' },
  actionsCol: { width: '160px' },
  pager: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalM },
  showMore: { alignSelf: 'flex-start' },
});

export function UserDetailPage() {
  const styles = useStyles();
  const { t, i18n } = useTranslation(ADMIN_NS);
  const navigate = useNavigate();
  const location = useLocation();
  const { employeeId = '' } = useParams();
  const { data: me } = useAdminMe();

  const [period, setPeriod] = useState<UserPeriod>(1);
  const { data: user, isLoading, error, setStatus } = useAdminUser(employeeId, monthsBackRange(period));

  // The log starts as the latest 5; "Show more" switches it to pages of 20.
  const [expanded, setExpanded] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const log = useAdminUserShoutouts(employeeId, expanded ? PAGE_SIZE : PREVIEW_SIZE);

  const [announcement, setAnnouncement] = useState('');
  const [actionError, setActionError] = useState('');
  const busy = useRef(false);
  const dateFormat = new Intl.DateTimeFormat(i18n.language || 'en-AU', { dateStyle: 'medium' });
  // /admin/users/E0005 -> /admin
  const adminBase = location.pathname.replace(/\/users\/[^/]*\/?$/, '');

  const back = (
    <Button className={styles.back} appearance="subtle" icon={<ArrowLeftRegular />} onClick={() => navigate('..', { relative: 'path' })}>
      {t('users.detail.back')}
    </Button>
  );

  if (isLoading) return <Spinner label={t('users.detail.loading')} />;
  if (error || !user) {
    const notFound = error instanceof AdminApiError && error.status === 404;
    return (
      <section className={styles.page}>
        {back}
        <MessageBar intent={notFound ? 'warning' : 'error'}>
          <MessageBarBody>{t(notFound ? 'users.detail.notFound' : 'users.detail.loadError')}</MessageBarBody>
        </MessageBar>
      </section>
    );
  }

  const isMe = user.employeeId === me?.employeeId;
  const suspended = user.status === 'SUSPENDED';
  const periodLabel = t(`users.period.m${period}`);

  async function toggleStatus() {
    if (busy.current || !user) return;
    busy.current = true;
    setActionError('');
    try {
      await setStatus(suspended ? 'ACTIVE' : 'SUSPENDED');
      setAnnouncement(t(suspended ? 'users.announce.reinstated' : 'users.announce.suspended', { name: user.name }));
    } catch {
      setAnnouncement('');
      setActionError(t('users.actionError'));
    } finally {
      busy.current = false;
    }
  }

  async function nextPage(from: number) {
    if (!log.pages) return;
    if (from + 1 >= log.pages.length) await log.fetchNextPage();
    setPageIndex(from + 1);
  }

  function renderRow(post: ShoutoutDto) {
    const given = post.sender.employeeId === user!.employeeId;
    const slt = post.kind === 'SLT';
    const href = `${adminBase}/posts/${post.id}`;
    return (
      <TableRow key={post.id}>
        <TableCell>
          <time dateTime={post.createdAt}>{dateFormat.format(new Date(post.createdAt))}</time>
        </TableCell>
        <TableCell>
          {/* An SLT shout-out the admin posted isn't one they gave: it is from the leadership team. */}
          {given && slt ? (
            <Badge appearance="filled" color="warning">
              {t('slt.badge')}
            </Badge>
          ) : (
            <Badge appearance="tint" color={given ? 'brand' : 'informative'}>
              {t(given ? 'users.detail.direction.given' : 'users.detail.direction.received')}
            </Badge>
          )}
        </TableCell>
        <TableCell>{given ? recipientsLabel(post, t) : slt ? t('slt.from') : post.sender.name}</TableCell>
        <TableCell>{post.principle.name}</TableCell>
        <TableCell>
          <Badge appearance="tint" color={VISIBILITY_COLOR[post.visibility]}>
            {t(`posts.visibility.${post.visibility}`)}
          </Badge>
        </TableCell>
        <TableCell>
          <Button
            as="a"
            href={href}
            size="small"
            icon={<OpenRegular />}
            aria-label={t('posts.actions.viewLabel', { id: post.id })}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              navigate(href);
            }}
          >
            {t('posts.actions.view')}
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  function renderLog() {
    if (log.isLoading) return <Spinner label={t('users.detail.logLoading')} />;
    if (log.error || !log.pages) {
      return (
        <MessageBar intent="error">
          <MessageBarBody>{t('users.detail.logError')}</MessageBarBody>
        </MessageBar>
      );
    }
    // A page that isn't loaded yet (Next was just pressed) shows the last one that is.
    const shown = Math.min(expanded ? pageIndex : 0, log.pages.length - 1);
    const page = log.pages[shown];
    if (page.items.length === 0) return <Body1 as="p">{t('users.detail.logEmpty')}</Body1>;
    const hasNext = shown + 1 < log.pages.length || log.hasNextPage;

    return (
      <>
        <div className={styles.tableWrap}>
          <Table aria-labelledby="user-log-title" className={styles.table}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell className={styles.postedCol}>{t('posts.col.posted')}</TableHeaderCell>
                <TableHeaderCell className={styles.typeCol}>{t('users.detail.col.direction')}</TableHeaderCell>
                <TableHeaderCell>{t('users.detail.col.with')}</TableHeaderCell>
                <TableHeaderCell>{t('posts.col.principle')}</TableHeaderCell>
                <TableHeaderCell className={styles.visibilityCol}>{t('posts.col.visibility')}</TableHeaderCell>
                <TableHeaderCell className={styles.actionsCol}>{t('posts.col.actions')}</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>{page.items.map(renderRow)}</TableBody>
          </Table>
        </div>
        {!expanded && hasNext && (
          <Button
            className={styles.showMore}
            onClick={() => {
              setExpanded(true);
              setPageIndex(0);
            }}
          >
            {t('users.detail.showMore')}
          </Button>
        )}
        {expanded && (shown > 0 || hasNext) && (
          <div className={styles.pager}>
            <Button icon={<ChevronLeftRegular />} disabled={shown === 0} onClick={() => setPageIndex(shown - 1)}>
              {t('users.detail.previous')}
            </Button>
            <Caption1 aria-live="polite">{t('users.detail.page', { page: shown + 1 })}</Caption1>
            <Button
              icon={<ChevronRightRegular />}
              iconPosition="after"
              disabled={!hasNext || log.isFetchingNextPage}
              onClick={() => void nextPage(shown)}
            >
              {t('users.detail.next')}
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="user-title">
      {back}

      <div className={styles.header}>
        <Avatar name={user.name} color="colorful" size={64} aria-hidden />
        <div className={styles.who}>
          <h1 id="user-title" className={styles.title}>
            {user.name}
          </h1>
          <Caption1 className={styles.muted}>{[user.jobTitle, user.teamName].filter(Boolean).join(' · ')}</Caption1>
          <Caption1 className={styles.muted}>{user.email}</Caption1>
          <div className={styles.badges}>
            <Badge appearance="tint" color={user.role === 'ADMIN' ? 'brand' : 'subtle'}>
              {t(`users.role.${user.role}`)}
            </Badge>
            <Badge appearance="tint" color={user.isActive ? 'subtle' : 'warning'}>
              {t(user.isActive ? 'users.directory.active' : 'users.directory.left')}
            </Badge>
            <Badge appearance="tint" color={suspended ? 'danger' : 'success'}>
              {t(`users.status.${user.status}`)}
            </Badge>
          </div>
        </div>
        {!user.isActive ? (
          <Caption1 className={styles.muted}>{t('users.actions.leftNoChange')}</Caption1>
        ) : isMe && !suspended ? (
          <Caption1 className={styles.muted}>{t('users.actions.cantSuspendSelf')}</Caption1>
        ) : (
          <Button onClick={() => void toggleStatus()}>
            {t(suspended ? 'users.actions.reinstate' : 'users.actions.suspend')}
          </Button>
        )}
      </div>

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

      <div className={styles.periodBlock}>
        <Label id="user-period-label">{t('users.periodLabel')}</Label>
        <div className={styles.periods} role="group" aria-labelledby="user-period-label">
          {USER_PERIODS.map((p) => (
            <ToggleButton key={p} size="small" checked={period === p} onClick={() => setPeriod(p)}>
              {t(`users.period.m${p}`)}
            </ToggleButton>
          ))}
        </div>
      </div>

      <div className={styles.tiles}>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>{t('users.detail.given')}</span>
          <p className={styles.tileValue}>{user.givenCount}</p>
          <Caption1 className={styles.muted}>{periodLabel}</Caption1>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>{t('users.detail.received')}</span>
          <p className={styles.tileValue}>{user.receivedCount}</p>
          <Caption1 className={styles.muted}>{periodLabel}</Caption1>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>{t('users.detail.points')}</span>
          <p className={styles.tileValue}>{user.points}</p>
          <Caption1 className={styles.muted}>{t('users.detail.allTime')}</Caption1>
        </div>
      </div>

      <div className={styles.log}>
        <h2 id="user-log-title" className={styles.logTitle}>
          {t('users.detail.logTitle')}
        </h2>
        <Caption1 className={styles.muted}>{t('users.detail.logIntro', { name: user.name })}</Caption1>
        {renderLog()}
      </div>
    </section>
  );
}
