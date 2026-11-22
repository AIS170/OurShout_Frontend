// src/features/admin/sampleData.ts
// TEMPORARY sample data for the Audit log page, until the backend has an audit_events table.
// Delete this file once every hook in adminData.ts calls the real API.
// People match the backend seed (seed.py).
import type {
  AuditEventDto,
  EmployeeSummary,
  Me,
} from '../../shared/types';

// Persona "admin": Natalie Moreau (E0039).
export const SAMPLE_ME: Me = {
  employeeId: 'E0039',
  name: 'Natalie Moreau',
  email: 'natalie.moreau@sandoz.test',
  jobTitle: 'Head of Human Resources',
  teamId: 'T06',
  teamName: 'Human Resources',
  country: 'AU',
  role: 'ADMIN',
  status: 'ACTIVE',
  points: 0,
  reportsAccess: 'ALL',
};

export const PRIYA: EmployeeSummary = {
  employeeId: 'E0005',
  name: 'Priya Raman',
  email: 'priya.raman@sandoz.test',
  jobTitle: 'Retail Pharmacy Sales Specialist',
  teamId: 'T13',
  teamName: 'Sales',
  country: 'AU',
};

export const AISHA: EmployeeSummary = {
  employeeId: 'E0013',
  name: 'Aisha Rahman',
  email: 'aisha.rahman@sandoz.test',
  jobTitle: 'Hospital Account Manager',
  teamId: 'T13',
  teamName: 'Sales',
  country: 'AU',
};

// Persona "manager".
export const OLIVIA: EmployeeSummary = {
  employeeId: 'E0011',
  name: 'Olivia Chen',
  email: 'olivia.chen@sandoz.test',
  jobTitle: 'Head of Commercial & Biosimilars',
  teamId: 'T02',
  teamName: 'Commercial & General Management',
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

// ───── Audit log (GET /api/admin/audit) ─────
// Matches the sample posts above (28 hidden, 21 deleted, 33 edited) and the seed (Oliver suspended,
// the "Retired test principle"). Actors who aren't in the directory (guest, other tenant) are null.

const DAVID: EmployeeSummary = {
  employeeId: 'E0044',
  name: 'David Novak',
  email: 'david.novak@sandoz.test',
  jobTitle: 'Director of Technology Transform',
  teamId: 'T15',
  teamName: 'Technology Transform',
  country: 'AU',
};

const OLIVER: EmployeeSummary = {
  employeeId: 'E0029',
  name: 'Oliver Grant',
  email: 'oliver.grant@sandoz.test',
  jobTitle: 'Supply Chain & Operations Planner',
  teamId: 'T14',
  teamName: 'Technical Operations',
  country: 'AU',
};

const BENJAMIN: EmployeeSummary = {
  employeeId: 'E0032',
  name: 'Benjamin Clarke',
  email: 'benjamin.clarke@sandoz.test',
  jobTitle: 'Former Clinical Researcher',
  teamId: 'T12',
  teamName: 'RND',
  country: 'AU',
};

let auditId = 0;
function audit(
  actor: EmployeeSummary | null,
  action: string,
  targetType: string,
  targetId: string | number,
  createdAt: string,
  before: unknown = null,
  after: unknown = null,
): AuditEventDto {
  return { id: ++auditId, actor, action, targetType, targetId: String(targetId), before, after, createdAt };
}

const created = (id: number, principleId: number, recipientIds: string[], actOfKindness = false) => ({
  id,
  principleId,
  recipientIds,
  actOfKindness,
  visibility: 'VISIBLE',
});

/** Oldest first here; the hook sorts newest first like the API. */
export const SAMPLE_AUDIT_EVENTS: AuditEventDto[] = [
  audit(OLIVIA, 'SHOUTOUT_CREATED', 'SHOUTOUT', 15, '2026-09-18T02:00:00.000Z', null, created(15, 5, ['E0005'], true)),
  audit(null, 'LOGIN_REJECTED', 'AUTH', 'guest', '2026-09-20T23:41:00.000Z', null, { reason: 'GUEST_NOT_ALLOWED' }),
  audit(AISHA, 'SHOUTOUT_CREATED', 'SHOUTOUT', 21, '2026-09-30T04:45:00.000Z', null, created(21, 3, ['E0039'])),
  audit(NATALIE, 'SHOUTOUT_DELETED', 'SHOUTOUT', 21, '2026-10-01T23:10:00.000Z', { visibility: 'VISIBLE' }, { visibility: 'DELETED' }),
  audit(OLIVIA, 'SHOUTOUT_CREATED', 'SHOUTOUT', 28, '2026-10-14T00:15:00.000Z', null, created(28, 4, ['E0013'])),
  audit(NATALIE, 'SHOUTOUT_HIDDEN', 'SHOUTOUT', 28, '2026-10-14T05:20:00.000Z', { visibility: 'VISIBLE' }, { visibility: 'HIDDEN' }),
  audit(NATALIE, 'SHOUTOUT_CREATED', 'SHOUTOUT', 33, '2026-10-22T05:30:00.000Z', null, created(33, 3, ['E0005', 'E0013', 'E0011'], true)),
  audit(
    NATALIE, 'SHOUTOUT_EDITED', 'SHOUTOUT', 33, '2026-10-22T06:02:00.000Z',
    { impact: 'Fewer questions to HR.' },
    { impact: 'Questions to People & Organisation dropped by half in the first fortnight.' },
  ),
  audit(NATALIE, 'USER_SUSPENDED', 'USER', 'E0029', '2026-10-27T01:00:00.000Z', { status: 'ACTIVE' }, { status: 'SUSPENDED' }),
  audit(OLIVER, 'LOGIN_REJECTED', 'AUTH', 'suspended', '2026-10-28T21:15:00.000Z', null, { reason: 'ACCOUNT_SUSPENDED' }),
  audit(
    DAVID, 'PRINCIPLE_CREATED', 'PRINCIPLE', 6, '2026-11-02T00:30:00.000Z', null,
    { id: 6, name: 'Retired test principle', description: 'Used to check that retired principles stay off the form.', displayOrder: 6, status: 'ACTIVE' },
  ),
  audit(DAVID, 'PRINCIPLE_UPDATED', 'PRINCIPLE', 6, '2026-11-02T00:35:00.000Z', { status: 'ACTIVE' }, { status: 'RETIRED' }),
  audit(PRIYA, 'SHOUTOUT_CREATED', 'SHOUTOUT', 39, '2026-11-05T22:05:00.000Z', null, created(39, 2, ['E0013', 'E0011'])),
  audit(NATALIE, 'EMAIL_RETRIED', 'EMAIL', 7, '2026-11-06T03:00:00.000Z', { status: 'FAILED', attempts: 4 }, { status: 'PENDING', attempts: 0 }),
  audit(AISHA, 'SHOUTOUT_CREATED', 'SHOUTOUT', 40, '2026-11-09T01:40:00.000Z', null, created(40, 5, ['E0005'])),
  audit(PRIYA, 'SHOUTOUT_CREATED', 'SHOUTOUT', 41, '2026-11-10T03:12:00.000Z', null, created(41, 1, ['E0013'], true)),
  audit(BENJAMIN, 'LOGIN_REJECTED', 'AUTH', 'left', '2026-11-11T00:05:00.000Z', null, { reason: 'NOT_ACTIVE_EMPLOYEE' }),
  audit(null, 'LOGIN_REJECTED', 'AUTH', 'othertenant', '2026-11-11T00:06:00.000Z', null, { reason: 'WRONG_TENANT' }),
  audit(DAVID, 'USER_SUSPENDED', 'USER', 'E0013', '2026-11-12T04:00:00.000Z', { status: 'ACTIVE' }, { status: 'SUSPENDED' }),
  audit(DAVID, 'USER_REINSTATED', 'USER', 'E0013', '2026-11-12T04:09:00.000Z', { status: 'SUSPENDED' }, { status: 'ACTIVE' }),
  audit(
    NATALIE, 'PRINCIPLE_UPDATED', 'PRINCIPLE', 3, '2026-11-13T02:30:00.000Z',
    { description: 'We make sure everyone understands the context for decisions.' },
    { description: 'We make sure everyone understands the context for decisions and actions, and what is expected of them.' },
  ),
];
