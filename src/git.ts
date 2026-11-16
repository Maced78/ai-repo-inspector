import { execFileSync } from "node:child_process";
import type { ChangedFile } from "./types.js";

function git(repositoryPath: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repositoryPath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// A ref starting with "-" would be parsed by git as an option
// (e.g. "--output=/some/file" makes `git diff` write a file).
export function assertSafeRef(ref: string): void {
  if (!/^[A-Za-z0-9._\/@{}^~-]+$/.test(ref) || ref.startsWith("-")) {
    throw new Error(`Invalid base ref: ${JSON.stringify(ref)}`);
  }
}

function refExists(repositoryPath: string, ref: string): boolean {
  try {
    git(repositoryPath, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

export function resolveBaseRef(repositoryPath: string, baseRef?: string): string {
  if (baseRef) {
    assertSafeRef(baseRef);
    if (!refExists(repositoryPath, baseRef)) {
      throw new Error(`Base ref not found: ${baseRef}`);
    }
    return baseRef;
  }
  for (const candidate of ["main", "master"]) {
    if (refExists(repositoryPath, candidate)) return candidate;
  }
  throw new Error("No base ref given and neither 'main' nor 'master' exists. Pass --base-ref.");
}

export function assertGitRepository(repositoryPath: string): void {
  try {
    git(repositoryPath, ["rev-parse", "--is-inside-work-tree"]);
  } catch {
    throw new Error(`Not a Git repository: ${repositoryPath}`);
  }
}

const STATUS: Record<string, ChangedFile["status"]> = {
  A: "added",
  D: "deleted",
  M: "modified",
  T: "modified",
  R: "renamed",
  C: "copied",
};

// Parses `git diff --name-status -z` output: fields are NUL-separated,
// and rename/copy entries carry two paths (old, new).
export function parseNameStatus(output: string): ChangedFile[] {
  const fields = output.split("\0").filter((field) => field.length > 0);
  const files: ChangedFile[] = [];
  for (let index = 0; index < fields.length; ) {
    const code = fields[index++];
    const letter = code[0];
    const status = STATUS[letter] ?? "modified";
    if (letter === "R" || letter === "C") {
      const previousPath = fields[index++];
      const path = fields[index++];
      files.push({ path, status, previousPath });
    } else {
      files.push({ path: fields[index++], status });
    }
  }
  return files;
}

export function changedFiles(repositoryPath: string, baseRef: string): ChangedFile[] {
  assertSafeRef(baseRef);
  const output = git(repositoryPath, ["diff", "--name-status", "-z", `${baseRef}...HEAD`, "--"]);
  return parseNameStatus(output);
}
