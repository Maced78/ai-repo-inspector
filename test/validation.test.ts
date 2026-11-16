import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { MAX_OUTPUT_CHARS, runValidation, runValidations } from "../src/validation.js";

describe("runValidation", () => {
  it("reports a failing command as failed instead of throwing", async () => {
    const result = await runValidation("echo out; echo err 1>&2; exit 3", tmpdir());
    expect(result.status).toBe("failed");
    expect(result.exitCode).toBe(3);
    expect(result.output).toContain("out");
    expect(result.output).toContain("err");
  });

  it("keeps running later commands after a failure", async () => {
    const results = await runValidations(["exit 1", "echo second"], tmpdir());
    expect(results.map((result) => result.status)).toEqual(["failed", "passed"]);
  });

  it("kills commands that exceed the timeout", async () => {
    const result = await runValidation("sleep 5", tmpdir(), 200);
    expect(result.timedOut).toBe(true);
    expect(result.status).toBe("failed");
  });

  it("truncates very large output and keeps the tail", async () => {
    const result = await runValidation(
      `node -e "process.stdout.write('x'.repeat(${MAX_OUTPUT_CHARS * 2}) + 'END')"`,
      tmpdir(),
    );
    expect(result.truncated).toBe(true);
    expect(result.output.length).toBe(MAX_OUTPUT_CHARS);
    expect(result.output.endsWith("END")).toBe(true);
  });
});
