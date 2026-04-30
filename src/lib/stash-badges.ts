export const DEFAULT_STASH_BADGE_KEY = 'record';

export const STASH_BADGES = [
  { key: 'record', label: 'Record', symbol: '◎', tone: 'amber' },
  { key: 'bolt', label: 'Bolt', symbol: '⚡', tone: 'red' },
  { key: 'sun', label: 'Sun', symbol: '☼', tone: 'gold' },
  { key: 'moon', label: 'Moon', symbol: '☾', tone: 'teal' },
  { key: 'star', label: 'Star', symbol: '✦', tone: 'indigo' },
  { key: 'rose', label: 'Rose', symbol: '✿', tone: 'rose' },
  { key: 'heart', label: 'Heart', symbol: '♥', tone: 'crimson' },
  { key: 'leaf', label: 'Leaf', symbol: '❋', tone: 'green' }
] as const;

export type StashBadgeKey = (typeof STASH_BADGES)[number]['key'];

export function isStashBadgeKey(value: string): value is StashBadgeKey {
  return STASH_BADGES.some((badge) => badge.key === value);
}

export function getStashBadge(key: string | null | undefined) {
  return STASH_BADGES.find((badge) => badge.key === key) ?? STASH_BADGES[0];
}
