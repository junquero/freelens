/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import userPreferencesStateInjectable from "./state.injectable";

/**
 * Whether the arguments of the shell setting also go to a terminal that runs a
 * command Freelens types into it, such as a pod's container shell, and not
 * only to a terminal the user opened on demand.
 */
const shellArgsForAllTerminalsInjectable = getInjectable({
  id: "shell-args-for-all-terminals",
  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);

    return computed(() => state.applyShellArgsToAllTerminals);
  },
});

export default shellArgsForAllTerminalsInjectable;
