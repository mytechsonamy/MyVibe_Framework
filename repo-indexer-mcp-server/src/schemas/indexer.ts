import { z } from "zod";

// ============================================================================
// INDEXING SCHEMAS
// ============================================================================

export const IndexRepoSchema = z.object({
  repoPath: z.string().describe("Absolute path to the repository root"),
  incremental: z.boolean().default(true).describe("Only index changed files (uses git diff + file hashes)"),
  languages: z.array(z.enum(["typescript", "javascript", "python", "go", "java"]))
    .default(["typescript", "javascript", "python", "go"])
    .describe("Languages to index"),
  excludePatterns: z.array(z.string()).optional().describe("Additional glob patterns to exclude"),
  includePatterns: z.array(z.string()).optional().describe("Override default include patterns"),
  maxFileSize: z.number().default(1024 * 1024).describe("Max file size in bytes (default 1MB)"),
  forceReindex: z.boolean().default(false).describe("Force full reindex even if incremental")
}).strict();

export const GetIndexStatusSchema = z.object({
  repoPath: z.string().describe("Repository path")
}).strict();

// ============================================================================
// SYMBOL QUERY SCHEMAS
// ============================================================================

export const QuerySymbolsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  name: z.string().optional().describe("Exact symbol name"),
  namePattern: z.string().optional().describe("Regex pattern for symbol name"),
  kind: z.array(z.enum([
    "function", "class", "interface", "type", "variable",
    "constant", "method", "property", "enum", "module", "namespace"
  ])).optional().describe("Filter by symbol kind"),
  filePath: z.string().optional().describe("Filter by file path"),
  filePattern: z.string().optional().describe("Glob pattern for file path"),
  exported: z.boolean().optional().describe("Only exported symbols"),
  limit: z.number().default(50).describe("Max results"),
  offset: z.number().default(0).describe("Pagination offset")
}).strict();

export const GetSymbolDetailsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  symbolId: z.string().optional().describe("Symbol ID"),
  filePath: z.string().optional().describe("File path"),
  symbolName: z.string().optional().describe("Symbol name"),
  line: z.number().optional().describe("Line number")
}).strict();

// ============================================================================
// DEPENDENCY QUERY SCHEMAS
// ============================================================================

export const QueryDependenciesSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  filePath: z.string().describe("File to analyze dependencies for"),
  direction: z.enum(["incoming", "outgoing", "both"]).default("both")
    .describe("incoming = who imports this, outgoing = what this imports"),
  depth: z.number().default(1).describe("Depth for transitive dependencies (1 = direct only)"),
  includeTypeOnly: z.boolean().default(true).describe("Include type-only imports"),
  includeExternal: z.boolean().default(false).describe("Include external package dependencies")
}).strict();

export const GetDependencyGraphSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  entryPoints: z.array(z.string()).optional().describe("Specific entry points (default: all files)"),
  maxDepth: z.number().default(5).describe("Max traversal depth"),
  format: z.enum(["adjacency", "edges", "mermaid"]).default("edges")
    .describe("Output format: adjacency list, edge list, or mermaid diagram")
}).strict();

// ============================================================================
// IMPACT ANALYSIS SCHEMAS
// ============================================================================

export const AnalyzeImpactSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  changedFiles: z.array(z.string()).describe("List of changed file paths"),
  symbolName: z.string().optional().describe("Specific symbol that changed"),
  depth: z.number().default(3).describe("How deep to trace impact"),
  includeTests: z.boolean().default(true).describe("Include test files in impact analysis")
}).strict();

export const GetHotspotsSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  metric: z.enum(["dependencies", "dependents", "complexity", "churn"])
    .default("dependents")
    .describe("Metric to rank files by"),
  limit: z.number().default(20).describe("Number of hotspots to return")
}).strict();

// ============================================================================
// FILE ANALYSIS SCHEMAS
// ============================================================================

export const AnalyzeFileSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  filePath: z.string().describe("Relative file path to analyze"),
  includeAST: z.boolean().default(false).describe("Include raw AST (large output)")
}).strict();

export const GetFileSummarySchema = z.object({
  repoPath: z.string().describe("Repository path"),
  filePath: z.string().describe("Relative file path"),
  summaryLevel: z.enum(["minimal", "standard", "detailed"]).default("standard")
    .describe("Level of detail in summary")
}).strict();

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

export const SearchCodeSchema = z.object({
  repoPath: z.string().describe("Repository path"),
  query: z.string().describe("Search query (symbol name, pattern, or natural language)"),
  searchType: z.enum(["symbol", "reference", "definition", "semantic"])
    .default("symbol")
    .describe("Type of search"),
  fileFilter: z.string().optional().describe("Glob pattern to filter files"),
  limit: z.number().default(20).describe("Max results")
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type IndexRepoInput = z.infer<typeof IndexRepoSchema>;
export type GetIndexStatusInput = z.infer<typeof GetIndexStatusSchema>;
export type QuerySymbolsInput = z.infer<typeof QuerySymbolsSchema>;
export type GetSymbolDetailsInput = z.infer<typeof GetSymbolDetailsSchema>;
export type QueryDependenciesInput = z.infer<typeof QueryDependenciesSchema>;
export type GetDependencyGraphInput = z.infer<typeof GetDependencyGraphSchema>;
export type AnalyzeImpactInput = z.infer<typeof AnalyzeImpactSchema>;
export type GetHotspotsInput = z.infer<typeof GetHotspotsSchema>;
export type AnalyzeFileInput = z.infer<typeof AnalyzeFileSchema>;
export type GetFileSummaryInput = z.infer<typeof GetFileSummarySchema>;
export type SearchCodeInput = z.infer<typeof SearchCodeSchema>;
