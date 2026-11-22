// src/features/auction/useAuctions.ts
// Loads GET /api/auctions and places bids. Plain React (the app has no TanStack Query).
// It reloads every 15 seconds so a new bid, or an item opening or closing, shows up without
// a refresh; a reload that fails keeps what's on screen.
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../admin/adminApi';
import type { AuctionItemDto, AuctionListDto, PlaceBidResponse } from './auctionTypes';

const REFRESH_MS = 15_000;

export interface AuctionsState {
  data: AuctionListDto | undefined;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
  /** POST /api/auctions/:id/bids. Rejects with the server's AdminApiError (its message is shown). */
  placeBid: (itemId: number, amount: number) => Promise<AuctionItemDto>;
}

export function useAuctions(): AuctionsState {
  const [data, setData] = useState<AuctionListDto | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const hasData = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      apiFetch<AuctionListDto>('/api/auctions')
        .then((result) => {
          if (cancelled) return;
          hasData.current = true;
          setData(result);
          setError(null);
        })
        .catch((err: unknown) => {
          if (!cancelled && !hasData.current) setError(err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });

    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [attempt]);

  const reload = useCallback(() => {
    if (!hasData.current) setIsLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  const placeBid = useCallback(
    async (itemId: number, amount: number) => {
      try {
        const result = await apiFetch<PlaceBidResponse>(`/api/auctions/${itemId}/bids`, {
          method: 'POST',
          body: { amount },
        });
        setData((old) =>
          old
            ? { items: old.items.map((i) => (i.id === itemId ? result.item : i)), balance: result.balance }
            : old,
        );
        return result.item;
      } catch (err) {
        // A rejected bid usually means the item moved on (someone bid more, or it closed).
        reload();
        throw err;
      }
    },
    [reload],
  );

  return { data, isLoading, error, reload, placeBid };
}
