import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ListFilter, RefreshCw, Send } from 'lucide-react';
import { addComment, ApiRequestError, deleteComment, fetchComments } from './feedApi';
import { CommentDto, MAX_COMMENT_LENGTH } from './feedTypes';
import { formatFullDate, formatRelativeTime } from './relativeTime';

interface CommentThreadProps {
  /** The id the card's Comments button points at with aria-controls. */
  id: string;
  shoutoutId: number;
  /** Tells the card the latest total, so the number on its Comments button stays right. */
  onCountChange: (count: number) => void;
  /** When given, each commenter's name links to their profile. */
  onOpenProfile?: (employeeId: string) => void;
}

type LoadState = 'loading' | 'ready' | 'error';

/** How many comments a thread opens on: the latest ones. "View all" shows the rest. */
const PREVIEW_COUNT = 2;

const initials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof ApiRequestError ? error.message : fallback;

/**
 * The comments under one shout-out: the thread, oldest first, and a box to add your own.
 * It loads when the card's Comments button opens it, showing the latest PREVIEW_COUNT with a
 * "View all" toggle for the rest. You can delete your own comments, and an
 * admin can delete any (the server sets canDelete and checks again on the request).
 * React renders all text, so quotes, ampersands and angle brackets show exactly as typed.
 */
export const CommentThread: React.FC<CommentThreadProps> = ({ id, shoutoutId, onCountChange, onOpenProfile }) => {
  const inputId = useId();
  const footId = useId();
  const listId = useId();

  const [comments, setComments] = useState<CommentDto[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [reloadKey, setReloadKey] = useState<number>(0);

  const [showAll, setShowAll] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');
  const [posting, setPosting] = useState<boolean>(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string>('');
  const [announcement, setAnnouncement] = useState<string>('');

  // Kept in a ref so a new function from the card doesn't make the thread load again.
  const countChangeRef = useRef(onCountChange);
  countChangeRef.current = onCountChange;

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState('loading');
    fetchComments(shoutoutId, controller.signal)
      .then((list) => {
        setComments(list.items);
        setTotal(list.commentCount);
        countChangeRef.current(list.commentCount);
        setLoadState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadState('error');
      });
    return () => controller.abort();
  }, [shoutoutId, reloadKey]);

  // The Delete link turns into "Delete / Cancel", so focus follows it to Cancel: pressing
  // Enter twice by accident never deletes anything.
  useEffect(() => {
    if (confirmingId !== null) {
      threadRef.current?.querySelector<HTMLElement>(`[data-cancel-delete="${confirmingId}"]`)?.focus();
    }
  }, [confirmingId]);

  const text = draft.trim();
  // Counted in characters the way the server counts them, so an emoji is one, not two.
  const length = Array.from(text).length;
  const tooLong = length > MAX_COMMENT_LENGTH;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text || tooLong || posting) return;
    setPosting(true);
    setActionError('');
    try {
      const result = await addComment(shoutoutId, text);
      setComments((current) => [...current, result.comment]);
      setTotal(result.commentCount);
      onCountChange(result.commentCount);
      setDraft('');
      setAnnouncement('Your comment was posted.');
    } catch (error) {
      setActionError(messageOf(error, "Your comment didn't post. Try again."));
    } finally {
      setPosting(false);
      inputRef.current?.focus();
    }
  };

  const cancelDelete = (commentId: number) => {
    setConfirmingId(null);
    // Back to the Delete link it came from, once that link is on the page again.
    requestAnimationFrame(() =>
      threadRef.current?.querySelector<HTMLElement>(`[data-delete="${commentId}"]`)?.focus(),
    );
  };

  const handleDelete = async (comment: CommentDto) => {
    setDeletingId(comment.id);
    setActionError('');
    try {
      const result = await deleteComment(shoutoutId, comment.id);
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setTotal(result.commentCount);
      onCountChange(result.commentCount);
      setAnnouncement('The comment was deleted.');
      // Its buttons are gone, so focus goes to the comment box.
      inputRef.current?.focus();
    } catch (error) {
      setActionError(messageOf(error, "That comment wasn't deleted. Try again."));
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  const renderThread = () => {
    if (loadState === 'loading') {
      return (
        <p className="os-comments-status" role="status">
          <RefreshCw size={15} className="os-spinner" aria-hidden="true" />
          Loading comments...
        </p>
      );
    }

    if (loadState === 'error') {
      return (
        <div className="os-note os-note-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>
            We couldn't load the comments.{' '}
            <button type="button" className="os-btn-link" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </button>
          </span>
        </div>
      );
    }

    if (comments.length === 0) {
      return <p className="os-comments-status">No comments yet. Be the first to say something.</p>;
    }

    // Closed, the thread shows only the latest few, so a new comment is always in view.
    const visible = showAll ? comments : comments.slice(-PREVIEW_COUNT);

    return (
      <>
        {comments.length > PREVIEW_COUNT && (
          <button
            type="button"
            className="os-btn-link os-comments-view-all"
            aria-expanded={showAll}
            aria-controls={listId}
            onClick={() => {
              setConfirmingId(null);
              setShowAll((all) => !all);
            }}
          >
            <ListFilter size={15} aria-hidden="true" />
            {showAll ? 'Show fewer comments' : `View all ${total} comments`}
          </button>
        )}
        {showAll && total > comments.length && (
          <p className="os-comments-status">
            Showing the latest {comments.length} of {total} comments.
          </p>
        )}
        <ul id={listId} className="os-comment-list">
          {visible.map((comment) => (
            <li key={comment.id} className="os-comment">
              <div className="os-avatar os-avatar-sm" aria-hidden="true">
                {comment.author.avatarUrl ? (
                  <img src={comment.author.avatarUrl} alt="" />
                ) : (
                  initials(comment.author.name)
                )}
              </div>
              <div className="os-comment-main">
                <p className="os-comment-head">
                  {onOpenProfile ? (
                    <button
                      type="button"
                      className="os-name-btn"
                      onClick={() => onOpenProfile(comment.author.employeeId)}
                    >
                      {comment.author.name}
                    </button>
                  ) : (
                    <strong>{comment.author.name}</strong>
                  )}
                  <time
                    className="os-comment-time"
                    dateTime={comment.createdAt}
                    title={formatFullDate(comment.createdAt)}
                  >
                    {formatRelativeTime(comment.createdAt)}
                  </time>
                </p>
                <p className="os-comment-text">{comment.text}</p>
                {comment.canDelete &&
                  (confirmingId === comment.id ? (
                    <p className="os-comment-confirm">
                      Delete this comment?
                      <button
                        type="button"
                        className="os-btn-link os-comment-danger"
                        disabled={deletingId === comment.id}
                        onClick={() => handleDelete(comment)}
                      >
                        {deletingId === comment.id ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        type="button"
                        className="os-btn-link"
                        data-cancel-delete={comment.id}
                        disabled={deletingId === comment.id}
                        onClick={() => cancelDelete(comment.id)}
                      >
                        Cancel
                      </button>
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="os-btn-link os-comment-delete"
                      data-delete={comment.id}
                      aria-label={`Delete the comment by ${comment.author.name}`}
                      onClick={() => setConfirmingId(comment.id)}
                    >
                      Delete
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  };

  return (
    // A group, not a page landmark: several threads can be open at once, all named "Comments".
    <div ref={threadRef} id={id} className="os-comments" role="group" aria-label="Comments">
      {renderThread()}

      {actionError && (
        <div className="os-note os-note-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {actionError}
        </div>
      )}

      <form className="os-comment-form" onSubmit={handleSubmit}>
        <label className="os-label" htmlFor={inputId}>
          Add a comment
        </label>
        <textarea
          id={inputId}
          ref={inputRef}
          className="os-textarea"
          rows={2}
          value={draft}
          aria-invalid={tooLong}
          aria-describedby={footId}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="os-comment-form-foot">
          <span id={footId} className={tooLong ? 'os-field-error' : undefined}>
            {tooLong
              ? `Keep it to ${MAX_COMMENT_LENGTH} characters. You're at ${length}.`
              : `${length} / ${MAX_COMMENT_LENGTH}`}
          </span>
          <button type="submit" className="os-btn os-btn-primary" disabled={!text || tooLong || posting}>
            <Send size={15} aria-hidden="true" />
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {/* Polite live region: tells screen readers that a comment was posted or deleted. */}
      <div className="os-comments-live" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
};
