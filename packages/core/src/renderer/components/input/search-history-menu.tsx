/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./search-history-menu.scss";

import { Icon } from "@freelensapp/icon";
import { observer } from "mobx-react";
import React from "react";
import { Menu, MenuItem } from "../menu";

import type { StrictReactNode } from "@freelensapp/utilities";

import type { SearchHistoryEntry } from "../../../features/user-preferences/common/search-history";

export interface SearchHistoryMenuProps {
  /** The id of the element that opens the menu. */
  htmlFor: string;
  isOpen: boolean;
  open(): void;
  close(): void;
  frequent: readonly SearchHistoryEntry[];
  recent: readonly SearchHistoryEntry[];
  onSelect(text: string): void;
  onRemove(text: string): void;
  onClear(): void;
}

export const SearchHistoryMenu = observer(
  ({ htmlFor, isOpen, open, close, frequent, recent, onSelect, onRemove, onClear }: SearchHistoryMenuProps) => {
    // The items are built by a function, not rendered as components of their own:
    // the menu only gives focus and keyboard handling to its direct MenuItem children.
    const renderEntry = (entry: SearchHistoryEntry, showCount: boolean) => (
      <MenuItem
        key={entry.text}
        className="SearchHistoryItem"
        title={entry.text}
        onClick={() => onSelect(entry.text)}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === "Delete") {
            event.preventDefault();
            onRemove(entry.text);
          }
        }}
      >
        <span className="SearchHistoryText">{entry.text}</span>
        {showCount && (
          <span className="SearchHistoryCount" title={`Searched ${entry.count} times`}>
            {entry.count}×
          </span>
        )}
        <Icon
          smallest
          material="close"
          className="SearchHistoryRemove"
          focusable={false}
          tooltip="Remove from history"
          onClick={(event: React.MouseEvent) => {
            // do not select the entry that is being removed
            event.stopPropagation();
            onRemove(entry.text);
          }}
        />
      </MenuItem>
    );

    const items: StrictReactNode[] = [];

    if (frequent.length > 0) {
      items.push(
        <li key="frequent-heading" className="SearchHistoryHeading">
          Most used
        </li>,
        ...frequent.map((entry) => renderEntry(entry, true)),
      );
    }

    if (recent.length > 0) {
      items.push(
        <li key="recent-heading" className="SearchHistoryHeading">
          Recent
        </li>,
        ...recent.map((entry) => renderEntry(entry, false)),
      );
    }

    if (items.length === 0) {
      items.push(
        <li key="empty" className="SearchHistoryEmpty">
          No searches yet. The ones you run are remembered here.
        </li>,
      );
    } else {
      items.push(
        <MenuItem key="separator" spacer />,
        <MenuItem key="clear" className="SearchHistoryClear" icon="delete_sweep" onClick={onClear}>
          Clear history
        </MenuItem>,
      );
    }

    return (
      <Menu
        htmlFor={htmlFor}
        isOpen={isOpen}
        open={open}
        close={close}
        className="SearchHistoryMenu"
        usePortal
        autoFocus
        closeOnScroll
      >
        {items}
      </Menu>
    );
  },
);
