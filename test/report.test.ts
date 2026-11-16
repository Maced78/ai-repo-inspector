import { describe, expect, it } from "vitest";
import { jsonReport, markdownReport } from "../src/report.js";
import type { ReviewResult } from "../src/types.js";

const base: ReviewResult = {
  repositoryPath: "/work/sample",
  baseRef: "main",
  changedFiles: [{ path: "src/index.ts", status: "modified" }],
  validationResults: [
    { command: "npm test", status: "passed", exitCode: 0, timedOut: false, output: "ok", truncated: false },
  ],
};

describe("markdownReport", () => {
  it("lists changed files and validation output", () => {
    const report = markdownReport(base);
    expect(report).toContain("src/index.ts (modified)");
    expect(report).toContain("PASSED: npm test");
    expect(report).toContain("ok");
  });

  it("shows failures and renames", () => {
    const report = markdownReport({
      ...base,
      changedFiles: [{ path: "new.ts", status: "renamed", previousPath: "old.ts" }],
      validationResults: [
        { command: "npm test", status: "failed", exitCode: 1, timedOut: false, output: "boom", truncated: false },
      ],
    });
    expect(report).toContain("new.ts (renamed) (from old.ts)");
    expect(report).toContain("FAILED: npm test");
    expect(report).toContain("exit code: 1");
  });

  it("keeps output containing backticks inside its code block", () => {
    const output = "before\n```\n# Injected heading\n```\nafter";
    const report = markdownReport({
      ...base,
      validationResults: [{ ...base.validationResults[0], output }],
    });
    // The fence must be longer than the triple backticks in the output.
    expect(report).toContain("````\n" + output + "\n````");
  });

  it("says when there is nothing to report", () => {
    const report = markdownReport({ ...base, changedFiles: [], validationResults: [] });
    expect(report).toContain("_No changes._");
    expect(report).toContain("_No validations run._");
  });
});

describe("jsonReport", () => {
  it("returns parseable JSON with the same data", () => {
    expect(JSON.parse(jsonReport(base))).toEqual(base);
  });
});
