// src/features/admin/sampleData.ts
// TEMPORARY sample data, typed with shared/types.ts, used until Rakshil's scaffold lands.
// Delete this file once every hook in adminData.ts calls the real API.
// Team IDs marked 'SAMPLE' are unknown until the seed CSVs are on main.
import type { EmployeeSummary, Me, PrincipleDto, ReciprocalAlertDto } from '../../shared/types';

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

const PRIYA: EmployeeSummary = {
  employeeId: 'E0005',
  name: 'Priya Raman',
  email: 'priya.raman@sandoz.test',
  jobTitle: null,
  teamId: 'SAMPLE',
  teamName: 'Retail Pharmacy Sales',
  country: 'AU',
};

const AISHA: EmployeeSummary = {
  employeeId: 'E0013',
  name: 'Aisha Rahman',
  email: 'aisha.rahman@sandoz.test',
  jobTitle: 'Hospital Account Manager',
  teamId: 'T03',
  teamName: 'Hospital & Biosimilars',
  country: 'AU',
};

// A5: Priya and Aisha shout each other out 3 times each this month, which triggers the alert.
// (Arjun and Zoe only do it twice, so the API never returns them.)
export const SAMPLE_RECIPROCAL_ALERTS: ReciprocalAlertDto[] = [
  { month: '2026-11', a: PRIYA, b: AISHA, aToB: 3, bToA: 3, reciprocalTimes: 3 },
];
