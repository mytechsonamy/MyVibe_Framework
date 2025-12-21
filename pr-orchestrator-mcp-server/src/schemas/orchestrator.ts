import { z } from "zod";

// ============================================================================
// BRANCH SCHEMAS
// ============================================================================

export const CreateBranchSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  type: z.enum(["feature", "bugfix", "hotfix", "release", "refactor", "chore"]),
  ticket: z.string().optional().describe("Ticket/issue ID"),
  description: z.string().describe("Branch description"),
  baseBranch: z.string().default("main").describe("Base branch to create from")
}).strict();

export const ValidateBranchNameSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  branchName: z.string().describe("Branch name to validate")
}).strict();

export const GetBranchInfoSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  branchName: z.string().optional().describe("Branch name (default: current)")
}).strict();

// ============================================================================
// CODEOWNERS SCHEMAS
// ============================================================================

export const ParseCodeOwnersSchema = z.object({
  repoPath: z.string().describe("Repository path")
}).strict();

export const GetOwnersForFilesSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  files: z.array(z.string()).describe("Files to get owners for")
}).strict();

export const GenerateCodeOwnersSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  strategy: z.enum(["git-history", "directory-based", "hybrid"]).default("hybrid"),
  minCommits: z.number().default(5).describe("Minimum commits to be considered owner")
}).strict();

// ============================================================================
// PR TEMPLATE SCHEMAS
// ============================================================================

export const GeneratePRTemplateSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  branchName: z.string().optional().describe("Branch name (default: current)"),
  summary: z.string().optional().describe("PR summary"),
  testing: z.string().optional().describe("Testing notes"),
  additionalContext: z.record(z.string()).optional()
}).strict();

export const AnalyzePRSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  baseBranch: z.string().default("main").describe("Base branch to compare against"),
  includeSuggestions: z.boolean().default(true)
}).strict();

export const GetPRSizeSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  baseBranch: z.string().default("main")
}).strict();

// ============================================================================
// AI PROVENANCE SCHEMAS
// ============================================================================

export const GenerateProvenanceSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  model: z.string().default("claude-opus-4-5").describe("AI model used"),
  sessionId: z.string().optional().describe("Session ID for tracking"),
  baseBranch: z.string().default("main")
}).strict();

export const TrackAIChangeSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  file: z.string().describe("File path"),
  changeType: z.enum(["created", "modified", "deleted"]),
  description: z.string().describe("Change description"),
  linesChanged: z.number().default(0)
}).strict();

// ============================================================================
// REVIEWER SCHEMAS
// ============================================================================

export const SuggestReviewersSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  baseBranch: z.string().default("main"),
  maxReviewers: z.number().default(3),
  includeAISuggested: z.boolean().default(true)
}).strict();

// ============================================================================
// WORKFLOW SCHEMAS
// ============================================================================

export const InitWorkflowSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  preset: z.enum(["minimal", "standard", "strict"]).default("standard"),
  outputDir: z.string().default(".github")
}).strict();

export const GetWorkflowConfigSchema = z.object({
  repoPath: z.string().describe("Repository path")
}).strict();

export const GenerateLabelsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  baseBranch: z.string().default("main")
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;
export type ValidateBranchNameInput = z.infer<typeof ValidateBranchNameSchema>;
export type GetBranchInfoInput = z.infer<typeof GetBranchInfoSchema>;
export type ParseCodeOwnersInput = z.infer<typeof ParseCodeOwnersSchema>;
export type GetOwnersForFilesInput = z.infer<typeof GetOwnersForFilesSchema>;
export type GenerateCodeOwnersInput = z.infer<typeof GenerateCodeOwnersSchema>;
export type GeneratePRTemplateInput = z.infer<typeof GeneratePRTemplateSchema>;
export type AnalyzePRInput = z.infer<typeof AnalyzePRSchema>;
export type GetPRSizeInput = z.infer<typeof GetPRSizeSchema>;
export type GenerateProvenanceInput = z.infer<typeof GenerateProvenanceSchema>;
export type TrackAIChangeInput = z.infer<typeof TrackAIChangeSchema>;
export type SuggestReviewersInput = z.infer<typeof SuggestReviewersSchema>;
export type InitWorkflowInput = z.infer<typeof InitWorkflowSchema>;
export type GetWorkflowConfigInput = z.infer<typeof GetWorkflowConfigSchema>;
export type GenerateLabelsInput = z.infer<typeof GenerateLabelsSchema>;
