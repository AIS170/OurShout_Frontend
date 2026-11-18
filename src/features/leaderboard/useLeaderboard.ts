// src/features/leaderboard/useLeaderboard.ts
// Loads GET /api/leaderboard?period=month|all. Plain React (the app has no TanStack Query),
// with a small per-period cache so flipping the This month / All time switch is instant.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeaderboardDto } from '../../shared/types';
import { apiFetch } from '../admin/adminApi';

export type LeaderboardPeriod = 'month' | 'all';

export interface LeaderboardState {
  data: LeaderboardDto | undefined;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useLeaderboard(period: LeaderboardPeriod): LeaderboardState {
  const cache = useRef(new Map<LeaderboardPeriod, LeaderboardDto>());
  const [data, setData] = useState<LeaderboardDto | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cached = cache.current.get(period);
    // Show the cached boards for this period at once; with no cache yet, keep the boards that are
    // on screen (the card dims them while loading) rather than flashing an empty card.
    if (cached) setData(cached);
    setError(null);
    setIsLoading(!cached);

    apiFetch<LeaderboardDto>(`/api/leaderboard?period=${period}`)
      .then((result) => {
        if (cancelled) return;
        cache.current.set(period, result);
        setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled && !cached) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, isLoading, error, reload };
}
