// Calls to the backend for giving a shout-out. They share the request helper (token, error
// handling) with the newsfeed.
import { apiRequest } from '../feed/feedApi';
import { CreateShoutoutRequest, EmployeeSummary, ShoutoutDto } from '../feed/feedTypes';

/** The search needs at least this many characters (the server enforces it too). */
export const MIN_SEARCH_LENGTH = 2;

/** A team shout-out is for 2 to 50 people. */
export const MIN_TEAM_PEOPLE = 2;
export const MAX_TEAM_PEOPLE = 50;

/** Active colleagues whose name matches. Never includes the signed-in user. */
export function searchDirectory(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query, limit: '8' });
  return apiRequest<EmployeeSummary[]>(`/api/directory/search?${params.toString()}`, { signal });
}

/** Active members of a team. Never includes the signed-in user. */
export function fetchTeamMembers(teamId: string, signal?: AbortSignal) {
  return apiRequest<EmployeeSummary[]>(`/api/teams/${encodeURIComponent(teamId)}/members`, { signal });
}

export function createShoutout(body: CreateShoutoutRequest) {
  return apiRequest<ShoutoutDto>('/api/shoutouts', { method: 'POST', body: JSON.stringify(body) });
}
