// The API types from Part A4 of the build plan, verbatim. The admin and leaderboard features
// (src/features/*) use these. The plan's `npm run sync-types` step doesn't exist with the Python
// backend, so this copy lives here. Change it only with team agreement (Rakshil owns the contract).

// shared/types.ts — the ONLY shared type file. Owner: Rakshil. Do not edit without team agreement.

// Added after A4 (needs team agreement): the SLT role, Me.reportsAccess and ShoutoutDto.kind.
export type Role = 'EMPLOYEE' | 'SLT' | 'ADMIN'; // SLT = Senior Leadership Team
export type ReportsAccess = 'ALL' | 'TEAM' | null; // admins and SLT: everything; a manager: their team
export type ShoutoutKind = 'STANDARD' | 'SLT';     // SLT = posted by an admin on the leadership team's behalf
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type Visibility = 'VISIBLE' | 'HIDDEN' | 'DELETED';
export type PrincipleStatus = 'ACTIVE' | 'RETIRED';
export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED';
export type FeedSort = 'newest' | 'most_liked';
export type RecognitionType = 'INDIVIDUAL' | 'TEAM';

export type ErrorCode =
  | 'UNAUTHENTICATED'      // 401 no/invalid token
  | 'WRONG_TENANT'         // 403 token tid is not Sandoz
  | 'GUEST_NOT_ALLOWED'    // 403 acct = 1 (external/guest)
  | 'NOT_ACTIVE_EMPLOYEE'  // 403 not in directory or is_active = false
  | 'ACCOUNT_SUSPENDED'    // 403 app_users.status = SUSPENDED
  | 'FORBIDDEN'            // 403 not an admin / not your post
  | 'NOT_FOUND'            // 404
  | 'VALIDATION_FAILED'    // 400 zod failure; details in message
  | 'SELF_SHOUTOUT'        // 400 recipients include the sender
  | 'RECIPIENT_NOT_ACTIVE' // 400 a recipient is unknown or inactive
  | 'PRINCIPLE_RETIRED'    // 400 principle missing or RETIRED
  | 'CONTENT_REJECTED'     // 400 profanity filter
  | 'RATE_LIMITED';        // 429

export interface ApiError { error: { code: ErrorCode; message: string } }

export interface EmployeeSummary {
  employeeId: string; name: string; email: string; jobTitle: string | null;
  teamId: string; teamName: string; country: string;
  avatarUrl?: string | null; // added after A4: the profile picture; without one, show initials
}
export interface Me extends EmployeeSummary { role: Role; status: UserStatus; points: number; reportsAccess: ReportsAccess }

export interface Persona {
  personaId: string; label: string; description: string;
  expected: 'OK' | ErrorCode; // what logging in as this persona should produce
}
export interface LoginResponse { token: string; me: Me }

export interface TeamDto { teamId: string; teamName: string; memberCount: number }

export interface PrincipleDto {
  id: number; name: string; description: string; displayOrder: number; status: PrincipleStatus;
}

export interface ShoutoutDto {
  id: number;
  sender: EmployeeSummary;
  recipients: EmployeeSummary[];
  targetTeam: { teamId: string; teamName: string } | null; // whole-team shout-out
  recognitionType: RecognitionType;
  principle: { id: number; name: string };
  reason: string;           // "Why are you recognising them?"
  impact: string;           // "What was the impact of their actions or contributions?"
  actOfKindness: boolean;
  country: string;
  likeCount: number;
  likedByMe: boolean;
  canEdit: boolean;         // true when the viewer is the sender
  visibility: Visibility;   // only ever VISIBLE in the feed; admins also see others
  createdAt: string;        // ISO
  editedAt: string | null;  // ISO
  kind: ShoutoutKind;       // SLT: shown in gold, as from the Senior Leadership Team
  scheduledFor?: string | null; // ISO; set when scheduled for a future date & time
}
export interface Page<T> { items: T[]; nextCursor: string | null }

export interface CreateShoutoutRequest {
  recognitionType: RecognitionType; // INDIVIDUAL = exactly 1 recipient; TEAM = 2–50
  recipientIds: string[];   // unique employee IDs
  targetTeamId?: string;    // send only when "Select all members" of a team was used
  principleId: number;
  reason: string;           // 1–500 chars after trimming
  impact: string;           // 1–500 chars after trimming
  actOfKindness: boolean;   // required yes/no, no default in the UI
  scheduledFor?: string;    // optional future ISO date/time for scheduled posts
}
export interface EditShoutoutRequest {
  principleId?: number; reason?: string; impact?: string; actOfKindness?: boolean;
}

export interface ProfileDto {
  employee: EmployeeSummary;
  points: number;
  receivedCount: number;
  givenCount: number;
  kindnessReceivedCount: number;        // received shout-outs flagged as acts of kindness
  topPrincipleReceived: string | null;
  topRecommender: { employee: EmployeeSummary; count: number } | null;
  busiestMonth: string | null;          // 'YYYY-MM', month with most shout-outs received
  topPrincipleGiven: string | null;
  recentReceived: ShoutoutDto[];        // latest 20
}

export interface LeaderboardEntry { employee: EmployeeSummary; count: number }
export interface LeaderboardDto {
  period: 'month' | 'all';
  month: string | null;                 // 'YYYY-MM' when period = month
  mostShoutedOut: LeaderboardEntry[];   // top 3
  mostShoutOutsGiven: LeaderboardEntry[]; // top 3
}

export interface ReciprocalAlertDto {
  month: string;                        // 'YYYY-MM'
  a: EmployeeSummary; b: EmployeeSummary;
  aToB: number; bToA: number;
  reciprocalTimes: number;              // min(aToB, bToA); alert when >= 3
}

export interface ReportSummaryDto {
  from: string; to: string;             // ISO dates
  total: number;
  actsOfKindness: number;
  byPrinciple: { name: string; count: number }[];
  byTeam: { teamId: string; teamName: string; count: number }[];   // by recipient team
  byCountry: { country: string; count: number }[];
  byMonth: { month: string; count: number }[];
}

export interface AuditEventDto {
  id: number; actor: EmployeeSummary | null; action: string; targetType: string; targetId: string;
  before: unknown; after: unknown; createdAt: string;
}

export interface EmailDto {
  id: number; shoutoutId: number; recipient: EmployeeSummary | null; status: EmailStatus;
  attempts: number; lastError: string | null; toEmail: string | null; subject: string | null;
  body: string | null; createdAt: string; sentAt: string | null; nextAttemptAt: string;
}

export interface KindnessCountDto { year: number; count: number } // public counter on the feed

export interface AdminUserDto extends EmployeeSummary { isActive: boolean; role: Role; status: UserStatus }
