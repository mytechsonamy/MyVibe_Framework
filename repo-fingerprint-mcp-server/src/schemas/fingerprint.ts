import { z } from "zod";

// ============================================================================
// FINGERPRINT SCHEMAS
// ============================================================================

export const CreateFingerprintSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  deep: z.boolean().default(false).describe("Perform deep analysis (slower but more accurate)"),
  includeTests: z.boolean().default(true),
  maxFiles: z.number().default(100).describe("Max files to analyze")
}).strict();

export const GetFingerprintSchema = z.object({
  repoPath: z.string().describe("Repository path")
}).strict();

export const UpdateFingerprintSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  incrementalOnly: z.boolean().default(true).describe("Only analyze changed files")
}).strict();

// ============================================================================
// STYLE ANALYSIS SCHEMAS
// ============================================================================

export const AnalyzeCodingStyleSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  files: z.array(z.string()).optional().describe("Specific files to analyze"),
  sampleSize: z.number().default(20)
}).strict();

export const AnalyzeNamingSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  scope: z.enum(["all", "files", "code"]).default("all")
}).strict();

export const AnalyzeErrorHandlingSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  includeExamples: z.boolean().default(true)
}).strict();

export const AnalyzeLoggingSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  includeExamples: z.boolean().default(true)
}).strict();

// ============================================================================
// PATTERN DETECTION SCHEMAS
// ============================================================================

export const DetectPatternsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  patternType: z.enum(["all", "error", "async", "import", "export", "custom"]).default("all"),
  minOccurrences: z.number().default(3)
}).strict();

export const LearnCustomPatternSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  name: z.string().describe("Pattern name"),
  description: z.string().describe("Pattern description"),
  regex: z.string().describe("Pattern regex"),
  category: z.string().optional()
}).strict();

export const ValidateAgainstFingerprintSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  code: z.string().describe("Code to validate"),
  context: z.string().optional().describe("Context (file type, purpose)")
}).strict();

// ============================================================================
// STRUCTURE ANALYSIS SCHEMAS
// ============================================================================

export const AnalyzeStructureSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  depth: z.number().default(3).describe("Directory depth to analyze")
}).strict();

export const AnalyzeDependenciesSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  includeDevDeps: z.boolean().default(true)
}).strict();

export const AnalyzeTestingPatternsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  includeExamples: z.boolean().default(true)
}).strict();

// ============================================================================
// GENERATION SCHEMAS
// ============================================================================

export const GenerateStyleGuideSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  format: z.enum(["markdown", "json", "html"]).default("markdown"),
  sections: z.array(z.string()).optional().describe("Specific sections to include")
}).strict();

export const GenerateTemplateSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  templateType: z.enum(["function", "class", "component", "test", "service", "controller"]),
  name: z.string().describe("Template name"),
  options: z.record(z.any()).optional()
}).strict();

export const SuggestConventionSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  codeType: z.enum(["function", "class", "variable", "constant", "file", "directory"]),
  context: z.string().describe("Context or purpose")
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type CreateFingerprintInput = z.infer<typeof CreateFingerprintSchema>;
export type GetFingerprintInput = z.infer<typeof GetFingerprintSchema>;
export type UpdateFingerprintInput = z.infer<typeof UpdateFingerprintSchema>;
export type AnalyzeCodingStyleInput = z.infer<typeof AnalyzeCodingStyleSchema>;
export type AnalyzeNamingInput = z.infer<typeof AnalyzeNamingSchema>;
export type AnalyzeErrorHandlingInput = z.infer<typeof AnalyzeErrorHandlingSchema>;
export type AnalyzeLoggingInput = z.infer<typeof AnalyzeLoggingSchema>;
export type DetectPatternsInput = z.infer<typeof DetectPatternsSchema>;
export type LearnCustomPatternInput = z.infer<typeof LearnCustomPatternSchema>;
export type ValidateAgainstFingerprintInput = z.infer<typeof ValidateAgainstFingerprintSchema>;
export type AnalyzeStructureInput = z.infer<typeof AnalyzeStructureSchema>;
export type AnalyzeDependenciesInput = z.infer<typeof AnalyzeDependenciesSchema>;
export type AnalyzeTestingPatternsInput = z.infer<typeof AnalyzeTestingPatternsSchema>;
export type GenerateStyleGuideInput = z.infer<typeof GenerateStyleGuideSchema>;
export type GenerateTemplateInput = z.infer<typeof GenerateTemplateSchema>;
export type SuggestConventionInput = z.infer<typeof SuggestConventionSchema>;
