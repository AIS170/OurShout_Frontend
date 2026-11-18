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

/** Body of PATCH /api/shoutouts/:id. Send only the fields that changed. */
export interface EditShoutoutRequest {
  principleId?: number;
  reason?: string;
  impact?: string;
  actOfKindness?: boolean;
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
