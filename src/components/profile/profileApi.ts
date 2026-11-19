// Call to the backend for a person's recognition profile.
import { apiRequest, ApiRequestError } from '../feed/feedApi';
import { ProfileDto } from '../feed/feedTypes';

/** Pass an employee ID, or "me" for the signed-in user. */
export function fetchProfile(employeeId: string, signal?: AbortSignal) {
  return apiRequest<ProfileDto>(`/api/profile/${encodeURIComponent(employeeId)}`, { signal });
}

export async function uploadAvatar(file: File): Promise<{ avatarUrl: string; message: string }> {
  const token = sessionStorage.getItem('token');
  const formData = new FormData();
  formData.append('avatar', file);

  const res = await fetch('/api/profile/avatar', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    const code = body?.error?.code || 'UPLOAD_FAILED';
    const message = body?.error?.message || 'Failed to upload photo';
    throw new ApiRequestError(code, message, res.status);
  }

  return body as { avatarUrl: string; message: string };
}

export async function deleteAvatar(): Promise<{ avatarUrl: null; message: string }> {
  return apiRequest<{ avatarUrl: null; message: string }>('/api/profile/avatar', {
    method: 'DELETE',
  });
}
