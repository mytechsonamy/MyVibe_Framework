# Test Intelligence MCP Server

An MCP (Model Context Protocol) server that provides smart test selection, flaky test detection, and coverage analysis.

## Overview

This server optimizes testing workflows by:

- **Impact-based test selection** - Run only tests affected by changes
- **Flaky test detection** - Identify and manage unreliable tests
- **Coverage gap analysis** - Find untested code areas
- **Test health monitoring** - Track test suite quality over time

## Features

- **Test Discovery**: Automatic test file detection across frameworks
- **Impact Analysis**: Map code changes to affected tests
- **Flaky Detection**: Statistical analysis of test reliability
- **Quarantine System**: Isolate flaky tests without blocking CI
- **Coverage Tracking**: Monitor and report code coverage

## Installation

```bash
cd test-intelligence-mcp-server

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "test-intelligence": {
      "command": "node",
      "args": ["/path/to/test-intelligence-mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

### `test_discover`

Discover all test files in the repository.

```typescript
{
  repoPath: string,
  patterns?: string[],    // Glob patterns for test files
  framework?: TestFramework  // jest, vitest, mocha, pytest
}
```

### `test_analyze_file`

Analyze test cases in a specific file.

```typescript
{
  repoPath: string,
  testFile: string
}
```

### `test_select`

Select tests based on changed files.

```typescript
{
  repoPath: string,
  changedFiles: string[],
  strategy?: SelectionStrategy  // direct, transitive, all
}
```

### `test_impacted`

Get tests impacted by code changes.

```typescript
{
  repoPath: string,
  changedFiles: string[],
  includeTransitive?: boolean  // Include indirectly affected tests
}
```

### `test_detect_flaky`

Detect flaky tests from run history.

```typescript
{
  repoPath: string,
  minRuns?: number,      // Minimum runs to analyze (default: 10)
  flakyThreshold?: number // Failure rate threshold (default: 0.1)
}
```

### `test_quarantine`

Quarantine or unquarantine flaky tests.

```typescript
{
  repoPath: string,
  testId: string,
  action: "quarantine" | "unquarantine",
  reason?: string
}
```

### `test_coverage`

Analyze code coverage.

```typescript
{
  repoPath: string,
  coverageFile?: string,  // Path to coverage report
  format?: CoverageFormat // lcov, cobertura, istanbul
}
```

### `test_coverage_gaps`

Find files with low coverage.

```typescript
{
  repoPath: string,
  threshold?: number,  // Coverage threshold (default: 80)
  limit?: number       // Max results
}
```

### `test_health`

Get test suite health score.

```typescript
{
  repoPath: string
}
```

### `test_record_run`

Record test run results.

```typescript
{
  repoPath: string,
  results: TestResult[]
}
```

### `test_history`

Get test run history.

```typescript
{
  repoPath: string,
  testId?: string,  // Specific test or all
  limit?: number
}
```

## Test Types

| Type | Typical Duration | Use Case |
|------|-----------------|----------|
| `unit` | < 100ms | Isolated logic tests |
| `integration` | < 5s | Component interaction |
| `e2e` | < 30s | Full flow tests |
| `performance` | < 30s | Performance benchmarks |
| `snapshot` | < 500ms | UI snapshot tests |

## Flaky Test Causes

The system identifies common flaky causes:

- **Timing issues** - Race conditions, async problems
- **State pollution** - Shared state between tests
- **External dependency** - Network, DB, file system
- **Resource contention** - Memory, CPU limits
- **Order dependency** - Tests depend on run order

## Health Score Calculation

| Factor | Weight | Description |
|--------|--------|-------------|
| Pass Rate | 40% | Overall test success rate |
| Flaky Rate | 30% | Percentage of flaky tests |
| Coverage | 20% | Code coverage percentage |
| Speed | 10% | Average test duration |

## Example Workflow

```
1. Discover tests:
   test_discover({ repoPath: "/path/to/repo" })

2. Select impacted tests:
   test_select({
     repoPath: "/path/to/repo",
     changedFiles: ["src/auth/login.ts"]
   })

3. Check for flaky tests:
   test_detect_flaky({
     repoPath: "/path/to/repo",
     minRuns: 20
   })

4. Get test health:
   test_health({ repoPath: "/path/to/repo" })
```

## License

MIT

## Author

Mustafa Yildirim
