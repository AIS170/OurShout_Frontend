// src/features/admin/adminData.ts
// Data hooks for the admin feature. They return the same shape as TanStack Query
// ({ data, isLoading, error }) so the pages won't change when these switch to the real API.
//
// TODO when Rakshil's scaffold lands:
//   useAdminMe()          -> Rakshil's useMe()
//   useOpenAlertCount()   -> useQuery GET /api/admin/alerts/reciprocal?month=<current UTC month>
//   usePrinciplesAdmin()  -> useQuery GET /api/admin/principles
//                            + useMutation POST /api/admin/principles, PATCH /api/admin/principles/:id
//   useAdminShoutouts()   -> useInfiniteQuery GET /api/admin/shoutouts?visibility=&q=&cursor=
//                            + useMutation PATCH /api/admin/shoutouts/:id { visibility }
//   (The server checks the role and writes the audit rows; the client does neither.)
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Me, Page, PrincipleDto, ShoutoutDto, Visibility } from '../../shared/types';
import {
  SAMPLE_ADMIN_SHOUTOUTS,
  SAMPLE_ME,
  SAMPLE_PRINCIPLES,
  SAMPLE_RECIPROCAL_ALERTS,
} from './sampleData';

export interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
}

/** Body of POST /api/admin/principles (A4). */
export type CreatePrincipleRequest = Pick<PrincipleDto, 'name' | 'description' | 'displayOrder'>;
/** Body of PATCH /api/admin/principles/:id: a partial PrincipleDto (A4). */
export type UpdatePrincipleRequest = Partial<Omit<PrincipleDto, 'id'>>;

export function useAdminMe(): QueryResult<Me> {
  return { data: SAMPLE_ME, isLoading: false, error: null };
}

/** Current calendar month in UTC as 'YYYY-MM' (A4: calendar months use UTC). */
export function currentUtcMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

/** Number of reciprocal-pair alerts this month, for the badge on the Alerts nav link. */
export function useOpenAlertCount(): QueryResult<number> {
  const month = currentUtcMonth();
  const count = SAMPLE_RECIPROCAL_ALERTS.filter(
    (a) => a.month === month && a.reciprocalTimes >= 3,
  ).length;
  return { data: count, isLoading: false, error: null };
}

export interface PrinciplesAdmin extends QueryResult<PrincipleDto[]> {
  createPrinciple: (body: CreatePrincipleRequest) => Promise<PrincipleDto>;
  updatePrinciple: (id: number, body: UpdatePrincipleRequest) => Promise<PrincipleDto>;
}

/** All principles, ACTIVE and RETIRED, sorted by displayOrder (GET /api/admin/principles). */
export function usePrinciplesAdmin(): PrinciplesAdmin {
  // The ref is the sample "server"; state only triggers a re-render.
  const store = useRef<PrincipleDto[]>(SAMPLE_PRINCIPLES.map((p) => ({ ...p })));
  const [items, setItems] = useState(store.current);

  const data = useMemo(
    () => [...items].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id),
    [items],
  );

  const createPrinciple = useCallback(async (body: CreatePrincipleRequest) => {
    const id = Math.max(0, ...store.current.map((p) => p.id)) + 1;
    const created: PrincipleDto = { id, status: 'ACTIVE', ...body };
    store.current = [...store.current, created];
    setItems(store.current);
    return created;
  }, []);

  const updatePrinciple = useCallback(async (id: number, body: UpdatePrincipleRequest) => {
    const existing = store.current.find((p) => p.id === id);
    if (!existing) throw new Error(`Principle ${id} not found`);
    const updated: PrincipleDto = { ...existing, ...body, id };
    store.current = store.current.map((p) => (p.id === id ? updated : p));
    setItems(store.current);
    return updated;
  }, []);

  return { data, isLoading: false, error: null, createPrinciple, updatePrinciple };
}

// ───── Posts ─────

export type VisibilityFilter = Visibility | 'ALL';

/** Query string of GET /api/admin/shoutouts?visibility=&q=&cursor= ('ALL' = no visibility param). */
export interface AdminShoutoutsFilter {
  visibility: VisibilityFilter;
  q: string;
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

function matchesSearch(s: ShoutoutDto, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [s.reason, s.impact, s.principle.name, s.sender.name, ...s.recipients.map((r) => r.name)]
    .some((text) => text.toLowerCase().includes(needle));
}

/** All shout-outs for the admin Posts page, newest first (GET /api/admin/shoutouts). */
export function useAdminShoutouts(filter: AdminShoutoutsFilter): AdminShoutouts {
  const store = useRef<ShoutoutDto[]>(SAMPLE_ADMIN_SHOUTOUTS.map((s) => ({ ...s })));
  const [items, setItems] = useState(store.current);

  const data = useMemo<Page<ShoutoutDto>>(() => {
    const filtered = items
      .filter((s) => filter.visibility === 'ALL' || s.visibility === filter.visibility)
      .filter((s) => matchesSearch(s, filter.q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
    return { items: filtered, nextCursor: null };
  }, [items, filter.visibility, filter.q]);

  const setVisibility = useCallback(async (id: number, visibility: Visibility) => {
    const existing = store.current.find((s) => s.id === id);
    if (!existing) throw new Error(`Shout-out ${id} not found`);
    if (!canChangeVisibility(existing.visibility, visibility)) {
      throw new Error(`Can't change ${existing.visibility} to ${visibility}`);
    }
    const updated: ShoutoutDto = { ...existing, visibility };
    store.current = store.current.map((s) => (s.id === id ? updated : s));
    setItems(store.current);
    return updated;
  }, []);

  // Sample data fits on one page, so there is never a next page.
  const fetchNextPage = useCallback(async () => {}, []);

  return {
    data,
    isLoading: false,
    error: null,
    setVisibility,
    hasNextPage: data.nextCursor !== null,
    fetchNextPage,
    isFetchingNextPage: false,
  };
}
