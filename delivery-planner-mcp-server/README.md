# Delivery Planner MCP Server

An MCP (Model Context Protocol) server that provides incremental delivery planning - slicing large changes into reviewable PRs with feature flags and rollout strategies.

## Overview

This server helps manage large code changes by:

- **Slicing changes** into manageable, reviewable PR chunks
- **Generating feature flags** for gradual rollouts
- **Creating rollout plans** with risk-based staging
- **Planning backwards compatibility** for breaking changes

## Features

- **Multiple Slicing Strategies**: by-module, by-layer, by-feature, by-risk
- **Feature Flag Generation**: LaunchDarkly, Unleash, custom formats
- **Rollout Planning**: Phased rollout with risk assessment
- **Breaking Change Detection**: Automatic detection and mitigation
- **Backwards Compatibility**: Migration and compatibility playbooks

## Installation

```bash
cd delivery-planner-mcp-server

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
    "delivery-planner": {
      "command": "node",
      "args": ["/path/to/delivery-planner-mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

### `delivery_analyze_changes`

Analyze changes between branches.

```typescript
{
  repoPath: string,
  baseBranch?: string,    // default: "main"
  targetBranch?: string   // default: current branch
}
```

### `delivery_detect_breaking`

Detect breaking changes in modified files.

```typescript
{
  repoPath: string,
  files: string[]  // Files to analyze
}
```

### `delivery_slice_changes`

Slice changes into PR chunks.

```typescript
{
  repoPath: string,
  strategy?: SliceStrategy,  // by-module, by-layer, by-feature, by-risk
  maxFilesPerSlice?: number, // default: 10
  baseBranch?: string
}
```

### `delivery_generate_flags`

Generate feature flag definitions.

```typescript
{
  repoPath: string,
  featureName: string,
  flagType?: FlagType,  // boolean, percentage, variant
  variants?: string[]
}
```

### `delivery_generate_flag_code`

Generate feature flag code snippets.

```typescript
{
  repoPath: string,
  flagName: string,
  language?: string,    // typescript, python, go
  provider?: string     // launchdarkly, unleash, custom
}
```

### `delivery_create_rollout`

Create rollout plan with stages.

```typescript
{
  repoPath: string,
  featureName: string,
  stages?: RolloutStage[],
  startPercentage?: number,
  incrementPercentage?: number
}
```

### `delivery_rollback_plan`

Generate rollback procedures.

```typescript
{
  repoPath: string,
  featureName: string,
  currentStage?: string
}
```

### `delivery_compatibility_plan`

Generate backwards compatibility plan.

```typescript
{
  repoPath: string,
  breakingChanges: string[]  // List of breaking changes
}
```

### `delivery_create_plan`

Create complete delivery plan.

```typescript
{
  repoPath: string,
  featureName: string,
  sliceStrategy?: SliceStrategy,
  includeFlags?: boolean,
  includeRollout?: boolean
}
```

### `delivery_validate_plan`

Validate a delivery plan.

```typescript
{
  repoPath: string,
  plan: DeliveryPlan
}
```

## Slicing Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| `by-module` | Group by directory/module | Modular codebases |
| `by-layer` | Group by architecture layer | Layered architecture |
| `by-feature` | Group by feature area | Feature-based work |
| `by-risk` | Group by risk level | Risk-aware delivery |

## Rollout Stages

Default rollout progression:

1. **Internal** (1%) - Internal testing
2. **Canary** (5%) - Small user subset
3. **Beta** (25%) - Larger beta group
4. **GA** (100%) - General availability

## Example Workflow

```
1. Analyze changes:
   delivery_analyze_changes({ repoPath: "/path/to/repo" })

2. Slice into PRs:
   delivery_slice_changes({
     repoPath: "/path/to/repo",
     strategy: "by-module",
     maxFilesPerSlice: 10
   })

3. Generate feature flags:
   delivery_generate_flags({
     repoPath: "/path/to/repo",
     featureName: "new-checkout-flow"
   })

4. Create rollout plan:
   delivery_create_rollout({
     repoPath: "/path/to/repo",
     featureName: "new-checkout-flow"
   })
```

## License

MIT

## Author

Mustafa Yildirim
