import { z } from "zod";

// ============================================================================
// HOTSPOT SCHEMAS
// ============================================================================

export const AnalyzeHotspotsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  days: z.number().default(90).describe("Analysis period in days"),
  limit: z.number().default(20).describe("Max hotspots to return"),
  includeStable: z.boolean().default(false)
}).strict();

export const GetFileHotspotSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  filePath: z.string().describe("File to analyze"),
  includeHistory: z.boolean().default(true)
}).strict();

export const AnalyzeChurnSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  period: z.enum(["week", "month", "quarter", "year"]).default("month"),
  groupBy: z.enum(["file", "directory", "author"]).default("file")
}).strict();

// ============================================================================
// OWNERSHIP SCHEMAS
// ============================================================================

export const GetOwnershipMapSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  path: z.string().optional().describe("Specific path to analyze"),
  minContributions: z.number().default(3)
}).strict();

export const FindOwnersSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  files: z.array(z.string()).describe("Files to find owners for")
}).strict();

export const AnalyzeDomainAreasSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  depth: z.number().default(2).describe("Directory depth for domain detection")
}).strict();

export const GetTeamOwnershipSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  teamMapping: z.record(z.array(z.string())).optional().describe("Team -> members mapping")
}).strict();

// ============================================================================
// BUG ANALYSIS SCHEMAS
// ============================================================================

export const FindBugProneFilesSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  days: z.number().default(180).describe("Analysis period"),
  limit: z.number().default(20),
  bugPatterns: z.array(z.string()).optional().describe("Commit message patterns for bugs")
}).strict();

export const AnalyzeBugIndicatorsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  filePath: z.string().describe("File to analyze")
}).strict();

// ============================================================================
// RISK ANALYSIS SCHEMAS
// ============================================================================

export const CalculateRiskModelSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  scope: z.enum(["full", "changed", "critical"]).default("full"),
  baseBranch: z.string().default("main")
}).strict();

export const GetRiskTrendSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  periods: z.number().default(6).describe("Number of periods to analyze"),
  periodType: z.enum(["week", "month"]).default("month")
}).strict();

export const IdentifyRiskFactorsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  changedFiles: z.array(z.string()).optional().describe("Specific changed files")
}).strict();

// ============================================================================
// AUTHOR ANALYSIS SCHEMAS
// ============================================================================

export const AnalyzeAuthorContributionsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  days: z.number().default(365),
  minCommits: z.number().default(5)
}).strict();

export const GetFileAuthorsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  filePath: z.string().describe("File to analyze")
}).strict();

export const FindInactiveOwnersSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  inactiveDays: z.number().default(90).describe("Days without commits to be considered inactive")
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type AnalyzeHotspotsInput = z.infer<typeof AnalyzeHotspotsSchema>;
export type GetFileHotspotInput = z.infer<typeof GetFileHotspotSchema>;
export type AnalyzeChurnInput = z.infer<typeof AnalyzeChurnSchema>;
export type GetOwnershipMapInput = z.infer<typeof GetOwnershipMapSchema>;
export type FindOwnersInput = z.infer<typeof FindOwnersSchema>;
export type AnalyzeDomainAreasInput = z.infer<typeof AnalyzeDomainAreasSchema>;
export type GetTeamOwnershipInput = z.infer<typeof GetTeamOwnershipSchema>;
export type FindBugProneFilesInput = z.infer<typeof FindBugProneFilesSchema>;
export type AnalyzeBugIndicatorsInput = z.infer<typeof AnalyzeBugIndicatorsSchema>;
export type CalculateRiskModelInput = z.infer<typeof CalculateRiskModelSchema>;
export type GetRiskTrendInput = z.infer<typeof GetRiskTrendSchema>;
export type IdentifyRiskFactorsInput = z.infer<typeof IdentifyRiskFactorsSchema>;
export type AnalyzeAuthorContributionsInput = z.infer<typeof AnalyzeAuthorContributionsSchema>;
export type GetFileAuthorsInput = z.infer<typeof GetFileAuthorsSchema>;
export type FindInactiveOwnersInput = z.infer<typeof FindInactiveOwnersSchema>;
