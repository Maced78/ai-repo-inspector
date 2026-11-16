#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { inspect, render } from "./core.js";
import type { ReviewFormat } from "./types.js";

const USAGE =
  "Usage: inspector review --repo <path> [--base-ref <ref>] [--format markdown|json] " +
  "[--validate <command>]... [--out <file>]";

type Args = {
  command: string;
  repositoryPath?: string;
  baseRef?: string;
  format: ReviewFormat;
  validations: string[];
  out?: string;
};

export function parseArgs(argv: string[]): Args {
  const args: Args = { command: argv[0] ?? "", validations: [], format: "markdown" };
  const value = (index: number, flag: string): string => {
    const next = argv[index];
    if (next === undefined || next.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    return next;
  };
  for (let index = 1; index < argv.length; index++) {
    const token = argv[index];
    if (token === "--repo") args.repositoryPath = value(++index, token);
    else if (token === "--base-ref") args.baseRef = value(++index, token);
    else if (token === "--validate") args.validations.push(value(++index, token));
    else if (token === "--out") args.out = value(++index, token);
    else if (token === "--format") {
      const format = value(++index, token);
      if (format !== "markdown" && format !== "json") throw new Error(`Unknown format: ${format}`);
      args.format = format;
    } else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

async function main() {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`${(error as Error).message}\n${USAGE}`);
    process.exitCode = 2;
    return;
  }
  if (args.command !== "review" || !args.repositoryPath) {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }

  // The CLI user is a developer on their own machine: --validate runs any command they pass.
  const result = await inspect({
    repositoryPath: args.repositoryPath,
    baseRef: args.baseRef,
    validationCommands: args.validations,
  });
  const out = args.out ?? (args.format === "json" ? "review-report.json" : "review-report.md");
  writeFileSync(out, render(result, args.format), "utf8");
  console.log(`Review report written to ${out}`);

  // Non-zero exit when any validation failed, so CI can rely on the exit code.
  if (result.validationResults.some((validation) => validation.status === "failed")) {
    process.exitCode = 1;
  }
}

// Only run when executed directly, so tests can import parseArgs.
if (process.argv[1] && /cli\.(ts|js)$/.test(process.argv[1])) {
  main().catch((error) => {
    console.error(`Error: ${(error as Error).message}`);
    process.exitCode = 1;
  });
}
