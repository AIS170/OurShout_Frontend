// src/features/admin/principles/PrincipleDialog.tsx
// Add/edit dialog for a principle: name and description only.
// Order is changed with the up/down buttons and status with Retire/Restore, on the table.
// These checks are convenience only; the server validates again.
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { PrincipleDto } from '../../../shared/types';
import { ADMIN_NS } from '../i18n';

export interface PrincipleFormValues {
  name: string;
  description: string;
}

interface PrincipleDialogProps {
  open: boolean;
  /** The principle being edited, or null to add a new one. */
  editing: PrincipleDto | null;
  /** Names of the other principles, for the duplicate-name check. */
  otherNames: string[];
  onSubmit: (values: PrincipleFormValues) => Promise<void>;
  onClose: () => void;
}

const useStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
});

export function PrincipleDialog({ open, editing, otherNames, onSubmit, onClose }: PrincipleDialogProps) {
  const styles = useStyles();
  const { t } = useTranslation(ADMIN_NS);
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [errors, setErrors] = useState<{ name?: string; description?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    const next: typeof errors = {};
    if (!trimmedName) {
      next.name = t('principles.dialog.errors.nameRequired');
    } else if (otherNames.some((n) => n.toLowerCase() === trimmedName.toLowerCase())) {
      next.name = t('principles.dialog.errors.nameTaken');
    }
    if (!trimmedDescription) next.description = t('principles.dialog.errors.descriptionRequired');
    setErrors(next);

    // Move focus to the first error.
    if (next.name) return nameRef.current?.focus();
    if (next.description) return descriptionRef.current?.focus();

    setSaving(true);
    try {
      await onSubmit({ name: trimmedName, description: trimmedDescription });
    } catch {
      setErrors({ form: t('principles.actionError') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody>
            <DialogTitle>
              {t(editing ? 'principles.dialog.editTitle' : 'principles.dialog.createTitle')}
            </DialogTitle>
            <DialogContent className={styles.content}>
              {errors.form && (
                <MessageBar intent="error">
                  <MessageBarBody>{errors.form}</MessageBarBody>
                </MessageBar>
              )}
              <Field
                label={t('principles.dialog.name')}
                required
                validationState={errors.name ? 'error' : 'none'}
                validationMessage={errors.name}
              >
                <Input ref={nameRef} value={name} onChange={(_, data) => setName(data.value)} />
              </Field>
              <Field
                label={t('principles.dialog.description')}
                required
                validationState={errors.description ? 'error' : 'none'}
                validationMessage={errors.description}
              >
                <Textarea
                  ref={descriptionRef}
                  value={description}
                  onChange={(_, data) => setDescription(data.value)}
                  resize="vertical"
                  rows={4}
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onClose}>
                {t('principles.dialog.cancel')}
              </Button>
              <Button appearance="primary" type="submit" disabled={saving}>
                {t('principles.dialog.save')}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
