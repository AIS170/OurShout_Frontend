import React, { useLayoutEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { EditShoutoutRequest, MAX_TEXT_LENGTH, PrincipleDto, ShoutoutDto } from './feedTypes';
import { recipientsSummary } from './ShoutoutCard';

interface EditShoutoutDialogProps {
  /** The post being edited. The parent remounts the dialog (by key) for each post. */
  shoutout: ShoutoutDto;
  /** ACTIVE principles, in display order. */
  principles: PrincipleDto[];
  /** Saves the changes. Rejects with an Error whose message is shown in the dialog. */
  onSubmit: (body: EditShoutoutRequest) => Promise<void>;
  onClose: () => void;
}

interface FieldErrors {
  reason?: string;
  impact?: string;
  form?: string;
}

const checkText = (value: string, emptyMessage: string): string | undefined => {
  if (!value) return emptyMessage;
  if (value.length > MAX_TEXT_LENGTH) return `Keep this to ${MAX_TEXT_LENGTH} characters or fewer.`;
  return undefined;
};

/**
 * Edit your own shout-out: principle, why, impact and act of kindness. Recipients can't change.
 * Only the fields that changed are sent. These checks are a convenience: the server validates
 * again and has the final say. A native <dialog> gives the focus trap, Escape to close and
 * focus returning to the Edit button for free.
 */
export const EditShoutoutDialog: React.FC<EditShoutoutDialogProps> = ({ shoutout, principles, onSubmit, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const impactRef = useRef<HTMLTextAreaElement>(null);

  const [principleId, setPrincipleId] = useState<number>(shoutout.principle.id);
  const [reason, setReason] = useState<string>(shoutout.reason);
  const [impact, setImpact] = useState<string>(shoutout.impact);
  const [actOfKindness, setActOfKindness] = useState<boolean>(shoutout.actOfKindness);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState<boolean>(false);

  // Open as a modal on mount. Closing in the cleanup (a layout effect, so the dialog is still on
  // the page) lets the browser put focus back on the Edit button that opened it.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  // Fires when Escape closes the dialog. React's StrictMode re-runs the effect above in
  // development, which closes and reopens it; a close event that arrives while it's open is stale.
  const handleNativeClose = () => {
    if (dialogRef.current?.open) return;
    onClose();
  };

  // A post can still carry a principle that has since been retired; keep it selectable as it is.
  const currentIsRetired = !principles.some((principle) => principle.id === shoutout.principle.id);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    const trimmedImpact = impact.trim();

    const next: FieldErrors = {
      reason: checkText(trimmedReason, "Tell us why you're recognising them."),
      impact: checkText(trimmedImpact, 'Tell us what the impact was.'),
    };
    setErrors(next);

    // Move focus to the first error.
    if (next.reason) {
      reasonRef.current?.focus();
      return;
    }
    if (next.impact) {
      impactRef.current?.focus();
      return;
    }

    const body: EditShoutoutRequest = {};
    if (principleId !== shoutout.principle.id) body.principleId = principleId;
    if (trimmedReason !== shoutout.reason) body.reason = trimmedReason;
    if (trimmedImpact !== shoutout.impact) body.impact = trimmedImpact;
    if (actOfKindness !== shoutout.actOfKindness) body.actOfKindness = actOfKindness;
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await onSubmit(body);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "That change didn't save. Try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="os-dialog" aria-labelledby="edit-shoutout-title" onClose={handleNativeClose}>
      <form className="os-dialog-form" onSubmit={handleSubmit} noValidate>
        <h2 id="edit-shoutout-title" className="os-dialog-title">
          Edit your shout-out
        </h2>
        <p className="os-dialog-note">To: {recipientsSummary(shoutout)}. The people you recognised can't be changed.</p>

        {errors.form && (
          <div className="os-note os-note-error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {errors.form}
          </div>
        )}

        <div className="os-field">
          <label className="os-label" htmlFor="edit-principle">
            Which Sandoz way principle are you recognising them for
          </label>
          <select
            id="edit-principle"
            className="os-select"
            value={principleId}
            onChange={(e) => setPrincipleId(Number(e.target.value))}
          >
            {currentIsRetired && <option value={shoutout.principle.id}>{shoutout.principle.name} (retired)</option>}
            {principles.map((principle) => (
              <option key={principle.id} value={principle.id}>
                {principle.name}
              </option>
            ))}
          </select>
        </div>

        <div className="os-field">
          <label className="os-label" htmlFor="edit-reason">
            Why are you recognising them?
          </label>
          <textarea
            id="edit-reason"
            ref={reasonRef}
            className="os-textarea"
            rows={4}
            value={reason}
            aria-invalid={Boolean(errors.reason)}
            aria-describedby="edit-reason-foot"
            onChange={(e) => setReason(e.target.value)}
          />
          <div id="edit-reason-foot" className="os-field-foot">
            <span className="os-field-error">{errors.reason}</span>
            <span>
              {reason.trim().length} / {MAX_TEXT_LENGTH}
            </span>
          </div>
        </div>

        <div className="os-field">
          <label className="os-label" htmlFor="edit-impact">
            What was the impact of their actions or contributions?
          </label>
          <textarea
            id="edit-impact"
            ref={impactRef}
            className="os-textarea"
            rows={4}
            value={impact}
            aria-invalid={Boolean(errors.impact)}
            aria-describedby="edit-impact-foot"
            onChange={(e) => setImpact(e.target.value)}
          />
          <div id="edit-impact-foot" className="os-field-foot">
            <span className="os-field-error">{errors.impact}</span>
            <span>
              {impact.trim().length} / {MAX_TEXT_LENGTH}
            </span>
          </div>
        </div>

        <fieldset className="os-radio-group">
          <legend className="os-label">Would you also like to log this as an act of kindness</legend>
          <div className="os-radio-row">
            <label className="os-radio">
              <input
                type="radio"
                name="edit-kindness"
                checked={actOfKindness}
                onChange={() => setActOfKindness(true)}
              />
              Yes
            </label>
            <label className="os-radio">
              <input
                type="radio"
                name="edit-kindness"
                checked={!actOfKindness}
                onChange={() => setActOfKindness(false)}
              />
              No
            </label>
          </div>
        </fieldset>

        <div className="os-dialog-actions">
          <button type="button" className="os-btn os-btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="os-btn os-btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </dialog>
  );
};
