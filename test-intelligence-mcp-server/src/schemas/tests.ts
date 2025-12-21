import { z } from "zod";

// ============================================================================
// TEST DISCOVERY SCHEMAS
// ============================================================================

export const DiscoverTestsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  framework: z.enum(["jest", "mocha", "vitest", "pytest", "go-test", "junit"]).optional()
    .describe("Test framework (auto-detected if not specified)"),
  includePaths: z.array(z.string()).optional().describe("Only search in these paths"),
  excludePaths: z.array(z.string()).optional().describe("Exclude these paths")
}).strict();

export const AnalyzeTestFileSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  testFile: z.string().describe("Path to test file"),
  includeSource: z.boolean().default(false).describe("Include test source code")
}).strict();

// ============================================================================
// IMPACT-BASED TEST SELECTION SCHEMAS
// ============================================================================

export const SelectTestsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  changedFiles: z.array(z.string()).describe("Changed source files"),
  includeFlaky: z.boolean().default(false).describe("Include known flaky tests"),
  maxTests: z.number().optional().describe("Maximum tests to select"),
  testTypes: z.array(z.enum(["unit", "integration", "e2e", "performance", "snapshot"]))
    .optional().describe("Filter by test type")
}).strict();

export const GetImpactedTestsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  changedFiles: z.array(z.string()).describe("Changed source files"),
  depth: z.number().default(2).describe("Dependency traversal depth")
}).strict();

// ============================================================================
// FLAKY TEST DETECTION SCHEMAS
// ============================================================================

export const DetectFlakyTestsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  historyDays: z.number().default(30).describe("Days of history to analyze"),
  minRuns: z.number().default(5).describe("Minimum runs to consider"),
  flakyThreshold: z.number().default(0.95).describe("Pass rate below this = flaky")
}).strict();

export const AnalyzeFlakyTestSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  testId: z.string().describe("Test ID to analyze"),
  includeHistory: z.boolean().default(true).describe("Include run history")
}).strict();

export const QuarantineTestSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  testId: z.string().describe("Test ID to quarantine"),
  reason: z.string().describe("Reason for quarantine"),
  autoRetry: z.number().default(3).describe("Auto-retry count before fail")
}).strict();

// ============================================================================
// COVERAGE ANALYSIS SCHEMAS
// ============================================================================

export const AnalyzeCoverageSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  coverageFile: z.string().optional().describe("Path to coverage report (auto-detected)"),
  format: z.enum(["lcov", "cobertura", "istanbul", "go-cover"]).optional()
}).strict();

export const FindCoverageGapsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  minCoverage: z.number().default(80).describe("Minimum coverage percentage"),
  focusFiles: z.array(z.string()).optional().describe("Focus on specific files"),
  ignoreGenerated: z.boolean().default(true).describe("Ignore generated files")
}).strict();

export const SuggestTestsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  targetFile: z.string().describe("Source file to suggest tests for"),
  coverage: z.object({
    uncoveredLines: z.array(z.number()),
    uncoveredFunctions: z.array(z.string())
  }).optional().describe("Existing coverage data")
}).strict();

// ============================================================================
// MUTATION TESTING SCHEMAS
// ============================================================================

export const RunMutationTestsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  targetFiles: z.array(z.string()).optional().describe("Files to mutate"),
  mutationTypes: z.array(z.enum([
    "arithmetic", "relational", "logical", "conditional", "return", "assignment", "boundary"
  ])).optional().describe("Types of mutations to apply"),
  maxMutants: z.number().default(100).describe("Maximum mutants to generate")
}).strict();

export const AnalyzeMutationResultsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  resultsFile: z.string().optional().describe("Mutation results file")
}).strict();

// ============================================================================
// TEST HEALTH SCHEMAS
// ============================================================================

export const GetTestHealthSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  includeRecommendations: z.boolean().default(true).describe("Include improvement suggestions")
}).strict();

export const FindSlowTestsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  thresholdMs: z.number().default(1000).describe("Duration threshold in ms"),
  testType: z.enum(["unit", "integration", "e2e"]).optional()
}).strict();

export const FindDuplicateTestsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  similarityThreshold: z.number().default(0.8).describe("Similarity threshold (0-1)")
}).strict();

// ============================================================================
// TEST HISTORY SCHEMAS
// ============================================================================

export const RecordTestRunSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  results: z.array(z.object({
    testId: z.string(),
    testName: z.string(),
    file: z.string(),
    passed: z.boolean(),
    duration: z.number(),
    error: z.string().optional()
  })).describe("Test results to record")
}).strict();

export const GetTestHistorySchema = z.object({
  repoPath: z.string().describe("Repository path"),
  testId: z.string().optional().describe("Specific test ID (all tests if not specified)"),
  days: z.number().default(30).describe("Days of history")
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type DiscoverTestsInput = z.infer<typeof DiscoverTestsSchema>;
export type AnalyzeTestFileInput = z.infer<typeof AnalyzeTestFileSchema>;
export type SelectTestsInput = z.infer<typeof SelectTestsSchema>;
export type GetImpactedTestsInput = z.infer<typeof GetImpactedTestsSchema>;
export type DetectFlakyTestsInput = z.infer<typeof DetectFlakyTestsSchema>;
export type AnalyzeFlakyTestInput = z.infer<typeof AnalyzeFlakyTestSchema>;
export type QuarantineTestInput = z.infer<typeof QuarantineTestSchema>;
export type AnalyzeCoverageInput = z.infer<typeof AnalyzeCoverageSchema>;
export type FindCoverageGapsInput = z.infer<typeof FindCoverageGapsSchema>;
export type SuggestTestsInput = z.infer<typeof SuggestTestsSchema>;
export type RunMutationTestsInput = z.infer<typeof RunMutationTestsSchema>;
export type AnalyzeMutationResultsInput = z.infer<typeof AnalyzeMutationResultsSchema>;
export type GetTestHealthInput = z.infer<typeof GetTestHealthSchema>;
export type FindSlowTestsInput = z.infer<typeof FindSlowTestsSchema>;
export type FindDuplicateTestsInput = z.infer<typeof FindDuplicateTestsSchema>;
export type RecordTestRunInput = z.infer<typeof RecordTestRunSchema>;
export type GetTestHistoryInput = z.infer<typeof GetTestHistorySchema>;
