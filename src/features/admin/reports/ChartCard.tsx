// src/features/admin/reports/ChartCard.tsx
// One report chart (Recharts) with a one-sentence text summary and a "View as table" toggle:
// screen readers can't read bars, so the same numbers are always available as a table (B3).
import {
  Body1,
  Button,
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ADMIN_NS } from '../i18n';

export interface ChartRow {
  label: string;
  value: number;
}

interface ChartCardProps {
  title: string;
  /** One sentence describing the main takeaway (read by everyone, and by screen readers). */
  summary: string;
  rows: ChartRow[];
  /** Column heading for the numbers in table view, e.g. "Shout-outs". */
  valueLabel: string;
  kind: 'line' | 'bar' | 'column';
  /** Wider cards span both grid columns. */
  wide?: boolean;
}

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    minWidth: 0,
  },
  wide: { gridColumn: '1 / -1' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacingHorizontalS },
  title: { ...typographyStyles.subtitle1, margin: 0 },
  summary: { margin: 0, color: tokens.colorNeutralForeground2 },
  chart: { width: '100%' },
  tableWrap: { overflowX: 'auto' },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
});

const AXIS_TICK = { fontSize: 12, fill: tokens.colorNeutralForeground3 };

export function ChartCard({ title, summary, rows, valueLabel, kind, wide }: ChartCardProps) {
  const styles = useStyles();
  const { t } = useTranslation(ADMIN_NS);
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();
  const summaryId = useId();

  // Horizontal bars need room per label; everything else has a fixed height.
  const height = kind === 'bar' ? Math.max(160, rows.length * 34 + 30) : 240;

  function renderChart() {
    if (kind === 'line') {
      return (
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} />
          <XAxis dataKey="label" tick={AXIS_TICK} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} />
          <Tooltip formatter={(v) => [v as number, valueLabel]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={tokens.colorBrandBackground}
            strokeWidth={2.5}
            dot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      );
    }
    if (kind === 'bar') {
      return (
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
          <YAxis type="category" dataKey="label" width={170} tick={AXIS_TICK} />
          <Tooltip formatter={(v) => [v as number, valueLabel]} cursor={{ fill: tokens.colorNeutralBackground2 }} />
          <Bar dataKey="value" fill={tokens.colorBrandBackground} radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      );
    }
    return (
      <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={tokens.colorNeutralStroke2} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} />
        <Tooltip formatter={(v) => [v as number, valueLabel]} cursor={{ fill: tokens.colorNeutralBackground2 }} />
        <Bar dataKey="value" fill={tokens.colorBrandBackground} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    );
  }

  return (
    <section className={`${styles.card} ${wide ? styles.wide : ''}`} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
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
        {summary}
      </Body1>

      {asTable ? (
        <div className={styles.tableWrap}>
          <Table size="small" aria-labelledby={titleId}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t('reports.table.item')}</TableHeaderCell>
                <TableHeaderCell className={styles.num}>{valueLabel}</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className={styles.num}>{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        // The picture is decorative for screen readers: the summary above describes it,
        // and the table view has every number.
        <div className={styles.chart} role="img" aria-labelledby={titleId} aria-describedby={summaryId}>
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
