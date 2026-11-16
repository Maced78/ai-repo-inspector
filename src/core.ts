import { realpathSync } from "node:fs";
import path from "node:path";
import { assertGitRepository, changedFiles, resolveBaseRef } from "./git.js";
import { jsonReport, markdownReport } from "./report.js";
import type { ReviewRequest, ReviewResult } from "./types.js";
import { runValidations } from "./validation.js";

export async function inspect(request: ReviewRequest): Promise<ReviewResult> {
  if (!request.repositoryPath) throw new Error("repositoryPath is required");
  assertGitRepository(request.repositoryPath);
  const baseRef = resolveBaseRef(request.repositoryPath, request.baseRef);
  const files = changedFiles(request.repositoryPath, baseRef);
  const validationResults = await runValidations(
    request.validationCommands ?? [],
    request.repositoryPath,
  );
  return {
    repositoryPath: request.repositoryPath,
    baseRef,
    changedFiles: files,
    validationResults,
  };
}

export function render(result: ReviewResult, format: ReviewRequest["format"] = "markdown"): string {
  return format === "json" ? jsonReport(result) : markdownReport(result);
}

// Both adapters call this one function, so CLI and MCP share behavior.
export async function reviewRepository(request: ReviewRequest): Promise<string> {
  return render(await inspect(request), request.format);
}

export type AgentPolicy = {
  // Repositories the agent may inspect must live under this directory.
  allowedRoot: string;
  // Exact validation commands the operator allows the agent to run.
  allowedValidations: string[];
};

export function policyFromEnv(env: NodeJS.ProcessEnv = process.env): AgentPolicy {
  return {
    allowedRoot: env.INSPECTOR_ALLOWED_ROOT ?? process.cwd(),
    allowedValidations: (env.INSPECTOR_ALLOWED_VALIDATIONS ?? "")
      .split(";")
      .map((command) => command.trim())
      .filter(Boolean),
  };
}

// The MCP caller is an AI agent whose input may be shaped by untrusted content
// (prompt injection), so it gets narrower capabilities than a human on the CLI.
export function enforceAgentPolicy(request: ReviewRequest, policy: AgentPolicy): ReviewRequest {
  const root = realpathSync(policy.allowedRoot);
  const target = realpathSync(path.resolve(root, request.repositoryPath));
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Repository is outside the allowed root (${root})`);
  }
  for (const command of request.validationCommands ?? []) {
    if (!policy.allowedValidations.includes(command)) {
      throw new Error(
        `Validation command not allowed: ${JSON.stringify(command)}. Allowed: ${JSON.stringify(policy.allowedValidations)}`,
      );
    }
  }
  return { ...request, repositoryPath: target };
}
