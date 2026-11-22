// src/features/admin/posts/PostDetailPage.tsx
// /admin/posts/:id: one shout-out in full (any visibility), with Hide / Unhide / Delete.
// Admin only: it renders inside AdminLayout, and GET /api/admin/shoutouts/:id is behind require_admin.
import {
  Avatar,
  Badge,
  Body1,
  Button,
  Caption1,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { ArrowLeftRegular, HeartRegular } from '@fluentui/react-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import type { Visibility } from '../../../shared/types';
import { AdminApiError } from '../adminApi';
import { canChangeVisibility, useAdminShoutout } from '../adminData';
import { ADMIN_NS } from '../i18n';
import { DeletePostDialog } from './DeletePostDialog';
import { recipientsLabel, VISIBILITY_COLOR } from './postFormat';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, maxWidth: '760px' },
  back: { alignSelf: 'flex-start' },
  title: { ...typographyStyles.title2, margin: 0 },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXL,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  who: { display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 },
  sender: { fontWeight: tokens.fontWeightSemibold },
  muted: { color: tokens.colorNeutralForeground3 },
  badges: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
  principle: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  sectionTitle: { ...typographyStyles.subtitle2, margin: 0 },
  text: { margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  recipients: { margin: 0, paddingLeft: tokens.spacingHorizontalL },
  meta: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalL, alignItems: 'center' },
  likes: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalXXS },
  actions: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
});

export function PostDetailPage() {
  const styles = useStyles();
  const { t, i18n } = useTranslation(ADMIN_NS);
  const navigate = useNavigate();
  const { id } = useParams();
  const postId = Number(id);
  const { data: post, isLoading, error, setVisibility } = useAdminShoutout(postId);

  const [announcement, setAnnouncement] = useState('');
  const [actionError, setActionError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const busy = useRef(false);
  const dateTime = new Intl.DateTimeFormat(i18n.language || 'en-AU', { dateStyle: 'long', timeStyle: 'short' });

  const back = (
    <Button className={styles.back} appearance="subtle" icon={<ArrowLeftRegular />} onClick={() => navigate('..', { relative: 'path' })}>
      {t('posts.detail.back')}
    </Button>
  );

  async function change(to: Visibility) {
    if (busy.current || !post) return;
    busy.current = true;
    setActionError('');
    try {
      await setVisibility(to);
      const key = to === 'HIDDEN' ? 'hidden' : to === 'VISIBLE' ? 'unhidden' : 'deleted';
      setAnnouncement(t(`posts.announce.${key}`, { id: post.id }));
    } finally {
      busy.current = false;
    }
  }

  if (isLoading) return <Spinner label={t('posts.detail.loading')} />;
  if (error || !post) {
    const notFound = error instanceof AdminApiError ? error.status === 404 : !Number.isInteger(postId) || postId <= 0;
    return (
      <section className={styles.page}>
        {back}
        <MessageBar intent={notFound ? 'warning' : 'error'}>
          <MessageBarBody>{t(notFound ? 'posts.detail.notFound' : 'posts.detail.loadError')}</MessageBarBody>
        </MessageBar>
      </section>
    );
  }

  const hidden = post.visibility === 'HIDDEN';
  const slt = post.kind === 'SLT';
  const canToggle = canChangeVisibility(post.visibility, 'HIDDEN') || canChangeVisibility(post.visibility, 'VISIBLE');

  return (
    <section className={styles.page} aria-labelledby="post-title">
      {back}
      <h1 id="post-title" className={styles.title}>
        {t('posts.detail.title', { id: post.id })}
      </h1>

      {post.visibility !== 'DELETED' && (
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>{t('posts.warning.title')}</MessageBarTitle>
            {t('posts.warning.body')}
          </MessageBarBody>
        </MessageBar>
      )}

      <article className={styles.card}>
        <div className={styles.header}>
          {/* An SLT shout-out is from the leadership team; the admin only posted it. */}
          <Avatar name={slt ? t('slt.from') : post.sender.name} color="colorful" size={48} />
          <div className={styles.who}>
            <span className={styles.sender}>{slt ? t('slt.from') : post.sender.name}</span>
            <Caption1 className={styles.muted}>
              {slt
                ? t('slt.postedBy', { name: post.sender.name })
                : [post.sender.jobTitle, post.sender.teamName].filter(Boolean).join(' · ')}
            </Caption1>
          </div>
          <div className={styles.badges}>
            {slt && (
              <Badge appearance="filled" color="warning">
                {t('slt.badge')}
              </Badge>
            )}
            <Badge appearance="tint" color={VISIBILITY_COLOR[post.visibility]}>
              {t(`posts.visibility.${post.visibility}`)}
            </Badge>
            {post.actOfKindness && (
              <Badge appearance="tint" color="brand">
                {t('posts.actOfKindness')}
              </Badge>
            )}
            <Badge appearance="outline">{t(`posts.detail.type.${post.recognitionType}`)}</Badge>
          </div>
        </div>

        <div className={styles.principle}>{post.principle.name}</div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t('posts.detail.recognising', { label: recipientsLabel(post, t, Number.MAX_SAFE_INTEGER) })}
          </h2>
          <ul className={styles.recipients}>
            {post.recipients.map((r) => (
              <li key={r.employeeId}>
                {r.name}
                <Caption1 className={styles.muted}> · {[r.jobTitle, r.teamName].filter(Boolean).join(' · ')}</Caption1>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('posts.detail.why')}</h2>
          <Body1 as="p" className={styles.text}>
            {post.reason}
          </Body1>
        </div>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('posts.detail.impact')}</h2>
          <Body1 as="p" className={styles.text}>
            {post.impact}
          </Body1>
        </div>

        <div className={styles.meta}>
          <Caption1>
            {t('posts.detail.posted')} <time dateTime={post.createdAt}>{dateTime.format(new Date(post.createdAt))}</time>
          </Caption1>
          {post.editedAt && (
            <Caption1 className={styles.muted}>
              {t('posts.detail.edited')} <time dateTime={post.editedAt}>{dateTime.format(new Date(post.editedAt))}</time>
            </Caption1>
          )}
          <Caption1 className={styles.likes}>
            <HeartRegular aria-hidden />
            {t('posts.detail.likes', { count: post.likeCount })}
          </Caption1>
        </div>
      </article>

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

      {post.visibility === 'DELETED' ? (
        <Caption1 className={styles.muted}>{t('posts.actions.none')}</Caption1>
      ) : (
        <div className={styles.actions}>
          {canToggle && (
            <Button
              onClick={() =>
                change(hidden ? 'VISIBLE' : 'HIDDEN').catch(() => {
                  setAnnouncement('');
                  setActionError(t('posts.actionError'));
                })
              }
            >
              {t(hidden ? 'posts.actions.unhide' : 'posts.actions.hide')}
            </Button>
          )}
          <Button onClick={() => setDeleteOpen(true)}>{t('posts.actions.delete')}</Button>
        </div>
      )}

      <DeletePostDialog
        open={deleteOpen}
        post={post}
        onConfirm={async () => {
          await change('DELETED');
          setDeleteOpen(false);
        }}
        onClose={() => setDeleteOpen(false)}
      />
    </section>
  );
}
