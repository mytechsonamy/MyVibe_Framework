#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

import { ContextOrchestrator } from "./services/orchestrator.js";
import { getTokenizer } from "./services/tokenizer.js";
import {
  PlanContextSchema,
  GetContextSchema,
  AnalyzeRelevanceSchema,
  GetFileSummarySchema,
  ChunkFileSchema,
  EstimateTokensSchema
} from "./schemas/context.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "context_plan",
    description: "Plan the optimal context selection for a coding task. Analyzes files, estimates tokens, and recommends a strategy for including relevant code in the context window.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        taskDescription: { type: "string", description: "Description of the task to perform" },
        targetFiles: { type: "array", items: { type: "string" }, description: "Specific files to focus on" },
        relevantSymbols: { type: "array", items: { type: "string" }, description: "Symbols that are relevant" },
        maxTokens: { type: "number", default: 100000, description: "Maximum token budget" },
        priority: { type: "string", enum: ["completeness", "relevance", "balanced"], default: "balanced" }
      },
      required: ["repoPath", "taskDescription"]
    }
  },
  {
    name: "context_get",
    description: "Get optimized context for a coding task. Returns code chunks prioritized by relevance within the token budget.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        taskDescription: { type: "string", description: "Description of the task" },
        targetFiles: { type: "array", items: { type: "string" }, description: "Specific files to include" },
        relevantSymbols: { type: "array", items: { type: "string" }, description: "Relevant symbols" },
        maxTokens: { type: "number", default: 100000, description: "Maximum token budget" },
        strategy: { type: "string", enum: ["full_files", "smart_chunks", "summaries", "hybrid"], default: "hybrid" },
        includeTests: { type: "boolean", default: false, description: "Include test files" },
        includeDependencies: { type: "boolean", default: true, description: "Include file dependencies" }
      },
      required: ["repoPath", "taskDescription"]
    }
  },
  {
    name: "context_analyze_relevance",
    description: "Analyze file relevance for a set of target files. Returns scored list of related files based on dependencies, symbols, and content.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        targetFiles: { type: "array", items: { type: "string" }, description: "Files to analyze relevance for" },
        taskDescription: { type: "string", description: "Optional task description for better relevance" },
        maxResults: { type: "number", default: 50, description: "Max number of relevant files" }
      },
      required: ["repoPath", "targetFiles"]
    }
  },
  {
    name: "context_summarize_file",
    description: "Get a concise summary of a file including exports, dependencies, and main symbols. Useful for understanding file purpose without full content.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        filePath: { type: "string", description: "File to summarize" },
        includeCode: { type: "boolean", default: false, description: "Include key code snippets" }
      },
      required: ["repoPath", "filePath"]
    }
  },
  {
    name: "context_chunk_file",
    description: "Split a file into semantic chunks respecting function/class boundaries. Useful for including only relevant parts of large files.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        filePath: { type: "string", description: "File to chunk" },
        maxChunkTokens: { type: "number", default: 2000, description: "Max tokens per chunk" },
        preserveStructure: { type: "boolean", default: true, description: "Preserve function/class boundaries" }
      },
      required: ["repoPath", "filePath"]
    }
  },
  {
    name: "context_estimate_tokens",
    description: "Estimate token counts for a list of files. Helps with context budget planning.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        files: { type: "array", items: { type: "string" }, description: "Files to estimate" }
      },
      required: ["repoPath", "files"]
    }
  }
];

// Cache for orchestrators
const orchestratorCache = new Map<string, ContextOrchestrator>();

function getOrchestrator(repoPath: string): ContextOrchestrator {
  if (!orchestratorCache.has(repoPath)) {
    orchestratorCache.set(repoPath, new ContextOrchestrator(repoPath));
  }
  return orchestratorCache.get(repoPath)!;
}

// Create server
const server = new Server(
  {
    name: "context-orchestrator-mcp-server",
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
      case "context_plan": {
        const input = PlanContextSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const plan = await orchestrator.planContext(
          input.taskDescription,
          input.targetFiles || [],
          input.relevantSymbols || [],
          input.maxTokens,
          input.priority
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              strategy: plan.strategy,
              estimatedTokens: plan.estimatedTokens,
              fileCount: plan.prioritizedFiles.length,
              topFiles: plan.prioritizedFiles.slice(0, 10).map(f => ({
                file: f.filePath,
                score: f.relevanceScore,
                tokens: f.tokenCount,
                reasons: f.reasons
              })),
              chunkCount: plan.recommendedChunks.length
            }, null, 2)
          }]
        };
      }

      case "context_get": {
        const input = GetContextSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = await orchestrator.getContext(
          input.taskDescription,
          input.targetFiles || [],
          input.relevantSymbols || [],
          input.maxTokens,
          input.strategy,
          input.includeTests,
          input.includeDependencies
        );

        // Return chunks with content
        const output = {
          totalTokens: result.totalTokens,
          filesIncluded: result.filesIncluded,
          filesSkipped: result.filesSkipped.length,
          truncationApplied: result.truncationApplied,
          strategy: result.strategy,
          chunks: result.chunks.map(c => ({
            file: c.filePath,
            lines: `${c.startLine}-${c.endLine}`,
            tokens: c.tokenCount,
            type: c.chunkType,
            content: c.content
          }))
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }]
        };
      }

      case "context_analyze_relevance": {
        const input = AnalyzeRelevanceSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const relevance = await orchestrator.analyzeRelevance(
          input.targetFiles,
          input.taskDescription
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              targetFiles: input.targetFiles,
              relatedFiles: relevance.slice(0, input.maxResults).map(f => ({
                file: f.filePath,
                score: f.relevanceScore,
                tokens: f.tokenCount,
                reasons: f.reasons,
                symbols: f.symbols.slice(0, 5)
              }))
            }, null, 2)
          }]
        };
      }

      case "context_summarize_file": {
        const input = GetFileSummarySchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const summary = await orchestrator.summarizeFile(input.filePath, input.includeCode);

        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }]
        };
      }

      case "context_chunk_file": {
        const input = ChunkFileSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const chunks = await orchestrator.chunkFile(
          input.filePath,
          input.maxChunkTokens,
          input.preserveStructure
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              file: input.filePath,
              totalChunks: chunks.length,
              totalTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
              chunks: chunks.map(c => ({
                id: c.id,
                lines: `${c.startLine}-${c.endLine}`,
                tokens: c.tokenCount,
                type: c.chunkType,
                preview: c.content.substring(0, 200) + (c.content.length > 200 ? "..." : "")
              }))
            }, null, 2)
          }]
        };
      }

      case "context_estimate_tokens": {
        const input = EstimateTokensSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const budget = await orchestrator.estimateTokens(input.files);

        return {
          content: [{ type: "text", text: JSON.stringify(budget, null, 2) }]
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
  getTokenizer().free();
  process.exit(0);
});

process.on("SIGTERM", () => {
  getTokenizer().free();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Context Orchestrator MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
