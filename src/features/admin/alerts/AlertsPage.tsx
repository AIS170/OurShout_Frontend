// src/features/admin/alerts/AlertsPage.tsx
// /admin/alerts: pairs who shouted each other out 3+ times in a calendar month (UTC), from
// GET /api/admin/alerts/reciprocal?month=YYYY-MM. One "time" = A shouts out B AND B shouts out A,
// so times = min(A→B, B→A). "View their posts" opens Posts filtered to just that pair and month.
import {
  Avatar,
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
import { ArrowSwapRegular, OpenRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { EmployeeSummary, ReciprocalAlertDto } from '../../../shared/types';
import { currentUtcMonth, useReciprocalAlerts } from '../adminData';
import { ADMIN_NS } from '../i18n';
import { formatMonth } from '../posts/postFormat';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  explain: {
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  explainTitle: { margin: 0, fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightSemibold },
  explainText: { margin: 0 },
  monthField: { maxWidth: '220px' },
  muted: { color: tokens.colorNeutralForeground3 },
  tableWrap: { overflowX: 'auto' },
  table: { minWidth: '760px' },
  numCol: { width: '90px' },
  actionsCol: { width: '190px' },
  pair: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  person: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, paddingTop: tokens.spacingVerticalXS, paddingBottom: tokens.spacingVerticalXS },
  personText: { display: 'flex', flexDirection: 'column' },
  swap: { color: tokens.colorNeutralForeground3 },
  num: { fontVariantNumeric: 'tabular-nums' },
});

export function AlertsPage() {
  const styles = useStyles();
  const { t, i18n } = useTranslation(ADMIN_NS);
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentUtcMonth());
  const validMonth = MONTH.test(month) ? month : currentUtcMonth();
  const { data: alerts, isLoading, error } = useReciprocalAlerts(validMonth);
  const monthLabel = formatMonth(validMonth, i18n.language);

  function person(p: EmployeeSummary) {
    return (
      <span className={styles.person}>
        <Avatar name={p.name} size={32} color="colorful" aria-hidden />
        <span className={styles.personText}>
          <span>{p.name}</span>
          <Caption1 className={styles.muted}>{p.teamName}</Caption1>
        </span>
      </span>
    );
  }

  function viewPosts(alert: ReciprocalAlertDto) {
    const params = new URLSearchParams({ between: `${alert.a.employeeId},${alert.b.employeeId}`, month: alert.month });
    navigate(`../posts?${params.toString()}`, { relative: 'path' });
  }

  function renderBody() {
    if (isLoading) return <Spinner label={t('alerts.loading')} />;
    if (error || !alerts) {
      return (
        <MessageBar intent="error">
          <MessageBarBody>{t('alerts.loadError')}</MessageBarBody>
        </MessageBar>
      );
    }
    if (alerts.length === 0) {
      return (
        <MessageBar intent="success">
          <MessageBarBody>{t('alerts.empty', { month: monthLabel })}</MessageBarBody>
        </MessageBar>
      );
    }
    return (
      <div className={styles.tableWrap}>
        <Table aria-label={t('alerts.tableLabel', { month: monthLabel })} className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{t('alerts.col.pair')}</TableHeaderCell>
              <TableHeaderCell className={styles.numCol}>{t('alerts.col.aToB')}</TableHeaderCell>
              <TableHeaderCell className={styles.numCol}>{t('alerts.col.bToA')}</TableHeaderCell>
              <TableHeaderCell className={styles.numCol}>{t('alerts.col.times')}</TableHeaderCell>
              <TableHeaderCell className={styles.actionsCol}>{t('alerts.col.actions')}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={`${alert.a.employeeId}-${alert.b.employeeId}`}>
                <TableCell>
                  <div className={styles.pair}>
                    {person(alert.a)}
                    <ArrowSwapRegular className={styles.swap} aria-label={t('alerts.and')} />
                    {person(alert.b)}
                  </div>
                </TableCell>
                <TableCell className={styles.num} aria-label={t('alerts.aToBLabel', { a: alert.a.name, b: alert.b.name, count: alert.aToB })}>
                  {alert.aToB}
                </TableCell>
                <TableCell className={styles.num} aria-label={t('alerts.aToBLabel', { a: alert.b.name, b: alert.a.name, count: alert.bToA })}>
                  {alert.bToA}
                </TableCell>
                <TableCell>
                  <Badge appearance="filled" color="danger">
                    {alert.reciprocalTimes}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    icon={<OpenRegular />}
                    aria-label={t('alerts.viewPostsLabel', { a: alert.a.name, b: alert.b.name })}
                    onClick={() => viewPosts(alert)}
                  >
                    {t('alerts.viewPosts')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="alerts-title">
      <Title1 as="h1" id="alerts-title">
        {t('alerts.title')}
      </Title1>
      <div className={styles.explain}>
        <h2 className={styles.explainTitle}>{t('alerts.explainTitle')}</h2>
        <Body1 as="p" className={styles.explainText}>
          {t('alerts.explain')}
        </Body1>
      </div>

      <Field label={t('alerts.month')} className={styles.monthField}>
        <Input type="month" value={month} max={currentUtcMonth()} onChange={(_, d) => setMonth(d.value)} />
      </Field>

      {alerts && (
        <Caption1 className={styles.muted} aria-live="polite">
          {t('alerts.count', { count: alerts.length, month: monthLabel })}
        </Caption1>
      )}

      {renderBody()}
    </section>
  );
}
