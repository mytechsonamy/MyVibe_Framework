#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

import { RepoIndexer } from "./services/indexer.js";
import {
  IndexRepoSchema,
  GetIndexStatusSchema,
  QuerySymbolsSchema,
  GetSymbolDetailsSchema,
  QueryDependenciesSchema,
  GetDependencyGraphSchema,
  AnalyzeImpactSchema,
  GetHotspotsSchema,
  AnalyzeFileSchema,
  SearchCodeSchema
} from "./schemas/indexer.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "repo_index",
    description: "Index a repository to build symbol table, dependency graph, and enable code intelligence queries. Supports incremental indexing using git diff and content hashes.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Absolute path to the repository root" },
        incremental: { type: "boolean", default: true, description: "Only index changed files" },
        languages: {
          type: "array",
          items: { type: "string", enum: ["typescript", "javascript", "python", "go", "java"] },
          default: ["typescript", "javascript", "python", "go"],
          description: "Languages to index"
        },
        excludePatterns: { type: "array", items: { type: "string" }, description: "Additional glob patterns to exclude" },
        includePatterns: { type: "array", items: { type: "string" }, description: "Override default include patterns" },
        maxFileSize: { type: "number", default: 1048576, description: "Max file size in bytes (default 1MB)" },
        forceReindex: { type: "boolean", default: false, description: "Force full reindex" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "repo_status",
    description: "Get the current status of a repository's index including stats on files, symbols, and dependencies.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "repo_query_symbols",
    description: "Query symbols (functions, classes, interfaces, types, variables) in the indexed repository. Supports filtering by name, kind, file, and export status.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        name: { type: "string", description: "Exact symbol name" },
        namePattern: { type: "string", description: "Regex pattern for symbol name" },
        kind: {
          type: "array",
          items: { type: "string", enum: ["function", "class", "interface", "type", "variable", "constant", "method", "property", "enum", "module", "namespace"] },
          description: "Filter by symbol kind"
        },
        filePath: { type: "string", description: "Filter by file path" },
        filePattern: { type: "string", description: "Glob pattern for file path" },
        exported: { type: "boolean", description: "Only exported symbols" },
        limit: { type: "number", default: 50, description: "Max results" },
        offset: { type: "number", default: 0, description: "Pagination offset" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "repo_query_dependencies",
    description: "Query file dependencies - find what a file imports (outgoing) or what files import it (incoming). Essential for understanding code structure.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        filePath: { type: "string", description: "File to analyze dependencies for" },
        direction: { type: "string", enum: ["incoming", "outgoing", "both"], default: "both", description: "incoming = who imports this, outgoing = what this imports" },
        depth: { type: "number", default: 1, description: "Depth for transitive dependencies" },
        includeTypeOnly: { type: "boolean", default: true, description: "Include type-only imports" },
        includeExternal: { type: "boolean", default: false, description: "Include external package dependencies" }
      },
      required: ["repoPath", "filePath"]
    }
  },
  {
    name: "repo_dependency_graph",
    description: "Generate a dependency graph for the repository in various formats (adjacency list, edge list, or mermaid diagram).",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        entryPoints: { type: "array", items: { type: "string" }, description: "Specific entry points (default: all files)" },
        maxDepth: { type: "number", default: 5, description: "Max traversal depth" },
        format: { type: "string", enum: ["adjacency", "edges", "mermaid"], default: "edges", description: "Output format" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "repo_analyze_impact",
    description: "Analyze the impact of changes to specific files. Returns direct and transitive dependents, affected symbols, and risk score. Critical for safe refactoring.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        changedFiles: { type: "array", items: { type: "string" }, description: "List of changed file paths" },
        symbolName: { type: "string", description: "Specific symbol that changed" },
        depth: { type: "number", default: 3, description: "How deep to trace impact" },
        includeTests: { type: "boolean", default: true, description: "Include test files in impact analysis" }
      },
      required: ["repoPath", "changedFiles"]
    }
  },
  {
    name: "repo_get_hotspots",
    description: "Find code hotspots - files with high dependency count, many dependents, high complexity, or frequent changes. Helps identify risky areas.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        metric: { type: "string", enum: ["dependencies", "dependents", "complexity", "churn"], default: "dependents", description: "Metric to rank files by" },
        limit: { type: "number", default: 20, description: "Number of hotspots to return" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "repo_search",
    description: "Search for code across the indexed repository. Supports symbol search, reference lookup, and definition finding.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        query: { type: "string", description: "Search query (symbol name or pattern)" },
        searchType: { type: "string", enum: ["symbol", "reference", "definition", "semantic"], default: "symbol", description: "Type of search" },
        fileFilter: { type: "string", description: "Glob pattern to filter files" },
        limit: { type: "number", default: 20, description: "Max results" }
      },
      required: ["repoPath", "query"]
    }
  }
];

// Cache for indexers to avoid re-opening databases
const indexerCache = new Map<string, RepoIndexer>();

function getIndexer(repoPath: string): RepoIndexer {
  if (!indexerCache.has(repoPath)) {
    indexerCache.set(repoPath, new RepoIndexer(repoPath));
  }
  return indexerCache.get(repoPath)!;
}

// Create server
const server = new Server(
  {
    name: "repo-indexer-mcp-server",
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
      case "repo_index": {
        const input = IndexRepoSchema.parse(args);
        const indexer = getIndexer(input.repoPath);
        const result = await indexer.indexRepository(input);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }

      case "repo_status": {
        const input = GetIndexStatusSchema.parse(args);
        const indexer = getIndexer(input.repoPath);
        const status = indexer.getStatus();

        if (!status) {
          return {
            content: [{ type: "text", text: JSON.stringify({ indexed: false, message: "Repository not indexed. Run repo_index first." }, null, 2) }]
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(status, null, 2) }]
        };
      }

      case "repo_query_symbols": {
        const input = QuerySymbolsSchema.parse(args);
        const indexer = getIndexer(input.repoPath);
        const symbols = indexer.querySymbols({
          name: input.name,
          namePattern: input.namePattern,
          kind: input.kind,
          filePath: input.filePath,
          exported: input.exported,
          limit: input.limit,
          offset: input.offset
        });

        return {
          content: [{ type: "text", text: JSON.stringify({ count: symbols.length, symbols }, null, 2) }]
        };
      }

      case "repo_query_dependencies": {
        const input = QueryDependenciesSchema.parse(args);
        const indexer = getIndexer(input.repoPath);

        const result: any = { filePath: input.filePath };

        if (input.direction === "outgoing" || input.direction === "both") {
          result.outgoing = indexer.getOutgoingDependencies(input.filePath);
        }

        if (input.direction === "incoming" || input.direction === "both") {
          result.incoming = indexer.getIncomingDependencies(input.filePath);
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }

      case "repo_dependency_graph": {
        const input = GetDependencyGraphSchema.parse(args);
        const indexer = getIndexer(input.repoPath);
        const graph = indexer.generateDependencyGraph(input.format, input.maxDepth);

        return {
          content: [{ type: "text", text: graph }]
        };
      }

      case "repo_analyze_impact": {
        const input = AnalyzeImpactSchema.parse(args);
        const indexer = getIndexer(input.repoPath);
        const impact = indexer.analyzeImpact(input.changedFiles, input.depth, input.includeTests);

        return {
          content: [{ type: "text", text: JSON.stringify(impact, null, 2) }]
        };
      }

      case "repo_get_hotspots": {
        const input = GetHotspotsSchema.parse(args);
        const indexer = getIndexer(input.repoPath);
        const hotspots = await indexer.getHotspots(input.metric, input.limit);

        return {
          content: [{ type: "text", text: JSON.stringify({ metric: input.metric, hotspots }, null, 2) }]
        };
      }

      case "repo_search": {
        const input = SearchCodeSchema.parse(args);
        const indexer = getIndexer(input.repoPath);

        // For now, search is implemented as symbol query
        // Future: semantic search with embeddings
        const symbols = indexer.querySymbols({
          namePattern: input.query,
          limit: input.limit
        });

        return {
          content: [{ type: "text", text: JSON.stringify({ query: input.query, results: symbols }, null, 2) }]
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

// Cleanup on exit
process.on("SIGINT", () => {
  for (const indexer of indexerCache.values()) {
    indexer.close();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  for (const indexer of indexerCache.values()) {
    indexer.close();
  }
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Repo Indexer MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
