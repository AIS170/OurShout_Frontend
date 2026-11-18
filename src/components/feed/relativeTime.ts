// "3 days ago" style times for the feed cards.
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
];

const LOCALE = 'en-AU';

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.trunc(seconds / size), unit);
  }
  return formatter.format(0, 'second'); // "now"
}

/** Full date and time, shown as the tooltip on a relative time. */
export function formatFullDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
