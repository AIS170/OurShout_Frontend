// src/features/admin/adminApi.ts
// TEMPORARY fetch helper for the admin feature until Rakshil's src/api/client.ts exists.
// Then delete this file and use his client (it adds the token and maps error codes).
import type { ApiError, ErrorCode } from '../../shared/types';

/** sessionStorage key for the mock-login token: the same key the app shell (src/App.tsx) uses. */
export const TOKEN_STORAGE_KEY = 'token';

/** Thrown for any non-2xx response; carries the A4 error code when the server sent one. */
export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'NETWORK_ERROR' | 'UNKNOWN',
    message: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** fetch() for /api routes: JSON in and out, Bearer token added, errors thrown as AdminApiError. */
export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch (err) {
    throw new AdminApiError(0, 'NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload as Partial<ApiError> | null)?.error;
    throw new AdminApiError(response.status, error?.code ?? 'UNKNOWN', error?.message ?? response.statusText);
  }
  return payload as T;
}

/** GET a file (e.g. the CSV export) with the Bearer token. Returns the data and the server's filename. */
export async function apiFetchBlob(path: string): Promise<{ data: Blob; filename: string | null }> {
  const headers: Record<string, string> = {};
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(path, { headers });
  } catch (err) {
    throw new AdminApiError(0, 'NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Partial<ApiError> | null;
    throw new AdminApiError(response.status, payload?.error?.code ?? 'UNKNOWN', payload?.error?.message ?? response.statusText);
  }
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? null;
  return { data: await response.blob(), filename };
}
