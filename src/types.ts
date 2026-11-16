export type ChangedFile = {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied" | "untracked";
  previousPath?: string;
};

export type ValidationResult = {
  command: string;
  status: "passed" | "failed";
  exitCode: number | null;
  timedOut: boolean;
  output: string;
  truncated: boolean;
};

export type ReviewFormat = "markdown" | "json";

export type ReviewRequest = {
  repositoryPath: string;
  baseRef?: string;
  validationCommands?: string[];
  format?: ReviewFormat;
};

export type ReviewResult = {
  repositoryPath: string;
  baseRef: string;
  changedFiles: ChangedFile[];
  validationResults: ValidationResult[];
};
