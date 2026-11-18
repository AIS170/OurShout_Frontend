// src/features/admin/posts/PostsPage.tsx
// /admin/posts: every shout-out in every visibility as a compact list, with a visibility filter,
// text search, View shout-out (full post), Hide / Unhide, and Delete behind a confirm dialog.
// ?between=E0005,E0013&month=2026-11 (from the Alerts page) limits it to one pair's posts.
// The server enforces the rules (admin only, HIDDEN ↔ VISIBLE, DELETED is final) and writes
// SHOUTOUT_HIDDEN / SHOUTOUT_UNHIDDEN / SHOUTOUT_DELETED audit rows.
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { OpenRegular, SearchRegular } from '@fluentui/react-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { ShoutoutDto, Visibility } from '../../../shared/types';
import { canChangeVisibility, useAdminShoutouts, useAdminUsers, type VisibilityFilter } from '../adminData';
import { ADMIN_NS } from '../i18n';
import { useDebouncedValue } from '../useDebouncedValue';
import { DeletePostDialog } from './DeletePostDialog';
import { formatMonth, recipientsLabel, VISIBILITY_COLOR } from './postFormat';

const VISIBILITY_FILTERS: VisibilityFilter[] = ['ALL', 'VISIBLE', 'HIDDEN', 'DELETED'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  // Same look as Fluent's Title1, on a real <h1> that can take focus after an action.
  title: {
    ...typographyStyles.title1,
    margin: 0,
    ':focus-visible': {
      outlineWidth: tokens.strokeWidthThick,
      outlineStyle: 'solid',
      outlineColor: tokens.colorStrokeFocus2,
    },
  },
  filters: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: tokens.spacingHorizontalL },
  visibilityField: { minWidth: '160px' },
  searchField: { flexGrow: 1, minWidth: '200px', maxWidth: '420px' },
  tableWrap: { overflowX: 'auto' },
  table: { minWidth: '860px' },
  postedCol: { width: '130px' },
  principleCol: { width: '200px' },
  visibilityCol: { width: '100px' },
  actionsCol: { width: '290px' },
  cellStack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalXXS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
  },
  muted: { color: tokens.colorNeutralForeground3 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
});

type DeleteState = { open: boolean; key: number; post: ShoutoutDto | null };

export function PostsPage() {
  const styles = useStyles();
  const { t, i18n } = useTranslation(ADMIN_NS);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Pair filter from the Alerts page.
  const pair = useMemo(() => {
    const ids = (searchParams.get('between') ?? '').split(',').filter(Boolean);
    return ids.length === 2 && ids[0] !== ids[1] ? ([ids[0], ids[1]] as [string, string]) : null;
  }, [searchParams]);
  const monthParam = searchParams.get('month') ?? '';
  const month = MONTH.test(monthParam) ? monthParam : '';
  const { data: people } = useAdminUsers('');
  const nameOf = (id: string) => people?.find((p) => p.employeeId === id)?.name ?? id;

  const [visibility, setVisibilityFilter] = useState<VisibilityFilter>('ALL');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search);

  const { data, isLoading, error, setVisibility, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminShoutouts({ visibility, q, between: pair, month });

  const [announcement, setAnnouncement] = useState('');
  const [actionError, setActionError] = useState('');
  const [del, setDel] = useState<DeleteState>({ open: false, key: 0, post: null });
  const busy = useRef(false);

  // After an action the row may change or leave the list. Put focus back on the row's
  // Hide/Unhide button if it's still there, otherwise on the page heading.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const toggleRefs = useRef(new Map<number, HTMLElement>());
  const [focusAfter, setFocusAfter] = useState<number | null>(null);
  useEffect(() => {
    if (focusAfter === null) return;
    const frame = requestAnimationFrame(() => {
      (toggleRefs.current.get(focusAfter) ?? headingRef.current)?.focus();
    });
    setFocusAfter(null);
    return () => cancelAnimationFrame(frame);
  }, [focusAfter, data]);

  const dateFormat = new Intl.DateTimeFormat(i18n.language || 'en-AU', { dateStyle: 'medium' });
  const basePath = location.pathname.replace(/\/+$/, '');

  async function change(post: ShoutoutDto, to: Visibility) {
    if (busy.current) return;
    busy.current = true;
    setActionError('');
    try {
      await setVisibility(post.id, to);
      const key = to === 'HIDDEN' ? 'hidden' : to === 'VISIBLE' ? 'unhidden' : 'deleted';
      setAnnouncement(t(`posts.announce.${key}`, { id: post.id }));
      setFocusAfter(post.id);
    } finally {
      busy.current = false;
    }
  }

  async function toggleHidden(post: ShoutoutDto) {
    try {
      await change(post, post.visibility === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE');
    } catch {
      setAnnouncement('');
      setActionError(t('posts.actionError'));
    }
  }

  async function confirmDelete() {
    if (!del.post) return;
    await change(del.post, 'DELETED'); // errors are shown inside the dialog
    setDel((d) => ({ ...d, open: false }));
  }

  function renderRow(post: ShoutoutDto) {
    const canToggle =
      canChangeVisibility(post.visibility, 'HIDDEN') || canChangeVisibility(post.visibility, 'VISIBLE');
    const hidden = post.visibility === 'HIDDEN';
    const href = `${basePath}/${post.id}`;
    return (
      <TableRow key={post.id}>
        <TableCell>
          <div className={styles.cellStack}>
            <time dateTime={post.createdAt}>{dateFormat.format(new Date(post.createdAt))}</time>
            {post.editedAt && <Caption1 className={styles.muted}>{t('posts.edited')}</Caption1>}
          </div>
        </TableCell>
        <TableCell>{post.sender.name}</TableCell>
        <TableCell>{recipientsLabel(post, t)}</TableCell>
        <TableCell>
          <div className={styles.cellStack}>
            <span>{post.principle.name}</span>
            {post.actOfKindness && (
              <Badge appearance="tint" color="brand" size="small">
                {t('posts.actOfKindness')}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge appearance="tint" color={VISIBILITY_COLOR[post.visibility]}>
            {t(`posts.visibility.${post.visibility}`)}
          </Badge>
        </TableCell>
        <TableCell>
          <div className={styles.actions}>
            {/* A real link (opens in a new tab with Ctrl+click), routed in-app on a plain click. */}
            <Button
              as="a"
              href={href}
              size="small"
              appearance="primary"
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
            {canToggle && (
              <Button
                ref={(el) => {
                  if (el) toggleRefs.current.set(post.id, el);
                  else toggleRefs.current.delete(post.id);
                }}
                size="small"
                aria-label={t(hidden ? 'posts.actions.unhideLabel' : 'posts.actions.hideLabel', { id: post.id })}
                onClick={() => toggleHidden(post)}
              >
                {t(hidden ? 'posts.actions.unhide' : 'posts.actions.hide')}
              </Button>
            )}
            {post.visibility !== 'DELETED' && (
              <Button
                size="small"
                aria-label={t('posts.actions.deleteLabel', { id: post.id })}
                onClick={() => setDel((d) => ({ open: true, key: d.key + 1, post }))}
              >
                {t('posts.actions.delete')}
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  function renderBody() {
    if (isLoading) return <Spinner label={t('posts.loading')} />;
    if (error || !data) {
      return (
        <MessageBar intent="error">
          <MessageBarBody>{t('posts.loadError')}</MessageBarBody>
        </MessageBar>
      );
    }
    if (data.items.length === 0) return <Body1 as="p">{t('posts.empty')}</Body1>;

    return (
      <>
        <div className={styles.tableWrap}>
          <Table aria-label={t('posts.tableLabel')} className={styles.table}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell className={styles.postedCol}>{t('posts.col.posted')}</TableHeaderCell>
                <TableHeaderCell>{t('posts.col.from')}</TableHeaderCell>
                <TableHeaderCell>{t('posts.col.to')}</TableHeaderCell>
                <TableHeaderCell className={styles.principleCol}>{t('posts.col.principle')}</TableHeaderCell>
                <TableHeaderCell className={styles.visibilityCol}>{t('posts.col.visibility')}</TableHeaderCell>
                <TableHeaderCell className={styles.actionsCol}>{t('posts.col.actions')}</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>{data.items.map(renderRow)}</TableBody>
          </Table>
        </div>
        {hasNextPage && (
          <Button onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
            {t('posts.loadMore')}
          </Button>
        )}
      </>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="posts-title">
      <h1 id="posts-title" ref={headingRef} tabIndex={-1} className={styles.title}>
        {t('posts.title')}
      </h1>
      <Body1 as="p">{t('posts.intro')}</Body1>

      {pair && (
        <MessageBar intent="info">
          <MessageBarBody>
            {t(month ? 'posts.pairFilter.withMonth' : 'posts.pairFilter.anyTime', {
              a: nameOf(pair[0]),
              b: nameOf(pair[1]),
              month: month ? formatMonth(month, i18n.language) : '',
            })}
          </MessageBarBody>
          <MessageBarActions>
            <Button size="small" onClick={() => setSearchParams({})}>
              {t('posts.pairFilter.clear')}
            </Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <form
        className={styles.filters}
        role="search"
        aria-label={t('posts.filters.label')}
        onSubmit={(e) => e.preventDefault()}
      >
        <Field label={t('posts.filters.visibility')} className={styles.visibilityField}>
          <Select value={visibility} onChange={(_, d) => setVisibilityFilter(d.value as VisibilityFilter)}>
            {VISIBILITY_FILTERS.map((v) => (
              <option key={v} value={v}>
                {t(`posts.visibility.${v}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('posts.filters.search')} className={styles.searchField}>
          <Input
            type="search"
            value={search}
            placeholder={t('posts.filters.searchPlaceholder')}
            contentBefore={<SearchRegular aria-hidden />}
            onChange={(_, d) => setSearch(d.value)}
          />
        </Field>
        {data && (
          <Caption1 className={styles.muted} aria-live="polite">
            {t('posts.resultCount', { count: data.items.length })}
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

      <DeletePostDialog
        key={del.key}
        open={del.open}
        post={del.post}
        onConfirm={confirmDelete}
        onClose={() => setDel((d) => ({ ...d, open: false }))}
      />
    </section>
  );
}
