import { z } from "zod";

// ============================================================================
// CONFIGURATION SCHEMAS
// ============================================================================

export const InitConfigSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  preset: z.enum(["clean-architecture", "mvc", "hexagonal", "custom"]).default("mvc")
    .describe("Architecture preset"),
  outputFile: z.string().default(".arch-guardrails.json").describe("Config file path")
}).strict();

export const LoadConfigSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  configFile: z.string().optional().describe("Config file path (auto-detected)")
}).strict();

export const UpdateRuleSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  ruleId: z.string().describe("Rule ID to update"),
  enabled: z.boolean().optional(),
  severity: z.enum(["error", "warning", "info"]).optional(),
  config: z.record(z.any()).optional()
}).strict();

// ============================================================================
// ANALYSIS SCHEMAS
// ============================================================================

export const AnalyzeSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  files: z.array(z.string()).optional().describe("Specific files to analyze"),
  rules: z.array(z.string()).optional().describe("Specific rules to check"),
  fix: z.boolean().default(false).describe("Auto-fix violations where possible")
}).strict();

export const AnalyzeLayersSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  layers: z.array(z.object({
    name: z.string(),
    patterns: z.array(z.string()),
    allowedDependencies: z.array(z.string())
  })).optional().describe("Layer definitions (uses config if not provided)")
}).strict();

export const CheckBoundarySchema = z.object({
  repoPath: z.string().describe("Repository path"),
  sourceFile: z.string().describe("Source file path"),
  targetFile: z.string().describe("Target file (import target)")
}).strict();

// ============================================================================
// PATTERN SCHEMAS
// ============================================================================

export const CheckPatternSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  pattern: z.string().describe("Pattern name to check"),
  files: z.array(z.string()).optional().describe("Specific files to check")
}).strict();

export const DefinePatternSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  name: z.string().describe("Pattern name"),
  description: z.string().describe("Pattern description"),
  filePattern: z.string().describe("Glob pattern for files"),
  mustContain: z.array(z.string()).optional(),
  mustNotContain: z.array(z.string()).optional(),
  mustExport: z.array(z.string()).optional(),
  maxLines: z.number().optional(),
  maxComplexity: z.number().optional()
}).strict();

// ============================================================================
// NAMING SCHEMAS
// ============================================================================

export const CheckNamingSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  scope: z.enum(["file", "class", "function", "variable", "constant", "type"]).optional(),
  files: z.array(z.string()).optional()
}).strict();

export const DefineNamingRuleSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  pattern: z.string().describe("File pattern to match"),
  convention: z.enum(["camelCase", "PascalCase", "snake_case", "SCREAMING_SNAKE_CASE", "kebab-case"]),
  scope: z.enum(["file", "class", "function", "variable", "constant", "type"]),
  exceptions: z.array(z.string()).optional()
}).strict();

// ============================================================================
// DEPENDENCY SCHEMAS
// ============================================================================

export const CheckDependenciesSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  file: z.string().optional().describe("Specific file to check"),
  checkCircular: z.boolean().default(true),
  maxDepth: z.number().default(3)
}).strict();

export const FindCircularDepsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  entryPoints: z.array(z.string()).optional().describe("Entry points to start from")
}).strict();

// ============================================================================
// SECURITY SCHEMAS
// ============================================================================

export const CheckSecuritySchema = z.object({
  repoPath: z.string().describe("Repository path"),
  files: z.array(z.string()).optional(),
  rules: z.array(z.enum(["no-secrets", "no-sql-injection", "validate-input"])).optional()
}).strict();

// ============================================================================
// REPORT SCHEMAS
// ============================================================================

export const GenerateReportSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  format: z.enum(["json", "markdown", "html"]).default("markdown"),
  includeDetails: z.boolean().default(true),
  outputFile: z.string().optional()
}).strict();

export const GetScoreSchema = z.object({
  repoPath: z.string().describe("Repository path")
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type InitConfigInput = z.infer<typeof InitConfigSchema>;
export type LoadConfigInput = z.infer<typeof LoadConfigSchema>;
export type UpdateRuleInput = z.infer<typeof UpdateRuleSchema>;
export type AnalyzeInput = z.infer<typeof AnalyzeSchema>;
export type AnalyzeLayersInput = z.infer<typeof AnalyzeLayersSchema>;
export type CheckBoundaryInput = z.infer<typeof CheckBoundarySchema>;
export type CheckPatternInput = z.infer<typeof CheckPatternSchema>;
export type DefinePatternInput = z.infer<typeof DefinePatternSchema>;
export type CheckNamingInput = z.infer<typeof CheckNamingSchema>;
export type DefineNamingRuleInput = z.infer<typeof DefineNamingRuleSchema>;
export type CheckDependenciesInput = z.infer<typeof CheckDependenciesSchema>;
export type FindCircularDepsInput = z.infer<typeof FindCircularDepsSchema>;
export type CheckSecurityInput = z.infer<typeof CheckSecuritySchema>;
export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;
export type GetScoreInput = z.infer<typeof GetScoreSchema>;
