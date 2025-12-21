import { z } from "zod";

// ============================================================================
// CONTEXT PLANNING SCHEMAS
// ============================================================================

export const PlanContextSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  taskDescription: z.string().describe("Description of the task to perform"),
  targetFiles: z.array(z.string()).optional().describe("Specific files to focus on"),
  relevantSymbols: z.array(z.string()).optional().describe("Symbols that are relevant to the task"),
  maxTokens: z.number().default(100000).describe("Maximum token budget for context"),
  priority: z.enum(["completeness", "relevance", "balanced"]).default("balanced")
    .describe("Priority: completeness (more files), relevance (most relevant chunks), balanced")
}).strict();

export const GetContextSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  taskDescription: z.string().describe("Description of the task"),
  targetFiles: z.array(z.string()).optional().describe("Specific files to include"),
  relevantSymbols: z.array(z.string()).optional().describe("Relevant symbols"),
  maxTokens: z.number().default(100000).describe("Maximum token budget"),
  strategy: z.enum(["full_files", "smart_chunks", "summaries", "hybrid"]).default("hybrid")
    .describe("Context selection strategy"),
  includeTests: z.boolean().default(false).describe("Include test files"),
  includeDependencies: z.boolean().default(true).describe("Include file dependencies")
}).strict();

// ============================================================================
// FILE ANALYSIS SCHEMAS
// ============================================================================

export const AnalyzeRelevanceSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  targetFiles: z.array(z.string()).describe("Files to analyze relevance for"),
  taskDescription: z.string().optional().describe("Optional task description for better relevance"),
  maxResults: z.number().default(50).describe("Max number of relevant files to return")
}).strict();

export const GetFileSummarySchema = z.object({
  repoPath: z.string().describe("Repository path"),
  filePath: z.string().describe("File to summarize"),
  includeCode: z.boolean().default(false).describe("Include key code snippets")
}).strict();

export const ChunkFileSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  filePath: z.string().describe("File to chunk"),
  maxChunkTokens: z.number().default(2000).describe("Max tokens per chunk"),
  preserveStructure: z.boolean().default(true).describe("Preserve function/class boundaries")
}).strict();

// ============================================================================
// TOKEN MANAGEMENT SCHEMAS
// ============================================================================

export const EstimateTokensSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  files: z.array(z.string()).describe("Files to estimate tokens for")
}).strict();

export const OptimizeContextSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  currentContext: z.array(z.object({
    filePath: z.string(),
    content: z.string()
  })).describe("Current context chunks"),
  targetTokens: z.number().describe("Target token count"),
  preserveFiles: z.array(z.string()).optional().describe("Files that must remain in context")
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type PlanContextInput = z.infer<typeof PlanContextSchema>;
export type GetContextInput = z.infer<typeof GetContextSchema>;
export type AnalyzeRelevanceInput = z.infer<typeof AnalyzeRelevanceSchema>;
export type GetFileSummaryInput = z.infer<typeof GetFileSummarySchema>;
export type ChunkFileInput = z.infer<typeof ChunkFileSchema>;
export type EstimateTokensInput = z.infer<typeof EstimateTokensSchema>;
export type OptimizeContextInput = z.infer<typeof OptimizeContextSchema>;
