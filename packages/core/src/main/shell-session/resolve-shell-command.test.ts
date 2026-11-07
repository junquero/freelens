/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import statInjectable from "../../common/fs/stat.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import resolveShellCommandInjectable, { tokenizeShellSetting } from "./resolve-shell-command.injectable";
import type { Stats } from "node:fs";

import type { DiContainer } from "@ogre-tools/injectable";

import type { ResolveShellCommand } from "./resolve-shell-command.injectable";

describe("tokenizeShellSetting", () => {
  it("splits on runs of whitespace", () => {
    expect(tokenizeShellSetting("  a   b\tc ")).toEqual(["a", "b", "c"]);
  });

  it("keeps the backslashes of a Windows path", () => {
    expect(tokenizeShellSetting("C:\\Windows\\System32\\wsl.exe")).toEqual(["C:\\Windows\\System32\\wsl.exe"]);
  });

  it("keeps a quoted part, spaces and all, as one token, with the text next to it", () => {
    expect(tokenizeShellSetting('"C:\\Program Files\\pwsh.exe" --rcfile="C:\\a b"')).toEqual([
      "C:\\Program Files\\pwsh.exe",
      "--rcfile=C:\\a b",
    ]);
  });

  it("keeps an empty quoted argument", () => {
    expect(tokenizeShellSetting('zsh "" -f')).toEqual(["zsh", "", "-f"]);
  });

  it("takes the rest of the setting as one token when a quote is not closed", () => {
    expect(tokenizeShellSetting('zsh "echo hello')).toEqual(["zsh", "echo hello"]);
  });
});

describe("resolveShellCommand", () => {
  let di: DiContainer;
  let existingFiles: Set<string>;
  let resolveShellCommand: ResolveShellCommand;

  beforeEach(() => {
    di = getDiForUnitTesting();
    existingFiles = new Set();

    di.override(statInjectable, () => async (path: string) => {
      if (existingFiles.has(path)) {
        return { isFile: () => true } as Partial<Stats> as Stats;
      }

      throw Object.assign(new Error(`ENOENT: no such file or directory, stat '${path}'`), { code: "ENOENT" });
    });

    resolveShellCommand = di.inject(resolveShellCommandInjectable);
  });

  it("takes a bare executable as the command, with no arguments", async () => {
    expect(await resolveShellCommand("/bin/zsh")).toEqual({ command: "/bin/zsh", args: [] });
  });

  it("takes the first word as the command and the rest as its arguments, as for WSL", async () => {
    expect(await resolveShellCommand("wsl.exe -d Ubuntu")).toEqual({
      command: "wsl.exe",
      args: ["-d", "Ubuntu"],
    });
  });

  it("keeps a quoted path with spaces as one command, with the arguments after it", async () => {
    expect(await resolveShellCommand('"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoLogo')).toEqual({
      command: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
      args: ["-NoLogo"],
    });
  });

  it("keeps the arguments in order, with the quotes around them removed", async () => {
    expect(await resolveShellCommand('zsh -c "echo hello world" -f')).toEqual({
      command: "zsh",
      args: ["-c", "echo hello world", "-f"],
    });
  });

  it("accepts an unquoted path with spaces, as a setting that is only a path always was", async () => {
    existingFiles.add("C:\\Program Files\\Git\\bin\\bash.exe");

    expect(await resolveShellCommand("C:\\Program Files\\Git\\bin\\bash.exe")).toEqual({
      command: "C:\\Program Files\\Git\\bin\\bash.exe",
      args: [],
    });
  });

  it("takes an unquoted path with spaces that names a file, followed by its arguments", async () => {
    existingFiles.add("C:\\Program Files\\Git\\bin\\bash.exe");

    expect(await resolveShellCommand("C:\\Program Files\\Git\\bin\\bash.exe --login")).toEqual({
      command: "C:\\Program Files\\Git\\bin\\bash.exe",
      args: ["--login"],
    });
  });

  it("takes the first word as the command when no leading words name a file", async () => {
    expect(await resolveShellCommand("C:\\Program Files\\Git\\bin\\bash.exe")).toEqual({
      command: "C:\\Program",
      args: ["Files\\Git\\bin\\bash.exe"],
    });
  });
});
