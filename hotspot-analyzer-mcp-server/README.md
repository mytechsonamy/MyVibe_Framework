# Hotspot Analyzer MCP Server

An MCP (Model Context Protocol) server that provides git churn analysis, bug-prone file detection, and domain ownership mapping.

## Overview

This server identifies code risk areas by:

- **Churn analysis** - Find frequently changed files
- **Bug-prone detection** - Identify files likely to contain bugs
- **Ownership mapping** - Understand who owns what code
- **Risk modeling** - Calculate overall codebase risk

## Features

- **Hotspot Detection**: Identify high-churn, high-complexity files
- **Bug Indicators**: Multiple signals for bug-prone code
- **Ownership Analysis**: Primary owner and contributor tracking
- **Domain Mapping**: Automatic domain area detection
- **Risk Trends**: Track risk over time

## Installation

```bash
cd hotspot-analyzer-mcp-server

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
    "hotspot-analyzer": {
      "command": "node",
      "args": ["/path/to/hotspot-analyzer-mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

### `hotspot_analyze`

Analyze code hotspots - files with high churn and complexity.

```typescript
{
  repoPath: string,
  days?: number,          // Analysis period (default: 90)
  limit?: number,         // Max results (default: 20)
  includeStable?: boolean // Include stable files (default: false)
}
```

### `hotspot_file`

Get detailed hotspot analysis for a specific file.

```typescript
{
  repoPath: string,
  filePath: string,
  includeHistory?: boolean
}
```

### `hotspot_churn`

Analyze code churn patterns over time.

```typescript
{
  repoPath: string,
  period?: "week" | "month" | "quarter" | "year",
  groupBy?: "file" | "directory" | "author"
}
```

### `ownership_map`

Get ownership map for files based on git history.

```typescript
{
  repoPath: string,
  path?: string,           // Specific path to analyze
  minContributions?: number
}
```

### `ownership_find`

Find owners for specific files.

```typescript
{
  repoPath: string,
  files: string[]
}
```

### `ownership_domains`

Analyze domain areas and their owners.

```typescript
{
  repoPath: string,
  depth?: number  // Directory depth for domain detection
}
```

### `ownership_teams`

Get team ownership distribution.

```typescript
{
  repoPath: string,
  teamMapping?: Record<string, string[]>  // Team -> members
}
```

### `bugs_find_prone`

Find bug-prone files based on commit history.

```typescript
{
  repoPath: string,
  days?: number,
  limit?: number,
  bugPatterns?: string[]  // Commit message patterns
}
```

### `bugs_indicators`

Analyze bug indicators for a specific file.

```typescript
{
  repoPath: string,
  filePath: string
}
```

### `risk_model`

Calculate overall risk model for the codebase.

```typescript
{
  repoPath: string,
  scope?: "full" | "changed" | "critical",
  baseBranch?: string
}
```

### `risk_trend`

Get risk trend over time.

```typescript
{
  repoPath: string,
  periods?: number,
  periodType?: "week" | "month"
}
```

### `risk_factors`

Identify specific risk factors for changes.

```typescript
{
  repoPath: string,
  changedFiles?: string[]
}
```

### `authors_contributions`

Analyze author contributions to the codebase.

```typescript
{
  repoPath: string,
  days?: number,
  minCommits?: number
}
```

### `authors_file`

Get authors for a specific file.

```typescript
{
  repoPath: string,
  filePath: string
}
```

### `authors_inactive`

Find files with inactive owners.

```typescript
{
  repoPath: string,
  inactiveDays?: number  // Days without commits (default: 90)
}
```

## Hotspot Scores

| Score | Category | Description |
|-------|----------|-------------|
| 0-20 | Stable | Rarely changed, low risk |
| 21-40 | Evolving | Moderate changes |
| 41-60 | Active | Frequent changes |
| 61-80 | Volatile | High churn, needs attention |
| 81-100 | Chaotic | Critical hotspot |

## Bug Indicators

| Indicator | Severity | Description |
|-----------|----------|-------------|
| High Churn | High/Critical | > 10 commits/month |
| Many Authors | Medium | > 5 unique authors |
| Complex | Medium/High | High cyclomatic complexity |
| Large File | Medium/High | > 500 lines |
| Bug History | High | Previous bug-fix commits |

## Risk Levels

| Level | Score | Action |
|-------|-------|--------|
| Low | 0-29 | Normal development |
| Medium | 30-49 | Extra review recommended |
| High | 50-69 | Careful changes, testing |
| Critical | 70-100 | Major refactoring needed |

## Churn Categories

| Category | Commits/Month | Description |
|----------|---------------|-------------|
| Stable | ≤ 2 | Mature, stable code |
| Evolving | 3-5 | Active development |
| Volatile | 6-10 | High activity |
| Chaotic | > 10 | Potentially unstable |

## Example Usage

```
1. Find hotspots:
   hotspot_analyze({
     repoPath: "/path/to/repo",
     days: 90,
     limit: 10
   })

2. Analyze ownership:
   ownership_map({
     repoPath: "/path/to/repo",
     path: "src/auth"
   })

3. Get risk model:
   risk_model({
     repoPath: "/path/to/repo",
     scope: "changed"
   })

4. Find inactive owners:
   authors_inactive({
     repoPath: "/path/to/repo",
     inactiveDays: 90
   })
```

## License

MIT

## Author

Mustafa Yildirim
