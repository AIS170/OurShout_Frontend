import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Megaphone, Send, User, Users, X } from 'lucide-react';
import { Me } from '../types';
import { PersonSearch } from '../components/compose/PersonSearch';
import { TeamPicker } from '../components/compose/TeamPicker';
import { createShoutout, MAX_TEAM_PEOPLE, MIN_TEAM_PEOPLE } from '../components/compose/composeApi';
import { ShoutoutCard } from '../components/feed/ShoutoutCard';
import { valueImage } from '../components/feed/valueImages';
import { ApiRequestError, fetchPrinciples, fetchTeams } from '../components/feed/feedApi';
import {
  CreateShoutoutRequest,
  EmployeeSummary,
  MAX_TEXT_LENGTH,
  PrincipleDto,
  RecognitionType,
  ShoutoutDto,
  TeamDto,
} from '../components/feed/feedTypes';
import '../components/feed/feed.css';
import '../components/compose/compose.css';

interface ComposePageProps {
  currentUser: Me;
  /** Goes back to the newsfeed. */
  onDone: () => void;
  /** Called after a shout-out is posted, so the header can refresh the user's points. */
  onCreated: () => void;
  /** Called when the API says the session is no longer valid. */
  onSessionEnded: () => void;
}

type Stage = 'start' | 'who' | 'details' | 'done';

interface Errors {
  type?: string;
  people?: string;
  principle?: string;
  reason?: string;
  impact?: string;
  kindness?: string;
  form?: string;
}

const checkText = (value: string, emptyMessage: string): string | undefined => {
  if (!value) return emptyMessage;
  if (value.length > MAX_TEXT_LENGTH) return `Keep this to ${MAX_TEXT_LENGTH} characters or fewer.`;
  return undefined;
};

/**
 * Give a shout-out. It asks the same questions, in the same order and wording, as the OurShout
 * Microsoft Form, with these differences:
 * - people are picked from the company directory, so names and emails are never typed;
 * - a whole team can be ticked at once, and any name toggled on or off;
 * - a live preview shows how the shout-out will look on the newsfeed before it is posted.
 * The checks here are a convenience. The server validates everything again and has the final say.
 */
export const ComposePage: React.FC<ComposePageProps> = ({ currentUser, onDone, onCreated, onSessionEnded }) => {
  const [stage, setStage] = useState<Stage>('start');

  // Step 1: who
  const [type, setType] = useState<RecognitionType | null>(null);
  const [individual, setIndividual] = useState<EmployeeSummary | null>(null);
  const [teamId, setTeamId] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<EmployeeSummary[]>([]);
  const [people, setPeople] = useState<EmployeeSummary[]>([]);

  // Step 2: recognition details
  const [principleId, setPrincipleId] = useState<number | null>(null);
  const [reason, setReason] = useState<string>('');
  const [impact, setImpact] = useState<string>('');
  const [kindness, setKindness] = useState<boolean | null>(null);

  const [principles, setPrinciples] = useState<PrincipleDto[]>([]);
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [created, setCreated] = useState<ShoutoutDto | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstTypeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  const firstPrincipleRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const impactRef = useRef<HTMLTextAreaElement>(null);
  const firstKindnessRef = useRef<HTMLInputElement>(null);

  const firstName = currentUser.name.split(' ')[0];

  const loadOptions = (signal?: AbortSignal) =>
    Promise.all([fetchPrinciples(signal), fetchTeams(signal)])
      .then(([principleList, teamList]) => {
        setPrinciples(principleList);
        setTeams(teamList);
      })
      .catch((error: unknown) => {
        if (signal?.aborted) return;
        if (error instanceof ApiRequestError && error.sessionEnded) onSessionEnded();
        else
          setErrors((current) => ({
            ...current,
            form: "We couldn't load the form options. Refresh the page to try again.",
          }));
      });

  useEffect(() => {
    const controller = new AbortController();
    void loadOptions(controller.signal);
    return () => controller.abort();
    // Loaded once, when the page opens.
  }, []);

  // Each step starts with focus on its heading, so screen readers announce where you are.
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [stage]);

  // After picking the one person, the search box is replaced by their card: move focus to "Change".
  useEffect(() => {
    if (individual) changeRef.current?.focus();
  }, [individual]);

  const recipients: EmployeeSummary[] = type === 'INDIVIDUAL' ? (individual ? [individual] : []) : people;

  // "Whole team" means the list is exactly that team's members and nobody else.
  const wholeTeam =
    type === 'TEAM' &&
    teamId !== '' &&
    teamMembers.length > 0 &&
    people.length === teamMembers.length &&
    teamMembers.every((member) => people.some((person) => person.employeeId === member.employeeId));
  const chosenTeam = teams.find((team) => team.teamId === teamId);
  const chosenPrinciple = principles.find((principle) => principle.id === principleId);

  const togglePeople = (toggled: EmployeeSummary[], selected: boolean) => {
    setErrors((current) => ({ ...current, people: undefined }));
    setPeople((current) => {
      const ids = toggled.map((person) => person.employeeId);
      if (!selected) return current.filter((person) => !ids.includes(person.employeeId));
      const existing = current.map((person) => person.employeeId);
      return [...current, ...toggled.filter((person) => !existing.includes(person.employeeId))];
    });
  };

  const handleNext = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!type) next.type = 'Choose Individual or Team.';
    else if (type === 'INDIVIDUAL' && !individual) next.people = 'Choose the person you want to recognise.';
    else if (type === 'TEAM' && people.length < MIN_TEAM_PEOPLE) {
      next.people = `Add at least ${MIN_TEAM_PEOPLE} people for a team shout-out.`;
    } else if (type === 'TEAM' && people.length > MAX_TEAM_PEOPLE) {
      next.people = `A team shout-out can include up to ${MAX_TEAM_PEOPLE} people.`;
    }
    setErrors(next);

    if (next.type) firstTypeRef.current?.focus();
    else if (next.people) searchRef.current?.focus();
    else setStage('details');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !type) return;
    const trimmedReason = reason.trim();
    const trimmedImpact = impact.trim();

    const next: Errors = {
      principle: principleId === null ? 'Choose a principle.' : undefined,
      reason: checkText(trimmedReason, "Tell us why you're recognising them."),
      impact: checkText(trimmedImpact, 'Tell us what the impact was.'),
      kindness: kindness === null ? 'Choose Yes or No.' : undefined,
    };
    setErrors(next);

    // Move focus to the first question that needs attention.
    if (next.principle) return firstPrincipleRef.current?.focus();
    if (next.reason) return reasonRef.current?.focus();
    if (next.impact) return impactRef.current?.focus();
    if (next.kindness) return firstKindnessRef.current?.focus();
    if (principleId === null || kindness === null) return;

    const body: CreateShoutoutRequest = {
      recognitionType: type,
      recipientIds: recipients.map((person) => person.employeeId),
      principleId,
      reason: trimmedReason,
      impact: trimmedImpact,
      actOfKindness: kindness,
    };
    if (wholeTeam) body.targetTeamId = teamId;

    setSubmitting(true);
    try {
      const shoutout = await createShoutout(body);
      setCreated(shoutout);
      setStage('done');
      onCreated();
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        setErrors({ form: "We couldn't post your shout-out. Check your connection and try again." });
      } else if (error.sessionEnded) {
        onSessionEnded();
      } else if (error.code === 'SELF_SHOUTOUT' || error.code === 'RECIPIENT_NOT_ACTIVE') {
        // The problem is with who was picked, so go back to that step and say so there.
        // Clearing the single pick brings the search box (and the message under it) back.
        if (type === 'INDIVIDUAL') setIndividual(null);
        setErrors({ people: error.message });
        setStage('who');
      } else if (error.code === 'PRINCIPLE_RETIRED') {
        setErrors({ principle: 'That principle has just been retired. Choose another one.' });
        setPrincipleId(null);
        void loadOptions();
      } else {
        setErrors({ form: error.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startAnother = () => {
    setType(null);
    setIndividual(null);
    setTeamId('');
    setTeamMembers([]);
    setPeople([]);
    setPrincipleId(null);
    setReason('');
    setImpact('');
    setKindness(null);
    setErrors({});
    setCreated(null);
    setStage('who');
  };

  // What the card will look like on the newsfeed, built from the answers so far.
  const preview: ShoutoutDto = {
    id: 0,
    sender: currentUser,
    recipients,
    targetTeam: wholeTeam && chosenTeam ? { teamId: chosenTeam.teamId, teamName: chosenTeam.teamName } : null,
    recognitionType: type ?? 'INDIVIDUAL',
    principle: chosenPrinciple
      ? { id: chosenPrinciple.id, name: chosenPrinciple.name }
      : { id: 0, name: 'Your chosen principle' }, // 0 = none yet: the card shows no value image
    reason: reason.trim() || 'Your answer will appear here.',
    impact: impact.trim() || 'Your answer will appear here.',
    actOfKindness: kindness === true,
    country: currentUser.country,
    likeCount: 0,
    likedByMe: false,
    canEdit: false,
    visibility: 'VISIBLE',
    createdAt: new Date().toISOString(),
    editedAt: null,
  };

  const stepNumber = stage === 'who' ? 1 : 2;

  return (
    <div className="os-feed-wrap">
      <main className="os-feed os-compose">
        {stage !== 'done' && (
          <button type="button" className="os-btn-link os-back" onClick={onDone}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to newsfeed
          </button>
        )}

        {stage === 'start' && (
          <section className="os-panel os-start">
            <div className="os-start-icon" aria-hidden="true">
              <Megaphone size={34} />
            </div>
            <h1 ref={headingRef} tabIndex={-1} className="os-feed-title">
              OurShout
            </h1>
            <p className="os-start-text">
              OurShout makes it easy to recognise great work at Sandoz—say thanks, celebrate our values, and make
              everyday impact visible.
            </p>
            <button type="button" className="os-btn os-btn-primary os-btn-large" onClick={() => setStage('who')}>
              Start now
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </section>
        )}

        {(stage === 'who' || stage === 'details') && (
          <div className="os-steps" aria-hidden="true">
            <span className="os-step-bar os-step-bar-on" />
            <span className={stage === 'details' ? 'os-step-bar os-step-bar-on' : 'os-step-bar'} />
          </div>
        )}

        {errors.form && (
          <div className="os-note os-note-error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {errors.form}
          </div>
        )}

        {stage === 'who' && (
          <form className="os-panel" onSubmit={handleNext} noValidate>
            <div>
              <p className="os-step-label">Step {stepNumber} of 2</p>
              <h1 ref={headingRef} tabIndex={-1} className="os-panel-title">
                Who do you wish to recognise?
              </h1>
              <p className="os-panel-intro">
                Hi {firstName}. Your name will appear on this shout-out and in the email to the people you recognise.
              </p>
            </div>

            <fieldset className="os-question">
              <legend className="os-question-title">Are you recognising an individual or team?</legend>
              <div className="os-choice-row">
                <label className={type === 'INDIVIDUAL' ? 'os-choice os-choice-on' : 'os-choice'}>
                  <input
                    ref={firstTypeRef}
                    type="radio"
                    name="compose-type"
                    checked={type === 'INDIVIDUAL'}
                    aria-describedby={errors.type ? 'compose-type-error' : undefined}
                    onChange={() => {
                      setType('INDIVIDUAL');
                      setErrors({});
                    }}
                  />
                  <User size={20} aria-hidden="true" />
                  <span>
                    <strong>Individual</strong>
                    <span className="os-muted">One person</span>
                  </span>
                </label>
                <label className={type === 'TEAM' ? 'os-choice os-choice-on' : 'os-choice'}>
                  <input
                    type="radio"
                    name="compose-type"
                    checked={type === 'TEAM'}
                    aria-describedby={errors.type ? 'compose-type-error' : undefined}
                    onChange={() => {
                      setType('TEAM');
                      setErrors({});
                    }}
                  />
                  <Users size={20} aria-hidden="true" />
                  <span>
                    <strong>Team</strong>
                    <span className="os-muted">Two or more people</span>
                  </span>
                </label>
              </div>
              {errors.type && (
                <p id="compose-type-error" className="os-hint os-field-error" role="alert">
                  {errors.type}
                </p>
              )}
            </fieldset>

            {type === 'INDIVIDUAL' &&
              (individual ? (
                <div className="os-question">
                  <p className="os-question-title">You're recognising</p>
                  <div className="os-person">
                    <div className="os-person-text">
                      <strong>{individual.name}</strong>
                      <span className="os-muted">
                        {[individual.jobTitle, individual.teamName].filter(Boolean).join(' · ')}
                      </span>
                      <span className="os-muted">{individual.email}</span>
                    </div>
                    <button
                      ref={changeRef}
                      type="button"
                      className="os-btn os-btn-quiet"
                      onClick={() => setIndividual(null)}
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <PersonSearch
                  label="Search for a colleague"
                  excludeIds={[]}
                  inputRef={searchRef}
                  error={errors.people}
                  onPick={(person) => {
                    setIndividual(person);
                    setErrors({});
                  }}
                />
              ))}

            {type === 'TEAM' && (
              <>
                <TeamPicker
                  teams={teams}
                  teamId={teamId}
                  onTeamChange={setTeamId}
                  onMembersLoaded={setTeamMembers}
                  members={teamMembers}
                  selectedIds={people.map((person) => person.employeeId)}
                  onToggle={togglePeople}
                />

                <PersonSearch
                  label="Add anyone else, one by one"
                  excludeIds={people.map((person) => person.employeeId)}
                  inputRef={searchRef}
                  error={errors.people}
                  onPick={(person) => togglePeople([person], true)}
                />

                <div className="os-question">
                  <p className="os-question-title" aria-live="polite">
                    People you're recognising ({people.length})
                    {wholeTeam && chosenTeam && (
                      <span className="os-badge os-whole-team">Whole {chosenTeam.teamName} team</span>
                    )}
                  </p>
                  {people.length === 0 ? (
                    <p className="os-hint">Nobody yet. Tick names in a team or search above. You need at least 2.</p>
                  ) : (
                    <ol className="os-people-list">
                      {people.map((person, index) => (
                        <li key={person.employeeId} className="os-person">
                          <div className="os-person-text">
                            <span className="os-person-number">Person {index + 1}</span>
                            <strong>{person.name}</strong>
                            <span className="os-muted">{person.email}</span>
                          </div>
                          <button
                            type="button"
                            className="os-icon-btn"
                            aria-label={`Remove ${person.name}`}
                            onClick={() => togglePeople([person], false)}
                          >
                            <X size={16} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </>
            )}

            <div className="os-panel-actions">
              <button type="submit" className="os-btn os-btn-primary">
                Next
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </form>
        )}

        {stage === 'details' && (
          <form className="os-panel" onSubmit={handleSubmit} noValidate>
            <div>
              <p className="os-step-label">Step {stepNumber} of 2</p>
              <h1 ref={headingRef} tabIndex={-1} className="os-panel-title">
                Recognition details
              </h1>
            </div>

            <fieldset className="os-question">
              <legend className="os-question-title">Which Sandoz way principle are you recognising them for</legend>
              <div className="os-choice-list">
                {principles.map((principle, index) => (
                  <label
                    key={principle.id}
                    className={principleId === principle.id ? 'os-choice os-choice-on' : 'os-choice'}
                  >
                    <input
                      ref={index === 0 ? firstPrincipleRef : undefined}
                      type="radio"
                      name="compose-principle"
                      checked={principleId === principle.id}
                      aria-describedby={errors.principle ? 'compose-principle-error' : undefined}
                      onChange={() => {
                        setPrincipleId(principle.id);
                        setErrors((current) => ({ ...current, principle: undefined }));
                      }}
                    />
                    {valueImage(principle.id) && (
                      <img className="os-choice-image" src={valueImage(principle.id)!} alt="" />
                    )}
                    <span>
                      <strong>{principle.name}</strong>
                      <span className="os-muted">{principle.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              {errors.principle && (
                <p id="compose-principle-error" className="os-hint os-field-error" role="alert">
                  {errors.principle}
                </p>
              )}
            </fieldset>

            <div className="os-field">
              <label className="os-question-title" htmlFor="compose-reason">
                Why are you recognising them?
              </label>
              <textarea
                id="compose-reason"
                ref={reasonRef}
                className="os-textarea"
                rows={4}
                value={reason}
                aria-invalid={Boolean(errors.reason)}
                aria-describedby="compose-reason-foot"
                onChange={(e) => {
                  setReason(e.target.value);
                  setErrors((current) => ({ ...current, reason: undefined }));
                }}
              />
              <div id="compose-reason-foot" className="os-field-foot">
                <span className="os-field-error">{errors.reason}</span>
                <span>
                  {reason.trim().length} / {MAX_TEXT_LENGTH}
                </span>
              </div>
            </div>

            <div className="os-field">
              <label className="os-question-title" htmlFor="compose-impact">
                What was the impact of their actions or contributions?
              </label>
              <textarea
                id="compose-impact"
                ref={impactRef}
                className="os-textarea"
                rows={4}
                value={impact}
                aria-invalid={Boolean(errors.impact)}
                aria-describedby="compose-impact-foot"
                onChange={(e) => {
                  setImpact(e.target.value);
                  setErrors((current) => ({ ...current, impact: undefined }));
                }}
              />
              <div id="compose-impact-foot" className="os-field-foot">
                <span className="os-field-error">{errors.impact}</span>
                <span>
                  {impact.trim().length} / {MAX_TEXT_LENGTH}
                </span>
              </div>
            </div>

            <fieldset className="os-question">
              <legend className="os-question-title">Would you also like to log this as an act of kindness?</legend>
              <div className="os-radio-row">
                <label className="os-radio">
                  <input
                    ref={firstKindnessRef}
                    type="radio"
                    name="compose-kindness"
                    checked={kindness === true}
                    aria-describedby={errors.kindness ? 'compose-kindness-error' : undefined}
                    onChange={() => {
                      setKindness(true);
                      setErrors((current) => ({ ...current, kindness: undefined }));
                    }}
                  />
                  Yes
                </label>
                <label className="os-radio">
                  <input
                    type="radio"
                    name="compose-kindness"
                    checked={kindness === false}
                    aria-describedby={errors.kindness ? 'compose-kindness-error' : undefined}
                    onChange={() => {
                      setKindness(false);
                      setErrors((current) => ({ ...current, kindness: undefined }));
                    }}
                  />
                  No
                </label>
              </div>
              {errors.kindness && (
                <p id="compose-kindness-error" className="os-hint os-field-error" role="alert">
                  {errors.kindness}
                </p>
              )}
            </fieldset>

            <section className="os-preview" aria-label="Preview of your shout-out">
              <p className="os-question-title">Preview</p>
              <p className="os-hint">This is how it will look on the newsfeed.</p>
              <ShoutoutCard shoutout={preview} hideActions />
            </section>

            <div className="os-panel-actions os-panel-actions-split">
              <button type="button" className="os-btn os-btn-quiet" onClick={() => setStage('who')}>
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </button>
              <button type="submit" className="os-btn os-btn-primary" disabled={submitting}>
                <Send size={16} aria-hidden="true" />
                {submitting ? 'Posting...' : 'Post shout-out'}
              </button>
            </div>
          </form>
        )}

        {stage === 'done' && created && (
          <section className="os-panel os-start">
            <div className="os-start-icon os-start-icon-done" aria-hidden="true">
              <CheckCircle2 size={34} />
            </div>
            <h1 ref={headingRef} tabIndex={-1} className="os-panel-title">
              Thanks! Your shout-out is live.
            </h1>
            <div className="os-done-card">
              <ShoutoutCard shoutout={created} hideActions />
            </div>
            <div className="os-panel-actions os-panel-actions-center">
              <button type="button" className="os-btn" onClick={startAnother}>
                Give another
              </button>
              <button type="button" className="os-btn os-btn-primary" onClick={onDone}>
                View on feed
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
