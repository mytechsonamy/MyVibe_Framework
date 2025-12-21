// Context Orchestrator Types

export interface ContextRequest {
  taskDescription: string;
  targetFiles?: string[];
  relevantSymbols?: string[];
  maxTokens: number;
  priority: "completeness" | "relevance" | "balanced";
}

export interface ContextChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  tokenCount: number;
  relevanceScore: number;
  chunkType: "full" | "function" | "class" | "imports" | "summary";
}

export interface ContextResult {
  chunks: ContextChunk[];
  totalTokens: number;
  filesIncluded: string[];
  filesSkipped: string[];
  truncationApplied: boolean;
  strategy: ContextStrategy;
}

export type ContextStrategy =
  | "full_files"      // Include complete files
  | "smart_chunks"    // Include relevant chunks only
  | "summaries"       // Include file summaries
  | "hybrid";         // Mix of above

export interface FileRelevance {
  filePath: string;
  relevanceScore: number;
  reasons: string[];
  tokenCount: number;
  symbols: string[];
}

export interface ContextPlan {
  strategy: ContextStrategy;
  prioritizedFiles: FileRelevance[];
  estimatedTokens: number;
  recommendedChunks: ContextChunk[];
}

export interface FileSummary {
  filePath: string;
  description: string;
  exports: string[];
  dependencies: string[];
  mainSymbols: string[];
  tokenCount: number;
}

export interface TokenBudget {
  total: number;
  used: number;
  remaining: number;
  breakdown: Record<string, number>;
}

export interface RelevanceFactors {
  directMatch: number;      // File directly mentioned
  dependencyOf: number;     // Imports target file
  dependedBy: number;       // Is imported by target
  symbolMatch: number;      // Contains relevant symbols
  recentChange: number;     // Recently modified
  highChurn: number;        // Frequently changed
  testFile: number;         // Is a test file
  configFile: number;       // Is a config file
}

export const DEFAULT_RELEVANCE_WEIGHTS: RelevanceFactors = {
  directMatch: 100,
  dependencyOf: 30,
  dependedBy: 40,
  symbolMatch: 50,
  recentChange: 20,
  highChurn: 15,
  testFile: -10,
  configFile: 10
};

export interface ChunkingConfig {
  maxChunkSize: number;      // Max tokens per chunk
  minChunkSize: number;      // Min tokens per chunk
  overlapTokens: number;     // Overlap between chunks
  preserveFunctions: boolean; // Keep functions intact
  preserveClasses: boolean;   // Keep classes intact
  includeImports: boolean;    // Always include imports
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxChunkSize: 2000,
  minChunkSize: 100,
  overlapTokens: 50,
  preserveFunctions: true,
  preserveClasses: true,
  includeImports: true
};
