// src/features/admin/reports/GivenReceived.tsx
// Shout-outs given and shout-outs received, shown apart on the Reports page (from
// GET /api/admin/reports/insights: given, received, byPerson):
//   GivenReceivedTrend    one chart with a line for each, month by month
//   GivenReceivedPeople   each person's two counts in a table
// Given = shout-outs sent by the people the report covers. Received = shout-outs that recognised
// at least one of them. A shout-out between two teammates is in both, so the two don't add up
// to the report's total. Like ChartCard, the chart always has a table view (B3).
import {
  Body1,
  Button,
  Caption1,
  makeStyles,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { ChartMultipleRegular, TableRegular } from '@fluentui/react-icons';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ADMIN_NS } from '../i18n';
import { formatMonth } from '../posts/postFormat';
import type { ReportInsightsDto } from '../reportTypes';

const useStyles = makeStyles({
  card: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    minWidth: 0,
  },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacingHorizontalS },
  title: { ...typographyStyles.subtitle1, margin: 0 },
  summary: { margin: 0, color: tokens.colorNeutralForeground2 },
  muted: { color: tokens.colorNeutralForeground3 },
  chart: { width: '100%' },
  tableWrap: { overflowX: 'auto' },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  // A number column's heading sits over its numbers, on the right.
  numHead: { textAlign: 'right', '& .fui-TableHeaderCell__button': { justifyContent: 'flex-end' } },
  person: { display: 'flex', flexDirection: 'column', minWidth: 0 },
});

const AXIS_TICK = { fontSize: 12, fill: tokens.colorNeutralForeground3 };
// The two lines differ by colour and by dash, so the chart doesn't rely on colour alone.
const RECEIVED_COLOUR = '#b45309';

interface TrendProps {
  given: ReportInsightsDto['given'];
  received: ReportInsightsDto['received'];
  /** True for a manager's team report; false for the whole-company report. */
  team: boolean;
  locale: string;
}

/** Given and received per month as two lines, with the same numbers as a table on request. */
export function GivenReceivedTrend({ given, received, team, locale }: TrendProps) {
  const styles = useStyles();
  const { t } = useTranslation(ADMIN_NS);
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();
  const summaryId = useId();

  const receivedByMonth = new Map(received.byMonth.map((m) => [m.month, m.count]));
  const rows = given.byMonth.map((m) => ({
    label: formatMonth(m.month, locale),
    given: m.count,
    received: receivedByMonth.get(m.month) ?? 0,
  }));

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {t('reports.split.trendTitle')}
        </h2>
        <Button
          size="small"
          appearance="subtle"
          icon={asTable ? <ChartMultipleRegular /> : <TableRegular />}
          aria-pressed={asTable}
          onClick={() => setAsTable((v) => !v)}
        >
          {t('reports.viewAsTable')}
        </Button>
      </div>
      <Body1 as="p" id={summaryId} className={styles.summary}>
        {t(team ? 'reports.split.trendSummaryTeam' : 'reports.split.trendSummaryAll', {
          given: given.total,
          received: received.total,
        })}
      </Body1>

      {asTable ? (
        <div className={styles.tableWrap}>
          <Table size="small" aria-labelledby={titleId}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t('reports.split.month')}</TableHeaderCell>
                <TableHeaderCell className={styles.numHead}>{t('reports.split.given')}</TableHeaderCell>
                <TableHeaderCell className={styles.numHead}>{t('reports.split.received')}</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className={styles.num}>{row.given}</TableCell>
                  <TableCell className={styles.num}>{row.received}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        // Decorative for screen readers: the summary describes it and the table has every number.
        <div className={styles.chart} role="img" aria-labelledby={titleId} aria-describedby={summaryId}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} />
              <XAxis dataKey="label" tick={AXIS_TICK} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="given"
                name={t('reports.split.given')}
                stroke={tokens.colorBrandBackground}
                strokeWidth={2.5}
                dot={{ r: 4 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="received"
                name={t('reports.split.received')}
                stroke={RECEIVED_COLOUR}
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

interface PeopleProps {
  byPerson: ReportInsightsDto['byPerson'];
  /** How many people the full list has; more than byPerson.length when the server capped it. */
  byPersonTotal: number;
  team: boolean;
}

/** One row per person: what they gave and what they received, most active first. */
export function GivenReceivedPeople({ byPerson, byPersonTotal, team }: PeopleProps) {
  const styles = useStyles();
  const { t } = useTranslation(ADMIN_NS);
  const titleId = useId();

  const intro = team
    ? t('reports.split.peopleIntroTeam')
    : byPersonTotal > byPerson.length
      ? t('reports.split.peopleIntroCapped', { shown: byPerson.length, count: byPersonTotal })
      : t('reports.split.peopleIntroAll');

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {t(team ? 'reports.split.peopleTitleTeam' : 'reports.split.peopleTitleAll')}
      </h2>
      <Caption1 className={styles.muted}>{intro}</Caption1>
      {byPerson.length === 0 ? (
        <Caption1 className={styles.muted}>{t('reports.noneInRange')}</Caption1>
      ) : (
        <div className={styles.tableWrap}>
          <Table size="small" aria-labelledby={titleId}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t('reports.split.person')}</TableHeaderCell>
                <TableHeaderCell className={styles.numHead}>{t('reports.split.given')}</TableHeaderCell>
                <TableHeaderCell className={styles.numHead}>{t('reports.split.received')}</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byPerson.map((row) => (
                <TableRow key={row.employee.employeeId}>
                  <TableCell>
                    <span className={styles.person}>
                      <span>{row.employee.name}</span>
                      <Caption1 className={styles.muted}>{row.employee.teamName}</Caption1>
                    </span>
                  </TableCell>
                  <TableCell className={styles.num}>{row.given}</TableCell>
                  <TableCell className={styles.num}>{row.received}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
