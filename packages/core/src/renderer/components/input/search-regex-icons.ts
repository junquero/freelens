/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Inline icons for `<Icon svg={...}>`: Material Icons has no regular expression glyph.
// The icon sheet fills every shape with the current colour, so the slash is a polygon.

const glyph = `
  <circle cx="6.5" cy="17.5" r="2.4"/>
  <rect x="14.9" y="4" width="2.2" height="12" rx="1.1"/>
  <rect x="14.9" y="4" width="2.2" height="12" rx="1.1" transform="rotate(60 16 10)"/>
  <rect x="14.9" y="4" width="2.2" height="12" rx="1.1" transform="rotate(120 16 10)"/>
`;

/** `.*`, the regular expression search is on. */
export const regexIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${glyph}</svg>`;

/** `.*` crossed out, the regular expression search is off, like `link_off` next to `link`. */
export const regexOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${glyph}<polygon points="4.2,2.6 21.4,19.8 19.8,21.4 2.6,4.2"/></svg>`;
