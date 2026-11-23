// src/features/admin/reports/ReportsPage.tsx
// /admin/reports (requirement 10): stat tiles, trend and breakdown charts, top people, cross-team
// flows and CSV export, for a chosen date range. VISIBLE posts only; no privacy thresholds.
//   GET /api/admin/reports/summary   (A4 ReportSummaryDto)
//   GET /api/admin/reports/insights  (proposed ReportInsightsDto, see ../reportTypes.ts)
//   GET /api/admin/reports/export.csv
import {
  Avatar,
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
  ToggleButton,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { ArrowDownloadRegular, ArrowRightRegular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { LeaderboardEntry } from '../../../shared/types';
import { downloadReportCsv, useAdminMe, useReportInsights, useReportSummary, type ReportRange } from '../adminData';
import { ADMIN_NS } from '../i18n';
import { formatMonth } from '../posts/postFormat';
import { ChartCard, type ChartRow } from './ChartCard';
import { GivenReceivedPeople, GivenReceivedTrend } from './GivenReceived';

type Preset = 'month' | 'quarter' | 'year' | 'all' | 'custom';
const PRESETS: Exclude<Preset, 'custom'>[] = ['month', 'quarter', 'year', 'all'];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Date range for a preset, in UTC calendar dates. "quarter" = this month and the two before it. */
export function presetRange(preset: Exclude<Preset, 'custom'>, now = new Date()): ReportRange {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const today = iso(now);
  if (preset === 'month') return { from: iso(new Date(Date.UTC(y, m, 1))), to: today };
  if (preset === 'quarter') return { from: iso(new Date(Date.UTC(y, m - 2, 1))), to: today };
  if (preset === 'year') return { from: iso(new Date(Date.UTC(y, 0, 1))), to: today };
  return { from: '', to: '' };
}

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalL,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  presets: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
  dateField: { width: '160px' },
  exports: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, marginLeft: 'auto' },
  muted: { color: tokens.colorNeutralForeground3 },
  // A team report has eight tiles (four to a row) and the full report six (three to a row), so
  // both make two even rows with no stragglers. On a narrow screen both go two to a row.
  tiles: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 900px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  },
  tilesSix: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
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
  up: { color: tokens.colorPaletteGreenForeground1 },
  down: { color: tokens.colorPaletteRedForeground1 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 900px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
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
  cardTitle: { ...typographyStyles.subtitle1, margin: 0 },
  rankList: { listStyleType: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  rankItem: { display: 'grid', gridTemplateColumns: '1.5rem 32px minmax(0, 1fr) auto', alignItems: 'center', gap: tokens.spacingHorizontalS },
  rank: { fontWeight: tokens.fontWeightBold, color: tokens.colorNeutralForeground3, textAlign: 'right' },
  rankName: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  highlight: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorBrandBackground2,
  },
  highlightText: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: '200px' },
});

export function ReportsPage() {
  const styles = useStyles();
  const { t, i18n } = useTranslation(ADMIN_NS);
  const navigate = useNavigate();
  const locale = i18n.language || 'en-AU';

  const [preset, setPreset] = useState<Preset>('quarter');
  const [custom, setCustom] = useState<ReportRange>(presetRange('quarter'));
  const range = preset === 'custom' ? custom : presetRange(preset);
  const customInvalid = preset === 'custom' && Boolean(custom.from && custom.to && custom.to < custom.from);
  const queryRange = customInvalid ? presetRange('quarter') : range;

  const summary = useReportSummary(queryRange);
  const insights = useReportInsights(queryRange);
  // Admins and the Senior Leadership Team see the whole company. A manager sees a team report:
  // the same figures for the people who report directly to them. The server decides which (see /api/me).
  const { data: me } = useAdminMe();
  const isAdmin = me?.role === 'ADMIN';
  const team = me?.reportsAccess === 'TEAM';
  const [exporting, setExporting] = useState<'' | 'all' | 'kindness'>('');
  const [exportError, setExportError] = useState('');

  const pct = useMemo(() => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }), [locale]);
  const dec = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const weekdayName = (i: number) =>
    // 2024-01-01 was a Monday, so 1 + i gives Monday..Sunday.
    new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + i)));
  const shortDate = (d: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));

  async function exportCsv(kind: 'all' | 'kindness') {
    setExporting(kind);
    setExportError('');
    try {
      await downloadReportCsv(queryRange, kind === 'kindness');
    } catch {
      setExportError(t('reports.exportError'));
    } finally {
      setExporting('');
    }
  }

  /** "Busiest: X (n)" style summary for a list of rows. */
  function topSummary(key: string, rows: ChartRow[]): string {
    const top = [...rows].sort((a, b) => b.value - a.value)[0];
    return top && top.value > 0 ? t(`reports.summary.${key}`, { label: top.label, count: top.value }) : t('reports.summary.none');
  }

  function rankList(entries: LeaderboardEntry[]) {
    if (entries.length === 0) return <Caption1 className={styles.muted}>{t('reports.noneInRange')}</Caption1>;
    return (
      <ol className={styles.rankList}>
        {entries.map((e, i) => (
          <li key={e.employee.employeeId} className={styles.rankItem}>
            <span className={styles.rank}>{i + 1}</span>
            <Avatar name={e.employee.name} size={32} color="colorful" aria-hidden />
            <span className={styles.rankName}>
              <span>{e.employee.name}</span>
              <Caption1 className={styles.muted}>{e.employee.teamName}</Caption1>
            </span>
            <span className={styles.num}>{t('reports.shoutoutCount', { count: e.count })}</span>
          </li>
        ))}
      </ol>
    );
  }

  function renderReport() {
    const s = summary.data;
    const x = insights.data;
    if ((summary.isLoading || insights.isLoading) && (!s || !x)) return <Spinner label={t('reports.loading')} />;
    if (summary.error || insights.error || !s || !x) {
      return (
        <MessageBar intent="error">
          <MessageBarBody>{t('reports.loadError')}</MessageBarBody>
        </MessageBar>
      );
    }

    const prev = x.previousPeriod;
    const change = prev && prev.total > 0 ? (x.total - prev.total) / prev.total : null;
    const months: ChartRow[] = s.byMonth.map((m) => ({ label: formatMonth(m.month, locale), value: m.count }));
    const principles: ChartRow[] = s.byPrinciple.map((p) => ({ label: p.name, value: p.count }));
    const teams: ChartRow[] = s.byTeam.map((p) => ({ label: p.teamName, value: p.count }));
    const giverTeams: ChartRow[] = x.byGiverTeam.map((p) => ({ label: p.teamName, value: p.count }));
    const weekdays: ChartRow[] = x.byWeekday.map((w) => ({ label: weekdayName(w.weekday), value: w.count }));

    return (
      <>
        <Caption1 className={styles.muted}>
          {t('reports.covering', { from: shortDate(s.from), to: shortDate(s.to) })}
        </Caption1>

        <div className={team ? styles.tiles : `${styles.tiles} ${styles.tilesSix}`}>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>{t('reports.tiles.total')}</span>
            <p className={styles.tileValue}>{x.total}</p>
            <Caption1 className={change === null ? styles.muted : change >= 0 ? styles.up : styles.down}>
              {change === null
                ? prev
                  ? t('reports.tiles.noPrevious')
                  : t('reports.tiles.allTime')
                : t(change >= 0 ? 'reports.tiles.changeUp' : 'reports.tiles.changeDown', {
                    pct: pct.format(Math.abs(change)),
                  })}
            </Caption1>
          </div>
          {/* Given and received as their own numbers, on a team report only. Across the whole
              company every shout-out is given by one employee and received by another, so both
              would just repeat the total. They don't add up to the total: a shout-out between
              two teammates is in both. */}
          {team && x.given && x.received && (
            <>
              <div className={styles.tile}>
                <span className={styles.tileLabel}>{t('reports.split.tileGiven')}</span>
                <p className={styles.tileValue}>{x.given.total}</p>
                <Caption1 className={styles.muted}>
                  {t(team ? 'reports.split.tileGivenTeam' : 'reports.split.tileGivenAll')}
                </Caption1>
              </div>
              <div className={styles.tile}>
                <span className={styles.tileLabel}>{t('reports.split.tileReceived')}</span>
                <p className={styles.tileValue}>{x.received.total}</p>
                <Caption1 className={styles.muted}>
                  {t(team ? 'reports.split.tileReceivedTeam' : 'reports.split.tileReceivedAll')}
                </Caption1>
              </div>
            </>
          )}
          <div className={styles.tile}>
            <span className={styles.tileLabel}>{t('reports.tiles.recognised')}</span>
            <p className={styles.tileValue}>{x.peopleRecognised}</p>
            <Caption1 className={styles.muted}>
              {t('reports.tiles.neverRecognised', { count: x.participation.neverRecognised })}
            </Caption1>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>{t('reports.tiles.participation')}</span>
            <p className={styles.tileValue}>{pct.format(x.participation.involvedShare)}</p>
            <Caption1 className={styles.muted}>
              {t('reports.tiles.participationDetail', {
                involved: x.participation.involved,
                total: x.participation.activeEmployees,
              })}
            </Caption1>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>{t('reports.tiles.kindness')}</span>
            <p className={styles.tileValue}>{x.kindness.count}</p>
            <Caption1 className={styles.muted}>{t('reports.tiles.shareOfPosts', { pct: pct.format(x.kindness.share) })}</Caption1>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>{t('reports.tiles.crossTeam')}</span>
            <p className={styles.tileValue}>{pct.format(x.crossTeam.share)}</p>
            <Caption1 className={styles.muted}>
              {t(team ? 'reports.team.crossTeamDetail' : 'reports.tiles.crossTeamDetail')}
            </Caption1>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>{t('reports.tiles.likes')}</span>
            <p className={styles.tileValue}>{dec.format(x.likes.averagePerPost)}</p>
            <Caption1 className={styles.muted}>{t('reports.tiles.likesDetail', { count: x.likes.total })}</Caption1>
          </div>
        </div>

        {x.mostLiked && (
          <div className={styles.highlight}>
            <div className={styles.highlightText}>
              <span className={styles.tileLabel}>{t('reports.mostLiked.title')}</span>
              <Body1>
                {t('reports.mostLiked.text', {
                  sender: x.mostLiked.senderName,
                  principle: x.mostLiked.principleName,
                  count: x.mostLiked.likeCount,
                })}
              </Body1>
            </div>
            {/* The post page is part of admin moderation, so only admins get the link. */}
            {isAdmin && (
              <Button
                icon={<ArrowRightRegular />}
                iconPosition="after"
                onClick={() => navigate(`../posts/${x.mostLiked!.shoutoutId}`, { relative: 'path' })}
              >
                {t('reports.mostLiked.view')}
              </Button>
            )}
          </div>
        )}

        <div className={styles.grid}>
          <ChartCard
            wide
            kind="line"
            title={t('reports.charts.byMonth')}
            summary={topSummary('busiestMonth', months)}
            rows={months}
            valueLabel={t('reports.table.shoutouts')}
          />
          {/* The month-by-month split is for a team report too, for the same reason as the tiles.
              The per-person table is in both: who gives and who receives differs person to person. */}
          {team && x.given && x.received && (
            <GivenReceivedTrend given={x.given} received={x.received} team={team} locale={locale} />
          )}
          {x.byPerson && (
            <GivenReceivedPeople byPerson={x.byPerson} byPersonTotal={x.byPersonTotal} team={team} />
          )}
          <ChartCard
            kind="bar"
            title={t('reports.charts.byPrinciple')}
            summary={topSummary('topPrinciple', principles)}
            rows={principles}
            valueLabel={t('reports.table.shoutouts')}
          />
          <ChartCard
            kind="column"
            title={t('reports.charts.byWeekday')}
            summary={topSummary('busiestDay', weekdays)}
            rows={weekdays}
            valueLabel={t('reports.table.shoutouts')}
          />
          {/* In a team report these two are: who your team recognised, and who recognised your team. */}
          <ChartCard
            wide
            kind="bar"
            title={t(team ? 'reports.team.byTeam' : 'reports.charts.byTeam')}
            summary={topSummary(team ? 'teamRecognised' : 'topTeam', teams)}
            rows={teams}
            valueLabel={t('reports.table.recipients')}
          />
          <ChartCard
            wide
            kind="bar"
            title={t(team ? 'reports.team.byGiverTeam' : 'reports.charts.byGiverTeam')}
            summary={topSummary(team ? 'teamRecognisedBy' : 'topGiverTeam', giverTeams)}
            rows={giverTeams}
            valueLabel={t('reports.table.recipients')}
          />

          <section className={styles.card} aria-labelledby="top-receivers">
            <h2 id="top-receivers" className={styles.cardTitle}>
              {t(team ? 'reports.team.topReceivers' : 'reports.topReceivers')}
            </h2>
            {rankList(x.topReceivers)}
          </section>
          <section className={styles.card} aria-labelledby="top-givers">
            <h2 id="top-givers" className={styles.cardTitle}>
              {t(team ? 'reports.team.topGivers' : 'reports.topGivers')}
            </h2>
            {rankList(x.topGivers)}
          </section>

          {/* A team report has no flows table: the two team charts above already say it. */}
          {!team && (
            <section className={styles.card} aria-labelledby="team-flows">
              <h2 id="team-flows" className={styles.cardTitle}>
                {t('reports.flows.title')}
              </h2>
              <Caption1 className={styles.muted}>{t('reports.flows.intro')}</Caption1>
              {x.teamFlows.length === 0 ? (
                <Caption1 className={styles.muted}>{t('reports.noneInRange')}</Caption1>
              ) : (
                <Table size="small" aria-labelledby="team-flows">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>{t('reports.flows.from')}</TableHeaderCell>
                      <TableHeaderCell>{t('reports.flows.to')}</TableHeaderCell>
                      <TableHeaderCell className={styles.num}>{t('reports.table.recipients')}</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {x.teamFlows.map((f) => (
                      <TableRow key={`${f.fromTeamId}-${f.toTeamId}`}>
                        <TableCell>{f.fromTeamName}</TableCell>
                        <TableCell>{f.toTeamName}</TableCell>
                        <TableCell className={styles.num}>{f.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          )}
          <section className={styles.card} aria-labelledby="by-country">
            <h2 id="by-country" className={styles.cardTitle}>
              {t('reports.country.title')}
            </h2>
            <Table size="small" aria-labelledby="by-country">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>{t('reports.country.country')}</TableHeaderCell>
                  <TableHeaderCell className={styles.num}>{t('reports.table.shoutouts')}</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.byCountry.map((c) => (
                  <TableRow key={c.country}>
                    <TableCell>{t(`reports.country.names.${c.country}`, { defaultValue: c.country })}</TableCell>
                    <TableCell className={styles.num}>{c.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Caption1 className={styles.muted}>
              {t('reports.tiles.teamShare', { pct: pct.format(x.teamShoutouts.share) })}
            </Caption1>
          </section>
        </div>
      </>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="reports-title">
      <Title1 as="h1" id="reports-title">
        {t(team ? 'reports.team.title' : 'reports.title')}
      </Title1>
      <Body1 as="p">
        {!team
          ? t('reports.intro')
          : insights.data
            ? t('reports.team.intro', { count: insights.data.scope.teamSize ?? 0 })
            : t('reports.team.introLoading')}
      </Body1>

      <div className={styles.controls} role="group" aria-label={t('reports.rangeLabel')}>
        <div className={styles.presets} role="group" aria-label={t('reports.presetsLabel')}>
          {PRESETS.map((p) => (
            <ToggleButton key={p} size="small" checked={preset === p} onClick={() => setPreset(p)}>
              {t(`reports.presets.${p}`)}
            </ToggleButton>
          ))}
          <ToggleButton size="small" checked={preset === 'custom'} onClick={() => setPreset('custom')}>
            {t('reports.presets.custom')}
          </ToggleButton>
        </div>
        {preset === 'custom' && (
          <>
            <Field label={t('reports.from')} className={styles.dateField}>
              <Input type="date" value={custom.from} max={custom.to || undefined} onChange={(_, d) => setCustom((c) => ({ ...c, from: d.value }))} />
            </Field>
            <Field
              label={t('reports.to')}
              className={styles.dateField}
              validationState={customInvalid ? 'error' : 'none'}
              validationMessage={customInvalid ? t('reports.toBeforeFrom') : undefined}
            >
              <Input type="date" value={custom.to} min={custom.from || undefined} onChange={(_, d) => setCustom((c) => ({ ...c, to: d.value }))} />
            </Field>
          </>
        )}
        <div className={styles.exports}>
          <Button icon={<ArrowDownloadRegular />} disabled={exporting !== ''} onClick={() => void exportCsv('all')}>
            {t('reports.export')}
          </Button>
          <Button icon={<ArrowDownloadRegular />} disabled={exporting !== ''} onClick={() => void exportCsv('kindness')}>
            {t('reports.exportKindness')}
          </Button>
        </div>
      </div>

      {exportError && (
        <MessageBar intent="error">
          <MessageBarBody>{exportError}</MessageBarBody>
        </MessageBar>
      )}

      {renderReport()}
    </section>
  );
}
