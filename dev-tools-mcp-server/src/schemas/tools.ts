import { z } from "zod";

// ============================================================================
// WORKSPACE SCHEMAS
// ============================================================================

export const CreateWorkspaceSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID from project-state server"),
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only").describe("Workspace folder name (e.g., 'todo-list-api')"),
  description: z.string().optional().describe("Project description for README"),
  techStack: z.array(z.string()).optional().describe("Technologies used (creates appropriate folder structure)")
}).strict();

export const GetWorkspaceSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID")
}).strict();

export const ListWorkspacesSchema = z.object({}).strict();

// ============================================================================
// FILE SCHEMAS
// ============================================================================

export const FileWriteSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  path: z.string().min(1).describe("Relative path within workspace (e.g., 'docs/requirements.md')"),
  content: z.string().describe("File content to write"),
  createDirs: z.boolean().default(true).describe("Create parent directories if they don't exist")
}).strict();

export const FileReadSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  path: z.string().min(1).describe("Relative path within workspace")
}).strict();

export const FileListSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  path: z.string().default(".").describe("Relative path to list (default: root)"),
  recursive: z.boolean().default(false).describe("List recursively")
}).strict();

export const FileDeleteSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  path: z.string().min(1).describe("Relative path within workspace")
}).strict();

export const FileCopySchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  sourcePath: z.string().min(1).describe("Source path"),
  destPath: z.string().min(1).describe("Destination path")
}).strict();

// ============================================================================
// GIT SCHEMAS
// ============================================================================

export const GitInitSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  initialBranch: z.string().default("main").describe("Initial branch name")
}).strict();

export const GitStatusSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID")
}).strict();

export const GitAddSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  paths: z.array(z.string()).default(["."]).describe("Paths to stage (default: all)")
}).strict();

export const GitCommitSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  message: z.string().min(1).describe("Commit message"),
  addAll: z.boolean().default(true).describe("Stage all changes before commit")
}).strict();

export const GitLogSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  limit: z.number().int().min(1).max(100).default(10).describe("Number of commits to show")
}).strict();

export const GitBranchSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  name: z.string().optional().describe("Branch name to create (omit to list branches)"),
  checkout: z.boolean().default(false).describe("Checkout after creating")
}).strict();

export const GitCheckoutSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  branch: z.string().min(1).describe("Branch name to checkout")
}).strict();

export const GitRevertSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  commitHash: z.string().min(4).describe("Commit hash to revert"),
  noCommit: z.boolean().default(false).describe("Stage changes but don't commit (allows reviewing before commit)")
}).strict();

export const GitResetSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  commitHash: z.string().min(4).describe("Commit hash to reset to"),
  mode: z.enum(["soft", "mixed", "hard"]).default("mixed").describe("Reset mode: soft (keep staged), mixed (unstage), hard (discard all)")
}).strict();

export const GitTagSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  name: z.string().min(1).describe("Tag name (e.g., 'v1.0.0', 'deploy-2024-01-15')"),
  message: z.string().optional().describe("Tag message (creates annotated tag)"),
  commitHash: z.string().optional().describe("Commit to tag (default: HEAD)")
}).strict();

export const GitListTagsSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID")
}).strict();

export const GitDiffSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  fromCommit: z.string().min(4).describe("Starting commit hash"),
  toCommit: z.string().default("HEAD").describe("Ending commit hash (default: HEAD)")
}).strict();

// ============================================================================
// EXEC SCHEMAS
// ============================================================================

export const ExecCommandSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  command: z.string().min(1).describe("Command to execute"),
  timeout: z.number().int().min(1000).max(300000).default(60000).describe("Timeout in milliseconds (default: 60s)")
}).strict();

export const RunTestsSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  framework: z.enum(["auto", "jest", "pytest", "xunit", "dotnet", "npm"]).default("auto").describe("Test framework (auto-detect if not specified)"),
  filter: z.string().optional().describe("Test filter pattern")
}).strict();

export const RunBuildSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  command: z.string().optional().describe("Custom build command (auto-detect if not specified)")
}).strict();

export const RunLintSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  fix: z.boolean().default(false).describe("Auto-fix issues if possible")
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type GetWorkspaceInput = z.infer<typeof GetWorkspaceSchema>;
export type FileWriteInput = z.infer<typeof FileWriteSchema>;
export type FileReadInput = z.infer<typeof FileReadSchema>;
export type FileListInput = z.infer<typeof FileListSchema>;
export type FileDeleteInput = z.infer<typeof FileDeleteSchema>;
export type FileCopyInput = z.infer<typeof FileCopySchema>;
export type GitInitInput = z.infer<typeof GitInitSchema>;
export type GitStatusInput = z.infer<typeof GitStatusSchema>;
export type GitAddInput = z.infer<typeof GitAddSchema>;
export type GitCommitInput = z.infer<typeof GitCommitSchema>;
export type GitLogInput = z.infer<typeof GitLogSchema>;
export type GitBranchInput = z.infer<typeof GitBranchSchema>;
export type GitCheckoutInput = z.infer<typeof GitCheckoutSchema>;
export type GitRevertInput = z.infer<typeof GitRevertSchema>;
export type GitResetInput = z.infer<typeof GitResetSchema>;
export type GitTagInput = z.infer<typeof GitTagSchema>;
export type GitListTagsInput = z.infer<typeof GitListTagsSchema>;
export type GitDiffInput = z.infer<typeof GitDiffSchema>;
export type ExecCommandInput = z.infer<typeof ExecCommandSchema>;
export type RunTestsInput = z.infer<typeof RunTestsSchema>;
export type RunBuildInput = z.infer<typeof RunBuildSchema>;
export type RunLintInput = z.infer<typeof RunLintSchema>;
