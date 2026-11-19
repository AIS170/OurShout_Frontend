import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Megaphone, RefreshCw } from 'lucide-react';
import { Me } from '../types';
import { EditShoutoutDialog } from '../components/feed/EditShoutoutDialog';
import { FeedFilterBar } from '../components/feed/FeedFilterBar';
import { ShoutoutCard } from '../components/feed/ShoutoutCard';
import {
  ApiRequestError,
  editShoutout,
  fetchFeed,
  fetchPrinciples,
  fetchTeams,
  setLike,
} from '../components/feed/feedApi';
import {
  DEFAULT_FEED_FILTER,
  EditShoutoutRequest,
  FeedFilter,
  PrincipleDto,
  ShoutoutDto,
  TeamDto,
} from '../components/feed/feedTypes';
import '../components/feed/feed.css';

interface FeedPageProps {
  currentUser: Me;
  /** Opens the "give a shout-out" screen. */
  onCompose: () => void;
  /** Opens a colleague's profile, from a name on a card. */
  onOpenProfile: (employeeId: string) => void;
  /** Called when the API says the session is no longer valid (expired, suspended, left). */
  onSessionEnded: () => void;
}

type LoadState = 'loading' | 'ready' | 'error';

/**
 * The newsfeed: where a user lands after signing in. Shows shout-outs from their country with
 * filters, likes, editing of their own posts and "Load more".
 *
 * Still to come from the plan: the leaderboard and kindness counter beside the feed.
 */
export const FeedPage: React.FC<FeedPageProps> = ({
  currentUser,
  onCompose,
  onOpenProfile,
  onSessionEnded,
}) => {
  const [filter, setFilter] = useState<FeedFilter>(DEFAULT_FEED_FILTER);
  const [items, setItems] = useState<ShoutoutDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const [principles, setPrinciples] = useState<PrincipleDto[]>([]);
  const [teams, setTeams] = useState<TeamDto[]>([]);

  const [editing, setEditing] = useState<{ key: number; shoutout: ShoutoutDto } | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // Kept in a ref so a new function from the parent doesn't make the feed load again.
  const sessionEndedRef = useRef(onSessionEnded);
  sessionEndedRef.current = onSessionEnded;

  /** Sends the user back to login when the session has ended; otherwise returns a message to show. */
  const describeError = useCallback((error: unknown, fallback: string): string => {
    if (error instanceof ApiRequestError) {
      if (error.sessionEnded) sessionEndedRef.current();
      return error.message;
    }
    return fallback;
  }, []);

  // Filter options. The feed still works without them, so a failure here isn't shown as an error.
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchPrinciples(controller.signal), fetchTeams(controller.signal)])
      .then(([principleList, teamList]) => {
        setPrinciples(principleList);
        setTeams(teamList);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  // First page, loaded again whenever a filter changes or the user presses "Try again".
  useEffect(() => {
    const controller = new AbortController();
    setLoadState('loading');
    fetchFeed(filter, null, controller.signal)
      .then((page) => {
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        describeError(error, '');
        setLoadState('error');
      });
    return () => controller.abort();
  }, [filter, reloadKey, describeError]);

  // After "Load more", move focus to the first new card so keyboard users carry on from there.
  const listRef = useRef<HTMLUListElement>(null);
  const pendingFocusIndex = useRef<number | null>(null);
  useEffect(() => {
    const index = pendingFocusIndex.current;
    if (index === null || items.length <= index) return;
    pendingFocusIndex.current = null;
    listRef.current?.children[index]?.querySelector<HTMLElement>('article')?.focus();
  }, [items.length]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setActionError('');
    try {
      const page = await fetchFeed(filter, nextCursor);
      pendingFocusIndex.current = items.length;
      // A post can move between pages while you read (its like count changed), so skip repeats.
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !seen.has(item.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      setActionError(describeError(error, "We couldn't load more shout-outs. Try again."));
    } finally {
      setLoadingMore(false);
    }
  };

  const replaceItem = (id: number, change: (item: ShoutoutDto) => ShoutoutDto) =>
    setItems((current) => current.map((item) => (item.id === id ? change(item) : item)));

  // Optimistic: the card updates straight away, then takes the server's count, or rolls back.
  const handleLikeChange = async (shoutout: ShoutoutDto, liked: boolean) => {
    setActionError('');
    replaceItem(shoutout.id, (item) => ({
      ...item,
      likedByMe: liked,
      likeCount: Math.max(0, item.likeCount + (liked === item.likedByMe ? 0 : liked ? 1 : -1)),
    }));
    try {
      const result = await setLike(shoutout.id, liked);
      replaceItem(shoutout.id, (item) => ({ ...item, ...result }));
    } catch (error) {
      replaceItem(shoutout.id, (item) => ({
        ...item,
        likedByMe: shoutout.likedByMe,
        likeCount: shoutout.likeCount,
      }));
      setActionError(describeError(error, "That like didn't save. Try again."));
    }
  };

  const handleEditSubmit = async (body: EditShoutoutRequest) => {
    if (!editing) return;
    try {
      const updated = await editShoutout(editing.shoutout.id, body);
      replaceItem(updated.id, () => updated);
      setEditing(null);
      setActionError('');
      setAnnouncement('Your shout-out was updated.');
    } catch (error) {
      // The dialog shows this message and stays open.
      throw new Error(describeError(error, "That change didn't save. Try again."));
    }
  };

  const filtered = filter.principleId !== null || filter.teamId !== null;

  const renderBody = () => {
    if (loadState === 'loading') {
      return (
        <div className="os-empty" role="status">
          <RefreshCw size={22} className="os-spinner" color="var(--sandoz-blue)" aria-hidden="true" />
          <p>Loading the newsfeed...</p>
        </div>
      );
    }

    if (loadState === 'error') {
      return (
        <div className="os-empty" role="alert">
          <AlertCircle size={24} color="#b42318" aria-hidden="true" />
          <h2>We couldn't load the newsfeed</h2>
          <p>Check that the backend is running, then try again.</p>
          <button type="button" className="os-btn" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="os-empty">
          <h2>{filtered ? 'No shout-outs match these filters' : 'No shout-outs yet'}</h2>
          <p>{filtered ? 'Try a different principle or team.' : 'Be the first to recognise a colleague.'}</p>
          {filtered && (
            <button type="button" className="os-btn" onClick={() => setFilter(DEFAULT_FEED_FILTER)}>
              Clear filters
            </button>
          )}
        </div>
      );
    }

    return (
      <>
        <ul ref={listRef} className="os-list" aria-label="Shout-outs">
          {items.map((shoutout) => (
            <li key={shoutout.id}>
              <ShoutoutCard
                shoutout={shoutout}
                onLikeChange={handleLikeChange}
                onOpenProfile={onOpenProfile}
                onEdit={(post) => setEditing((current) => ({ key: (current?.key ?? 0) + 1, shoutout: post }))}
              />
            </li>
          ))}
        </ul>
        {nextCursor && (
          <button type="button" className="os-btn os-load-more" disabled={loadingMore} onClick={handleLoadMore}>
            {loadingMore ? 'Loading more...' : 'Load more'}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="os-feed-wrap">
      <main className="os-feed">
        <div className="os-feed-header">
          <div>
            <h1 className="os-feed-title">Newsfeed</h1>
            <p className="os-feed-intro">
              Welcome back, {currentUser.name.split(' ')[0]}. Here are the latest shout-outs from across Sandoz
              Australia.
            </p>
          </div>
          <div className="os-feed-actions">
            <button type="button" className="os-btn os-btn-primary" onClick={onCompose}>
              <Megaphone size={16} aria-hidden="true" />
              Give a shout-out
            </button>
          </div>
        </div>

        <FeedFilterBar filter={filter} principles={principles} teams={teams} onChange={setFilter} />

        {loadState === 'ready' && items.length > 0 && (
          <p className="os-count" aria-live="polite">
            Showing {items.length} {items.length === 1 ? 'shout-out' : 'shout-outs'}
          </p>
        )}

        {/* Polite live region: announces a saved change to screen readers and shows it on screen. */}
        <div role="status" aria-live="polite">
          {announcement && (
            <div className="os-note os-note-success">
              <CheckCircle2 size={18} aria-hidden="true" />
              {announcement}
            </div>
          )}
        </div>
        {actionError && (
          <div className="os-note os-note-error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {actionError}
          </div>
        )}

        {renderBody()}
      </main>

      {editing && (
        <EditShoutoutDialog
          key={editing.key}
          shoutout={editing.shoutout}
          principles={principles}
          onSubmit={handleEditSubmit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};
