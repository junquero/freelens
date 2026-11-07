/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed } from "mobx";
import {
  getFrequentSearches,
  getRecentSearches,
  recordSearch,
  removeSearch,
} from "../../../features/user-preferences/common/search-history";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";

/**
 * The searches the user committed to in the list search fields, shared by all of them
 * and kept across restarts with the user preferences.
 */
class SearchHistoryStore {
  constructor(private readonly userPreferencesState: UserPreferencesState) {}

  @computed
  get entries() {
    return this.userPreferencesState.searchHistory ?? [];
  }

  /** The most used searches. */
  @computed
  get frequent() {
    return getFrequentSearches(this.entries);
  }

  /** The latest searches, without the frequent ones. */
  @computed
  get recent() {
    return getRecentSearches(this.entries, this.frequent);
  }

  @action
  record(text: string) {
    this.userPreferencesState.searchHistory = recordSearch(this.entries, text);
  }

  @action
  remove(text: string) {
    this.userPreferencesState.searchHistory = removeSearch(this.entries, text);
  }

  @action
  clear() {
    this.userPreferencesState.searchHistory = [];
  }
}

const searchHistoryStoreInjectable = getInjectable({
  id: "search-history-store",
  instantiate: (di) => new SearchHistoryStore(di.inject(userPreferencesStateInjectable)),
});

export default searchHistoryStoreInjectable;
