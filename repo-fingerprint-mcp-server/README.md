# Repo Fingerprint MCP Server

An MCP (Model Context Protocol) server that learns a project's "dialect" - coding style, error handling patterns, logging standards, and naming conventions.

## Overview

This server creates a fingerprint of your codebase by:

- **Analyzing coding style** - Indentation, quotes, semicolons
- **Detecting patterns** - Error handling, async patterns, imports
- **Learning conventions** - Naming, file structure, testing
- **Generating guides** - Style guides and code templates

## Features

- **Style Analysis**: Indentation, quotes, semicolons, async patterns
- **Naming Detection**: Files, classes, functions, variables
- **Pattern Learning**: Custom pattern detection and validation
- **Template Generation**: Code templates following project style
- **Style Guide Output**: Markdown, JSON, or HTML format

## Installation

```bash
cd repo-fingerprint-mcp-server

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
    "repo-fingerprint": {
      "command": "node",
      "args": ["/path/to/repo-fingerprint-mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

### `fingerprint_create`

Create a fingerprint of the repository's coding style and patterns.

```typescript
{
  repoPath: string,
  deep?: boolean,          // Perform deep analysis (default: false)
  includeTests?: boolean,  // Include test files (default: true)
  maxFiles?: number        // Max files to analyze (default: 100)
}
```

### `fingerprint_get`

Get the existing fingerprint for a repository.

```typescript
{
  repoPath: string
}
```

### `fingerprint_update`

Update the fingerprint with new analysis.

```typescript
{
  repoPath: string,
  incrementalOnly?: boolean  // Only analyze changed files
}
```

### `fingerprint_coding_style`

Analyze the coding style of the repository.

```typescript
{
  repoPath: string,
  files?: string[],
  sampleSize?: number
}
```

### `fingerprint_naming`

Analyze naming conventions in the repository.

```typescript
{
  repoPath: string,
  scope?: "all" | "files" | "code"
}
```

### `fingerprint_error_handling`

Analyze error handling patterns.

```typescript
{
  repoPath: string,
  includeExamples?: boolean
}
```

### `fingerprint_logging`

Analyze logging standards.

```typescript
{
  repoPath: string,
  includeExamples?: boolean
}
```

### `fingerprint_detect_patterns`

Detect common code patterns.

```typescript
{
  repoPath: string,
  patternType?: "all" | "error" | "async" | "import" | "export" | "custom",
  minOccurrences?: number
}
```

### `fingerprint_learn_pattern`

Learn a custom pattern from the repository.

```typescript
{
  repoPath: string,
  name: string,
  description: string,
  regex: string,
  category?: string
}
```

### `fingerprint_validate`

Validate code against the fingerprint.

```typescript
{
  repoPath: string,
  code: string,
  context?: string
}
```

### `fingerprint_structure`

Analyze project structure.

```typescript
{
  repoPath: string,
  depth?: number
}
```

### `fingerprint_dependencies`

Analyze project dependencies.

```typescript
{
  repoPath: string,
  includeDevDeps?: boolean
}
```

### `fingerprint_testing`

Analyze testing patterns.

```typescript
{
  repoPath: string,
  includeExamples?: boolean
}
```

### `fingerprint_style_guide`

Generate a style guide from the fingerprint.

```typescript
{
  repoPath: string,
  format?: "markdown" | "json" | "html",
  sections?: string[]
}
```

### `fingerprint_template`

Generate a code template following project conventions.

```typescript
{
  repoPath: string,
  templateType: "function" | "class" | "component" | "test" | "service" | "controller",
  name: string,
  options?: Record<string, any>
}
```

### `fingerprint_suggest`

Suggest naming convention for new code.

```typescript
{
  repoPath: string,
  codeType: "function" | "class" | "variable" | "constant" | "file" | "directory",
  context: string
}
```

## Detected Patterns

### Coding Style
| Property | Values |
|----------|--------|
| Indentation | spaces / tabs |
| Indent Size | 2 / 4 / 8 |
| Quotes | single / double |
| Semicolons | yes / no |
| Async Style | async-await / promises / callbacks |

### Naming Conventions
| Element | Common Styles |
|---------|---------------|
| Files | kebab-case, camelCase, PascalCase |
| Classes | PascalCase |
| Functions | camelCase |
| Variables | camelCase |
| Constants | SCREAMING_SNAKE_CASE |

### Error Handling
| Pattern | Description |
|---------|-------------|
| try-catch | Traditional try/catch blocks |
| promises | .catch() chains |
| result-type | Result<T, E> patterns |
| throw | throw new Error |

### Logging
| Library | Format |
|---------|--------|
| console | Basic console.* |
| winston | Structured JSON |
| pino | Fast JSON |
| bunyan | JSON with levels |

## Confidence Levels

| Level | Threshold | Meaning |
|-------|-----------|---------|
| High | > 80% | Very consistent pattern |
| Medium | 50-80% | Mostly consistent |
| Low | < 50% | Inconsistent |

## Example Fingerprint Output

```json
{
  "language": "typescript",
  "framework": "express",
  "codingStyle": {
    "indentation": "spaces",
    "indentSize": 2,
    "quotes": "single",
    "semicolons": true,
    "asyncStyle": "async-await"
  },
  "namingConventions": {
    "files": { "style": "kebab-case", "confidence": "high" },
    "classes": { "style": "PascalCase", "confidence": "high" },
    "functions": { "style": "camelCase", "confidence": "high" }
  },
  "errorHandling": {
    "primaryPattern": "try-catch",
    "customErrorClasses": true,
    "validationApproach": "zod"
  }
}
```

## Generated Templates

Templates follow detected conventions:

```typescript
// fingerprint_template: service, UserService
export class UserService {
  constructor() {
    // TODO: Inject dependencies
  }

  async execute(): Promise<void> {
    // TODO: Implement
  }
}
```

## License

MIT

## Author

Mustafa Yildirim
