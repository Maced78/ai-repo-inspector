import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export function makeRepo(defaultBranch = "master"): string {
  const dir = mkdtempSync(path.join(tmpdir(), "inspector-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  git("init", "-q", "-b", defaultBranch);
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  writeFileSync(path.join(dir, "a.txt"), "a\n");
  writeFileSync(path.join(dir, "keep.txt"), "k\n");
  git("add", ".");
  git("commit", "-qm", "init");
  git("checkout", "-qb", "feature");
  git("mv", "a.txt", "renamed with space.txt");
  writeFileSync(path.join(dir, "new.txt"), "n\n");
  git("add", ".");
  git("commit", "-qm", "change");
  return dir;
}
