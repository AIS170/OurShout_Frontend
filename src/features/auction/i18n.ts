// src/features/auction/i18n.ts
// The Auction Table's UI text lives in en/auction.json (no hard-coded UI text).
// The same tiny lookup as features/leaderboard/i18n.ts: dotted paths, {{name}} placeholders and
// _one/_other plurals. If the app adds i18next later, register en/auction.json as the "auction"
// namespace and swap t() for useTranslation().
import en from './en/auction.json';

type Vars = Record<string, string | number>;

function lookup(path: string): unknown {
  return path.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    en,
  );
}

export function t(key: string, vars: Vars = {}): string {
  let text = lookup(key);
  if (typeof vars.count === 'number') {
    const plural = lookup(`${key}_${vars.count === 1 ? 'one' : 'other'}`);
    if (typeof plural === 'string') text = plural;
  }
  if (typeof text !== 'string') return key;
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ''));
}
