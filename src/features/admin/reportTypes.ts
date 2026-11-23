// src/features/admin/reportTypes.ts
// PROPOSED addition to shared/types.ts (Rakshil owns that file): the response of
// GET /api/admin/reports/insights. Kept here until the team agrees it; then move it to
// shared/types.ts unchanged and import it from there.
import type { EmployeeSummary, LeaderboardEntry } from '../../shared/types';

/** One side of the given / received split: its total and its count for each month of the report. */
export interface ReportSideDto {
  total: number;
  byMonth: { month: string; count: number }[];   // 'YYYY-MM', every month of the range, gaps as 0
}

export interface ReportInsightsDto {
  from: string; to: string;                 // 'YYYY-MM-DD', the range actually covered
  /**
   * What the report covers, decided by the server from who is signed in.
   * ALL: the whole company (admins and the Senior Leadership Team).
   * TEAM: a manager's team (the people who report directly to them).
   * In a TEAM report summary.byTeam is the teams the team recognised, byGiverTeam the teams
   * that recognised it, and teamFlows is empty.
   */
  scope: { kind: 'ALL' | 'TEAM'; teamSize: number | null };
  total: number;                            // VISIBLE shout-outs in the range
  /** The same number of days just before `from`; null for "all time". */
  previousPeriod: { from: string; to: string; total: number } | null;
  peopleRecognised: number;                 // distinct recipients
  participation: {
    activeEmployees: number;                // everyone who hasn't left
    gave: number;                           // active employees who sent at least one
    received: number;                       // active employees who received at least one
    involved: number;                       // gave or received
    neverRecognised: number;                // activeEmployees - received
    involvedShare: number;                  // 0..1
  };
  crossTeam: { recipientRows: number; crossTeamRows: number; share: number };   // share 0..1
  teamShoutouts: { count: number; share: number };
  kindness: { count: number; share: number; goal?: number };
  likes: { total: number; averagePerPost: number };
  mostLiked: { shoutoutId: number; senderName: string; principleName: string; likeCount: number; createdAt: string } | null;
  topGivers: LeaderboardEntry[];            // top 5
  topReceivers: LeaderboardEntry[];         // top 5
  byWeekday: { weekday: number; count: number }[];   // 0 = Monday .. 6 = Sunday, always 7 entries
  teamFlows: { fromTeamId: string; fromTeamName: string; toTeamId: string; toTeamName: string; count: number }[];
  /** Recognitions (recipient rows) by the sender's team; sums to the same total as summary.byTeam. */
  byGiverTeam: { teamId: string; teamName: string; count: number }[];
  /**
   * Given and received, kept apart. Given: shout-outs sent by the people the report covers (never
   * SLT shout-outs). Received: shout-outs that recognised at least one of them. A shout-out
   * between two teammates is in both, so these don't add up to `total`.
   */
  given: ReportSideDto;
  received: ReportSideDto;
  /** Each person's own two counts, most active first. TEAM: every team member. ALL: the most active 50. */
  byPerson: { employee: EmployeeSummary; given: number; received: number }[];
  /** How many people byPerson would list without the cap. */
  byPersonTotal: number;
}
