/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Primitive } from "type-fest";

const separators = /[-_]/g;

function normalizeText(value: Primitive) {
  return String(value).toLowerCase();
}

function stripSeparators(text: string) {
  return text.replace(separators, "");
}

export interface SearchMatcherOptions {
  /**
   * Treat the query as a case-insensitive regular expression. A query that is not a valid
   * expression falls back to the plain substring match.
   */
  regex?: boolean;
}

export function isValidSearchRegex(search: string): boolean {
  try {
    new RegExp(search);

    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a case-insensitive matcher for a search query.
 *
 * In the default (plain) mode the query is a substring. A value also matches when its text
 * with dashes and underscores removed contains the query. Separators in the query stay
 * literal, so `nginxingress` finds `nginx-ingress`, while `nginx-ingress` does not find
 * `nginxingress`.
 *
 * In regex mode the query is a regular expression tested against the value and against the
 * value without separators, so the same separator-insensitivity applies.
 */
export function createSearchMatcher(
  search: string,
  { regex = false }: SearchMatcherOptions = {},
): (value: Primitive) => boolean {
  if (regex && isValidSearchRegex(search)) {
    const pattern = new RegExp(search, "i");

    return (value) => {
      const text = String(value);

      return pattern.test(text) || pattern.test(stripSeparators(text));
    };
  }

  const query = normalizeText(search);

  return (value) => {
    const text = normalizeText(value);

    return text.includes(query) || stripSeparators(text).includes(query);
  };
}
