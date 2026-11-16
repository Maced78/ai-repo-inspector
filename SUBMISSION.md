# Submission

## What did you investigate first, and why?

I ran the CLI with a failing validation (`--validate "exit 1"`): the whole review crashed and no report was written. Then I looked at the MCP adapter, because its caller is an AI agent whose input can be manipulated. Confirmed issues:
- MCP read `input.repoPath` but the schema declared `repo_path`, so it silently inspected the server's own directory.
- MCP passed any `validationCommands` to `exec()`: arbitrary command execution.
- A base ref like `--output=/tmp/x` made `git diff` write a file.
- Hard-coded `main` base, `--format json` ignored, renames parsed wrongly, paths with spaces cut.

## What did you choose to implement or fix?

Safety first, then correctness, then reliability:
1. Fixed the MCP input contract (typed with zod, no `any`).
2. MCP agent policy: repos only under `INSPECTOR_ALLOWED_ROOT`, commands only from `INSPECTOR_ALLOWED_VALIDATIONS` (empty by default).
3. Unsafe base refs rejected.
4. Failing validations are reported as FAILED instead of crashing; timeout and output cap added.
5. Base `main`, then `master`; correct rename parsing; working `--format json`; CI-friendly exit codes.
6. My addition: the MCP report is wrapped as untrusted data (`<<<REPORT … REPORT>>>` plus a warning), and fake end markers are neutralized. MCP only, because there the reader is a model that can be tricked by text inside the repo; on the CLI the reader is a human.
7. Tests: from 1 to 20. README documents both interfaces.

## What did you intentionally not do?

- Uncommitted or untracked changes are not reported.
- No limit on the number of files listed.
- CLI validation commands are not sandboxed (the CLI user is trusted).
- No end-to-end MCP test in the suite (verified manually).

## Interface decision

- Decision: hybrid
- Primary user and execution environment: developers on their own machine or in CI use the CLI; AI coding agents on the developer's machine use the MCP stdio server.
- Trust boundary and allowed capabilities: the CLI user is trusted and can run any validation command. The MCP caller is not fully trusted: only repos under an allowed root, only allowlisted commands, no disk writes, and its output is marked as untrusted data.
- Reliability, discoverability, latency/context, and output tradeoffs: timeouts so the agent never hangs; output capped at 8,000 chars (keeping the tail, where failures are) to protect the agent's context; allowed commands listed in the tool description; short error messages; JSON for agents, Markdown for humans.
- How supported interfaces remain consistent: both call the same `inspect()` and `render()` in `core.ts`; only the MCP policy and output wrapping differ, and both are tested.
- Evidence that would change this decision: if agents become the main users, go MCP-first with structured output; if agents run in isolated sandboxes, relax the allowlist; if nobody uses MCP, go CLI-first.

## How did you use an AI coding agent?

I used Claude to read the code, find likely issues and reproduce them. Because of the 90-minute limit, most of the code and tests were written by the AI. I reproduced a bug myself, reviewed each change, ran the tests, wrote the commit messages, and designed the untrusted-output layer.

## Where did you check, correct, or reject an AI suggestion? (required)

- The AI's fixes covered the code but not what the agent reads. I did not accept them as complete and added the untrusted-output layer.
- The AI first said the marker split count in my test should be 2. I changed it to 2, saw the test fail, and confirmed 3 is correct, because the warning text itself contains the marker.
- The AI's first timeout implementation killed only the shell; the test hung because the child process kept the output pipe open. Fixed by killing the whole process group.

## Commands used to verify the result, with outcomes

- `npm run typecheck`: passes
- `npm test`: 5 files, 20 tests pass
- `npm run inspector -- review --repo . --validate "exit 1"`: before, a crash; after, the report shows `FAILED: exit 1`
- Manual MCP calls: an allowed command works; `rm -rf ~` is rejected; a repo outside the root is rejected; `base_ref: "--output=/tmp/x"` is rejected.

## A blocker you hit and how you approached it

The hanging timeout test (above). Instead of raising the test timeout, we found why it hung: a child process held the pipe open. Killing the process group fixed a real bug that would also hang `npm test`-style commands.

## Known limitations and the next three things you would do

Limitations: `npm install` reports 15 dependency vulnerabilities (not addressed; `npm audit fix --force` could break versions). Process-group kill is POSIX-only (Windows not tested).
1. Report uncommitted and untracked changes.
2. Add an end-to-end MCP test over stdio.
3. Limit or paginate very large file lists; make timeout and output cap configurable.

## Approximate focused-work time

- Start: 14:44
- Finish: 15:48
