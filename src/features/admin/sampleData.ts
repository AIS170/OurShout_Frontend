// src/features/admin/sampleData.ts
// TEMPORARY sample data, typed with shared/types.ts, used until Rakshil's scaffold lands.
// Delete this file once every hook in adminData.ts calls the real API.
// Team IDs marked 'SAMPLE' are unknown until the seed CSVs are on main.
import type {
  EmployeeSummary,
  Me,
  PrincipleDto,
  ReciprocalAlertDto,
  ShoutoutDto,
} from '../../shared/types';

// Persona "admin": Natalie Moreau (E0039).
export const SAMPLE_ME: Me = {
  employeeId: 'E0039',
  name: 'Natalie Moreau',
  email: 'natalie.moreau@sandoz.test',
  jobTitle: 'Head of People & Organisation',
  teamId: 'SAMPLE',
  teamName: 'People & Organisation',
  country: 'AU',
  role: 'ADMIN',
  status: 'ACTIVE',
  points: 0,
};

// The five official Sandoz Way principles (A1b), in order, plus the retired test principle (A5).
export const SAMPLE_PRINCIPLES: PrincipleDto[] = [
  {
    id: 1,
    name: 'We Think Sandoz',
    description:
      'We think beyond our own department or business unit, asking "What is best for Sandoz?"',
    displayOrder: 1,
    status: 'ACTIVE',
  },
  {
    id: 2,
    name: 'We are passionate about performance',
    description:
      'We focus on, and execute against, ambitious priorities to drive performance and deliver on our Purpose.',
    displayOrder: 2,
    status: 'ACTIVE',
  },
  {
    id: 3,
    name: 'We seek and create clarity',
    description:
      'We make sure everyone understands the context for decisions and actions, and what is expected of them.',
    displayOrder: 3,
    status: 'ACTIVE',
  },
  {
    id: 4,
    name: 'We decide smart, do simple',
    description:
      'We make sure everyone knows who decides what, align behind decisions once made, and drive simple, fast execution.',
    displayOrder: 4,
    status: 'ACTIVE',
  },
  {
    id: 5,
    name: 'We develop each other',
    description:
      'We encourage and challenge everyone to learn and grow, keeping our careers and our company ahead of the curve.',
    displayOrder: 5,
    status: 'ACTIVE',
  },
  {
    id: 6,
    name: 'Retired test principle',
    description: 'Used to check that retired principles stay off the form.',
    displayOrder: 6,
    status: 'RETIRED',
  },
];

export const PRIYA: EmployeeSummary = {
  employeeId: 'E0005',
  name: 'Priya Raman',
  email: 'priya.raman@sandoz.test',
  jobTitle: null,
  teamId: 'SAMPLE',
  teamName: 'Retail Pharmacy Sales',
  country: 'AU',
};

export const AISHA: EmployeeSummary = {
  employeeId: 'E0013',
  name: 'Aisha Rahman',
  email: 'aisha.rahman@sandoz.test',
  jobTitle: 'Hospital Account Manager',
  teamId: 'T03',
  teamName: 'Hospital & Biosimilars',
  country: 'AU',
};

// Persona "manager".
export const OLIVIA: EmployeeSummary = {
  employeeId: 'E0011',
  name: 'Olivia Chen',
  email: 'olivia.chen@sandoz.test',
  jobTitle: 'Head of Hospital & Biosimilars',
  teamId: 'T03',
  teamName: 'Hospital & Biosimilars',
  country: 'AU',
};

export const NATALIE: EmployeeSummary = {
  employeeId: SAMPLE_ME.employeeId,
  name: SAMPLE_ME.name,
  email: SAMPLE_ME.email,
  jobTitle: SAMPLE_ME.jobTitle,
  teamId: SAMPLE_ME.teamId,
  teamName: SAMPLE_ME.teamName,
  country: SAMPLE_ME.country,
};

// A5: Priya and Aisha shout each other out 3 times each this month, which triggers the alert.
// (Arjun and Zoe only do it twice, so the API never returns them.)
export const SAMPLE_RECIPROCAL_ALERTS: ReciprocalAlertDto[] = [
  { month: '2026-11', a: PRIYA, b: AISHA, aToB: 3, bToA: 3, reciprocalTimes: 3 },
];

// Admin view of shout-outs (GET /api/admin/shoutouts): every visibility, newest first.
// The admin isn't the sender of any of these, so canEdit is false.
function shoutout(
  s: Pick<ShoutoutDto, 'id' | 'sender' | 'recipients' | 'principle' | 'reason' | 'impact' | 'createdAt'> &
    Partial<ShoutoutDto>,
): ShoutoutDto {
  return {
    targetTeam: null,
    recognitionType: s.recipients.length > 1 ? 'TEAM' : 'INDIVIDUAL',
    actOfKindness: false,
    country: 'AU',
    likeCount: 0,
    likedByMe: false,
    canEdit: false,
    visibility: 'VISIBLE',
    editedAt: null,
    ...s,
  };
}

const P = (id: number) => {
  const p = SAMPLE_PRINCIPLES.find((x) => x.id === id)!;
  return { id: p.id, name: p.name };
};

export const SAMPLE_ADMIN_SHOUTOUTS: ShoutoutDto[] = [
  shoutout({
    id: 41,
    sender: PRIYA,
    recipients: [AISHA],
    principle: P(1),
    reason: 'Aisha jumped in to help Retail with a hospital stock question that wasn\'t her job at all.',
    impact: 'Two pharmacies got their biosimilar orders on time instead of a week late.',
    actOfKindness: true,
    likeCount: 4,
    createdAt: '2026-11-10T03:12:00.000Z',
  }),
  shoutout({
    id: 40,
    sender: AISHA,
    recipients: [PRIYA],
    principle: P(5),
    reason: 'Priya spent her lunch break walking me through the new pharmacy ordering portal.',
    impact: 'I can now answer my customers\' questions myself instead of escalating them.',
    likeCount: 2,
    createdAt: '2026-11-09T01:40:00.000Z',
  }),
  shoutout({
    id: 39,
    sender: PRIYA,
    recipients: [AISHA, OLIVIA],
    targetTeam: { teamId: 'T03', teamName: 'Hospital & Biosimilars' },
    principle: P(2),
    reason:
      'The team hit every tender deadline in October, even with two people on leave. "Whatever it takes" & then some!',
    impact:
      'We kept every hospital contract we were renewing this quarter, and the account managers had time left over to help Retail with stock questions. That cross-team help is exactly what Sandoz needs more of.',
    likeCount: 7,
    createdAt: '2026-11-05T22:05:00.000Z',
  }),
  shoutout({
    id: 33,
    sender: NATALIE,
    recipients: [PRIYA, AISHA, OLIVIA],
    principle: P(3),
    reason: 'You three wrote the one-page guide to the new leave policy that everyone actually read.',
    impact: 'Questions to People & Organisation dropped by half in the first fortnight.',
    actOfKindness: true,
    likeCount: 5,
    createdAt: '2026-10-22T05:30:00.000Z',
    editedAt: '2026-10-22T06:02:00.000Z',
  }),
  shoutout({
    id: 28,
    sender: OLIVIA,
    recipients: [AISHA],
    principle: P(4),
    reason: 'Sample hidden post: hidden by an admin so the Unhide button can be tested.',
    impact: 'Shows that hidden posts drop out of the feed, profiles, leaderboards and points.',
    visibility: 'HIDDEN',
    likeCount: 1,
    createdAt: '2026-10-14T00:15:00.000Z',
  }),
  shoutout({
    id: 21,
    sender: AISHA,
    recipients: [NATALIE],
    principle: P(3),
    reason: 'Sample deleted post: deleting is final, so it has no actions.',
    impact: 'Shows that the audit trail survives a soft delete.',
    visibility: 'DELETED',
    createdAt: '2026-09-30T04:45:00.000Z',
  }),
  shoutout({
    id: 15,
    sender: OLIVIA,
    recipients: [PRIYA],
    principle: P(5),
    reason: 'Priya mentored our graduate through her first pharmacy visits.',
    impact: 'Our graduate now runs her own visits and says she feels part of the wider Sandoz team.',
    actOfKindness: true,
    likeCount: 3,
    createdAt: '2026-09-18T02:00:00.000Z',
  }),
];
