# Context Orchestrator MCP Server

An MCP (Model Context Protocol) server that provides intelligent context selection and token budget management for large codebases.

## Overview

This server solves the "Lost in the Middle" problem by intelligently selecting and prioritizing relevant code context within token limits. It provides:

- **Smart context selection** based on relevance scoring
- **Token budget management** using tiktoken
- **Multiple strategies**: full_files, smart_chunks, summaries, hybrid
- **Semantic chunking** for optimal context distribution

## Features

- **Token Counting**: Accurate token estimation using tiktoken (cl100k_base)
- **Relevance Scoring**: Multi-factor relevance analysis for files
- **Smart Chunking**: Semantic code splitting by functions/classes
- **Budget Allocation**: Optimal distribution across relevant files
- **File Summarization**: Concise summaries for context compression

## Installation

```bash
cd context-orchestrator-mcp-server

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
    "context-orchestrator": {
      "command": "node",
      "args": ["/path/to/context-orchestrator-mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

### `context_plan`

Plan optimal context selection for a task.

```typescript
{
  repoPath: string,
  taskDescription: string,    // What you're trying to do
  targetFiles?: string[],     // Primary files of interest
  tokenBudget?: number,       // Max tokens (default: 100000)
  strategy?: ContextStrategy  // Selection strategy
}
```

**Strategies**:
- `full_files`: Include complete files
- `smart_chunks`: Include relevant chunks only
- `summaries`: Include file summaries
- `hybrid`: Mix of strategies based on relevance

### `context_get`

Get optimized context chunks within token budget.

```typescript
{
  repoPath: string,
  files: string[],
  tokenBudget?: number,
  chunkSize?: number,     // Tokens per chunk (default: 500)
  overlapTokens?: number  // Overlap between chunks (default: 50)
}
```

### `context_analyze_relevance`

Analyze file relevance for target files.

```typescript
{
  repoPath: string,
  targetFiles: string[],   // Primary files you're working with
  candidateFiles?: string[], // Files to score (default: all)
  topN?: number            // Return top N results
}
```

### `context_summarize_file`

Get a concise summary of a file.

```typescript
{
  repoPath: string,
  filePath: string,
  maxTokens?: number  // Summary length limit
}
```

### `context_chunk_file`

Split file into semantic chunks.

```typescript
{
  repoPath: string,
  filePath: string,
  chunkSize?: number,
  overlapTokens?: number
}
```

### `context_estimate_tokens`

Estimate token counts for files.

```typescript
{
  repoPath: string,
  files: string[]
}
```

## Relevance Scoring

Files are scored based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Import Distance | 0.30 | How directly connected to target files |
| Directory Proximity | 0.20 | Same/nearby directory bonus |
| Name Similarity | 0.15 | Filename pattern matching |
| Type Match | 0.15 | Same file type (test, component, etc.) |
| Size Penalty | 0.10 | Smaller files preferred |
| Recency | 0.10 | Recently modified files preferred |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Context Plan   │────►│   Relevance     │
│    Request      │     │   Analyzer      │
└─────────────────┘     └─────────────────┘
                               │
                               ▼
┌─────────────────┐     ┌─────────────────┐
│    Tokenizer    │◄────│   Orchestrator  │
│   (tiktoken)    │     │                 │
└─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Context Chunks │
                        │   + Summaries   │
                        └─────────────────┘
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
