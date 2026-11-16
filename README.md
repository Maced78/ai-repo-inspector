# Repository Inspector

This is a small TypeScript developer tool that inspects changes in a Git
repository, runs optional validation commands, and produces a Markdown report.
It can be used from a command line or exposed to AI clients through MCP.

## Your task

Investigate the repository and improve it as you judge best. The starter works
for a narrow happy path, but production use may expose correctness, safety,
reliability, contract, output, documentation, or testing weaknesses.

You are not expected to finish everything. We care about how you investigate,
prioritize, implement, verify, and explain a meaningful scope.

## Product decision

This tool may be used directly by developers and by AI coding agents. Decide
whether its production interface should be **CLI-first**, **MCP-first**, or
**hybrid**. Implement improvements consistent with your decision.

There is no preferred label. Explain:

- The primary user and execution environment you assumed.
- The trust boundary and allowed capabilities.
- Reliability, discoverability, latency/context, and output-size tradeoffs.
- How the interfaces you continue to advertise stay behaviorally consistent.
- What evidence would change your decision.

## Time and rules

- Maximum **90 focused minutes** within 48 hours of receiving the invitation.
- Use AI coding tools freely. Verify their work and document at least one
  suggestion you corrected or rejected.
- Work in your own repository created from this template.
- Commit as you work and complete `SUBMISSION.md` in your final commit.
- Completion is not required. Accurate scope and verification matter more than
  a large diff.

## Setup

```bash
npm install
npm run typecheck
npm test
```

## Interfaces (hybrid)

Both adapters call the same `inspect()` / `render()` functions in `src/core.ts`,
so they produce the same report for the same input. They differ only in
**what the caller is allowed to do**.

### CLI — for a developer on their own machine or in CI

```bash
npm run inspector -- review --repo ./path/to/repo
npm run inspector -- review --repo ./path/to/repo --base-ref origin/main --format json
npm run inspector -- review --repo ./path/to/repo --validate "npm test" --out report.md
```

- `--base-ref` defaults to `main`, then `master`.
- `--validate` runs any shell command (the CLI user is trusted). Each command
  has a 120 s timeout; output is capped at 8,000 characters (tail kept).
- Writes `review-report.md` (or `review-report.json` with `--format json`),
  or the path given by `--out`.
- Exit codes: `0` ok, `1` a validation failed or the review errored, `2` bad arguments.

### MCP — for AI coding agents

```bash
INSPECTOR_ALLOWED_ROOT=/path/to/workspaces \
INSPECTOR_ALLOWED_VALIDATIONS="npm test;npm run typecheck" \
npm run mcp-server
```

Tool `review_repository` input:

| field | type | notes |
|---|---|---|
| `repo_path` | string, required | must resolve inside `INSPECTOR_ALLOWED_ROOT` (default: server cwd) |
| `base_ref` | string, optional | refs starting with `-` are rejected |
| `validation_commands` | string[], optional | each must exactly match an entry in `INSPECTOR_ALLOWED_VALIDATIONS` (default: none) |
| `format` | `markdown` \| `json`, optional | |

The report is returned in the tool result (nothing is written to disk).
Errors are returned as `isError: true` with a one-line message.

## Project layout

```text
src/core.ts         shared review orchestration
src/cli.ts          command-line adapter
src/mcp-server.ts   MCP adapter
src/git.ts          Git inspection
src/validation.ts   validation execution
src/report.ts       Markdown / JSON report generation
test/               unit and integration tests
```

When finished, submit via **Security → Report a vulnerability** on this
repo — see `SECURITY.md` for exactly what to include. Do not reply by email;
that submission channel is not monitored.