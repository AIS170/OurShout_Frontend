/**
 * The picture for each Sandoz Way value, keyed by principle id (ids 1 to 5 in the seed).
 * The files live in public/values. To change one, replace the file, or drop a new one in that
 * folder and change its path here. Cards show the whole picture, whatever its shape (see
 * .os-card-media in feed.css), so nothing needs cropping by hand.
 */
const VALUE_IMAGES: Record<number, string> = {
  1: '/values/value-1.jpg', // We Think Sandoz
  2: '/values/value-2.jpg', // We are passionate about performance
  3: '/values/value-3.jpg', // We seek and create clarity (the two panels side by side)
  4: '/values/value-4.jpg', // We decide smart, do simple
  5: '/values/value-5.jpg', // We develop each other
};

/** The value's picture, or null when it has none (a retired or not-yet-chosen principle). */
export const valueImage = (principleId: number): string | null => VALUE_IMAGES[principleId] ?? null;
