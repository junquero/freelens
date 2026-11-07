/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { debounce } from "es-toolkit/compat";
import { compareStructural, observable, reaction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { isValidSearchRegex } from "../item-object-list/search-matcher";
import namespaceStoreInjectable from "../namespaces/store.injectable";
import persistentSearchStoreInjectable from "./persistent-search-store.injectable";
import { SearchHistoryMenu } from "./search-history-menu";
import searchHistoryStoreInjectable from "./search-history-store.injectable";
import { SearchInput } from "./search-input";
import { regexIcon, regexOffIcon } from "./search-regex-icons";
import searchRegexStoreInjectable from "./search-regex-store.injectable";
import searchUrlPageParamInjectable from "./search-url-page-param.injectable";

import type { PageParam } from "../../navigation/page-param";
import type { InputProps } from "./input";

export interface SearchInputUrlProps extends InputProps {
  compact?: boolean; // show only search-icon when not focused
}

interface Dependencies {
  searchUrlParam: PageParam<string>;
  searchRegexStore: ReturnType<typeof searchRegexStoreInjectable.instantiate>;
  searchHistoryStore: ReturnType<typeof searchHistoryStoreInjectable.instantiate>;
  persistentSearchStore: ReturnType<typeof persistentSearchStoreInjectable.instantiate>;
  namespaceStore?: ReturnType<typeof namespaceStoreInjectable.instantiate>;
}

/** Identifies the icon that opens the history menu of an input among the inputs on the screen. */
let historyIconCounter = 0;

/** How long the text has to stay unchanged before it is remembered as a search. */
const HISTORY_IDLE_MS = 1500;

@observer
class NonInjectedSearchInputUrl extends React.Component<SearchInputUrlProps & Dependencies> {
  private readonly disposers: (() => void)[] = [];
  private readonly historyIconId = `search-history-icon-${++historyIconCounter}`;

  @observable accessor inputVal = ""; // fix: use empty string on init to avoid react warnings
  @observable private accessor isHistoryOpen = false;
  @observable private accessor lastNamespaceKey = "";
  @observable private accessor lastPlaceholder = "";
  private userTyping = false;

  readonly updateUrl = debounce((val: string) => this.props.searchUrlParam.set(val), 250);
  readonly updateStorage = debounce((storageKey: string, val: string) => {
    this.props.persistentSearchStore.setValue(storageKey, val);
    this.userTyping = false;
  }, 250);
  // A search is remembered once the typing stops, on Enter or when the field is left,
  // not on every key, so the history does not fill up with the prefixes of a word.
  readonly rememberSearch = debounce((val: string) => this.props.searchHistoryStore.record(val), HISTORY_IDLE_MS);

  private getCurrentNamespaceKey(): string {
    const { namespaceStore } = this.props;

    if (!namespaceStore) {
      return "global";
    }

    const namespaces = Array.from(namespaceStore.contextNamespaces).sort();

    return namespaces.length > 0 ? namespaces.join(",") : "all-namespaces";
  }

  private getStorageKey(): string {
    const { persistentSearchStore, placeholder } = this.props;

    // When linking is enabled, use a global key (shared across all namespaces and placeholders)
    if (persistentSearchStore.isEnabled) {
      return "global:linked";
    }

    // When linking is disabled, use namespace + placeholder (separate per placeholder per namespace)
    const namespaceKey = this.getCurrentNamespaceKey();
    const placeholderKey = placeholder || "default";
    return `${namespaceKey}:${placeholderKey}`;
  }

  componentDidMount(): void {
    const { searchUrlParam, persistentSearchStore, namespaceStore, placeholder } = this.props;

    // Capture props into local closures for the reactions below: mobx-react 9
    // forbids reading this.props inside a derivation, and the reaction data
    // functions call getStorageKey/getCurrentNamespaceKey (which read this.props).
    const getCurrentNamespaceKey = (): string => {
      if (!namespaceStore) {
        return "global";
      }

      const namespaces = Array.from(namespaceStore.contextNamespaces).sort();

      return namespaces.length > 0 ? namespaces.join(",") : "all-namespaces";
    };
    const getStorageKey = (): string => {
      if (persistentSearchStore.isEnabled) {
        return "global:linked";
      }

      const namespaceKey = getCurrentNamespaceKey();
      const placeholderKey = placeholder || "default";
      return `${namespaceKey}:${placeholderKey}`;
    };

    // Initialize lastNamespaceKey and lastPlaceholder
    this.lastNamespaceKey = getCurrentNamespaceKey();
    this.lastPlaceholder = placeholder || "default";

    // On first mount, load the stored value and sync to URL
    const storageKey = getStorageKey();
    const storedValue = persistentSearchStore.getValue(storageKey);

    if (storedValue) {
      this.inputVal = storedValue;
      searchUrlParam.set(storedValue);
    } else {
      // If no stored value, check URL
      const urlValue = searchUrlParam.get();
      if (urlValue) {
        this.inputVal = urlValue;
      }
    }

    // Sync inputVal with either persistent store or URL param
    this.disposers.push(
      reaction(
        () => ({
          isEnabled: persistentSearchStore.isEnabled,
          storageKey: getStorageKey(),
          persistedValue: persistentSearchStore.getValue(getStorageKey()),
          urlValue: searchUrlParam.get(),
          namespaceKey: getCurrentNamespaceKey(),
          placeholderKey: placeholder || "default",
        }),
        ({ isEnabled, storageKey, persistedValue, urlValue, namespaceKey, placeholderKey }) => {
          const namespaceChanged = namespaceKey !== this.lastNamespaceKey;
          const placeholderChanged = placeholderKey !== this.lastPlaceholder;
          const contextChanged = namespaceChanged || (placeholderChanged && !isEnabled);

          // Skip overwriting inputVal while user is actively typing — the debounced
          // storage/URL updates will eventually bring everything back in sync.
          if (this.userTyping && !contextChanged) {
            this.lastNamespaceKey = namespaceKey;
            this.lastPlaceholder = placeholderKey;
            return;
          }

          // When persistence is enabled, sync to persisted value
          if (isEnabled) {
            this.inputVal = persistedValue;
            searchUrlParam.set(persistedValue);
          } else {
            // When persistence is disabled
            if (contextChanged) {
              // Load stored value for this specific placeholder+namespace or clear if none
              this.inputVal = persistedValue;
              searchUrlParam.set(persistedValue);
            } else {
              // When user types in URL or uses browser back/forward, sync from URL
              if (urlValue !== this.inputVal) {
                this.inputVal = urlValue;
              }
            }
          }

          this.lastNamespaceKey = namespaceKey;
          this.lastPlaceholder = placeholderKey;
        },
        { equals: compareStructural },
      ),
    );

    // When persistence is enabled and there's a persistent value, sync it to URL
    this.disposers.push(
      reaction(
        () => ({
          isEnabled: persistentSearchStore.isEnabled,
          storageKey: getStorageKey(),
        }),
        ({ isEnabled, storageKey }) => {
          if (isEnabled) {
            const persistedValue = persistentSearchStore.getValue(storageKey);

            // Always sync to URL, even if empty (to clear filter when switching namespaces)
            searchUrlParam.set(persistedValue);
          }
        },
        { fireImmediately: true, equals: compareStructural },
      ),
    );
  }

  componentWillUnmount(): void {
    this.rememberSearch.flush();
    this.disposers.forEach((dispose) => dispose());
  }

  setValue = (value: string) => {
    const storageKey = this.getStorageKey();

    this.userTyping = true;
    this.inputVal = value;
    this.updateUrl(value);
    this.updateStorage(storageKey, value);
    this.rememberSearch(value);
  };

  onKeyDown = (evt: React.KeyboardEvent<any>) => {
    if (evt.key === "Enter") {
      this.rememberSearch.flush();
    }

    this.props.onKeyDown?.(evt);
  };

  onBlur = (evt: React.FocusEvent<any>) => {
    this.rememberSearch.flush();
    this.props.onBlur?.(evt);
  };

  openHistory = () => {
    this.isHistoryOpen = true;
  };

  closeHistory = () => {
    this.isHistoryOpen = false;
  };

  selectFromHistory = (text: string) => {
    this.setValue(text);
    // apply the search right away instead of waiting for the debounce
    this.updateUrl.flush();
    this.updateStorage.flush();
    this.rememberSearch.flush();
  };

  clear = () => {
    this.setValue("");
    this.updateUrl.flush();
    this.updateStorage.flush();
    this.userTyping = false;
  };

  onChange = (val: string, evt: React.ChangeEvent<any>) => {
    this.setValue(val);
    this.props.onChange?.(val, evt);
  };

  togglePersistence = (newState: boolean) => {
    const { persistentSearchStore } = this.props;

    if (newState) {
      // When enabling linking (switching to global shared):
      // 1. Save current search value to the global key FIRST
      // 2. Then enable persistence
      const globalKey = "global:linked";
      if (this.inputVal) {
        persistentSearchStore.setValue(globalKey, this.inputVal);
      }
      persistentSearchStore.setEnabled(newState);
    } else {
      // When disabling linking (switching to per-namespace per-placeholder):
      // 1. Disable persistence first
      // 2. Save current value to namespace+placeholder-specific key
      const currentValue = this.inputVal;
      persistentSearchStore.setEnabled(newState);
      const newStorageKey = this.getStorageKey(); // This will now be namespace+placeholder-specific
      if (currentValue) {
        persistentSearchStore.setValue(newStorageKey, currentValue);
      }
    }
  };

  constructor(props: SearchInputUrlProps & Dependencies) {
    super(props);
  }

  toggleSearchRegex = () => {
    const { searchRegexStore } = this.props;

    searchRegexStore.setEnabled(!searchRegexStore.isEnabled);
  };

  render() {
    const {
      searchUrlParam,
      searchRegexStore,
      searchHistoryStore,
      persistentSearchStore,
      namespaceStore,
      ...searchInputProps
    } = this.props;
    const isRegex = searchRegexStore.isEnabled;
    const isInvalidRegex = isRegex && !isValidSearchRegex(this.inputVal);

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <SearchInput
          value={this.inputVal}
          onChange={(val, event) => {
            this.setValue(val);
            this.props.onChange?.(val, event);
          }}
          onClear={this.clear}
          {...searchInputProps}
          onKeyDown={this.onKeyDown}
          onBlur={this.onBlur}
        />
        <Icon
          small
          svg={isRegex ? regexIcon : regexOffIcon}
          className={cssNames("SearchRegexIcon", { invalid: isInvalidRegex })}
          aria-pressed={isRegex}
          onClick={this.toggleSearchRegex}
          tooltip={
            isInvalidRegex
              ? "Invalid regular expression: searching as plain text"
              : isRegex
                ? "Disable regular expression search"
                : "Enable regular expression search"
          }
        />
        <Icon
          small
          id={this.historyIconId}
          material="history"
          active={this.isHistoryOpen}
          aria-haspopup="menu"
          aria-expanded={this.isHistoryOpen}
          interactive
          // the menu toggles itself on a click of the icon, and it has no tooltip when it is open
          tooltip={this.isHistoryOpen ? undefined : "Search history"}
        />
        <SearchHistoryMenu
          htmlFor={this.historyIconId}
          isOpen={this.isHistoryOpen}
          open={this.openHistory}
          close={this.closeHistory}
          frequent={searchHistoryStore.frequent}
          recent={searchHistoryStore.recent}
          onSelect={this.selectFromHistory}
          onRemove={(text) => searchHistoryStore.remove(text)}
          onClear={() => searchHistoryStore.clear()}
        />
        <Icon
          small
          material={persistentSearchStore.isEnabled ? "link" : "link_off"}
          onClick={() => this.togglePersistence(!persistentSearchStore.isEnabled)}
          tooltip={persistentSearchStore.isEnabled ? "Unlink search (per-view)" : "Link search (shared)"}
        />
      </div>
    );
  }
}

export const SearchInputUrl = withInjectables<Dependencies, SearchInputUrlProps>(NonInjectedSearchInputUrl, {
  getProps: (di, props) => {
    const canCreateStores = di.inject(storesAndApisCanBeCreatedInjectionToken);

    return {
      ...props,
      searchUrlParam: di.inject(searchUrlPageParamInjectable),
      searchRegexStore: di.inject(searchRegexStoreInjectable),
      searchHistoryStore: di.inject(searchHistoryStoreInjectable),
      persistentSearchStore: di.inject(persistentSearchStoreInjectable),
      namespaceStore: canCreateStores ? di.inject(namespaceStoreInjectable) : undefined,
    };
  },
});
