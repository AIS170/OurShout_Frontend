import React, { useId, useLayoutEffect, useRef, useState } from 'react';

interface ClampedTextProps {
  label: string;
  text: string;
}

/**
 * A labelled paragraph ("Why: ...") clamped to 3 lines, with a Read more / Show less toggle
 * that only appears when the text really is cut off. Screen readers always get the full text.
 */
export const ClampedText: React.FC<ClampedTextProps> = ({ label, text }) => {
  const id = useId();
  const [expanded, setExpanded] = useState<boolean>(false);
  const [overflows, setOverflows] = useState<boolean>(false);
  const paragraph = useRef<HTMLParagraphElement>(null);

  // Measure while clamped, and again whenever the card changes width.
  useLayoutEffect(() => {
    const el = paragraph.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div>
      <p ref={paragraph} id={id} className={expanded ? 'os-text' : 'os-text os-text-clamped'}>
        <strong>{label}:</strong> {text}
      </p>
      {overflows && (
        <button
          type="button"
          className="os-btn-link"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
};
