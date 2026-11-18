// src/features/admin/adminData.ts
// Data hooks for the admin feature. Each returns { data, isLoading, error } plus its actions,
// so the pages don't care whether the data is live or sample.
//
// Live (TanStack Query against the Flask backend; needs a QueryClientProvider):
//   useAdminMe()           GET /api/me                      TODO: swap for Rakshil's useMe()
//   useAdminUsers()        GET /api/admin/users?q=, PATCH /api/admin/users/:employeeId
//   useAdminShoutouts()    GET /api/admin/shoutouts?visibility=&q=&between=&month=&cursor=
//   useAdminShoutout()     GET /api/admin/shoutouts/:id (both update via PATCH /api/admin/shoutouts/:id)
//   useReciprocalAlerts()  GET /api/admin/alerts/reciprocal?month=YYYY-MM (and the Alerts badge)
// Still sample data (the backend has no audit_events table yet):
//   useAdminAudit()        -> useInfiniteQuery GET /api/admin/audit?action=&actorId=&from=&to=&cursor=
//                             (the route exists and returns an empty page until the table does)
//
// The server checks the role and writes the audit rows; the client does neither.
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type {
  AdminUserDto,
  AuditEventDto,
  Me,
  Page,
  ReciprocalAlertDto,
  ReportSummaryDto,
  ShoutoutDto,
  UserStatus,
  Visibility,
} from '../../shared/types';
import { apiFetch, apiFetchBlob } from './adminApi';
import type { ReportInsightsDto } from './reportTypes';
import { SAMPLE_AUDIT_EVENTS } from './sampleData';

export interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
}

/** TanStack Query keys for the admin feature. */
export const adminKeys = {
  me: ['me'] as const,
  users: (q: string) => ['admin', 'users', q] as const,
  allUsers: ['admin', 'users'] as const,
  shoutouts: (visibility: string, q: string, between: string, month: string) =>
    ['admin', 'shoutouts', visibility, q, between, month] as const,
  shoutout: (id: number) => ['admin', 'shoutout', id] as const,
  allShoutouts: ['admin', 'shoutouts'] as const,
  alerts: (month: string) => ['admin', 'alerts', month] as const,
};

// ───── Me ─────

export function useAdminMe(): QueryResult<Me> {
  const query = useQuery({ queryKey: adminKeys.me, queryFn: () => apiFetch<Me>('/api/me') });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

/** Current calendar month in UTC as 'YYYY-MM' (A4: calendar months use UTC). */
export function currentUtcMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

/** Reciprocal-pair alerts for a month (GET /api/admin/alerts/reciprocal?month=YYYY-MM). */
export function useReciprocalAlerts(month: string, enabled = true): QueryResult<ReciprocalAlertDto[]> {
  const query = useQuery({
    queryKey: adminKeys.alerts(month),
    queryFn: () =>
      apiFetch<ReciprocalAlertDto[]>(`/api/admin/alerts/reciprocal?month=${encodeURIComponent(month)}`),
    enabled,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

/**
 * Number of reciprocal-pair alerts this month, for the badge on the Alerts nav link.
 * Pass enabled = false until the viewer is known to be an admin, so non-admins never call it.
 */
export function useOpenAlertCount(enabled = true): QueryResult<number> {
  const alerts = useReciprocalAlerts(currentUtcMonth(), enabled);
  return { data: alerts.data?.length, isLoading: alerts.isLoading, error: alerts.error };
}

// ───── Posts ─────

export type VisibilityFilter = Visibility | 'ALL';

/** Query string of GET /api/admin/shoutouts ('ALL' / '' = not sent). */
export interface AdminShoutoutsFilter {
  visibility: VisibilityFilter;
  q: string;
  /** Two employee IDs: only posts between them, in either direction (from the Alerts page). */
  between?: [string, string] | null;
  /** 'YYYY-MM' (UTC). */
  month?: string;
}

export interface AdminShoutouts extends QueryResult<Page<ShoutoutDto>> {
  /** PATCH /api/admin/shoutouts/:id { visibility }. HIDDEN ↔ VISIBLE; DELETED is final. */
  setVisibility: (id: number, visibility: Visibility) => Promise<ShoutoutDto>;
  /** Cursor paging: true when nextCursor isn't null. */
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  isFetchingNextPage: boolean;
}

/** Allowed moves for PATCH { visibility } (A4). The server enforces this too. */
export function canChangeVisibility(from: Visibility, to: Visibility): boolean {
  if (from === 'DELETED' || from === to) return false;
  return to === 'DELETED' || (from === 'VISIBLE' && to === 'HIDDEN') || (from === 'HIDDEN' && to === 'VISIBLE');
}

/**
 * PATCH a post's visibility, then update every cached copy (each Posts list and the detail page)
 * in the same render, so tables change at once and focus handling stays simple.
 */
export function useSetShoutoutVisibility(): (id: number, visibility: Visibility) => Promise<ShoutoutDto> {
  const queryClient = useQueryClient();
  return useCallback(
    async (id: number, visibility: Visibility) => {
      const updated = await apiFetch<ShoutoutDto>(`/api/admin/shoutouts/${id}`, {
        method: 'PATCH',
        body: { visibility },
      });
      // Each list key is ['admin', 'shoutouts', visibilityFilter, ...]: drop the post from lists
      // whose filter it no longer matches, replace it everywhere else.
      for (const [key, old] of queryClient.getQueriesData<InfiniteData<Page<ShoutoutDto>>>({
        queryKey: adminKeys.allShoutouts,
      })) {
        if (!old) continue;
        const listFilter = key[2] as VisibilityFilter;
        const keep = listFilter === 'ALL' || listFilter === updated.visibility;
        queryClient.setQueryData<InfiniteData<Page<ShoutoutDto>>>(key, {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: keep ? page.items.map((s) => (s.id === id ? updated : s)) : page.items.filter((s) => s.id !== id),
          })),
        });
      }
      queryClient.setQueryData(adminKeys.shoutout(id), updated);
      // The feed, leaderboards and the alert count depend on visibility too.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['shoutouts'] });
      return updated;
    },
    [queryClient],
  );
}

/** All shout-outs for the admin Posts page, newest first, a page at a time (GET /api/admin/shoutouts). */
export function useAdminShoutouts(filter: AdminShoutoutsFilter): AdminShoutouts {
  const q = filter.q.trim();
  const between = filter.between ? filter.between.join(',') : '';
  const month = filter.month ?? '';
  const setVisibility = useSetShoutoutVisibility();

  const query = useInfiniteQuery({
    queryKey: adminKeys.shoutouts(filter.visibility, q, between, month),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filter.visibility !== 'ALL') params.set('visibility', filter.visibility);
      if (q) params.set('q', q);
      if (between) params.set('between', between);
      if (month) params.set('month', month);
      if (pageParam) params.set('cursor', pageParam);
      const qs = params.toString();
      return apiFetch<Page<ShoutoutDto>>(qs ? `/api/admin/shoutouts?${qs}` : '/api/admin/shoutouts');
    },
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData, // keep the table on screen while a new filter loads
  });

  // All loaded pages as one Page, so the page component doesn't care about paging.
  const data = useMemo<Page<ShoutoutDto> | undefined>(() => {
    if (!query.data) return undefined;
    const pages = query.data.pages;
    return { items: pages.flatMap((p) => p.items), nextCursor: pages[pages.length - 1]?.nextCursor ?? null };
  }, [query.data]);

  const fetchNextPage = useCallback(async () => {
    await query.fetchNextPage();
  }, [query]);

  return {
    data,
    isLoading: query.isLoading,
    error: query.error,
    setVisibility,
    hasNextPage: query.hasNextPage,
    fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export interface AdminShoutout extends QueryResult<ShoutoutDto> {
  setVisibility: (visibility: Visibility) => Promise<ShoutoutDto>;
}

/** One post in any visibility, for the "View shout-out" page (GET /api/admin/shoutouts/:id). */
export function useAdminShoutout(id: number): AdminShoutout {
  const setVisibility = useSetShoutoutVisibility();
  const valid = Number.isInteger(id) && id > 0;
  const query = useQuery({
    queryKey: adminKeys.shoutout(id),
    queryFn: () => apiFetch<ShoutoutDto>(`/api/admin/shoutouts/${id}`),
    enabled: valid,
  });
  return {
    data: query.data,
    isLoading: valid && query.isLoading,
    error: valid ? query.error : new Error('Invalid shout-out id'),
    setVisibility: (visibility) => setVisibility(id, visibility),
  };
}

// ───── Users ─────

export interface AdminUsers extends QueryResult<AdminUserDto[]> {
  /** PATCH /api/admin/users/:employeeId { status }. You can't suspend yourself. */
  setStatus: (employeeId: string, status: UserStatus) => Promise<AdminUserDto>;
}

/** Users for the admin Users page, by name (GET /api/admin/users?q=). */
export function useAdminUsers(q: string): AdminUsers {
  const queryClient = useQueryClient();
  const trimmed = q.trim();
  const query = useQuery({
    queryKey: adminKeys.users(trimmed),
    queryFn: () =>
      apiFetch<AdminUserDto[]>(`/api/admin/users${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''}`),
    placeholderData: keepPreviousData, // keep the table on screen while a new search loads
  });

  const setStatus = useCallback(
    async (employeeId: string, status: UserStatus) => {
      const updated = await apiFetch<AdminUserDto>(`/api/admin/users/${encodeURIComponent(employeeId)}`, {
        method: 'PATCH',
        body: { status },
      });
      // Update this person in every cached search result.
      queryClient.setQueriesData<AdminUserDto[]>({ queryKey: adminKeys.allUsers }, (old) =>
        old?.map((u) => (u.employeeId === employeeId ? updated : u)),
      );
      return updated;
    },
    [queryClient],
  );

  return { data: query.data, isLoading: query.isLoading, error: query.error, setStatus };
}

// ───── Audit log (sample data) ─────

/** The only allowed values of AuditEvent.action (A3), in the order the filter lists them. */
export const AUDIT_ACTIONS = [
  'SHOUTOUT_CREATED',
  'SHOUTOUT_EDITED',
  'SHOUTOUT_HIDDEN',
  'SHOUTOUT_UNHIDDEN',
  'SHOUTOUT_DELETED',
  'PRINCIPLE_CREATED',
  'PRINCIPLE_UPDATED',
  'USER_SUSPENDED',
  'USER_REINSTATED',
  'EMAIL_RETRIED',
  'LOGIN_REJECTED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Query string of GET /api/admin/audit?action=&actorId=&from=&to=&cursor= ('' = not sent). */
export interface AdminAuditFilter {
  action: AuditAction | '';
  actorId: string;
  /** 'YYYY-MM-DD', inclusive, UTC. */
  from: string;
  to: string;
}

export interface AdminAudit extends QueryResult<Page<AuditEventDto>> {
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  isFetchingNextPage: boolean;
}

const AUDIT_PAGE_SIZE = 10;

/**
 * Audit events, newest first, a page at a time (GET /api/admin/audit). Read-only.
 * Sample data until the audit_events table exists; then -> useInfiniteQuery on the route.
 */
export function useAdminAudit(filter: AdminAuditFilter): AdminAudit {
  const { action, actorId, from, to } = filter;
  const filterKey = `${action}|${actorId}|${from}|${to}`;
  const [paging, setPaging] = useState({ key: filterKey, pages: 1 });
  const pages = paging.key === filterKey ? paging.pages : 1; // a new filter starts at page 1

  const matching = useMemo(
    () =>
      SAMPLE_AUDIT_EVENTS.filter((e) => {
        const day = e.createdAt.slice(0, 10);
        return (
          (!action || e.action === action) &&
          (!actorId || e.actor?.employeeId === actorId) &&
          (!from || day >= from) &&
          (!to || day <= to)
        );
      }).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id),
    [action, actorId, from, to],
  );

  const data = useMemo<Page<AuditEventDto>>(() => {
    const items = matching.slice(0, pages * AUDIT_PAGE_SIZE);
    return { items, nextCursor: items.length < matching.length ? String(items.length) : null };
  }, [matching, pages]);

  const fetchNextPage = useCallback(async () => {
    setPaging({ key: filterKey, pages: pages + 1 });
  }, [filterKey, pages]);

  return {
    data,
    isLoading: false,
    error: null,
    hasNextPage: data.nextCursor !== null,
    fetchNextPage,
    isFetchingNextPage: false,
  };
}

// ───── Reports ─────

/** Calendar dates 'YYYY-MM-DD' (UTC, inclusive). Empty = open-ended. */
export interface ReportRange {
  from: string;
  to: string;
}

function rangeQuery(range: ReportRange, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(extra);
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** GET /api/admin/reports/summary (the A4 ReportSummaryDto). */
export function useReportSummary(range: ReportRange): QueryResult<ReportSummaryDto> {
  const query = useQuery({
    queryKey: ['admin', 'reports', 'summary', range.from, range.to],
    queryFn: () => apiFetch<ReportSummaryDto>(`/api/admin/reports/summary${rangeQuery(range)}`),
    placeholderData: keepPreviousData,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

/** GET /api/admin/reports/insights (the proposed ReportInsightsDto). */
export function useReportInsights(range: ReportRange): QueryResult<ReportInsightsDto> {
  const query = useQuery({
    queryKey: ['admin', 'reports', 'insights', range.from, range.to],
    queryFn: () => apiFetch<ReportInsightsDto>(`/api/admin/reports/insights${rangeQuery(range)}`),
    placeholderData: keepPreviousData,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

/**
 * Downloads GET /api/admin/reports/export.csv. A plain link can't send the login token,
 * so fetch it and hand the browser a file.
 */
export async function downloadReportCsv(range: ReportRange, kindnessOnly = false): Promise<void> {
  const path = `/api/admin/reports/export.csv${rangeQuery(range, kindnessOnly ? { kindness: 'true' } : {})}`;
  const blob = await apiFetchBlob(path);
  const url = URL.createObjectURL(blob.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = blob.filename ?? (kindnessOnly ? 'ourshout-kindness.csv' : 'ourshout-shoutouts.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
