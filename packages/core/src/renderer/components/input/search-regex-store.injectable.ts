/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed } from "mobx";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";

/**
 * Whether list searches are interpreted as regular expressions.
 * Kept in the user preferences, so the setting is shared by all lists and kept across restarts.
 */
class SearchRegexStore {
  constructor(private readonly userPreferencesState: UserPreferencesState) {}

  @computed
  get isEnabled(): boolean {
    return this.userPreferencesState.searchRegex ?? false;
  }

  @action
  setEnabled(enabled: boolean) {
    this.userPreferencesState.searchRegex = enabled;
  }
}

const searchRegexStoreInjectable = getInjectable({
  id: "search-regex-store",
  instantiate: (di) => new SearchRegexStore(di.inject(userPreferencesStateInjectable)),
});

export default searchRegexStoreInjectable;
