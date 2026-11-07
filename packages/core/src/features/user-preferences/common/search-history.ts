/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/** A search text the user committed to, with how often and when it was last used. */
export interface SearchHistoryEntry {
  text: string;
  /** How many times the text was searched for. */
  count: number;
  /** Epoch milliseconds of the last use. */
  lastUsed: number;
}

/** The most entries kept. When it is exceeded, the least valuable one is dropped. */
export const SEARCH_HISTORY_LIMIT = 30;

/** Texts shorter than this are not worth remembering. */
export const SEARCH_HISTORY_MIN_LENGTH = 2;

/** Longer texts are pasted blobs rather than searches. */
export const SEARCH_HISTORY_MAX_LENGTH = 200;

/** An entry has to be used this many times to be listed as frequent. */
export const SEARCH_HISTORY_FREQUENT_MIN_COUNT = 2;

/** How many entries the frequent group lists at most. */
export const SEARCH_HISTORY_FREQUENT_LIMIT = 3;

/**
 * A text typed on from a shorter one that was recorded this recently replaces it,
 * so a search typed slowly does not leave its prefixes behind.
 */
const REFINEMENT_WINDOW_MS = 10_000;

const isValidEntry = (value: unknown): value is SearchHistoryEntry => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { text, count, lastUsed } = value as Partial<SearchHistoryEntry>;

  return (
    typeof text === "string" &&
    text.length > 0 &&
    typeof count === "number" &&
    Number.isFinite(count) &&
    count > 0 &&
    typeof lastUsed === "number" &&
    Number.isFinite(lastUsed)
  );
};

/** Drops what a hand-edited or older preferences file could hold that is not an entry, and applies the limit. */
export const sanitizeSearchHistory = (value: unknown): SearchHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const entries: SearchHistoryEntry[] = [];

  for (const item of value) {
    if (isValidEntry(item) && !seen.has(item.text)) {
      seen.add(item.text);
      entries.push({ text: item.text, count: Math.floor(item.count) || 1, lastUsed: item.lastUsed });
    }
  }

  return trimToLimit(entries);
};

/** Keeps the entries that are most frequent, the most recent among equals, and drops the rest. */
const trimToLimit = (entries: SearchHistoryEntry[], limit = SEARCH_HISTORY_LIMIT): SearchHistoryEntry[] => {
  if (entries.length <= limit) {
    return entries;
  }

  return [...entries]
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit)
    .sort((a, b) => b.lastUsed - a.lastUsed);
};

/** Returns the history with `text` recorded as searched for at `now`. */
export const recordSearch = (
  entries: readonly SearchHistoryEntry[],
  text: string,
  now: number = Date.now(),
): SearchHistoryEntry[] => {
  const value = text.trim();

  if (value.length < SEARCH_HISTORY_MIN_LENGTH || value.length > SEARCH_HISTORY_MAX_LENGTH) {
    return [...entries];
  }

  const existing = entries.find((entry) => entry.text === value);

  if (existing) {
    return [
      { ...existing, count: existing.count + 1, lastUsed: now },
      ...entries.filter((entry) => entry !== existing),
    ];
  }

  const latest = entries.reduce<SearchHistoryEntry | undefined>(
    (latest, entry) => (!latest || entry.lastUsed > latest.lastUsed ? entry : latest),
    undefined,
  );
  const isRefinement =
    latest !== undefined &&
    latest.count === 1 &&
    now - latest.lastUsed < REFINEMENT_WINDOW_MS &&
    value.toLowerCase().startsWith(latest.text.toLowerCase());
  const rest = isRefinement ? entries.filter((entry) => entry !== latest) : [...entries];

  // The text just searched for is always kept: only the older entries compete for the rest.
  return [{ text: value, count: 1, lastUsed: now }, ...trimToLimit(rest, SEARCH_HISTORY_LIMIT - 1)];
};

/** Returns the history without `text`. */
export const removeSearch = (entries: readonly SearchHistoryEntry[], text: string): SearchHistoryEntry[] =>
  entries.filter((entry) => entry.text !== text);

/** The entries the user searches for most, the most used first, which are worth listing apart. */
export const getFrequentSearches = (entries: readonly SearchHistoryEntry[]): SearchHistoryEntry[] =>
  entries
    .filter((entry) => entry.count >= SEARCH_HISTORY_FREQUENT_MIN_COUNT)
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, SEARCH_HISTORY_FREQUENT_LIMIT);

/** The entries from the latest to the oldest, without those in `exclude`. */
export const getRecentSearches = (
  entries: readonly SearchHistoryEntry[],
  exclude: readonly SearchHistoryEntry[] = [],
): SearchHistoryEntry[] => entries.filter((entry) => !exclude.includes(entry)).sort((a, b) => b.lastUsed - a.lastUsed);
