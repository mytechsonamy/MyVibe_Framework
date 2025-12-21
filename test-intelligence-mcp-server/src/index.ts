#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

import { TestIntelligence } from "./services/intelligence.js";
import {
  DiscoverTestsSchema,
  AnalyzeTestFileSchema,
  SelectTestsSchema,
  GetImpactedTestsSchema,
  DetectFlakyTestsSchema,
  QuarantineTestSchema,
  AnalyzeCoverageSchema,
  FindCoverageGapsSchema,
  GetTestHealthSchema,
  RecordTestRunSchema,
  GetTestHistorySchema
} from "./schemas/tests.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "test_discover",
    description: "Discover all test files in the repository. Auto-detects test framework.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        framework: { type: "string", enum: ["jest", "mocha", "vitest", "pytest", "go-test", "junit"] },
        includePaths: { type: "array", items: { type: "string" } },
        excludePaths: { type: "array", items: { type: "string" } }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "test_analyze_file",
    description: "Analyze a test file to extract individual test cases.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        testFile: { type: "string", description: "Path to test file" },
        includeSource: { type: "boolean", default: false }
      },
      required: ["repoPath", "testFile"]
    }
  },
  {
    name: "test_select",
    description: "Select tests to run based on changed files. Returns must-run, should-run, and can-skip lists.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        changedFiles: { type: "array", items: { type: "string" }, description: "Changed source files" },
        includeFlaky: { type: "boolean", default: false },
        maxTests: { type: "number" },
        testTypes: { type: "array", items: { type: "string", enum: ["unit", "integration", "e2e", "performance", "snapshot"] } }
      },
      required: ["repoPath", "changedFiles"]
    }
  },
  {
    name: "test_impacted",
    description: "Get tests impacted by file changes with impact scores.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        changedFiles: { type: "array", items: { type: "string" } },
        depth: { type: "number", default: 2 }
      },
      required: ["repoPath", "changedFiles"]
    }
  },
  {
    name: "test_detect_flaky",
    description: "Detect flaky tests based on historical run data.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        historyDays: { type: "number", default: 30 },
        minRuns: { type: "number", default: 5 },
        flakyThreshold: { type: "number", default: 0.95 }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "test_quarantine",
    description: "Quarantine a flaky test to exclude it from normal runs.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        testId: { type: "string", description: "Test ID" },
        reason: { type: "string", description: "Reason for quarantine" },
        autoRetry: { type: "number", default: 3 }
      },
      required: ["repoPath", "testId", "reason"]
    }
  },
  {
    name: "test_coverage",
    description: "Analyze code coverage from coverage report.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        coverageFile: { type: "string", description: "Path to coverage report" },
        format: { type: "string", enum: ["lcov", "cobertura", "istanbul", "go-cover"] }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "test_coverage_gaps",
    description: "Find files with coverage below threshold.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        minCoverage: { type: "number", default: 80 },
        focusFiles: { type: "array", items: { type: "string" } },
        ignoreGenerated: { type: "boolean", default: true }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "test_health",
    description: "Get overall test suite health score with recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        includeRecommendations: { type: "boolean", default: true }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "test_record_run",
    description: "Record test run results for flaky detection and history.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              testId: { type: "string" },
              testName: { type: "string" },
              file: { type: "string" },
              passed: { type: "boolean" },
              duration: { type: "number" },
              error: { type: "string" }
            },
            required: ["testId", "testName", "file", "passed", "duration"]
          }
        }
      },
      required: ["repoPath", "results"]
    }
  },
  {
    name: "test_history",
    description: "Get test run history for analysis.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        testId: { type: "string", description: "Specific test ID" },
        days: { type: "number", default: 30 }
      },
      required: ["repoPath"]
    }
  }
];

// Cache for test intelligence instances
const intelligenceCache = new Map<string, TestIntelligence>();

function getIntelligence(repoPath: string): TestIntelligence {
  if (!intelligenceCache.has(repoPath)) {
    intelligenceCache.set(repoPath, new TestIntelligence(repoPath));
  }
  return intelligenceCache.get(repoPath)!;
}

// Create server
const server = new Server(
  {
    name: "test-intelligence-mcp-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "test_discover": {
        const input = DiscoverTestsSchema.parse(args);
        const intel = getIntelligence(input.repoPath);
        const tests = await intel.discoverTests(
          input.framework,
          input.includePaths,
          input.excludePaths
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              totalFiles: tests.length,
              totalTests: tests.reduce((sum, t) => sum + t.testCount, 0),
              byFramework: tests.reduce((acc, t) => {
                acc[t.framework] = (acc[t.framework] || 0) + t.testCount;
                return acc;
              }, {} as Record<string, number>),
              files: tests.slice(0, 50)
            }, null, 2)
          }]
        };
      }

      case "test_analyze_file": {
        const input = AnalyzeTestFileSchema.parse(args);
        const intel = getIntelligence(input.repoPath);
        const tests = await intel.analyzeTestFile(input.testFile);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              file: input.testFile,
              testCount: tests.length,
              tests: tests.map(t => ({
                name: t.name,
                line: t.line,
                type: t.type,
                tags: t.tags,
                flakyScore: t.flakyScore
              }))
            }, null, 2)
          }]
        };
      }

      case "test_select": {
        const input = SelectTestsSchema.parse(args);
        const intel = getIntelligence(input.repoPath);
        const selection = await intel.selectTests(
          input.changedFiles,
          input.includeFlaky,
          input.maxTests,
          input.testTypes
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              mustRun: selection.mustRun.length,
              shouldRun: selection.shouldRun.length,
              canSkip: selection.canSkip.length,
              totalSaved: selection.totalSaved,
              estimatedDuration: `${Math.round(selection.estimatedDuration / 1000)}s`,
              confidence: `${selection.confidence}%`,
              tests: {
                mustRun: selection.mustRun.map(t => ({ name: t.name, file: t.file })),
                shouldRun: selection.shouldRun.slice(0, 10).map(t => ({ name: t.name, file: t.file }))
              }
            }, null, 2)
          }]
        };
      }

      case "test_impacted": {
        const input = GetImpactedTestsSchema.parse(args);
        const intel = getIntelligence(input.repoPath);
        const impacted = await intel.getImpactedTests(input.changedFiles, input.depth);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              totalImpacted: impacted.length,
              tests: impacted.slice(0, 30).map(t => ({
                name: t.testName,
                file: t.file,
                impactScore: t.impactScore,
                reason: t.reason
              }))
            }, null, 2)
          }]
        };
      }

      case "test_detect_flaky": {
        const input = DetectFlakyTestsSchema.parse(args);
        const intel = getIntelligence(input.repoPath);
        const flaky = await intel.detectFlakyTests(
          input.historyDays,
          input.minRuns,
          input.flakyThreshold
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              totalFlaky: flaky.length,
              tests: flaky.map(t => ({
                name: t.testName,
                file: t.file,
                flakyScore: t.flakyScore,
                passRate: `${Math.round(t.passRate * 100)}%`,
                causes: t.suspectedCauses,
                recommendation: t.recommendation
              }))
            }, null, 2)
          }]
        };
      }

      case "test_quarantine": {
        const input = QuarantineTestSchema.parse(args);
        const intel = getIntelligence(input.repoPath);
        intel.quarantineTest(input.testId, input.reason);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Test ${input.testId} quarantined: ${input.reason}`
            }, null, 2)
          }]
        };
      }

      case "test_coverage": {
        const input = AnalyzeCoverageSchema.parse(args);
        const intel = getIntelligence(input.repoPath);
        const coverage = await intel.analyzeCoverage(input.coverageFile);

        if (!coverage) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: "No coverage report found" })
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              lines: `${coverage.lines.percentage.toFixed(1)}%`,
              branches: `${coverage.branches.percentage.toFixed(1)}%`,
              functions: `${coverage.functions.percentage.toFixed(1)}%`,
              fileCount: coverage.files.length,
              lowCoverageFiles: coverage.files
                .filter(f => f.lines.percentage < 60)
                .slice(0, 10)
                .map(f => ({ path: f.path, coverage: `${f.lines.percentage.toFixed(1)}%` }))
            }, null, 2)
          }]
        };
      }

      case "test_coverage_gaps": {
        const input = FindCoverageGapsSchema.parse(args);
        const intel = getIntelligence(input.repoPath);
        const gaps = await intel.findCoverageGaps(input.minCoverage, input.focusFiles);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              totalGaps: gaps.length,
              gaps: gaps.slice(0, 20).map(g => ({
                file: g.file,
                risk: g.risk,
                uncoveredLines: g.lines.length,
                suggestion: g.suggestion
              }))
            }, null, 2)
          }]
        };
      }

      case "test_health": {
        const input = GetTestHealthSchema.parse(args);
        const intel = getIntelligence(input.repoPath);
        const health = await intel.getTestHealth();

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              overallScore: health.overallScore,
              coverage: `${health.coverage.toFixed(1)}%`,
              flakyTests: health.flakyTestCount,
              slowTests: health.slowTestCount,
              recommendations: input.includeRecommendations ? health.recommendations : undefined
            }, null, 2)
          }]
        };
      }

      case "test_record_run": {
        const input = RecordTestRunSchema.parse(args);
        const intel = getIntelligence(input.repoPath);
        intel.recordTestRun(input.results);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              recorded: input.results.length
            }, null, 2)
          }]
        };
      }

      case "test_history": {
        const input = GetTestHistorySchema.parse(args);
        const intel = getIntelligence(input.repoPath);
        const history = intel.getTestHistory(input.testId, input.days);

        const result: Record<string, any> = {};
        for (const [id, runs] of history) {
          result[id] = {
            totalRuns: runs.length,
            passRate: `${Math.round((runs.filter(r => r.passed).length / runs.length) * 100)}%`,
            avgDuration: Math.round(runs.reduce((s, r) => s + r.duration, 0) / runs.length),
            recentRuns: runs.slice(-5).map(r => ({
              passed: r.passed,
              duration: r.duration,
              date: r.timestamp
            }))
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Test Intelligence MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
