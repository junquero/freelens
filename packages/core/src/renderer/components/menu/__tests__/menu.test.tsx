/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MenuItem, NonInjectedMenu } from "../menu";

// Runs the callback at once, so the position is refreshed within the test.
const requestAnimationFrame = (callback: () => void) => {
  callback();

  return 0;
};

const renderMenu = (isOpen: boolean, items: string[]) => (
  <NonInjectedMenu
    isOpen={isOpen}
    open={vi.fn()}
    close={vi.fn()}
    autoFocus
    animated={false}
    requestAnimationFrame={requestAnimationFrame as any}
  >
    {items.map((text) => (
      <MenuItem key={text}>{text}</MenuItem>
    ))}
  </NonInjectedMenu>
);

describe("<Menu/> items", () => {
  it("does not read items that were unmounted before the menu opens again", () => {
    const view = render(renderMenu(true, ["first", "second", "third"]));

    // the items unmount while the menu is open: React calls their refs with null
    view.rerender(renderMenu(true, ["first"]));
    // closing and opening again focuses the first item, which reads every item
    view.rerender(renderMenu(false, ["first"]));

    expect(() => view.rerender(renderMenu(true, ["first"]))).not.toThrow();
  });
});
