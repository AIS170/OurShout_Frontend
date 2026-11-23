// src/features/admin/slt/SltShoutoutPage.tsx
// /admin/slt ("SLT shout-out"): the admin posts a shout-out on the Senior Leadership Team's behalf.
// It is the highest recognition: on the feed it has a gold frame, says "SLT shout-out" and is
// shown as from the Senior Leadership Team. The people recognised get their usual points; the
// admin gets none for posting it.
// The same questions as an ordinary shout-out (who, principle, why, impact, act of kindness), and
// the server runs the same checks (POST /api/admin/slt-shoutouts, admin only).
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Checkbox,
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
  Textarea,
  Title1,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { AddRegular, CalendarClockRegular, ClockRegular, DismissRegular, OpenRegular, SearchRegular, StarRegular } from '@fluentui/react-icons';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import type { EmployeeSummary, ShoutoutDto } from '../../../shared/types';
import { AdminApiError } from '../adminApi';
import { fetchTeamMembers, useDirectorySearch, usePrinciples, useSltShoutouts, useTeams } from '../adminData';
import { ADMIN_NS } from '../i18n';
import { recipientsLabel, VISIBILITY_COLOR } from '../posts/postFormat';
import { useDebouncedValue } from '../useDebouncedValue';

const MAX_TEXT = 500;
const MAX_PEOPLE = 50;

type Errors = Partial<Record<'people' | 'principle' | 'reason' | 'impact' | 'schedule', string>>;

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalXL,
    // Gold, like the card it produces on the feed.
    border: '2px solid #d4a72c',
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    maxWidth: '760px',
  },
  sectionTitle: { ...typographyStyles.subtitle2, margin: 0 },
  pickRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: tokens.spacingHorizontalM },
  grow: { flexGrow: 1, minWidth: '220px' },
  results: { listStyleType: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  result: { justifyContent: 'flex-start', textAlign: 'left' },
  chosen: { listStyleType: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS} ${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  muted: { color: tokens.colorNeutralForeground3 },
  submit: { alignSelf: 'flex-start' },
  listTitle: { ...typographyStyles.subtitle1, margin: 0 },
  tableWrap: { overflowX: 'auto' },
  table: { minWidth: '760px' },
  postedCol: { width: '130px' },
  visibilityCol: { width: '100px' },
  actionsCol: { width: '160px' },
});

export function SltShoutoutPage() {
  const styles = useStyles();
  const { t, i18n } = useTranslation(ADMIN_NS);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: posted, isLoading, error, create } = useSltShoutouts();
  const { data: principles } = usePrinciples();
  const { data: teams } = useTeams();

  const [people, setPeople] = useState<EmployeeSummary[]>([]);
  // The team whose members were added in one go, to mark the post as a whole-team shout-out
  // when the final selection is exactly that team.
  const [wholeTeam, setWholeTeam] = useState<{ teamId: string; memberIds: string[] } | null>(null);
  const [search, setSearch] = useState('');
  const [teamId, setTeamId] = useState('');
  const [principleId, setPrincipleId] = useState('');
  const [reason, setReason] = useState('');
  const [impact, setImpact] = useState('');
  const [kindness, setKindness] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [teamError, setTeamError] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const q = useDebouncedValue(search);
  const { data: found } = useDirectorySearch(q);
  const chosenIds = new Set(people.map((p) => p.employeeId));
  const results = (found ?? []).filter((p) => !chosenIds.has(p.employeeId));
  const dateFormat = new Intl.DateTimeFormat(i18n.language || 'en-AU', { dateStyle: 'medium' });
  // /admin/slt -> /admin
  const adminBase = location.pathname.replace(/\/slt\/?$/, '');

  function add(list: EmployeeSummary[]) {
    setPeople((current) => {
      const have = new Set(current.map((p) => p.employeeId));
      return [...current, ...list.filter((p) => !have.has(p.employeeId))].slice(0, MAX_PEOPLE);
    });
    setErrors((e) => ({ ...e, people: undefined }));
  }

  async function addTeam() {
    if (!teamId) return;
    setTeamError('');
    try {
      const members = await fetchTeamMembers(teamId);
      add(members);
      setWholeTeam({ teamId, memberIds: members.map((m) => m.employeeId) });
      setTeamId('');
    } catch {
      setTeamError(t('slt.errors.team'));
    }
  }

  function reset() {
    setPeople([]);
    setWholeTeam(null);
    setSearch('');
    setPrincipleId('');
    setReason('');
    setImpact('');
    setKindness(false);
    setIsScheduled(false);
    setScheduledDate('');
    setScheduledTime('');
    setErrors({});
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const problems: Errors = {};
    if (people.length === 0) problems.people = t('slt.errors.people');
    if (!principleId) problems.principle = t('slt.errors.principle');
    if (!reason.trim()) problems.reason = t('slt.errors.reason');
    if (!impact.trim()) problems.impact = t('slt.errors.impact');

    let scheduledIso: string | undefined = undefined;
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        problems.schedule = 'Please choose both a date and time for the scheduled post.';
      } else {
        const schedDt = new Date(`${scheduledDate}T${scheduledTime}`);
        if (isNaN(schedDt.getTime())) {
          problems.schedule = 'Please enter a valid date and time.';
        } else if (schedDt.getTime() <= Date.now()) {
          problems.schedule = 'Scheduled post date & time must be in the future.';
        } else {
          scheduledIso = schedDt.toISOString();
        }
      }
    }

    setErrors(problems);
    setAnnouncement('');
    setSaveError('');
    if (Object.keys(problems).length > 0) return;

    const ids = people.map((p) => p.employeeId);
    const isWholeTeam =
      wholeTeam !== null &&
      ids.length >= 2 &&
      ids.length === wholeTeam.memberIds.length &&
      wholeTeam.memberIds.every((id) => chosenIds.has(id));

    setSaving(true);
    try {
      const created = await create({
        recognitionType: ids.length === 1 ? 'INDIVIDUAL' : 'TEAM',
        recipientIds: ids,
        targetTeamId: isWholeTeam ? wholeTeam.teamId : undefined,
        principleId: Number(principleId),
        reason: reason.trim(),
        impact: impact.trim(),
        actOfKindness: kindness,
        scheduledFor: scheduledIso,
      });

      if (scheduledIso) {
        const formattedDate = new Intl.DateTimeFormat(i18n.language || 'en-AU', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(scheduledIso));
        setAnnouncement(`SLT shout-out to ${recipientsLabel(created, t)} scheduled for ${formattedDate}.`);
      } else {
        setAnnouncement(t('slt.announce', { label: recipientsLabel(created, t) }));
      }
      reset();
    } catch (err) {
      // The server's message says what's wrong (someone has left, the principle was retired…).
      setSaveError(err instanceof AdminApiError && err.status === 400 ? err.message : t('slt.saveError'));
    } finally {
      setSaving(false);
    }
  }

  function renderRow(post: ShoutoutDto) {
    const href = `${adminBase}/posts/${post.id}`;
    const isFutureScheduled = Boolean(
      post.scheduledFor && new Date(post.scheduledFor).getTime() > Date.now()
    );

    return (
      <TableRow key={post.id}>
        <TableCell>
          {isFutureScheduled && post.scheduledFor ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#92400E',
                  fontWeight: 600,
                  fontSize: '0.74rem',
                }}
              >
                <ClockRegular style={{ fontSize: '12px' }} />
                Scheduled for:
              </span>
              <time dateTime={post.scheduledFor} style={{ fontWeight: 600 }}>
                {new Intl.DateTimeFormat(i18n.language || 'en-AU', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(post.scheduledFor))}
              </time>
            </div>
          ) : (
            <time dateTime={post.createdAt}>{dateFormat.format(new Date(post.createdAt))}</time>
          )}
        </TableCell>
        <TableCell>{recipientsLabel(post, t)}</TableCell>
        <TableCell>{post.principle.name}</TableCell>
        <TableCell>
          {isFutureScheduled ? (
            <Badge appearance="tint" color="warning" icon={<ClockRegular />}>
              Scheduled
            </Badge>
          ) : (
            <Badge appearance="tint" color={VISIBILITY_COLOR[post.visibility]}>
              {t(`posts.visibility.${post.visibility}`)}
            </Badge>
          )}
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

  function renderPosted() {
    if (isLoading) return <Spinner label={t('slt.loading')} />;
    if (error || !posted) {
      return (
        <MessageBar intent="error">
          <MessageBarBody>{t('slt.loadError')}</MessageBarBody>
        </MessageBar>
      );
    }
    if (posted.length === 0) return <Body1 as="p">{t('slt.empty')}</Body1>;
    return (
      <div className={styles.tableWrap}>
        <Table aria-labelledby="slt-list-title" className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell className={styles.postedCol}>{t('posts.col.posted')}</TableHeaderCell>
              <TableHeaderCell>{t('posts.col.to')}</TableHeaderCell>
              <TableHeaderCell>{t('posts.col.principle')}</TableHeaderCell>
              <TableHeaderCell className={styles.visibilityCol}>{t('posts.col.visibility')}</TableHeaderCell>
              <TableHeaderCell className={styles.actionsCol}>{t('posts.col.actions')}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>{posted.map(renderRow)}</TableBody>
        </Table>
      </div>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="slt-title">
      <Title1 as="h1" id="slt-title">
        {t('slt.title')}
      </Title1>
      <Body1 as="p">{t('slt.intro')}</Body1>

      <form className={styles.card} onSubmit={submit} noValidate aria-labelledby="slt-title">
        <h2 className={styles.sectionTitle}>{t('slt.who')}</h2>
        <div className={styles.pickRow}>
          <Field label={t('slt.search')} className={styles.grow} hint={t('slt.searchHint')}>
            <Input
              type="search"
              value={search}
              contentBefore={<SearchRegular aria-hidden />}
              onChange={(_, d) => setSearch(d.value)}
            />
          </Field>
        </div>
        {results.length > 0 && (
          <ul className={styles.results} aria-label={t('slt.results')}>
            {results.map((p) => (
              <li key={p.employeeId}>
                <Button
                  className={styles.result}
                  appearance="subtle"
                  icon={<AddRegular />}
                  onClick={() => {
                    add([p]);
                    setSearch('');
                  }}
                >
                  {p.name}
                  <Caption1 className={styles.muted}>&nbsp;· {[p.jobTitle, p.teamName].filter(Boolean).join(' · ')}</Caption1>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {q.trim().length >= 2 && found && results.length === 0 && (
          <Caption1 className={styles.muted}>{t('slt.noResults')}</Caption1>
        )}

        <div className={styles.pickRow}>
          <Field label={t('slt.team')} className={styles.grow}>
            <Select value={teamId} onChange={(_, d) => setTeamId(d.value)}>
              <option value="">{t('slt.teamPlaceholder')}</option>
              {(teams ?? []).map((team) => (
                <option key={team.teamId} value={team.teamId}>
                  {t('slt.teamOption', { team: team.teamName, count: team.memberCount })}
                </option>
              ))}
            </Select>
          </Field>
          <Button disabled={!teamId} onClick={() => void addTeam()}>
            {t('slt.addTeam')}
          </Button>
        </div>
        {teamError && (
          <MessageBar intent="error">
            <MessageBarBody>{teamError}</MessageBarBody>
          </MessageBar>
        )}

        <Field
          label={t('slt.chosen', { count: people.length })}
          validationState={errors.people ? 'error' : 'none'}
          validationMessage={errors.people}
        >
          {people.length === 0 ? (
            <Caption1 className={styles.muted}>{t('slt.noneChosen')}</Caption1>
          ) : (
            <ul className={styles.chosen}>
              {people.map((p) => (
                <li key={p.employeeId} className={styles.chip}>
                  <span>{p.name}</span>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<DismissRegular />}
                    aria-label={t('slt.remove', { name: p.name })}
                    onClick={() => setPeople((current) => current.filter((x) => x.employeeId !== p.employeeId))}
                  />
                </li>
              ))}
            </ul>
          )}
        </Field>

        <Field
          label={t('slt.principle')}
          required
          validationState={errors.principle ? 'error' : 'none'}
          validationMessage={errors.principle}
        >
          <Select
            value={principleId}
            onChange={(_, d) => {
              setPrincipleId(d.value);
              setErrors((e) => ({ ...e, principle: undefined }));
            }}
          >
            <option value="">{t('slt.principlePlaceholder')}</option>
            {(principles ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={t('posts.detail.why')}
          required
          hint={t('slt.counter', { count: reason.length, max: MAX_TEXT })}
          validationState={errors.reason ? 'error' : 'none'}
          validationMessage={errors.reason}
        >
          <Textarea
            value={reason}
            maxLength={MAX_TEXT}
            rows={3}
            onChange={(_, d) => {
              setReason(d.value);
              setErrors((e) => ({ ...e, reason: undefined }));
            }}
          />
        </Field>
        <Field
          label={t('posts.detail.impact')}
          required
          hint={t('slt.counter', { count: impact.length, max: MAX_TEXT })}
          validationState={errors.impact ? 'error' : 'none'}
          validationMessage={errors.impact}
        >
          <Textarea
            value={impact}
            maxLength={MAX_TEXT}
            rows={3}
            onChange={(_, d) => {
              setImpact(d.value);
              setErrors((e) => ({ ...e, impact: undefined }));
            }}
          />
        </Field>
        <Checkbox label={t('slt.kindness')} checked={kindness} onChange={(_, d) => setKindness(d.checked === true)} />

        {/* Schedule Post: Date & Time */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacingVerticalS,
            padding: tokens.spacingHorizontalM,
            backgroundColor: isScheduled ? '#FEFCE8' : tokens.colorNeutralBackground3,
            borderRadius: tokens.borderRadiusMedium,
            border: isScheduled ? '1.5px solid #D4A72C' : '1px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <Checkbox
            label="Schedule this post for a future date & time"
            checked={isScheduled}
            onChange={(_, d) => {
              const active = d.checked === true;
              setIsScheduled(active);
              setErrors((e) => ({ ...e, schedule: undefined }));
              if (active && !scheduledDate) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const yyyy = tomorrow.getFullYear();
                const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
                const dd = String(tomorrow.getDate()).padStart(2, '0');
                setScheduledDate(`${yyyy}-${mm}-${dd}`);
                setScheduledTime('09:00');
              }
            }}
          />

          {isScheduled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, marginTop: tokens.spacingVerticalXXS }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalM, alignItems: 'flex-start' }}>
                <Field
                  label="Publish Date"
                  required
                  className={styles.grow}
                  validationState={errors.schedule ? 'error' : 'none'}
                >
                  <Input
                    type="date"
                    value={scheduledDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(_, d) => {
                      setScheduledDate(d.value);
                      setErrors((e) => ({ ...e, schedule: undefined }));
                    }}
                  />
                </Field>

                <Field
                  label="Publish Time"
                  required
                  className={styles.grow}
                  validationState={errors.schedule ? 'error' : 'none'}
                  validationMessage={errors.schedule}
                >
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(_, d) => {
                      setScheduledTime(d.value);
                      setErrors((e) => ({ ...e, schedule: undefined }));
                    }}
                  />
                </Field>
              </div>

              {scheduledDate && scheduledTime && (
                <Caption1
                  style={{
                    color: '#92400E',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(254, 243, 199, 0.6)',
                    borderRadius: '4px',
                  }}
                >
                  <ClockRegular /> Post will publish on{' '}
                  {new Intl.DateTimeFormat(i18n.language || 'en-AU', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  }).format(new Date(`${scheduledDate}T${scheduledTime}`))}
                </Caption1>
              )}
            </div>
          )}
        </div>

        <MessageBar intent="warning">
          <MessageBarBody>
            Please refraining from using any future or in-the-work products in your shoutout
          </MessageBarBody>
        </MessageBar>

        {saveError && (
          <MessageBar intent="error">
            <MessageBarBody>{saveError}</MessageBarBody>
          </MessageBar>
        )}
        <Button
          className={styles.submit}
          type="submit"
          appearance="primary"
          icon={isScheduled ? <CalendarClockRegular /> : <StarRegular />}
          disabled={saving}
        >
          {saving
            ? t('slt.saving')
            : isScheduled
              ? 'Schedule SLT Shout-out'
              : t('slt.submit')}
        </Button>
      </form>

      <div role="status" aria-live="polite">
        {announcement && (
          <MessageBar intent="success">
            <MessageBarBody>{announcement}</MessageBarBody>
          </MessageBar>
        )}
      </div>

      <h2 id="slt-list-title" className={styles.listTitle}>
        {t('slt.listTitle')}
      </h2>
      {renderPosted()}
    </section>
  );
}
