// Calls to the backend for the newsfeed. Every request sends the session token that
// App.tsx stores after login, and turns the API's { error: { code, message } } into an exception.
import { ApiError } from '../../types';
import {
  CommentList,
  CommentResult,
  EditShoutoutRequest,
  FeedFilter,
  LikeResult,
  Page,
  PrincipleDto,
  ShoutoutDto,
  TeamDto,
} from './feedTypes';

/** The API pages by 20 by default. The feed asks for 5 so "Load more" shows with the demo data. */
export const FEED_PAGE_SIZE = 5;

/** Error codes that mean the session is no longer valid, so the user goes back to the login page. */
const SESSION_ENDED_CODES = [
  'UNAUTHENTICATED',
  'WRONG_TENANT',
  'GUEST_NOT_ALLOWED',
  'NOT_ACTIVE_EMPLOYEE',
  'ACCOUNT_SUSPENDED',
];

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }

  get sessionEnded(): boolean {
    return SESSION_ENDED_CODES.includes(this.code);
  }
}

/** One request to the backend, with the session token attached. Used by the feed and compose calls. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('token');
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Not JSON (for example the backend is down and the proxy answered). Handled below.
  }

  if (!res.ok) {
    const error = (body as Partial<ApiError> | null)?.error;
    throw new ApiRequestError(
      error?.code ?? 'UNKNOWN',
      error?.message ?? `The request failed (${res.status}).`,
      res.status,
    );
  }
  return body as T;
}

export function fetchFeed(filter: FeedFilter, cursor: string | null, signal?: AbortSignal) {
  const params = new URLSearchParams({ sort: filter.sort, limit: String(FEED_PAGE_SIZE) });
  if (filter.principleId !== null) params.set('principleId', String(filter.principleId));
  if (filter.teamId !== null) params.set('teamId', filter.teamId);
  if (cursor) params.set('cursor', cursor);
  return apiRequest<Page<ShoutoutDto>>(`/api/shoutouts?${params.toString()}`, { signal });
}

export function fetchPrinciples(signal?: AbortSignal) {
  return apiRequest<PrincipleDto[]>('/api/principles', { signal });
}

export function fetchTeams(signal?: AbortSignal) {
  return apiRequest<TeamDto[]>('/api/teams', { signal });
}

/** Liking twice or unliking twice is safe: the server counts each person once. */
export function setLike(shoutoutId: number, liked: boolean) {
  return apiRequest<LikeResult>(`/api/shoutouts/${shoutoutId}/like`, { method: liked ? 'POST' : 'DELETE' });
}

export function editShoutout(shoutoutId: number, body: EditShoutoutRequest) {
  return apiRequest<ShoutoutDto>(`/api/shoutouts/${shoutoutId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function fetchComments(shoutoutId: number, signal?: AbortSignal) {
  return apiRequest<CommentList>(`/api/shoutouts/${shoutoutId}/comments`, { signal });
}

export function addComment(shoutoutId: number, text: string) {
  return apiRequest<CommentResult>(`/api/shoutouts/${shoutoutId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

/** Your own comment, or any comment when you are an admin. Returns the new total. */
export function deleteComment(shoutoutId: number, commentId: number) {
  return apiRequest<{ commentCount: number }>(`/api/shoutouts/${shoutoutId}/comments/${commentId}`, {
    method: 'DELETE',
  });
}
