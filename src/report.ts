import type { ReviewResult } from "./types.js";

// Pick a fence longer than any backtick run inside the text,
// so command output cannot close the code block early.
function fence(text: string): string {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(longest + 1);
}

export function markdownReport(input: ReviewResult): string {
  const lines = [
    `# Review Report: ${input.repositoryPath}`,
    "",
    `Base: \`${input.baseRef}\``,
    "",
    "## Changed files",
  ];
  if (input.changedFiles.length === 0) lines.push("_No changes._");
  for (const file of input.changedFiles) {
    const from = file.previousPath ? ` (from ${file.previousPath})` : "";
    lines.push(`- ${file.path} (${file.status})${from}`);
  }

  lines.push("", "## Validation output");
  if (input.validationResults.length === 0) lines.push("_No validations run._");
  for (const result of input.validationResults) {
    const extra = result.timedOut ? ", timed out" : result.truncated ? ", output truncated" : "";
    lines.push(
      `### ${result.status === "passed" ? "PASSED" : "FAILED"}: ${result.command}`,
      `exit code: ${result.exitCode ?? "none"}${extra}`,
    );
    const marker = fence(result.output);
    lines.push(marker, result.output, marker);
  }
  return lines.join("\n");
}

export function jsonReport(input: ReviewResult): string {
  return JSON.stringify(input, null, 2);
}
