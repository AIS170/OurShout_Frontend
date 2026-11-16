// src/features/admin/principles/PrinciplesPage.tsx
// /admin/principles (requirement 9): every principle, ACTIVE and RETIRED, with add/edit,
// up/down reordering and Retire/Restore. Every change is audited on the server.
import {
  Badge,
  Body1,
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Title1,
  tokens,
} from '@fluentui/react-components';
import { AddRegular, ArrowDownRegular, ArrowUpRegular, EditRegular } from '@fluentui/react-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PrincipleDto } from '../../../shared/types';
import { usePrinciplesAdmin } from '../adminData';
import { ADMIN_NS } from '../i18n';
import { PrincipleDialog, type PrincipleFormValues } from './PrincipleDialog';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  // Wide tables scroll inside this box, never the page.
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    minWidth: '640px',
  },
  orderCol: { width: '72px' },
  statusCol: { width: '110px' },
  actionsCol: { width: '260px' },
  description: {
    color: tokens.colorNeutralForeground2,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
  },
});

type DialogState = { open: boolean; key: number; editing: PrincipleDto | null };
type Direction = 'up' | 'down';

export function PrinciplesPage() {
  const styles = useStyles();
  const { t } = useTranslation(ADMIN_NS);
  const { data: principles, isLoading, error, createPrinciple, updatePrinciple } = usePrinciplesAdmin();

  const [dialog, setDialog] = useState<DialogState>({ open: false, key: 0, editing: null });
  const [announcement, setAnnouncement] = useState('');
  const [actionError, setActionError] = useState('');
  const busy = useRef(false);

  // After a reorder the row moves in the DOM, so put focus back on its arrow button.
  const arrowRefs = useRef(new Map<string, HTMLButtonElement>());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  useEffect(() => {
    if (!focusKey) return;
    arrowRefs.current.get(focusKey)?.focus();
    setFocusKey(null);
  }, [focusKey, principles]);

  async function run(action: () => Promise<string>) {
    if (busy.current) return;
    busy.current = true;
    setActionError('');
    try {
      setAnnouncement(await action());
    } catch {
      setAnnouncement('');
      setActionError(t('principles.actionError'));
    } finally {
      busy.current = false;
    }
  }

  function move(list: PrincipleDto[], index: number, direction: Direction) {
    const current = list[index];
    const neighbour = list[direction === 'up' ? index - 1 : index + 1];
    if (!current || !neighbour) return;
    void run(async () => {
      // Swap the two display orders: two PATCH calls once the API is connected.
      await updatePrinciple(current.id, { displayOrder: neighbour.displayOrder });
      await updatePrinciple(neighbour.id, { displayOrder: current.displayOrder });
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const atEdge = newIndex === 0 || newIndex === list.length - 1;
      // At the top or bottom the same arrow is now disabled, so focus the other one.
      const focusDirection: Direction = atEdge ? (direction === 'up' ? 'down' : 'up') : direction;
      setFocusKey(`${current.id}-${focusDirection}`);
      return t(direction === 'up' ? 'principles.announce.movedUp' : 'principles.announce.movedDown', {
        name: current.name,
      });
    });
  }

  function toggleStatus(principle: PrincipleDto) {
    const retiring = principle.status === 'ACTIVE';
    void run(async () => {
      await updatePrinciple(principle.id, { status: retiring ? 'RETIRED' : 'ACTIVE' });
      return t(retiring ? 'principles.announce.retired' : 'principles.announce.restored', {
        name: principle.name,
      });
    });
  }

  async function handleDialogSubmit(values: PrincipleFormValues) {
    const editing = dialog.editing;
    if (editing) {
      await updatePrinciple(editing.id, values);
    } else {
      const displayOrder = Math.max(0, ...(principles ?? []).map((p) => p.displayOrder)) + 1;
      await createPrinciple({ ...values, displayOrder });
    }
    setDialog((d) => ({ ...d, open: false }));
    setActionError('');
    setAnnouncement(
      t(editing ? 'principles.announce.updated' : 'principles.announce.created', { name: values.name }),
    );
  }

  const openDialog = (editing: PrincipleDto | null) =>
    setDialog((d) => ({ open: true, key: d.key + 1, editing }));

  const setArrowRef = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) arrowRefs.current.set(key, el);
    else arrowRefs.current.delete(key);
  };

  function renderBody() {
    if (isLoading) return <Spinner label={t('principles.loading')} />;
    if (error || !principles) {
      return (
        <MessageBar intent="error">
          <MessageBarBody>{t('principles.loadError')}</MessageBarBody>
        </MessageBar>
      );
    }
    if (principles.length === 0) return <Body1 as="p">{t('principles.empty')}</Body1>;

    return (
      <div className={styles.tableWrap}>
        <Table aria-label={t('principles.tableLabel')} className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell className={styles.orderCol}>{t('principles.col.order')}</TableHeaderCell>
              <TableHeaderCell>{t('principles.col.name')}</TableHeaderCell>
              <TableHeaderCell>{t('principles.col.description')}</TableHeaderCell>
              <TableHeaderCell className={styles.statusCol}>{t('principles.col.status')}</TableHeaderCell>
              <TableHeaderCell className={styles.actionsCol}>{t('principles.col.actions')}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {principles.map((p, index) => {
              const retired = p.status === 'RETIRED';
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.displayOrder}</TableCell>
                  <TableCell>
                    <strong>{p.name}</strong>
                  </TableCell>
                  <TableCell className={styles.description}>{p.description}</TableCell>
                  <TableCell>
                    <Badge appearance="tint" color={retired ? 'subtle' : 'success'}>
                      {t(`principles.status.${p.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={styles.actions}>
                      <Button
                        ref={setArrowRef(`${p.id}-up`)}
                        size="small"
                        icon={<ArrowUpRegular />}
                        aria-label={t('principles.actions.moveUp', { name: p.name })}
                        disabled={index === 0}
                        onClick={() => move(principles, index, 'up')}
                      />
                      <Button
                        ref={setArrowRef(`${p.id}-down`)}
                        size="small"
                        icon={<ArrowDownRegular />}
                        aria-label={t('principles.actions.moveDown', { name: p.name })}
                        disabled={index === principles.length - 1}
                        onClick={() => move(principles, index, 'down')}
                      />
                      <Button
                        size="small"
                        icon={<EditRegular />}
                        aria-label={t('principles.actions.editLabel', { name: p.name })}
                        onClick={() => openDialog(p)}
                      >
                        {t('principles.actions.edit')}
                      </Button>
                      <Button
                        size="small"
                        aria-label={t(
                          retired ? 'principles.actions.restoreLabel' : 'principles.actions.retireLabel',
                          { name: p.name },
                        )}
                        onClick={() => toggleStatus(p)}
                      >
                        {t(retired ? 'principles.actions.restore' : 'principles.actions.retire')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="principles-title">
      <div className={styles.header}>
        <Title1 as="h1" id="principles-title">
          {t('principles.title')}
        </Title1>
        <Button appearance="primary" icon={<AddRegular />} onClick={() => openDialog(null)}>
          {t('principles.add')}
        </Button>
      </div>
      <Body1 as="p">{t('principles.intro')}</Body1>

      {/* Polite live region: announces each change to screen readers and shows it on screen. */}
      <div role="status" aria-live="polite">
        {announcement && (
          <MessageBar intent="success">
            <MessageBarBody>{announcement}</MessageBarBody>
          </MessageBar>
        )}
      </div>
      {actionError && (
        <MessageBar intent="error">
          <MessageBarBody>{actionError}</MessageBarBody>
        </MessageBar>
      )}

      {renderBody()}

      <PrincipleDialog
        key={dialog.key}
        open={dialog.open}
        editing={dialog.editing}
        otherNames={(principles ?? []).filter((p) => p.id !== dialog.editing?.id).map((p) => p.name)}
        onSubmit={handleDialogSubmit}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
      />
    </section>
  );
}
