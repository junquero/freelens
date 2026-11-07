/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { createSearchMatcher, isValidSearchRegex } from "../search-matcher";

describe("createSearchMatcher", () => {
  it("matches a substring regardless of case", () => {
    expect(createSearchMatcher("Ingress-Con")("nginx-ingress-controller")).toBe(true);
  });

  it("matches a value with dashes when the query has none", () => {
    expect(createSearchMatcher("nginxingress")("nginx-ingress-7d9f8")).toBe(true);
  });

  it("matches dashes in the query literally", () => {
    const matchesSearch = createSearchMatcher("nginx-ingress");

    expect(matchesSearch("nginx-ingress-7d9f8")).toBe(true);
    expect(matchesSearch("nginxingress-7d9f8")).toBe(false);
  });

  it("matches a value with underscores when the query has none", () => {
    expect(createSearchMatcher("nginxingress")("nginx_ingress_controller")).toBe(true);
  });

  it("matches underscores in the query literally", () => {
    const matchesSearch = createSearchMatcher("nginx_ingress");

    expect(matchesSearch("nginx_ingress_controller")).toBe(true);
    expect(matchesSearch("nginx-ingress-controller")).toBe(false);
    expect(matchesSearch("nginxingress-controller")).toBe(false);
  });

  it.each([
    ["-0", "database-0", "database0"],
    ["-v2", "service-v2", "servicev2"],
    ["nginx-", "nginx-controller", "nginxcontroller"],
    ["_0", "database_0", "database0"],
    ["_v2", "service_v2", "servicev2"],
    ["nginx_", "nginx_controller", "nginxcontroller"],
  ])("preserves leading or trailing separators in query %s", (query, literalMatch, nonLiteralMatch) => {
    const matchesSearch = createSearchMatcher(query);

    expect(matchesSearch(literalMatch)).toBe(true);
    expect(matchesSearch(nonLiteralMatch)).toBe(false);
  });

  it("matches non-string values", () => {
    expect(createSearchMatcher("80")(8080)).toBe(true);
  });

  it.each(["-", "_", "-_"])("matches the separator-only query %s literally", (query) => {
    const matchesSearch = createSearchMatcher(query);

    expect(matchesSearch(`nginx${query}ingress`)).toBe(true);
    expect(matchesSearch("nginxingress")).toBe(false);
  });

  it("does not match a value missing the query", () => {
    expect(createSearchMatcher("nginx-ingress")("nginx-gateway")).toBe(false);
  });

  describe("regex mode", () => {
    it("treats the query as a regular expression", () => {
      const matchesSearch = createSearchMatcher("^nginx-.*-7d9f8$", { regex: true });

      expect(matchesSearch("nginx-ingress-7d9f8")).toBe(true);
      expect(matchesSearch("my-nginx-ingress-7d9f8")).toBe(false);
    });

    it("matches case-insensitively", () => {
      expect(createSearchMatcher("INGRESS-\\d", { regex: true })("nginx-ingress-2")).toBe(true);
    });

    it("keeps the separator-insensitive match", () => {
      expect(createSearchMatcher("nginxingress$", { regex: true })("nginx-ingress")).toBe(true);
    });

    it("treats dots and parentheses as regex syntax", () => {
      expect(createSearchMatcher("nginx.ingress", { regex: true })("nginx-ingress")).toBe(true);
      expect(createSearchMatcher("nginx\\.ingress", { regex: true })("nginx-ingress")).toBe(false);
      expect(createSearchMatcher("(ingress|gateway)", { regex: true })("nginx-gateway")).toBe(true);
    });

    it.each(["[", "(unclosed", "*bad", "a{2,1}"])("falls back to a plain substring for invalid %s", (query) => {
      const matchesSearch = createSearchMatcher(query, { regex: true });

      expect(matchesSearch(`prefix-${query}-suffix`)).toBe(true);
      expect(matchesSearch("nginx-ingress")).toBe(false);
    });

    it("keeps the plain substring behaviour when regex mode is off", () => {
      expect(createSearchMatcher("nginx.ingress")("nginx-ingress")).toBe(false);
      expect(createSearchMatcher("nginx.ingress", { regex: false })("nginx.ingress")).toBe(true);
    });
  });
});

describe("isValidSearchRegex", () => {
  it("accepts valid expressions", () => {
    expect(isValidSearchRegex("nginx-.*")).toBe(true);
  });

  it("rejects invalid expressions", () => {
    expect(isValidSearchRegex("[")).toBe(false);
  });
});
