// src/features/admin/userTypes.ts
// PROPOSED additions to shared/types.ts (Rakshil owns that file): what the admin Users routes
// return on top of AdminUserDto. Kept here until the team agrees them, like reportTypes.ts.
import type { AdminUserDto } from '../../shared/types';

/** A row of GET /api/admin/users?q=&from=&to=. Counts cover the range and VISIBLE posts only. */
export interface AdminUserStatsDto extends AdminUserDto {
  givenCount: number;      // shout-outs sent
  receivedCount: number;   // shout-outs received
}

/** GET /api/admin/users/:employeeId?from=&to=. */
export interface AdminUserDetailDto extends AdminUserStatsDto {
  points: number;          // all time, the same number as /api/me and the profile page
}
