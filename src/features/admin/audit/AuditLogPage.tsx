// src/features/admin/audit/AuditLogPage.tsx
// /admin/audit (requirement 10): every audit entry, newest first, filtered by action, actor and
// date range, a page at a time. Rows expand to show the before/after data.
// Read-only by design: there is no edit or delete anywhere, here or in the API.
import {
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
  Title1,
  tokens,
} from '@fluentui/react-components';
import { ChevronDownRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuditEventDto } from '../../../shared/types';
import { AUDIT_ACTIONS, useAdminAudit, useAdminUsers, type AuditAction } from '../adminData';
import { ADMIN_NS } from '../i18n';

const COLUMN_COUNT = 4;

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalL,
  },
  filterField: { minWidth: '180px' },
  dateField: { width: '170px' },
  clearButton: { alignSelf: 'flex-end' },
  muted: { color: tokens.colorNeutralForeground3 },
  tableWrap: { overflowX: 'auto' },
  table: { minWidth: '680px' },
  whenCol: { width: '190px' },
  detailsCol: { width: '170px' },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
  },
  detailsCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
  },
  diff: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalL,
    '@media (max-width: 720px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  diffHeading: {
    margin: `0 0 ${tokens.spacingVerticalXS}`,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  json: {
    margin: 0,
    padding: tokens.spacingHorizontalM,
    maxHeight: '260px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
});

function formatJson(value: unknown): string | null {
  return value === null || value === undefined ? null : JSON.stringify(value, null, 2);
}

export function AuditLogPage() {
  const styles = useStyles();
  const { t, i18n } = useTranslation(ADMIN_NS);

  const [action, setAction] = useState<AuditAction | ''>('');
  const [actorId, setActorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const datesInvalid = Boolean(from && to && to < from);

  // While the range is backwards, don't filter by date at all (the field shows the error).
  const { data, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useAdminAudit({
    action,
    actorId,
    from: datesInvalid ? '' : from,
    to: datesInvalid ? '' : to,
  });

  // Everyone in the directory, for the "Who" filter.
  const { data: people } = useAdminUsers('');
  const actorOptions = useMemo(() => people ?? [], [people]);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // After "Load more", move focus to the first new row (the button may disappear on the last page).
  const detailsButtons = useRef(new Map<number, HTMLElement>());
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  useEffect(() => {
    if (focusIndex === null || !data) return;
    const item = data.items[focusIndex];
    if (item) detailsButtons.current.get(item.id)?.focus();
    setFocusIndex(null);
  }, [focusIndex, data]);

  async function loadMore() {
    const firstNewIndex = data?.items.length ?? 0;
    await fetchNextPage();
    setFocusIndex(firstNewIndex);
  }

  const hasFilters = Boolean(action || actorId || from || to);
  const clearFilters = () => {
    setAction('');
    setActorId('');
    setFrom('');
    setTo('');
  };

  const dateTime = new Intl.DateTimeFormat(i18n.language || 'en-AU', { dateStyle: 'medium', timeStyle: 'short' });

  function renderRows(event: AuditEventDto) {
    const open = expanded.has(event.id);
    const detailsId = `audit-details-${event.id}`;
    const before = formatJson(event.before);
    const after = formatJson(event.after);
    return (
      <Fragment key={event.id}>
        <TableRow>
          <TableCell>
            <time dateTime={event.createdAt}>{dateTime.format(new Date(event.createdAt))}</time>
          </TableCell>
          <TableCell>
            {event.actor ? (
              <div className={styles.stack}>
                <span>{event.actor.name}</span>
                <Caption1 className={styles.muted}>{event.actor.employeeId}</Caption1>
              </div>
            ) : (
              <Caption1 className={styles.muted}>{t('audit.notInDirectory')}</Caption1>
            )}
          </TableCell>
          <TableCell>{t(`audit.action.${event.action}`, { defaultValue: event.action })}</TableCell>
          <TableCell>
            <Button
              ref={(el) => {
                if (el) detailsButtons.current.set(event.id, el);
                else detailsButtons.current.delete(event.id);
              }}
              size="small"
              appearance="subtle"
              icon={open ? <ChevronDownRegular /> : <ChevronRightRegular />}
              aria-expanded={open}
              aria-controls={detailsId}
              aria-label={t(open ? 'audit.hideDetailsLabel' : 'audit.showDetailsLabel', { id: event.id })}
              onClick={() => toggle(event.id)}
            >
              {t(open ? 'audit.hideDetails' : 'audit.showDetails')}
            </Button>
          </TableCell>
        </TableRow>
        {open && (
          <TableRow id={detailsId}>
            <TableCell colSpan={COLUMN_COUNT} className={styles.detailsCell}>
              <div className={styles.diff}>
                {(
                  [
                    ['before', before],
                    ['after', after],
                  ] as const
                ).map(([label, json]) => (
                  <div key={label}>
                    <h2 className={styles.diffHeading}>{t(`audit.${label}`)}</h2>
                    {json ? (
                      <pre className={styles.json}>{json}</pre>
                    ) : (
                      <Caption1 className={styles.muted}>{t('audit.nothingRecorded')}</Caption1>
                    )}
                  </div>
                ))}
              </div>
            </TableCell>
          </TableRow>
        )}
      </Fragment>
    );
  }

  function renderBody() {
    if (isLoading) return <Spinner label={t('audit.loading')} />;
    if (error || !data) {
      return (
        <MessageBar intent="error">
          <MessageBarBody>{t('audit.loadError')}</MessageBarBody>
        </MessageBar>
      );
    }
    if (data.items.length === 0) return <Body1 as="p">{t('audit.empty')}</Body1>;

    return (
      <>
        <div className={styles.tableWrap}>
          <Table aria-label={t('audit.tableLabel')} className={styles.table}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell className={styles.whenCol}>{t('audit.col.when')}</TableHeaderCell>
                <TableHeaderCell>{t('audit.col.who')}</TableHeaderCell>
                <TableHeaderCell>{t('audit.col.action')}</TableHeaderCell>
                <TableHeaderCell className={styles.detailsCol}>{t('audit.col.details')}</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>{data.items.map(renderRows)}</TableBody>
          </Table>
        </div>
        {hasNextPage && (
          <Button onClick={() => void loadMore()} disabled={isFetchingNextPage}>
            {t('audit.loadMore')}
          </Button>
        )}
      </>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="audit-title">
      <Title1 as="h1" id="audit-title">
        {t('audit.title')}
      </Title1>
      <Body1 as="p">{t('audit.intro')}</Body1>

      <form
        className={styles.filters}
        role="search"
        aria-label={t('audit.filters.label')}
        onSubmit={(e) => e.preventDefault()}
      >
        <Field label={t('audit.filters.action')} className={styles.filterField}>
          <Select value={action} onChange={(_, d) => setAction(d.value as AuditAction | '')}>
            <option value="">{t('audit.filters.anyAction')}</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`audit.action.${a}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('audit.filters.actor')} className={styles.filterField}>
          <Select value={actorId} onChange={(_, d) => setActorId(d.value)}>
            <option value="">{t('audit.filters.anyone')}</option>
            {actorOptions.map((p) => (
              <option key={p.employeeId} value={p.employeeId}>
                {p.name} ({p.employeeId})
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('audit.filters.from')} className={styles.dateField}>
          <Input type="date" value={from} max={to || undefined} onChange={(_, d) => setFrom(d.value)} />
        </Field>
        <Field
          label={t('audit.filters.to')}
          className={styles.dateField}
          validationState={datesInvalid ? 'error' : 'none'}
          validationMessage={datesInvalid ? t('audit.filters.toBeforeFrom') : undefined}
        >
          <Input type="date" value={to} min={from || undefined} onChange={(_, d) => setTo(d.value)} />
        </Field>
        {hasFilters && (
          <Button className={styles.clearButton} onClick={clearFilters}>
            {t('audit.filters.clear')}
          </Button>
        )}
      </form>

      {data && (
        <Caption1 className={styles.muted} aria-live="polite">
          {t('audit.shownCount', { count: data.items.length })}
        </Caption1>
      )}

      {renderBody()}
    </section>
  );
}
