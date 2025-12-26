# Architecture Guardrails MCP Server

An MCP (Model Context Protocol) server that provides architecture-level linting and enforcement - like ESLint but for architecture.

## Overview

This server enforces architectural constraints by:

- **Layer boundary enforcement** - Prevent invalid dependencies between layers
- **Circular dependency detection** - Find and report dependency cycles
- **Pattern compliance** - Ensure code follows defined patterns
- **Security checks** - Detect hardcoded secrets, SQL injection risks

## Features

- **Preset Configurations**: Clean Architecture, MVC, Hexagonal
- **Custom Rules**: Define project-specific rules
- **Auto-fix Support**: Some violations can be auto-corrected
- **Multi-format Reports**: JSON, Markdown, HTML
- **Architecture Score**: 0-100 health score

## Installation

```bash
cd arch-guardrails-mcp-server

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
    "arch-guardrails": {
      "command": "node",
      "args": ["/path/to/arch-guardrails-mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

### `arch_init`

Initialize architecture guardrails config with a preset.

```typescript
{
  repoPath: string,
  preset?: ArchPreset,     // clean-architecture, mvc, hexagonal, custom
  outputFile?: string      // default: .arch-guardrails.json
}
```

### `arch_load_config`

Load existing architecture guardrails configuration.

```typescript
{
  repoPath: string,
  configFile?: string  // Auto-detected if not specified
}
```

### `arch_update_rule`

Enable/disable or configure a specific architecture rule.

```typescript
{
  repoPath: string,
  ruleId: string,
  enabled?: boolean,
  severity?: "error" | "warning" | "info",
  config?: Record<string, any>
}
```

### `arch_analyze`

Run architecture analysis on the codebase.

```typescript
{
  repoPath: string,
  files?: string[],   // Specific files to analyze
  rules?: string[],   // Specific rules to check
  fix?: boolean       // Auto-fix violations (default: false)
}
```

### `arch_analyze_layers`

Analyze layer dependencies and violations.

```typescript
{
  repoPath: string,
  layers?: LayerDefinition[]  // Uses config if not provided
}
```

### `arch_find_circular`

Find circular dependencies in the codebase.

```typescript
{
  repoPath: string,
  entryPoints?: string[]  // Entry points to start from
}
```

### `arch_check_security`

Run security-focused architecture checks.

```typescript
{
  repoPath: string,
  files?: string[],
  rules?: SecurityRule[]  // no-secrets, no-sql-injection, validate-input
}
```

### `arch_report`

Generate architecture analysis report.

```typescript
{
  repoPath: string,
  format?: "json" | "markdown" | "html",
  includeDetails?: boolean,
  outputFile?: string
}
```

### `arch_score`

Get the architecture health score (0-100).

```typescript
{
  repoPath: string
}
```

## Built-in Rules

### Layer Boundary Rules
| Rule ID | Description | Severity |
|---------|-------------|----------|
| `layer-boundary` | Enforces layer dependency rules | error |
| `no-circular-deps` | Prevents circular dependencies | error |
| `no-relative-parent-imports` | Limits ../../ import depth | warning |

### Structure Rules
| Rule ID | Description | Severity |
|---------|-------------|----------|
| `single-responsibility` | Max exports per file | warning |
| `max-file-lines` | Max lines per file (500) | warning |
| `index-exports-only` | Index files should only export | error |

### Naming Rules
| Rule ID | Description | Severity |
|---------|-------------|----------|
| `component-naming` | React components in PascalCase | warning |
| `constant-naming` | Constants in SCREAMING_SNAKE | warning |
| `file-naming` | File naming convention | warning |

### Security Rules
| Rule ID | Description | Severity |
|---------|-------------|----------|
| `no-secrets` | Detect hardcoded secrets | error |
| `no-sql-injection` | Detect SQL injection risks | error |
| `validate-input` | API input validation | warning |

## Architecture Presets

### Clean Architecture
```
domain (no deps) ← application ← infrastructure
                              ← presentation
```

### MVC
```
models (no deps) ← services ← controllers ← routes
```

### Hexagonal
```
domain (no deps) ← ports ← adapters
                        ← app
```

## Example Configuration

`.arch-guardrails.json`:
```json
{
  "extends": "clean-architecture",
  "rules": {
    "layer-boundary": "error",
    "no-circular-deps": "error",
    "max-file-lines": ["warning", { "maxLines": 300 }],
    "no-secrets": "error"
  },
  "layers": [
    {
      "name": "domain",
      "patterns": ["**/domain/**"],
      "allowedDependencies": []
    },
    {
      "name": "application",
      "patterns": ["**/application/**"],
      "allowedDependencies": ["domain"]
    }
  ]
}
```

## Score Calculation

| Grade | Score | Description |
|-------|-------|-------------|
| A | 90-100 | Excellent architecture |
| B | 80-89 | Good, minor issues |
| C | 70-79 | Acceptable, needs work |
| D | 60-69 | Poor, significant issues |
| F | < 60 | Critical problems |

## License

MIT

## Author

Mustafa Yildirim
