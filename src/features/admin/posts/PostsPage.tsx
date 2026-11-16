// src/features/admin/posts/PostsPage.tsx
// /admin/posts: every shout-out in every visibility, with a visibility filter, text search,
// Hide / Unhide, and Delete behind a "this is permanent" confirm dialog.
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
  type BadgeProps,
} from '@fluentui/react-components';
import { SearchRegular } from '@fluentui/react-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShoutoutDto, Visibility } from '../../../shared/types';
import { canChangeVisibility, useAdminShoutouts, type VisibilityFilter } from '../adminData';
import { ADMIN_NS } from '../i18n';
import { ClampedText } from './ClampedText';
import { DeletePostDialog } from './DeletePostDialog';

const VISIBILITY_FILTERS: VisibilityFilter[] = ['ALL', 'VISIBLE', 'HIDDEN', 'DELETED'];
const VISIBILITY_COLOR: Record<Visibility, BadgeProps['color']> = {
  VISIBLE: 'success',
  HIDDEN: 'warning',
  DELETED: 'danger',
};
const SEARCH_DEBOUNCE_MS = 250;
const MAX_NAMES = 3;

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
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
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalL,
  },
  visibilityField: { minWidth: '160px' },
  searchField: { flexGrow: 1, minWidth: '200px', maxWidth: '420px' },
  tableWrap: { overflowX: 'auto' },
  table: { minWidth: '960px' },
  postedCol: { width: '120px' },
  fromCol: { width: '140px' },
  toCol: { width: '180px' },
  principleCol: { width: '170px' },
  visibilityCol: { width: '100px' },
  actionsCol: { width: '170px' },
  cellStack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalXXS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
  },
  muted: { color: tokens.colorNeutralForeground3 },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
  },
});

type DeleteState = { open: boolean; key: number; post: ShoutoutDto | null };

export function PostsPage() {
  const styles = useStyles();
  const { t, i18n } = useTranslation(ADMIN_NS);

  const [visibility, setVisibilityFilter] = useState<VisibilityFilter>('ALL');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQ(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error, setVisibility, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminShoutouts({ visibility, q });

  const [announcement, setAnnouncement] = useState('');
  const [actionError, setActionError] = useState('');
  const [del, setDel] = useState<DeleteState>({ open: false, key: 0, post: null });
  const busy = useRef(false);

  // After an action the row may change or leave the list. Put focus back on the row's
  // Hide/Unhide button if it's still there, otherwise on the page heading.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const toggleRefs = useRef(new Map<number, HTMLButtonElement>());
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

  function recipientsLabel(post: ShoutoutDto): string {
    if (post.targetTeam) {
      return t('posts.recipients.team', { team: post.targetTeam.teamName, count: post.recipients.length });
    }
    const names = post.recipients.slice(0, MAX_NAMES).map((r) => r.name).join(', ');
    const extra = post.recipients.length - MAX_NAMES;
    return extra > 0 ? `${names} ${t('posts.recipients.more', { count: extra })}` : names;
  }

  const setToggleRef = (id: number) => (el: HTMLButtonElement | null) => {
    if (el) toggleRefs.current.set(id, el);
    else toggleRefs.current.delete(id);
  };

  function renderRow(post: ShoutoutDto) {
    const canToggle =
      canChangeVisibility(post.visibility, 'HIDDEN') || canChangeVisibility(post.visibility, 'VISIBLE');
    const hidden = post.visibility === 'HIDDEN';
    return (
      <TableRow key={post.id}>
        <TableCell>
          <div className={styles.cellStack}>
            <time dateTime={post.createdAt}>{dateFormat.format(new Date(post.createdAt))}</time>
            {post.editedAt && <Caption1 className={styles.muted}>{t('posts.edited')}</Caption1>}
          </div>
        </TableCell>
        <TableCell>{post.sender.name}</TableCell>
        <TableCell>{recipientsLabel(post)}</TableCell>
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
          <div className={styles.cellStack}>
            <ClampedText label={t('posts.why')} text={post.reason} />
            <ClampedText label={t('posts.impact')} text={post.impact} />
          </div>
        </TableCell>
        <TableCell>
          <Badge appearance="tint" color={VISIBILITY_COLOR[post.visibility]}>
            {t(`posts.visibility.${post.visibility}`)}
          </Badge>
        </TableCell>
        <TableCell>
          {post.visibility === 'DELETED' ? (
            <Caption1 className={styles.muted}>{t('posts.actions.none')}</Caption1>
          ) : (
            <div className={styles.actions}>
              {canToggle && (
                <Button
                  ref={setToggleRef(post.id)}
                  size="small"
                  aria-label={t(hidden ? 'posts.actions.unhideLabel' : 'posts.actions.hideLabel', {
                    id: post.id,
                  })}
                  onClick={() => toggleHidden(post)}
                >
                  {t(hidden ? 'posts.actions.unhide' : 'posts.actions.hide')}
                </Button>
              )}
              <Button
                size="small"
                aria-label={t('posts.actions.deleteLabel', { id: post.id })}
                onClick={() => setDel((d) => ({ open: true, key: d.key + 1, post }))}
              >
                {t('posts.actions.delete')}
              </Button>
            </div>
          )}
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
                <TableHeaderCell className={styles.fromCol}>{t('posts.col.from')}</TableHeaderCell>
                <TableHeaderCell className={styles.toCol}>{t('posts.col.to')}</TableHeaderCell>
                <TableHeaderCell className={styles.principleCol}>{t('posts.col.principle')}</TableHeaderCell>
                <TableHeaderCell>{t('posts.col.message')}</TableHeaderCell>
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

      <form
        className={styles.filters}
        role="search"
        aria-label={t('posts.filters.label')}
        onSubmit={(e) => e.preventDefault()}
      >
        <Field label={t('posts.filters.visibility')} className={styles.visibilityField}>
          <Select
            value={visibility}
            onChange={(_, d) => setVisibilityFilter(d.value as VisibilityFilter)}
          >
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
