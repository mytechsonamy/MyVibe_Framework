import { z } from "zod";

// ============================================================================
// CHANGE ANALYSIS SCHEMAS
// ============================================================================

export const AnalyzeChangesSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  baseBranch: z.string().default("main").describe("Base branch to compare against"),
  targetBranch: z.string().optional().describe("Target branch (default: current branch)"),
  includePaths: z.array(z.string()).optional().describe("Only analyze these paths"),
  excludePaths: z.array(z.string()).optional().describe("Exclude these paths")
}).strict();

export const DetectBreakingChangesSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  changedFiles: z.array(z.string()).describe("List of changed files"),
  checkAPI: z.boolean().default(true).describe("Check for API breaking changes"),
  checkSchema: z.boolean().default(true).describe("Check for schema changes"),
  checkConfig: z.boolean().default(true).describe("Check for config changes")
}).strict();

// ============================================================================
// SLICING SCHEMAS
// ============================================================================

export const SliceChangesSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  changedFiles: z.array(z.string()).describe("Files to slice into PRs"),
  strategy: z.enum(["by-module", "by-layer", "by-feature", "by-risk"]).default("by-module")
    .describe("Slicing strategy"),
  maxFilesPerPR: z.number().default(15).describe("Maximum files per PR"),
  maxLOCPerPR: z.number().default(500).describe("Maximum lines of code per PR"),
  groupTests: z.boolean().default(true).describe("Group tests with implementation"),
  atomicChanges: z.boolean().default(true).describe("Ensure each PR is independently deployable")
}).strict();

export const ReorderSlicesSchema = z.object({
  slices: z.array(z.object({
    id: z.string(),
    dependencies: z.array(z.string())
  })).describe("Slices with their dependencies"),
  prioritize: z.enum(["risk-first", "foundation-first", "quick-wins"]).default("foundation-first")
    .describe("Prioritization strategy")
}).strict();

// ============================================================================
// FEATURE FLAG SCHEMAS
// ============================================================================

export const GenerateFeatureFlagsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  slices: z.array(z.object({
    id: z.string(),
    title: z.string(),
    files: z.array(z.string())
  })).describe("PR slices to generate flags for"),
  flagSystem: z.enum(["launchdarkly", "unleash", "custom", "env-vars"]).default("env-vars")
    .describe("Feature flag system to use"),
  includeKillSwitch: z.boolean().default(true).describe("Add kill switch for each flag")
}).strict();

export const GenerateFlagCodeSchema = z.object({
  flagName: z.string().describe("Feature flag name"),
  language: z.enum(["typescript", "javascript", "python", "go"]).describe("Target language"),
  flagType: z.enum(["boolean", "percentage", "user-segment"]).default("boolean"),
  defaultValue: z.string().default("false").describe("Default flag value")
}).strict();

// ============================================================================
// ROLLOUT PLANNING SCHEMAS
// ============================================================================

export const CreateRolloutPlanSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  deliveryPlanId: z.string().describe("Delivery plan ID"),
  stages: z.array(z.enum(["internal", "canary", "beta", "gradual", "full"])).default(["internal", "canary", "gradual", "full"])
    .describe("Rollout stages"),
  metrics: z.array(z.string()).optional().describe("Metrics to monitor"),
  autoRollback: z.boolean().default(true).describe("Enable automatic rollback on errors")
}).strict();

export const GenerateRollbackPlanSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  sliceId: z.string().describe("PR slice ID"),
  includeDataRollback: z.boolean().default(true).describe("Include data migration rollback"),
  includeFeatureFlagDisable: z.boolean().default(true).describe("Include feature flag disable steps")
}).strict();

// ============================================================================
// COMPATIBILITY SCHEMAS
// ============================================================================

export const GenerateCompatibilityPlanSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  breakingChanges: z.array(z.object({
    type: z.string(),
    description: z.string(),
    affectedConsumers: z.array(z.string())
  })).describe("Detected breaking changes"),
  deprecationPeriod: z.string().default("30 days").describe("Deprecation period before removal"),
  versioningStrategy: z.enum(["url-path", "header", "query-param"]).default("url-path")
}).strict();

export const GenerateMigrationScriptsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  schemaChanges: z.array(z.object({
    table: z.string(),
    changeType: z.enum(["add-column", "remove-column", "modify-column", "add-table", "remove-table"]),
    details: z.string()
  })).describe("Schema changes requiring migration"),
  database: z.enum(["postgresql", "mysql", "sqlite", "mongodb"]).default("postgresql")
}).strict();

// ============================================================================
// DELIVERY PLAN SCHEMAS
// ============================================================================

export const CreateDeliveryPlanSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  name: z.string().describe("Plan name"),
  strategy: z.enum(["feature-flag", "branch-by-abstraction", "strangler-fig", "parallel-run", "dark-launch"])
    .default("feature-flag").describe("Delivery strategy"),
  baseBranch: z.string().default("main").describe("Base branch"),
  autoSlice: z.boolean().default(true).describe("Automatically slice changes")
}).strict();

export const GetDeliveryPlanSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  planId: z.string().describe("Delivery plan ID")
}).strict();

export const ValidateDeliveryPlanSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  planId: z.string().describe("Delivery plan ID"),
  checkDependencies: z.boolean().default(true).describe("Validate PR dependencies"),
  checkRollback: z.boolean().default(true).describe("Validate rollback plans exist"),
  checkTests: z.boolean().default(true).describe("Validate test coverage")
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type AnalyzeChangesInput = z.infer<typeof AnalyzeChangesSchema>;
export type DetectBreakingChangesInput = z.infer<typeof DetectBreakingChangesSchema>;
export type SliceChangesInput = z.infer<typeof SliceChangesSchema>;
export type ReorderSlicesInput = z.infer<typeof ReorderSlicesSchema>;
export type GenerateFeatureFlagsInput = z.infer<typeof GenerateFeatureFlagsSchema>;
export type GenerateFlagCodeInput = z.infer<typeof GenerateFlagCodeSchema>;
export type CreateRolloutPlanInput = z.infer<typeof CreateRolloutPlanSchema>;
export type GenerateRollbackPlanInput = z.infer<typeof GenerateRollbackPlanSchema>;
export type GenerateCompatibilityPlanInput = z.infer<typeof GenerateCompatibilityPlanSchema>;
export type GenerateMigrationScriptsInput = z.infer<typeof GenerateMigrationScriptsSchema>;
export type CreateDeliveryPlanInput = z.infer<typeof CreateDeliveryPlanSchema>;
export type GetDeliveryPlanInput = z.infer<typeof GetDeliveryPlanSchema>;
export type ValidateDeliveryPlanInput = z.infer<typeof ValidateDeliveryPlanSchema>;
