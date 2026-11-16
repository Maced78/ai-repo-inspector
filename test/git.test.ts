import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertSafeRef, parseNameStatus } from "../src/git.js";
import { inspect } from "../src/core.js";
import { makeRepo } from "./helpers.js";

describe("parseNameStatus", () => {
  it("parses renames into old and new paths", () => {
    const files = parseNameStatus("R100\0a.txt\0b.txt\0A\0new.txt\0D\0gone.txt\0");
    expect(files).toEqual([
      { path: "b.txt", status: "renamed", previousPath: "a.txt" },
      { path: "new.txt", status: "added" },
      { path: "gone.txt", status: "deleted" },
    ]);
  });
});

describe("assertSafeRef", () => {
  it("rejects refs that git would read as options", () => {
    expect(() => assertSafeRef("--output=/tmp/pwned")).toThrow(/Invalid base ref/);
    expect(() => assertSafeRef("main; rm -rf /")).toThrow(/Invalid base ref/);
    expect(() => assertSafeRef("origin/main")).not.toThrow();
  });
});

describe("inspect", () => {
  it("falls back to master when main does not exist", async () => {
    const result = await inspect({ repositoryPath: makeRepo("master") });
    expect(result.baseRef).toBe("master");
    expect(result.changedFiles).toContainEqual({
      path: "renamed with space.txt",
      status: "renamed",
      previousPath: "a.txt",
    });
    expect(result.changedFiles).toContainEqual({ path: "new.txt", status: "added" });
  });

  it("gives a clear error for a missing base ref and for non-repositories", async () => {
    await expect(inspect({ repositoryPath: makeRepo(), baseRef: "nope" })).rejects.toThrow(
      /Base ref not found/,
    );
    await expect(inspect({ repositoryPath: mkdtempSync(path.join(tmpdir(), "x-")) })).rejects.toThrow(
      /Not a Git repository/,
    );
  });
});
