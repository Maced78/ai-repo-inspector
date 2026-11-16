#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { enforceAgentPolicy, policyFromEnv, reviewRepository } from "./core.js";

const policy = policyFromEnv();
const server = new McpServer({ name: "repository-inspector", version: "2.1.0" });

server.tool(
  "review_repository",
  "Lists files changed between a base ref and HEAD in a Git repository, optionally runs " +
    "operator-approved validation commands, and returns a report. " +
    `Allowed validation commands: ${JSON.stringify(policy.allowedValidations)}.`,
  {
    repo_path: z.string().min(1).describe("Repository path, absolute or relative to the allowed root."),
    base_ref: z.string().optional().describe("Base ref to diff against. Defaults to main, then master."),
    validation_commands: z
      .array(z.string())
      .optional()
      .describe("Must exactly match one of the allowed validation commands."),
    format: z.enum(["markdown", "json"]).optional(),
  },
  async (input) => {
    try {
      const request = enforceAgentPolicy(
        {
          repositoryPath: input.repo_path,
          baseRef: input.base_ref,
          validationCommands: input.validation_commands,
          format: input.format,
        },
        policy,
      );
      const report = await reviewRepository(request);
      return { content: [{ type: "text", text: report }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  },
);

await server.connect(new StdioServerTransport());
