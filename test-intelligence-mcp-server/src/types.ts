// Test Intelligence Types

export type TestFramework = "jest" | "mocha" | "vitest" | "pytest" | "go-test" | "junit";
export type TestType = "unit" | "integration" | "e2e" | "performance" | "snapshot";
export type TestStatus = "pass" | "fail" | "skip" | "flaky";

export interface TestFile {
  path: string;
  framework: TestFramework;
  testCount: number;
  lastRun?: Date;
  lastDuration?: number;
  coverage?: number;
}

export interface TestCase {
  id: string;
  name: string;
  file: string;
  line: number;
  type: TestType;
  tags: string[];
  status: TestStatus;
  duration?: number;
  flakyScore?: number;
}

export interface TestRun {
  id: string;
  timestamp: Date;
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  coverage?: CoverageReport;
}

export interface CoverageReport {
  lines: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  statements: CoverageMetric;
  files: FileCoverage[];
}

export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

export interface FileCoverage {
  path: string;
  lines: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  uncoveredLines: number[];
}

export interface FlakyTest {
  testId: string;
  testName: string;
  file: string;
  flakyScore: number;  // 0-100, higher = more flaky
  passRate: number;    // Historical pass rate
  recentRuns: TestRunResult[];
  suspectedCauses: FlakyCause[];
  recommendation: string;
}

export interface TestRunResult {
  timestamp: Date;
  passed: boolean;
  duration: number;
  error?: string;
}

export type FlakyCause =
  | "timing"           // Race conditions, timeouts
  | "external"         // External service dependencies
  | "state"            // Shared state issues
  | "random"           // Random data in tests
  | "order"            // Test order dependency
  | "resource"         // Resource contention
  | "environment";     // Environment-specific

export interface ImpactedTest {
  testId: string;
  testName: string;
  file: string;
  impactScore: number;  // 0-100, higher = more likely affected
  reason: string;
  changedFiles: string[];
}

export interface TestSelection {
  mustRun: TestCase[];
  shouldRun: TestCase[];
  canSkip: TestCase[];
  totalSaved: number;     // Tests that can be skipped
  estimatedDuration: number;
  confidence: number;     // 0-100%
}

export interface CoverageGap {
  file: string;
  lines: number[];
  functions: string[];
  risk: "low" | "medium" | "high" | "critical";
  suggestion: string;
}

export interface MutationResult {
  file: string;
  line: number;
  mutationType: MutationType;
  killed: boolean;
  survivingMutant?: string;
  killedBy?: string;
}

export type MutationType =
  | "arithmetic"        // +, -, *, /
  | "relational"        // <, >, <=, >=
  | "logical"           // &&, ||, !
  | "conditional"       // if conditions
  | "return"            // return values
  | "assignment"        // = operations
  | "boundary";         // array bounds

export interface TestSuiteHealth {
  overallScore: number;     // 0-100
  coverage: number;
  flakyTestCount: number;
  slowTestCount: number;
  duplicateTests: number;
  uncoveredCriticalPaths: string[];
  recommendations: string[];
}

export interface TestRecommendation {
  type: "add" | "remove" | "refactor" | "fix";
  priority: "low" | "medium" | "high" | "critical";
  file: string;
  description: string;
  suggestedTest?: string;
}

export const FLAKY_THRESHOLDS = {
  passRate: 0.95,         // Below this = potentially flaky
  minRuns: 5,             // Minimum runs to detect flakiness
  flakyScore: 20          // Above this = definitely flaky
};

export const COVERAGE_THRESHOLDS = {
  minimum: 60,
  recommended: 80,
  excellent: 90
};

export const SLOW_TEST_THRESHOLD_MS: Record<TestType, number> = {
  unit: 100,
  integration: 1000,
  e2e: 10000,
  performance: 30000,
  snapshot: 500
};
