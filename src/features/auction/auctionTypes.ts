// src/features/auction/auctionTypes.ts
// PROPOSED additions to shared/types.ts (Rakshil owns that file): the auction routes' shapes.
// Kept here until the team agrees them; the admin "Add auction item" page imports them too.
import type { EmployeeSummary } from '../../shared/types';

/** From the clock: before startsAt, between startsAt and endsAt, after endsAt. */
export type AuctionStatus = 'UPCOMING' | 'LIVE' | 'ENDED';

export interface AuctionBidder extends EmployeeSummary {
  avatarUrl: string | null;
}

export interface AuctionBidEntry {
  id: number;
  amount: number;
  createdAt: string;
  bidder: AuctionBidder;
}

export interface AuctionItemDto {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;          // '/static/auctions/...', served by the backend
  startingBid: number;              // points
  startsAt: string;                 // ISO, UTC
  endsAt: string;                   // ISO, UTC
  status: AuctionStatus;
  currentBid: number | null;        // the leading bid; the winning bid once ENDED
  currentBidder: AuctionBidder | null;
  bidCount: number;
  recentBids?: AuctionBidEntry[];
  minNextBid: number;               // startingBid, or currentBid + 1
  leadingIsMe: boolean;
}

/** The viewer's points. available = earned - spent - held. */
export interface AuctionBalanceDto {
  earned: number;                   // 25 per visible shout-out given or received
  spent: number;                    // winning bids on ended items
  held: number;                     // leading bids on live items
  available: number;
}

/** GET /api/auctions */
export interface AuctionListDto {
  items: AuctionItemDto[];          // live, then upcoming, then the last few ended
  balance: AuctionBalanceDto;
}

/** POST /api/auctions/:id/bids { amount } */
export interface PlaceBidResponse {
  item: AuctionItemDto;
  balance: AuctionBalanceDto;
}

/** POST /api/admin/auctions */
export interface CreateAuctionItemRequest {
  name: string;                     // 1–80 chars
  description?: string;             // up to 500 chars
  startingBid: number;              // whole points, 1 or more
  startsAt: string;                 // ISO date-time
  endsAt: string;                   // ISO date-time, after startsAt and in the future
  imageBase64?: string;             // data: URL (PNG, JPG, WEBP or GIF, up to 5 MB)
}

/** Error codes these routes add to the shared ErrorCode list. */
export type AuctionErrorCode = 'AUCTION_NOT_OPEN' | 'BID_TOO_LOW' | 'INSUFFICIENT_POINTS' | 'AUCTION_HAS_BIDS';
