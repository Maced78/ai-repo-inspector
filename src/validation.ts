import { spawn } from "node:child_process";
import type { ValidationResult } from "./types.js";

export const MAX_OUTPUT_CHARS = 8_000;
export const DEFAULT_TIMEOUT_MS = 120_000;

function truncate(text: string): { output: string; truncated: boolean } {
  if (text.length <= MAX_OUTPUT_CHARS) return { output: text, truncated: false };
  // Keep the tail: test runners print the summary and failures last.
  return { output: text.slice(-MAX_OUTPUT_CHARS), truncated: true };
}

// A failing command is a normal review result, not a crash:
// it resolves with status "failed" instead of rejecting.
export function runValidation(
  command: string,
  cwd: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ValidationResult> {
  return new Promise((resolve) => {
    let combined = "";
    let timedOut = false;
    // detached: the command gets its own process group, so on timeout we can
    // kill the shell AND its children (killing only the shell left `sleep`
    // running and holding the output pipe open).
    const child = spawn(command, { cwd, shell: true, detached: process.platform !== "win32" });
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (child.pid && process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch {
        // already exited
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk) => (combined += chunk));
    child.stderr.on("data", (chunk) => (combined += chunk));
    child.on("error", (error) => (combined += `\n${error.message}`));
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      const { output, truncated } = truncate(combined);
      resolve({
        command,
        status: exitCode === 0 && !timedOut ? "passed" : "failed",
        exitCode,
        timedOut,
        output,
        truncated,
      });
    });
  });
}

export async function runValidations(commands: string[], cwd: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  for (const command of commands) {
    results.push(await runValidation(command, cwd));
  }
  return results;
}
