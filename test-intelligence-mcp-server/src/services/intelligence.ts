import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  TestFile,
  TestCase,
  TestRun,
  TestFramework,
  TestType,
  FlakyTest,
  FlakyCause,
  ImpactedTest,
  TestSelection,
  CoverageGap,
  CoverageReport,
  FileCoverage,
  MutationResult,
  MutationType,
  TestSuiteHealth,
  TestRecommendation,
  FLAKY_THRESHOLDS,
  COVERAGE_THRESHOLDS,
  SLOW_TEST_THRESHOLD_MS,
  TestRunResult
} from "../types.js";

const execAsync = promisify(exec);

export class TestIntelligence {
  private repoPath: string;
  private testHistory: Map<string, TestRunResult[]> = new Map();
  private quarantinedTests: Set<string> = new Set();

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  // ============================================================================
  // TEST DISCOVERY
  // ============================================================================

  async discoverTests(
    framework?: TestFramework,
    includePaths?: string[],
    excludePaths?: string[]
  ): Promise<TestFile[]> {
    const detectedFramework = framework || await this.detectFramework();
    const patterns = this.getTestPatterns(detectedFramework);
    const testFiles: TestFile[] = [];

    const { stdout } = await execAsync(
      `find . -type f \\( ${patterns.map(p => `-name "${p}"`).join(" -o ")} \\) | head -500`,
      { cwd: this.repoPath }
    );

    for (const filePath of stdout.trim().split("\n").filter(f => f)) {
      const absolutePath = path.join(this.repoPath, filePath.replace(/^\.\//, ""));

      // Apply path filters
      if (includePaths && !includePaths.some(p => filePath.includes(p))) continue;
      if (excludePaths && excludePaths.some(p => filePath.includes(p))) continue;

      const testCount = await this.countTestsInFile(absolutePath, detectedFramework);

      testFiles.push({
        path: filePath.replace(/^\.\//, ""),
        framework: detectedFramework,
        testCount,
        coverage: undefined
      });
    }

    return testFiles;
  }

  private async detectFramework(): Promise<TestFramework> {
    const packageJsonPath = path.join(this.repoPath, "package.json");

    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps["vitest"]) return "vitest";
      if (deps["jest"]) return "jest";
      if (deps["mocha"]) return "mocha";
    }

    if (fs.existsSync(path.join(this.repoPath, "pytest.ini")) ||
        fs.existsSync(path.join(this.repoPath, "pyproject.toml"))) {
      return "pytest";
    }

    if (fs.existsSync(path.join(this.repoPath, "go.mod"))) {
      return "go-test";
    }

    return "jest"; // Default
  }

  private getTestPatterns(framework: TestFramework): string[] {
    switch (framework) {
      case "jest":
      case "vitest":
        return ["*.test.ts", "*.test.tsx", "*.test.js", "*.spec.ts", "*.spec.js"];
      case "mocha":
        return ["*.test.js", "*.spec.js"];
      case "pytest":
        return ["test_*.py", "*_test.py"];
      case "go-test":
        return ["*_test.go"];
      case "junit":
        return ["*Test.java", "*Tests.java"];
    }
  }

  private async countTestsInFile(filePath: string, framework: TestFramework): Promise<number> {
    try {
      const content = fs.readFileSync(filePath, "utf-8");

      switch (framework) {
        case "jest":
        case "vitest":
        case "mocha":
          return (content.match(/\b(it|test)\s*\(/g) || []).length;
        case "pytest":
          return (content.match(/\bdef\s+test_/g) || []).length;
        case "go-test":
          return (content.match(/\bfunc\s+Test/g) || []).length;
        case "junit":
          return (content.match(/@Test/g) || []).length;
      }
    } catch {
      return 0;
    }
  }

  async analyzeTestFile(testFile: string): Promise<TestCase[]> {
    const absolutePath = path.join(this.repoPath, testFile);
    const content = fs.readFileSync(absolutePath, "utf-8");
    const framework = await this.detectFramework();
    const tests: TestCase[] = [];

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpMatchArray | null = null;

      switch (framework) {
        case "jest":
        case "vitest":
        case "mocha":
          match = line.match(/(?:it|test)\s*\(\s*['"`](.+?)['"`]/);
          break;
        case "pytest":
          match = line.match(/def\s+(test_\w+)/);
          break;
        case "go-test":
          match = line.match(/func\s+(Test\w+)/);
          break;
      }

      if (match) {
        const testName = match[1];
        tests.push({
          id: `${testFile}:${i + 1}:${testName}`,
          name: testName,
          file: testFile,
          line: i + 1,
          type: this.inferTestType(testFile, testName),
          tags: this.extractTags(line, lines.slice(Math.max(0, i - 5), i)),
          status: "pass",
          flakyScore: this.testHistory.has(`${testFile}:${testName}`)
            ? this.calculateFlakyScore(`${testFile}:${testName}`)
            : undefined
        });
      }
    }

    return tests;
  }

  private inferTestType(file: string, testName: string): TestType {
    const lowerFile = file.toLowerCase();
    const lowerName = testName.toLowerCase();

    if (lowerFile.includes("e2e") || lowerFile.includes("playwright") || lowerFile.includes("cypress")) {
      return "e2e";
    }
    if (lowerFile.includes("integration") || lowerName.includes("integration")) {
      return "integration";
    }
    if (lowerFile.includes("performance") || lowerFile.includes("benchmark")) {
      return "performance";
    }
    if (lowerName.includes("snapshot")) {
      return "snapshot";
    }
    return "unit";
  }

  private extractTags(line: string, previousLines: string[]): string[] {
    const tags: string[] = [];
    const allText = [...previousLines, line].join(" ");

    if (allText.includes("@slow")) tags.push("slow");
    if (allText.includes("@flaky")) tags.push("flaky");
    if (allText.includes("@skip")) tags.push("skip");
    if (allText.includes("@integration")) tags.push("integration");
    if (allText.includes("@e2e")) tags.push("e2e");

    return tags;
  }

  // ============================================================================
  // IMPACT-BASED TEST SELECTION
  // ============================================================================

  async selectTests(
    changedFiles: string[],
    includeFlaky: boolean = false,
    maxTests?: number,
    testTypes?: TestType[]
  ): Promise<TestSelection> {
    const impacted = await this.getImpactedTests(changedFiles);
    const allTests = await this.discoverTests();

    const mustRun: TestCase[] = [];
    const shouldRun: TestCase[] = [];
    const canSkip: TestCase[] = [];

    for (const testFile of allTests) {
      const tests = await this.analyzeTestFile(testFile.path);

      for (const test of tests) {
        // Filter by test type
        if (testTypes && !testTypes.includes(test.type)) {
          canSkip.push(test);
          continue;
        }

        // Skip flaky tests unless requested
        if (!includeFlaky && test.flakyScore && test.flakyScore > FLAKY_THRESHOLDS.flakyScore) {
          canSkip.push(test);
          continue;
        }

        // Skip quarantined tests
        if (this.quarantinedTests.has(test.id)) {
          canSkip.push(test);
          continue;
        }

        // Check impact
        const impact = impacted.find(i => i.file === test.file);
        if (impact && impact.impactScore > 70) {
          mustRun.push(test);
        } else if (impact && impact.impactScore > 30) {
          shouldRun.push(test);
        } else {
          canSkip.push(test);
        }
      }
    }

    // Apply max limit
    let selected = [...mustRun, ...shouldRun];
    if (maxTests && selected.length > maxTests) {
      selected = selected.slice(0, maxTests);
    }

    return {
      mustRun,
      shouldRun: shouldRun.slice(0, Math.max(0, (maxTests || 1000) - mustRun.length)),
      canSkip,
      totalSaved: canSkip.length,
      estimatedDuration: this.estimateDuration(selected),
      confidence: this.calculateSelectionConfidence(changedFiles, selected)
    };
  }

  async getImpactedTests(changedFiles: string[], depth: number = 2): Promise<ImpactedTest[]> {
    const impacted: ImpactedTest[] = [];
    const testFiles = await this.discoverTests();

    for (const testFile of testFiles) {
      const absolutePath = path.join(this.repoPath, testFile.path);
      const content = fs.readFileSync(absolutePath, "utf-8");

      let impactScore = 0;
      const matchedFiles: string[] = [];

      for (const changedFile of changedFiles) {
        const baseName = path.basename(changedFile, path.extname(changedFile));

        // Direct import
        if (content.includes(baseName)) {
          impactScore += 50;
          matchedFiles.push(changedFile);
        }

        // Same directory
        if (path.dirname(testFile.path) === path.dirname(changedFile)) {
          impactScore += 20;
          if (!matchedFiles.includes(changedFile)) matchedFiles.push(changedFile);
        }

        // Same module
        const testModule = testFile.path.split("/")[0];
        const changeModule = changedFile.split("/")[0];
        if (testModule === changeModule) {
          impactScore += 10;
        }
      }

      if (impactScore > 0) {
        const tests = await this.analyzeTestFile(testFile.path);
        for (const test of tests) {
          impacted.push({
            testId: test.id,
            testName: test.name,
            file: testFile.path,
            impactScore: Math.min(100, impactScore),
            reason: `Imports or tests: ${matchedFiles.join(", ")}`,
            changedFiles: matchedFiles
          });
        }
      }
    }

    return impacted.sort((a, b) => b.impactScore - a.impactScore);
  }

  private estimateDuration(tests: TestCase[]): number {
    let total = 0;
    for (const test of tests) {
      const threshold = SLOW_TEST_THRESHOLD_MS[test.type] || 100;
      total += test.duration || threshold / 2;
    }
    return total;
  }

  private calculateSelectionConfidence(changedFiles: string[], selectedTests: TestCase[]): number {
    // Simple heuristic: more tests = higher confidence, direct matches = higher
    if (selectedTests.length === 0) return 0;
    if (changedFiles.length === 0) return 100;

    const directMatches = selectedTests.filter(t =>
      changedFiles.some(f => t.file.includes(path.basename(f, path.extname(f))))
    ).length;

    return Math.min(100, 50 + (directMatches / changedFiles.length) * 50);
  }

  // ============================================================================
  // FLAKY TEST DETECTION
  // ============================================================================

  async detectFlakyTests(
    historyDays: number = 30,
    minRuns: number = 5,
    flakyThreshold: number = 0.95
  ): Promise<FlakyTest[]> {
    const flakyTests: FlakyTest[] = [];

    for (const [testId, runs] of this.testHistory) {
      if (runs.length < minRuns) continue;

      // Filter to recent runs
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - historyDays);
      const recentRuns = runs.filter(r => r.timestamp >= cutoff);

      if (recentRuns.length < minRuns) continue;

      const passRate = recentRuns.filter(r => r.passed).length / recentRuns.length;

      if (passRate < flakyThreshold && passRate > 0) {
        const flakyScore = this.calculateFlakyScore(testId);
        const causes = this.detectFlakyCauses(recentRuns);

        const [file, , testName] = testId.split(":");

        flakyTests.push({
          testId,
          testName: testName || testId,
          file: file || "",
          flakyScore,
          passRate,
          recentRuns: recentRuns.slice(-10),
          suspectedCauses: causes,
          recommendation: this.generateFlakyRecommendation(causes, passRate)
        });
      }
    }

    return flakyTests.sort((a, b) => b.flakyScore - a.flakyScore);
  }

  private calculateFlakyScore(testId: string): number {
    const runs = this.testHistory.get(testId) || [];
    if (runs.length < 2) return 0;

    // Count state transitions (pass -> fail or fail -> pass)
    let transitions = 0;
    for (let i = 1; i < runs.length; i++) {
      if (runs[i].passed !== runs[i - 1].passed) {
        transitions++;
      }
    }

    // More transitions = more flaky
    return Math.min(100, (transitions / (runs.length - 1)) * 100);
  }

  private detectFlakyCauses(runs: TestRunResult[]): FlakyCause[] {
    const causes: FlakyCause[] = [];

    // Check for timing issues
    const durations = runs.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
    if (variance > avgDuration * 0.5) {
      causes.push("timing");
    }

    // Check for external dependency issues (by error messages)
    const errors = runs.filter(r => r.error).map(r => r.error!);
    if (errors.some(e => e.includes("timeout") || e.includes("ECONNREFUSED") || e.includes("network"))) {
      causes.push("external");
    }

    // Check for state issues
    if (errors.some(e => e.includes("already exists") || e.includes("not found") || e.includes("undefined"))) {
      causes.push("state");
    }

    // Check for random data issues
    if (errors.some(e => e.includes("expected") && e.includes("received"))) {
      causes.push("random");
    }

    return causes.length > 0 ? causes : ["timing"]; // Default assumption
  }

  private generateFlakyRecommendation(causes: FlakyCause[], passRate: number): string {
    if (passRate < 0.5) {
      return "This test fails more than it passes. Consider fixing the underlying issue or removing the test.";
    }

    const recommendations: Record<FlakyCause, string> = {
      timing: "Add explicit waits or increase timeouts. Consider using fake timers.",
      external: "Mock external services. Use contract tests for integration points.",
      state: "Ensure proper test isolation. Reset shared state in beforeEach/afterEach.",
      random: "Use seeded random generators or fixed test data.",
      order: "Make test independent. Don't rely on test execution order.",
      resource: "Add resource locks or run in isolation mode.",
      environment: "Use containers or VM for consistent environment."
    };

    return causes.map(c => recommendations[c]).join(" ");
  }

  quarantineTest(testId: string, reason: string): void {
    this.quarantinedTests.add(testId);
    console.error(`Quarantined test ${testId}: ${reason}`);
  }

  // ============================================================================
  // COVERAGE ANALYSIS
  // ============================================================================

  async analyzeCoverage(coverageFile?: string): Promise<CoverageReport | null> {
    const reportPath = coverageFile || await this.findCoverageReport();
    if (!reportPath || !fs.existsSync(path.join(this.repoPath, reportPath))) {
      return null;
    }

    // Parse coverage report (simplified - would need format-specific parsing)
    const content = fs.readFileSync(path.join(this.repoPath, reportPath), "utf-8");

    // Attempt to parse as JSON (Istanbul format)
    try {
      const data = JSON.parse(content);
      return this.parseIstanbulCoverage(data);
    } catch {
      // Try LCOV format
      return this.parseLcovCoverage(content);
    }
  }

  private async findCoverageReport(): Promise<string | null> {
    const commonPaths = [
      "coverage/coverage-final.json",
      "coverage/lcov.info",
      "coverage/cobertura.xml",
      "coverage.json"
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(path.join(this.repoPath, p))) {
        return p;
      }
    }

    return null;
  }

  private parseIstanbulCoverage(data: any): CoverageReport {
    const files: FileCoverage[] = [];
    let totalLines = 0, coveredLines = 0;
    let totalBranches = 0, coveredBranches = 0;
    let totalFunctions = 0, coveredFunctions = 0;

    for (const [filePath, coverage] of Object.entries(data)) {
      const cov = coverage as any;

      const linesCovered = Object.values(cov.s || {}).filter((v: any) => v > 0).length;
      const linesTotal = Object.keys(cov.s || {}).length;
      const branchesCovered = Object.values(cov.b || {}).flat().filter((v: any) => v > 0).length;
      const branchesTotal = Object.values(cov.b || {}).flat().length;
      const functionsCovered = Object.values(cov.f || {}).filter((v: any) => v > 0).length;
      const functionsTotal = Object.keys(cov.f || {}).length;

      totalLines += linesTotal;
      coveredLines += linesCovered;
      totalBranches += branchesTotal;
      coveredBranches += branchesCovered;
      totalFunctions += functionsTotal;
      coveredFunctions += functionsCovered;

      const uncoveredLines = Object.entries(cov.s || {})
        .filter(([, v]) => v === 0)
        .map(([line]) => parseInt(line));

      files.push({
        path: filePath,
        lines: { total: linesTotal, covered: linesCovered, percentage: linesTotal ? (linesCovered / linesTotal) * 100 : 0 },
        branches: { total: branchesTotal, covered: branchesCovered, percentage: branchesTotal ? (branchesCovered / branchesTotal) * 100 : 0 },
        functions: { total: functionsTotal, covered: functionsCovered, percentage: functionsTotal ? (functionsCovered / functionsTotal) * 100 : 0 },
        uncoveredLines
      });
    }

    return {
      lines: { total: totalLines, covered: coveredLines, percentage: totalLines ? (coveredLines / totalLines) * 100 : 0 },
      branches: { total: totalBranches, covered: coveredBranches, percentage: totalBranches ? (coveredBranches / totalBranches) * 100 : 0 },
      functions: { total: totalFunctions, covered: coveredFunctions, percentage: totalFunctions ? (coveredFunctions / totalFunctions) * 100 : 0 },
      statements: { total: totalLines, covered: coveredLines, percentage: totalLines ? (coveredLines / totalLines) * 100 : 0 },
      files
    };
  }

  private parseLcovCoverage(content: string): CoverageReport {
    // Simplified LCOV parsing
    const files: FileCoverage[] = [];
    let currentFile: Partial<FileCoverage> | null = null;

    for (const line of content.split("\n")) {
      if (line.startsWith("SF:")) {
        if (currentFile && currentFile.path) {
          files.push(currentFile as FileCoverage);
        }
        currentFile = {
          path: line.substring(3),
          lines: { total: 0, covered: 0, percentage: 0 },
          branches: { total: 0, covered: 0, percentage: 0 },
          functions: { total: 0, covered: 0, percentage: 0 },
          uncoveredLines: []
        };
      } else if (line.startsWith("LF:") && currentFile) {
        currentFile.lines!.total = parseInt(line.substring(3));
      } else if (line.startsWith("LH:") && currentFile) {
        currentFile.lines!.covered = parseInt(line.substring(3));
        currentFile.lines!.percentage = currentFile.lines!.total
          ? (currentFile.lines!.covered / currentFile.lines!.total) * 100
          : 0;
      }
    }

    if (currentFile && currentFile.path) {
      files.push(currentFile as FileCoverage);
    }

    const totalLines = files.reduce((sum, f) => sum + f.lines.total, 0);
    const coveredLines = files.reduce((sum, f) => sum + f.lines.covered, 0);

    return {
      lines: { total: totalLines, covered: coveredLines, percentage: totalLines ? (coveredLines / totalLines) * 100 : 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      statements: { total: totalLines, covered: coveredLines, percentage: totalLines ? (coveredLines / totalLines) * 100 : 0 },
      files
    };
  }

  async findCoverageGaps(
    minCoverage: number = 80,
    focusFiles?: string[]
  ): Promise<CoverageGap[]> {
    const coverage = await this.analyzeCoverage();
    if (!coverage) return [];

    const gaps: CoverageGap[] = [];

    for (const file of coverage.files) {
      if (focusFiles && !focusFiles.some(f => file.path.includes(f))) {
        continue;
      }

      if (file.lines.percentage < minCoverage) {
        const risk = file.lines.percentage < 50 ? "critical" :
                    file.lines.percentage < 60 ? "high" :
                    file.lines.percentage < 70 ? "medium" : "low";

        gaps.push({
          file: file.path,
          lines: file.uncoveredLines,
          functions: [], // Would need more parsing
          risk,
          suggestion: this.generateCoverageSuggestion(file)
        });
      }
    }

    return gaps.sort((a, b) => {
      const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return riskOrder[a.risk] - riskOrder[b.risk];
    });
  }

  private generateCoverageSuggestion(file: FileCoverage): string {
    if (file.lines.percentage < 20) {
      return "This file has very low coverage. Consider adding basic happy-path tests first.";
    }
    if (file.functions.percentage < file.lines.percentage) {
      return "Many functions are not called. Add tests for untested functions.";
    }
    if (file.branches.percentage < file.lines.percentage) {
      return "Branch coverage is low. Add tests for edge cases and error paths.";
    }
    return `Add tests for lines: ${file.uncoveredLines.slice(0, 5).join(", ")}${file.uncoveredLines.length > 5 ? "..." : ""}`;
  }

  // ============================================================================
  // TEST HEALTH
  // ============================================================================

  async getTestHealth(): Promise<TestSuiteHealth> {
    const tests = await this.discoverTests();
    const coverage = await this.analyzeCoverage();
    const flakyTests = await this.detectFlakyTests();

    let totalTests = 0;
    let slowTests = 0;

    for (const testFile of tests) {
      totalTests += testFile.testCount;
      if (testFile.lastDuration && testFile.lastDuration > 5000) {
        slowTests++;
      }
    }

    const coverageScore = coverage ? coverage.lines.percentage : 0;
    const flakyScore = flakyTests.length > 0 ? Math.max(0, 100 - flakyTests.length * 10) : 100;
    const overallScore = Math.round((coverageScore * 0.5) + (flakyScore * 0.3) + 20);

    const recommendations: string[] = [];

    if (coverageScore < COVERAGE_THRESHOLDS.minimum) {
      recommendations.push(`Coverage is below ${COVERAGE_THRESHOLDS.minimum}%. Add more tests.`);
    }
    if (flakyTests.length > 0) {
      recommendations.push(`${flakyTests.length} flaky tests detected. Fix or quarantine them.`);
    }
    if (slowTests > totalTests * 0.1) {
      recommendations.push("More than 10% of tests are slow. Consider optimization.");
    }

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      coverage: coverageScore,
      flakyTestCount: flakyTests.length,
      slowTestCount: slowTests,
      duplicateTests: 0, // Would need more analysis
      uncoveredCriticalPaths: [],
      recommendations
    };
  }

  // ============================================================================
  // TEST HISTORY
  // ============================================================================

  recordTestRun(results: Array<{
    testId: string;
    testName: string;
    file: string;
    passed: boolean;
    duration: number;
    error?: string;
  }>): void {
    for (const result of results) {
      const history = this.testHistory.get(result.testId) || [];
      history.push({
        timestamp: new Date(),
        passed: result.passed,
        duration: result.duration,
        error: result.error
      });

      // Keep last 100 runs
      if (history.length > 100) {
        history.shift();
      }

      this.testHistory.set(result.testId, history);
    }
  }

  getTestHistory(testId?: string, days: number = 30): Map<string, TestRunResult[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    if (testId) {
      const history = this.testHistory.get(testId) || [];
      const filtered = history.filter(r => r.timestamp >= cutoff);
      return new Map([[testId, filtered]]);
    }

    const result = new Map<string, TestRunResult[]>();
    for (const [id, runs] of this.testHistory) {
      const filtered = runs.filter(r => r.timestamp >= cutoff);
      if (filtered.length > 0) {
        result.set(id, filtered);
      }
    }
    return result;
  }
}
