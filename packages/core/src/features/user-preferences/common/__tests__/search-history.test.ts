/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import {
  getFrequentSearches,
  getRecentSearches,
  recordSearch,
  removeSearch,
  SEARCH_HISTORY_LIMIT,
  sanitizeSearchHistory,
} from "../search-history";

import type { SearchHistoryEntry } from "../search-history";

const entry = (text: string, count = 1, lastUsed = 0): SearchHistoryEntry => ({ text, count, lastUsed });

describe("recordSearch", () => {
  it("adds a new text first, with a count of one", () => {
    expect(recordSearch([entry("nginx", 1, 1000)], "redis", 50_000)).toEqual([
      entry("redis", 1, 50_000),
      entry("nginx", 1, 1000),
    ]);
  });

  it("trims the text", () => {
    expect(recordSearch([], "  redis ", 1)).toEqual([entry("redis", 1, 1)]);
  });

  it("ignores texts that are too short or too long to be a search", () => {
    expect(recordSearch([], "a", 1)).toEqual([]);
    expect(recordSearch([], "   ", 1)).toEqual([]);
    expect(recordSearch([], "x".repeat(201), 1)).toEqual([]);
  });

  it("counts a repeated text once more and moves it to the top", () => {
    const history = [entry("redis", 1, 2000), entry("nginx", 3, 1000)];

    expect(recordSearch(history, "nginx", 90_000)).toEqual([entry("nginx", 4, 90_000), entry("redis", 1, 2000)]);
  });

  it("does not change the history it is given", () => {
    const history = [entry("redis", 1, 2000)];

    recordSearch(history, "redis", 90_000);

    expect(history).toEqual([entry("redis", 1, 2000)]);
  });

  it("replaces a text that is extended soon after, so typing does not leave prefixes behind", () => {
    const history = [entry("ngi", 1, 10_000), entry("redis", 2, 1000)];

    expect(recordSearch(history, "nginx", 12_000)).toEqual([entry("nginx", 1, 12_000), entry("redis", 2, 1000)]);
  });

  it("keeps a text that is extended long after, or that was used more than once", () => {
    expect(recordSearch([entry("ngi", 1, 10_000)], "nginx", 60_000)).toHaveLength(2);
    expect(recordSearch([entry("ngi", 2, 10_000)], "nginx", 12_000)).toHaveLength(2);
  });

  it("drops the least used, oldest entry when the limit is exceeded", () => {
    const history = Array.from({ length: SEARCH_HISTORY_LIMIT }, (_, index) =>
      entry(`search-${index}`, index === 0 ? 1 : 5, 1000 + index),
    );
    const result = recordSearch(history, "brand-new", 99_000);

    expect(result).toHaveLength(SEARCH_HISTORY_LIMIT);
    expect(result[0]).toEqual(entry("brand-new", 1, 99_000));
    expect(result.some((item) => item.text === "search-0")).toBe(false);
  });

  it("keeps the text just searched for even when every other entry is used more", () => {
    const history = Array.from({ length: SEARCH_HISTORY_LIMIT }, (_, index) => entry(`search-${index}`, 9, index));

    expect(recordSearch(history, "brand-new", 99_000)[0].text).toBe("brand-new");
  });
});

describe("removeSearch", () => {
  it("removes the text", () => {
    expect(removeSearch([entry("redis"), entry("nginx")], "redis")).toEqual([entry("nginx")]);
  });
});

describe("getFrequentSearches", () => {
  it("lists the entries used more than once, the most used first, at most three", () => {
    const history = [entry("a1", 1), entry("b2", 2, 5), entry("c9", 9), entry("d3", 3), entry("e2", 2, 9)];

    expect(getFrequentSearches(history).map((item) => item.text)).toEqual(["c9", "d3", "e2"]);
  });

  it("is empty when nothing was used more than once", () => {
    expect(getFrequentSearches([entry("a1"), entry("b1")])).toEqual([]);
  });
});

describe("getRecentSearches", () => {
  it("lists the latest first, without the excluded entries", () => {
    const old = entry("old", 1, 1);
    const frequent = entry("frequent", 5, 2);
    const latest = entry("latest", 1, 3);

    expect(getRecentSearches([old, frequent, latest], [frequent])).toEqual([latest, old]);
  });
});

describe("sanitizeSearchHistory", () => {
  it("accepts only an array of valid entries without repeated texts", () => {
    expect(sanitizeSearchHistory(undefined)).toEqual([]);
    expect(sanitizeSearchHistory("nginx")).toEqual([]);
    expect(
      sanitizeSearchHistory([
        entry("nginx", 2, 5),
        entry("nginx", 7, 9),
        { text: "", count: 1, lastUsed: 1 },
        { text: "bad", count: "1", lastUsed: 1 },
        { text: "negative", count: -1, lastUsed: 1 },
        null,
        42,
      ]),
    ).toEqual([entry("nginx", 2, 5)]);
  });

  it("applies the limit", () => {
    const entries = Array.from({ length: SEARCH_HISTORY_LIMIT + 5 }, (_, index) => entry(`search-${index}`, 1, index));

    expect(sanitizeSearchHistory(entries)).toHaveLength(SEARCH_HISTORY_LIMIT);
  });
});
