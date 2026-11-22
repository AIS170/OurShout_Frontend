// src/features/admin/auctions/AuctionsAdminPage.tsx
// /admin/auctions ("Add auction item"): a form to list an item (name, description, picture,
// starting bid, bid start and end date/time) and a table of everything listed so far.
// An item shows on the Auction Table as soon as it's added; people can bid once its start time
// passes. An item can be removed only while nobody has bid on it.
// The server enforces the rules (admin only, valid times, picture type and size, no bids).
import {
  Badge,
  Body1,
  Button,
  Caption1,
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
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Textarea,
  Title1,
  tokens,
  typographyStyles,
  type BadgeProps,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuctionItemDto, AuctionStatus } from '../../auction/auctionTypes';
import { AdminApiError } from '../adminApi';
import { useAdminAuctions } from '../adminData';
import { ADMIN_NS } from '../i18n';

const MAX_NAME = 80;
const MAX_DESCRIPTION = 500;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_COLOR: Record<AuctionStatus, BadgeProps['color']> = {
  LIVE: 'success',
  UPCOMING: 'informative',
  ENDED: 'subtle',
};

/** A Date as the value of <input type="datetime-local">: local time, to the minute. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface FormState {
  name: string;
  description: string;
  startingBid: string;
  startsAt: string; // datetime-local values (the admin's own time zone)
  endsAt: string;
}

type FormErrors = Partial<Record<keyof FormState | 'image', string>>;

const emptyForm = (): FormState => {
  const now = new Date();
  return {
    name: '',
    description: '',
    startingBid: '',
    startsAt: toLocalInput(now),
    endsAt: toLocalInput(new Date(now.getTime() + 7 * DAY_MS)),
  };
};

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalXL,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    maxWidth: '760px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalL,
    '@media (max-width: 720px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  imageRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalM },
  preview: {
    width: '120px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  submit: { alignSelf: 'flex-start' },
  listTitle: { ...typographyStyles.subtitle1, margin: 0 },
  tableWrap: { overflowX: 'auto' },
  table: { minWidth: '900px' },
  itemCell: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, minWidth: 0 },
  thumb: { width: '48px', height: '32px', objectFit: 'cover', borderRadius: tokens.borderRadiusSmall, flexShrink: 0 },
  bidCol: { width: '120px' },
  statusCol: { width: '130px' },
  actionsCol: { width: '130px' },
  num: { fontVariantNumeric: 'tabular-nums' },
  cellStack: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  muted: { color: tokens.colorNeutralForeground3 },
});

export function AuctionsAdminPage() {
  const styles = useStyles();
  const { t, i18n } = useTranslation(ADMIN_NS);
  const { data: items, isLoading, error, createItem, removeItem } = useAdminAuctions();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [removing, setRemoving] = useState<AuctionItemDto | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const dateTime = new Intl.DateTimeFormat(i18n.language || 'en-AU', { dateStyle: 'medium', timeStyle: 'short' });
  const set = (field: keyof FormState) => (_: unknown, data: { value: string }) => {
    setForm((f) => ({ ...f, [field]: data.value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setErrors((e) => ({ ...e, image: undefined }));
    if (!file) {
      setImage(null);
      return;
    }
    const problem = !IMAGE_TYPES.includes(file.type)
      ? t('auctions.errors.imageType')
      : file.size > MAX_IMAGE_BYTES
        ? t('auctions.errors.imageSize')
        : '';
    if (problem) {
      setImage(null);
      setErrors((e) => ({ ...e, image: problem }));
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage({ dataUrl: String(reader.result), name: file.name });
    reader.onerror = () => setErrors((e) => ({ ...e, image: t('auctions.errors.imageRead') }));
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImage(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  function validate(): FormErrors {
    const found: FormErrors = {};
    const bid = Number(form.startingBid);
    const start = new Date(form.startsAt).getTime();
    const end = new Date(form.endsAt).getTime();
    if (!form.name.trim()) found.name = t('auctions.errors.name');
    if (!form.startingBid.trim() || !Number.isInteger(bid) || bid < 1) found.startingBid = t('auctions.errors.startingBid');
    if (Number.isNaN(start)) found.startsAt = t('auctions.errors.startsAt');
    if (Number.isNaN(end)) found.endsAt = t('auctions.errors.endsAt');
    else if (!Number.isNaN(start) && end <= start) found.endsAt = t('auctions.errors.endBeforeStart');
    else if (end <= Date.now()) found.endsAt = t('auctions.errors.endInPast');
    return found;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const found = validate();
    setErrors((e) => ({ ...found, image: e.image }));
    setAnnouncement('');
    setSaveError('');
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const created = await createItem({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startingBid: Number(form.startingBid),
        // datetime-local is the admin's local time; the API takes UTC.
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        imageBase64: image?.dataUrl,
      });
      setAnnouncement(t(`auctions.announce.${created.status}`, { name: created.name }));
      setForm(emptyForm());
      clearImage();
      nameInput.current?.focus();
    } catch (err) {
      // The server's message names the field that's wrong.
      setSaveError(err instanceof AdminApiError && err.status === 400 ? err.message : t('auctions.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!removing || removeBusy) return;
    setRemoveBusy(true);
    setRemoveError('');
    try {
      await removeItem(removing.id);
      setAnnouncement(t('auctions.announce.removed', { name: removing.name }));
      setRemoving(null);
    } catch (err) {
      setRemoveError(err instanceof AdminApiError && err.status === 409 ? t('auctions.remove.hasBids') : t('auctions.remove.error'));
    } finally {
      setRemoveBusy(false);
    }
  }

  function renderRow(item: AuctionItemDto) {
    return (
      <TableRow key={item.id}>
        <TableCell>
          <span className={styles.itemCell}>
            {item.imageUrl && <img className={styles.thumb} src={item.imageUrl} alt="" />}
            <span>{item.name}</span>
          </span>
        </TableCell>
        <TableCell className={styles.num}>{t('auctions.points', { count: item.startingBid })}</TableCell>
        <TableCell>
          <time dateTime={item.startsAt}>{dateTime.format(new Date(item.startsAt))}</time>
        </TableCell>
        <TableCell>
          <time dateTime={item.endsAt}>{dateTime.format(new Date(item.endsAt))}</time>
        </TableCell>
        <TableCell>
          <Badge appearance="tint" color={STATUS_COLOR[item.status]}>
            {t(`auctions.status.${item.status}`)}
          </Badge>
        </TableCell>
        <TableCell>
          {item.currentBidder && item.currentBid !== null ? (
            <span className={styles.cellStack}>
              <span className={styles.num}>{t('auctions.points', { count: item.currentBid })}</span>
              <Caption1 className={styles.muted}>
                {t(item.status === 'ENDED' ? 'auctions.wonBy' : 'auctions.ledBy', { name: item.currentBidder.name })}
              </Caption1>
            </span>
          ) : (
            <Caption1 className={styles.muted}>{t('auctions.noBids')}</Caption1>
          )}
        </TableCell>
        <TableCell>
          {item.bidCount === 0 ? (
            <Button
              size="small"
              icon={<DeleteRegular />}
              aria-label={t('auctions.remove.label', { name: item.name })}
              onClick={() => {
                setRemoveError('');
                setRemoving(item);
              }}
            >
              {t('auctions.remove.button')}
            </Button>
          ) : (
            <Caption1 className={styles.muted}>{t('auctions.remove.locked')}</Caption1>
          )}
        </TableCell>
      </TableRow>
    );
  }

  function renderList() {
    if (isLoading) return <Spinner label={t('auctions.loading')} />;
    if (error || !items) {
      return (
        <MessageBar intent="error">
          <MessageBarBody>{t('auctions.loadError')}</MessageBarBody>
        </MessageBar>
      );
    }
    if (items.length === 0) return <Body1 as="p">{t('auctions.empty')}</Body1>;
    return (
      <div className={styles.tableWrap}>
        <Table aria-labelledby="auction-list-title" className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{t('auctions.col.item')}</TableHeaderCell>
              <TableHeaderCell className={styles.bidCol}>{t('auctions.col.startingBid')}</TableHeaderCell>
              <TableHeaderCell>{t('auctions.col.opens')}</TableHeaderCell>
              <TableHeaderCell>{t('auctions.col.closes')}</TableHeaderCell>
              <TableHeaderCell className={styles.statusCol}>{t('auctions.col.status')}</TableHeaderCell>
              <TableHeaderCell>{t('auctions.col.currentBid')}</TableHeaderCell>
              <TableHeaderCell className={styles.actionsCol}>{t('auctions.col.actions')}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>{items.map(renderRow)}</TableBody>
        </Table>
      </div>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="auctions-title">
      <Title1 as="h1" id="auctions-title">
        {t('auctions.title')}
      </Title1>
      <Body1 as="p">{t('auctions.intro')}</Body1>

      <form className={styles.card} onSubmit={submit} noValidate aria-labelledby="auctions-title">
        <Field
          label={t('auctions.fields.name')}
          required
          validationState={errors.name ? 'error' : 'none'}
          validationMessage={errors.name}
        >
          <Input ref={nameInput} value={form.name} maxLength={MAX_NAME} onChange={set('name')} />
        </Field>
        <Field label={t('auctions.fields.description')} hint={t('auctions.fields.descriptionHint', { max: MAX_DESCRIPTION })}>
          <Textarea value={form.description} maxLength={MAX_DESCRIPTION} rows={3} onChange={set('description')} />
        </Field>
        <Field
          label={t('auctions.fields.image')}
          hint={t('auctions.fields.imageHint')}
          validationState={errors.image ? 'error' : 'none'}
          validationMessage={errors.image}
        >
          <div className={styles.imageRow}>
            <input ref={fileInput} type="file" accept={IMAGE_TYPES.join(',')} aria-label={t('auctions.fields.image')} onChange={pickImage} />
            {image && (
              <>
                <img className={styles.preview} src={image.dataUrl} alt={t('auctions.fields.imagePreview', { name: image.name })} />
                <Button size="small" onClick={clearImage}>
                  {t('auctions.fields.imageRemove')}
                </Button>
              </>
            )}
          </div>
        </Field>

        <div className={styles.row}>
          <Field
            label={t('auctions.fields.startingBid')}
            required
            validationState={errors.startingBid ? 'error' : 'none'}
            validationMessage={errors.startingBid}
          >
            <Input type="number" min={1} step={1} inputMode="numeric" value={form.startingBid} contentAfter={t('auctions.fields.pts')} onChange={set('startingBid')} />
          </Field>
          <Field
            label={t('auctions.fields.startsAt')}
            required
            validationState={errors.startsAt ? 'error' : 'none'}
            validationMessage={errors.startsAt}
          >
            <Input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
          </Field>
          <Field
            label={t('auctions.fields.endsAt')}
            required
            validationState={errors.endsAt ? 'error' : 'none'}
            validationMessage={errors.endsAt}
          >
            <Input type="datetime-local" value={form.endsAt} min={form.startsAt || undefined} onChange={set('endsAt')} />
          </Field>
        </div>
        <Caption1 className={styles.muted}>{t('auctions.fields.timeNote')}</Caption1>

        {saveError && (
          <MessageBar intent="error">
            <MessageBarBody>{saveError}</MessageBarBody>
          </MessageBar>
        )}
        <Button className={styles.submit} type="submit" appearance="primary" icon={<AddRegular />} disabled={saving}>
          {t(saving ? 'auctions.saving' : 'auctions.submit')}
        </Button>
      </form>

      <div role="status" aria-live="polite">
        {announcement && (
          <MessageBar intent="success">
            <MessageBarBody>{announcement}</MessageBarBody>
          </MessageBar>
        )}
      </div>

      <h2 id="auction-list-title" className={styles.listTitle}>
        {t('auctions.listTitle')}
      </h2>
      {renderList()}

      <Dialog modalType="alert" open={removing !== null} onOpenChange={(_, data) => !data.open && setRemoving(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('auctions.remove.title')}</DialogTitle>
            <DialogContent>
              {removeError && (
                <MessageBar intent="error">
                  <MessageBarBody>{removeError}</MessageBarBody>
                </MessageBar>
              )}
              {removing && t('auctions.remove.body', { name: removing.name })}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setRemoving(null)}>
                {t('auctions.remove.cancel')}
              </Button>
              <Button appearance="primary" onClick={() => void confirmRemove()} disabled={removeBusy}>
                {t('auctions.remove.confirm')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </section>
  );
}
