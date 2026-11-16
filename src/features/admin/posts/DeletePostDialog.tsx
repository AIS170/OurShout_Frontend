// src/features/admin/posts/DeletePostDialog.tsx
// Confirm dialog for deleting a post. It says plainly that deleting is permanent (B3).
// Cancel comes first so it gets initial focus, the safer default.
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShoutoutDto } from '../../../shared/types';
import { ADMIN_NS } from '../i18n';

interface DeletePostDialogProps {
  open: boolean;
  post: ShoutoutDto | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeletePostDialog({ open, post, onConfirm, onClose }: DeletePostDialogProps) {
  const { t } = useTranslation(ADMIN_NS);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setDeleting(true);
    setError('');
    try {
      await onConfirm();
    } catch {
      setError(t('posts.actionError'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog modalType="alert" open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('posts.deleteDialog.title')}</DialogTitle>
          <DialogContent>
            {error && (
              <MessageBar intent="error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}
            {post && t('posts.deleteDialog.body', { id: post.id, sender: post.sender.name })}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              {t('posts.deleteDialog.cancel')}
            </Button>
            <Button appearance="primary" onClick={handleConfirm} disabled={deleting}>
              {t('posts.deleteDialog.confirm')}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
