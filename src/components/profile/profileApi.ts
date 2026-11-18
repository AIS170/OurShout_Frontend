// Call to the backend for a person's recognition profile.
import { apiRequest } from '../feed/feedApi';
import { ProfileDto } from '../feed/feedTypes';

/** Pass an employee ID, or "me" for the signed-in user. */
export function fetchProfile(employeeId: string, signal?: AbortSignal) {
  return apiRequest<ProfileDto>(`/api/profile/${encodeURIComponent(employeeId)}`, { signal });
}
