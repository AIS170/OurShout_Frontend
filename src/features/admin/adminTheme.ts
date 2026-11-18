// src/features/admin/adminTheme.ts
// Fluent UI theme for the admin area, built on the Sandoz blue (#1c59b5, --sandoz-blue in
// src/index.css) and the app's Futura fonts, so admin pages match the rest of OurShout.
import { createLightTheme, type BrandVariants, type Theme } from '@fluentui/react-components';

// Fluent uses shade 80 as the main brand colour in a light theme: that's the Sandoz blue.
const sandozBrand: BrandVariants = {
  10: '#020814',
  20: '#071a33',
  30: '#0a2850',
  40: '#0c3268',
  50: '#0e3c80',
  60: '#0c3f8c', // --sandoz-blue-hover
  70: '#154d9f',
  80: '#1c59b5', // --sandoz-blue
  90: '#3a6ec0',
  100: '#5583ca',
  110: '#6f98d4',
  120: '#89addd',
  130: '#a3c1e6',
  140: '#bdd5ee',
  150: '#d6e7f6',
  160: '#eef5fc',
};

export const sandozAdminTheme: Theme = {
  ...createLightTheme(sandozBrand),
  fontFamilyBase: "var(--font-text, 'Segoe UI', sans-serif)",
};
