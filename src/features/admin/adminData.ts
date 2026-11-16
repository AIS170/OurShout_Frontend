// src/features/admin/adminData.ts
// Data hooks for the admin feature. They return the same shape as TanStack Query
// ({ data, isLoading, error }) so the pages won't change when these switch to the real API.
//
// TODO when Rakshil's scaffold lands:
//   useAdminMe()          -> Rakshil's useMe()
//   useOpenAlertCount()   -> useQuery GET /api/admin/alerts/reciprocal?month=<current UTC month>
//   usePrinciplesAdmin()  -> useQuery GET /api/admin/principles
//                            + useMutation POST /api/admin/principles, PATCH /api/admin/principles/:id
//   (The server checks the role and writes the audit rows; the client does neither.)
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Me, PrincipleDto } from '../../shared/types';
import { SAMPLE_ME, SAMPLE_PRINCIPLES, SAMPLE_RECIPROCAL_ALERTS } from './sampleData';

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
