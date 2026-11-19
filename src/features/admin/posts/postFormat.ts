// src/features/admin/posts/postFormat.ts
// Small display helpers shared by the Posts list, the post detail page and the Alerts page.
import type { BadgeProps } from '@fluentui/react-components';
import type { TFunction } from 'i18next';
import type { ShoutoutDto, Visibility } from '../../../shared/types';

export const VISIBILITY_COLOR: Record<Visibility, BadgeProps['color']> = {
  VISIBLE: 'success',
  HIDDEN: 'warning',
  DELETED: 'danger',
};

const MAX_NAMES = 3;

/** "Sales team (8)" for a whole-team shout-out, else names collapsing after 3 to "+2 more". */
export function recipientsLabel(post: ShoutoutDto, t: TFunction, maxNames = MAX_NAMES): string {
  if (post.targetTeam) {
    return t('posts.recipients.team', { team: post.targetTeam.teamName, count: post.recipients.length });
  }
  const names = post.recipients.slice(0, maxNames).map((r) => r.name).join(', ');
  const extra = post.recipients.length - maxNames;
  return extra > 0 ? `${names} ${t('posts.recipients.more', { count: extra })}` : names;
}

/** 'YYYY-MM' -> "November 2026" (UTC, so the month never shifts with the viewer's time zone). */
export function formatMonth(month: string, locale?: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale || 'en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, m - 1, 1)),
  );
}
