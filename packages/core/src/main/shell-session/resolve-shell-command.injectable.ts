/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import statInjectable from "../../common/fs/stat.injectable";

export interface ShellCommand {
  /** The executable to start. */
  readonly command: string;
  /** The arguments the setting gives after the executable, in order. */
  readonly args: string[];
}

export type ResolveShellCommand = (setting: string) => Promise<ShellCommand>;

/**
 * Splits a shell setting on the whitespace outside quotes, so that a quoted path may hold spaces, and an argument may
 * too. Backslashes are kept as they are, because they separate the parts of a Windows path.
 */
export const tokenizeShellSetting = (setting: string): string[] => {
  const tokens: string[] = [];
  let token: string | undefined;
  let quote: string | undefined;

  for (const char of setting) {
    if (quote !== undefined) {
      if (char === quote) {
        quote = undefined;
      } else {
        token = (token ?? "") + char;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
      token = token ?? "";
    } else if (/\s/.test(char)) {
      if (token !== undefined) {
        tokens.push(token);
        token = undefined;
      }
    } else {
      token = (token ?? "") + char;
    }
  }

  if (token !== undefined) {
    tokens.push(token);
  }

  return tokens;
};

/**
 * Turns the shell setting into the executable and its arguments, such as `wsl.exe -d Ubuntu`.
 *
 * A setting that was only ever a path may still hold unquoted spaces, as in `C:\Program Files\PowerShell\7\pwsh.exe`,
 * so the longest run of leading words that names an existing file is the executable. Otherwise the first word is.
 */
const resolveShellCommandInjectable = getInjectable({
  id: "resolve-shell-command",

  instantiate: (di): ResolveShellCommand => {
    const stat = di.inject(statInjectable);

    const isFile = async (path: string): Promise<boolean> => {
      try {
        return (await stat(path)).isFile();
      } catch {
        return false;
      }
    };

    return async (setting) => {
      const tokens = tokenizeShellSetting(setting.trim());

      for (let count = tokens.length; count > 1; count -= 1) {
        const command = tokens.slice(0, count).join(" ");

        if (await isFile(command)) {
          return { command, args: tokens.slice(count) };
        }
      }

      const [command = "", ...args] = tokens;

      return { command, args };
    };
  },
});

export default resolveShellCommandInjectable;
