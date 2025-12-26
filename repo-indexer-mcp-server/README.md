# Repo Indexer MCP Server

An MCP (Model Context Protocol) server that provides codebase intelligence through AST parsing, symbol tracking, and dependency analysis.

## Overview

This server enables intelligent code understanding for large codebases (100K+ LOC). It provides:

- **Multi-language parsing** (TypeScript, JavaScript, Python, Go)
- **Symbol extraction** (functions, classes, interfaces, types)
- **Dependency graph** generation and analysis
- **Impact analysis** for change risk assessment
- **Hotspot detection** for identifying problematic areas

## Features

- **Incremental Indexing**: SQLite-backed index with WAL mode for fast updates
- **AST Parsing**: Deep code analysis using language-specific parsers
- **Dependency Graph**: Tracks imports/exports and module relationships
- **Impact Analysis**: Calculates risk scores for code changes
- **Churn Detection**: Git history integration for hotspot analysis

## Installation

```bash
cd repo-indexer-mcp-server

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
    "repo-indexer": {
      "command": "node",
      "args": ["/path/to/repo-indexer-mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

### `repo_index`

Index a repository for code intelligence.

```typescript
{
  repoPath: string,      // Path to repository
  incremental?: boolean, // Only index changed files (default: true)
  languages?: string[]   // Languages to index (default: all supported)
}
```

### `repo_status`

Get index status and statistics.

```typescript
{
  repoPath: string
}
```

### `repo_query_symbols`

Query symbols (functions, classes, types).

```typescript
{
  repoPath: string,
  query?: string,           // Search query
  type?: SymbolType,        // function, class, interface, type, variable
  file?: string,            // Filter by file
  limit?: number            // Max results (default: 50)
}
```

### `repo_query_dependencies`

Find file dependencies.

```typescript
{
  repoPath: string,
  file: string,
  direction?: "incoming" | "outgoing" | "both"
}
```

### `repo_dependency_graph`

Generate dependency graph.

```typescript
{
  repoPath: string,
  entryPoints?: string[],
  maxDepth?: number,
  format?: "adjacency" | "edges" | "mermaid"
}
```

### `repo_analyze_impact`

Analyze change impact with risk scoring.

```typescript
{
  repoPath: string,
  files: string[],       // Changed files
  includeTests?: boolean
}
```

### `repo_get_hotspots`

Find code hotspots.

```typescript
{
  repoPath: string,
  metric?: "dependents" | "complexity" | "churn",
  limit?: number
}
```

### `repo_search`

Search symbols across codebase.

```typescript
{
  repoPath: string,
  query: string,
  caseSensitive?: boolean
}
```

## Supported Languages

| Language | Extensions | Parsing |
|----------|------------|---------|
| TypeScript | .ts, .tsx | Full AST |
| JavaScript | .js, .jsx | Full AST |
| Python | .py | Regex-based |
| Go | .go | Regex-based |

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Indexer    │────►│    Parser    │────►│   Storage    │
│   Service    │     │  (per-lang)  │     │   (SQLite)   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                                         │
       ▼                                         ▼
┌──────────────┐                         ┌──────────────┐
│ Impact       │                         │ Symbol &     │
│ Analysis     │                         │ Dependency   │
└──────────────┘                         │ Tables       │
                                         └──────────────┘
```

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build
```

## License

MIT

## Author

Mustafa Yildirim
