// src/features/admin/posts/ClampedText.tsx
// A labelled paragraph ("Why: …") clamped to 2 lines, with a Show more / Show less toggle
// when the text is long. Screen readers always get the full text.
import { Button, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ADMIN_NS } from '../i18n';

/** Texts longer than this get the toggle (2 lines of a ~70-character column). */
const CLAMP_CHARS = 140;

const useStyles = makeStyles({
  text: {
    margin: 0,
    overflowWrap: 'anywhere',
  },
  clamped: {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflowX: 'hidden',
    overflowY: 'hidden',
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
  },
  toggle: {
    minWidth: 'auto',
    paddingLeft: 0,
    paddingRight: 0,
  },
});

export function ClampedText({ label, text }: { label: string; text: string }) {
  const styles = useStyles();
  const { t } = useTranslation(ADMIN_NS);
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const long = text.length > CLAMP_CHARS;

  return (
    <div>
      <p id={id} className={mergeClasses(styles.text, long && !expanded && styles.clamped)}>
        <span className={styles.label}>{label}:</span> {text}
      </p>
      {long && (
        <Button
          className={styles.toggle}
          appearance="transparent"
          size="small"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((e) => !e)}
        >
          {t(expanded ? 'posts.showLess' : 'posts.showMore')}
        </Button>
      )}
    </div>
  );
}
