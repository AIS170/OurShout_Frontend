// Types for the newsfeed. They mirror what the backend returns from /api/shoutouts,
// /api/principles and /api/teams (section A4 of the build plan).

export type FeedSort = 'newest' | 'most_liked';
export type RecognitionType = 'INDIVIDUAL' | 'TEAM';
export type Visibility = 'VISIBLE' | 'HIDDEN' | 'DELETED';

export interface EmployeeSummary {
  employeeId: string;
  name: string;
  email: string;
  jobTitle: string | null;
  teamId: string;
  teamName: string;
  country: string;
  role?: string;
  status?: string;
  avatarUrl?: string | null;
}

export interface ShoutoutDto {
  id: number;
  sender: EmployeeSummary;
  recipients: EmployeeSummary[];
  /** Set when the shout-out went to a whole team. */
  targetTeam: { teamId: string; teamName: string } | null;
  recognitionType: RecognitionType;
  principle: { id: number; name: string };
  /** "Why are you recognising them?" */
  reason: string;
  /** "What was the impact of their actions or contributions?" */
  impact: string;
  actOfKindness: boolean;
  country: string;
  likeCount: number;
  likedByMe: boolean;
  /** True when the signed-in user sent it. */
  canEdit: boolean;
  visibility: Visibility;
  createdAt: string;
  editedAt: string | null;
  /**
   * 'SLT' = an admin posted it on the Senior Leadership Team's behalf: the card is gold and says
   * it is from the leadership team. Left out (or 'STANDARD') for an ordinary shout-out.
   */
  kind?: 'STANDARD' | 'SLT';
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface PrincipleDto {
  id: number;
  name: string;
  description: string;
  displayOrder: number;
  status: 'ACTIVE' | 'RETIRED';
}

export interface TeamDto {
  teamId: string;
  teamName: string;
  memberCount: number;
}

export interface LikeResult {
  likeCount: number;
  likedByMe: boolean;
}

/** Body of POST /api/shoutouts. */
export interface CreateShoutoutRequest {
  /** INDIVIDUAL = exactly 1 recipient. TEAM = 2 to 50. */
  recognitionType: RecognitionType;
  recipientIds: string[];
  /** Send only when the recipients are exactly every member of this team. */
  targetTeamId?: string;
  principleId: number;
  reason: string;
  impact: string;
  actOfKindness: boolean;
}

/** Body of PATCH /api/shoutouts/:id. Send only the fields that changed. */
export interface EditShoutoutRequest {
  principleId?: number;
  reason?: string;
  impact?: string;
  actOfKindness?: boolean;
}

/** What GET /api/profile/:employeeId returns. Only visible shout-outs are counted. */
export interface ProfileDto {
  employee: EmployeeSummary;
  points: number;
  receivedCount: number;
  givenCount: number;
  kindnessReceivedCount: number;
  topPrincipleReceived: string | null;
  topRecommender: { employee: EmployeeSummary; count: number } | null;
  /** 'YYYY-MM': the month with the most shout-outs received. */
  busiestMonth: string | null;
  topPrincipleGiven: string | null;
  /** The latest 20. */
  recentReceived: ShoutoutDto[];
}

/** Query of GET /api/shoutouts (null = no filter). */
export interface FeedFilter {
  sort: FeedSort;
  principleId: number | null;
  teamId: string | null;
}

export const DEFAULT_FEED_FILTER: FeedFilter = { sort: 'newest', principleId: null, teamId: null };

/** Limit for "why" and "impact", after trimming. The server enforces the same limit. */
export const MAX_TEXT_LENGTH = 500;
