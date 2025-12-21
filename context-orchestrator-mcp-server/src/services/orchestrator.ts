import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import {
  ContextChunk,
  ContextResult,
  ContextStrategy,
  FileRelevance,
  ContextPlan,
  FileSummary,
  TokenBudget,
  DEFAULT_RELEVANCE_WEIGHTS,
  DEFAULT_CHUNKING_CONFIG,
  ChunkingConfig
} from "../types.js";
import { countTokens, getTokenizer } from "./tokenizer.js";

export class ContextOrchestrator {
  private repoPath: string;
  private chunkingConfig: ChunkingConfig;

  constructor(repoPath: string, config?: Partial<ChunkingConfig>) {
    this.repoPath = repoPath;
    this.chunkingConfig = { ...DEFAULT_CHUNKING_CONFIG, ...config };
  }

  // ============================================================================
  // CONTEXT PLANNING
  // ============================================================================

  async planContext(
    taskDescription: string,
    targetFiles: string[],
    relevantSymbols: string[],
    maxTokens: number,
    priority: "completeness" | "relevance" | "balanced"
  ): Promise<ContextPlan> {
    // Analyze relevance of all files
    const relevantFiles = await this.analyzeRelevance(targetFiles, taskDescription);

    // Estimate total tokens needed
    let totalEstimatedTokens = 0;
    for (const file of relevantFiles) {
      totalEstimatedTokens += file.tokenCount;
    }

    // Determine strategy based on tokens and priority
    let strategy: ContextStrategy;
    if (totalEstimatedTokens <= maxTokens * 0.7) {
      strategy = "full_files";
    } else if (priority === "completeness") {
      strategy = "summaries";
    } else if (priority === "relevance") {
      strategy = "smart_chunks";
    } else {
      strategy = "hybrid";
    }

    // Generate recommended chunks
    const chunks = await this.selectChunks(relevantFiles, maxTokens, strategy, relevantSymbols);

    return {
      strategy,
      prioritizedFiles: relevantFiles,
      estimatedTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
      recommendedChunks: chunks
    };
  }

  async getContext(
    taskDescription: string,
    targetFiles: string[],
    relevantSymbols: string[],
    maxTokens: number,
    strategy: ContextStrategy,
    includeTests: boolean,
    includeDependencies: boolean
  ): Promise<ContextResult> {
    // Get relevant files
    let relevantFiles = await this.analyzeRelevance(targetFiles, taskDescription);

    // Filter test files if not included
    if (!includeTests) {
      relevantFiles = relevantFiles.filter(f => !this.isTestFile(f.filePath));
    }

    // Select chunks based on strategy
    const chunks = await this.selectChunks(relevantFiles, maxTokens, strategy, relevantSymbols);

    const filesIncluded = [...new Set(chunks.map(c => c.filePath))];
    const filesSkipped = relevantFiles
      .map(f => f.filePath)
      .filter(f => !filesIncluded.includes(f));

    return {
      chunks,
      totalTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
      filesIncluded,
      filesSkipped,
      truncationApplied: chunks.some(c => c.chunkType !== "full"),
      strategy
    };
  }

  // ============================================================================
  // RELEVANCE ANALYSIS
  // ============================================================================

  async analyzeRelevance(
    targetFiles: string[],
    taskDescription?: string
  ): Promise<FileRelevance[]> {
    const allFiles = await this.discoverFiles();
    const relevanceScores: FileRelevance[] = [];

    const targetSet = new Set(targetFiles.map(f => this.resolvePath(f)));

    for (const filePath of allFiles) {
      const absolutePath = path.join(this.repoPath, filePath);

      let score = 0;
      const reasons: string[] = [];
      let tokenCount = 0;
      const symbols: string[] = [];

      // Check if directly targeted
      if (targetSet.has(absolutePath) || targetSet.has(filePath)) {
        score += DEFAULT_RELEVANCE_WEIGHTS.directMatch;
        reasons.push("directly targeted");
      }

      // Read file content for analysis
      try {
        const content = fs.readFileSync(absolutePath, "utf-8");
        tokenCount = countTokens(content);

        // Extract symbols (simple regex for now)
        const symbolMatches = content.match(/(?:function|class|interface|type|const|let|var|export)\s+(\w+)/g) || [];
        for (const match of symbolMatches) {
          const name = match.split(/\s+/).pop();
          if (name) symbols.push(name);
        }

        // Check for task-related keywords
        if (taskDescription) {
          const keywords = taskDescription.toLowerCase().split(/\s+/);
          const contentLower = content.toLowerCase();
          let keywordMatches = 0;
          for (const kw of keywords) {
            if (kw.length > 3 && contentLower.includes(kw)) {
              keywordMatches++;
            }
          }
          if (keywordMatches > 0) {
            score += keywordMatches * 5;
            reasons.push(`${keywordMatches} keyword matches`);
          }
        }

        // Check for imports of target files
        for (const target of targetFiles) {
          const baseName = path.basename(target, path.extname(target));
          if (content.includes(`from './${baseName}'`) ||
              content.includes(`from "./${baseName}"`) ||
              content.includes(`import ${baseName}`)) {
            score += DEFAULT_RELEVANCE_WEIGHTS.dependencyOf;
            reasons.push(`imports ${baseName}`);
          }
        }
      } catch (error) {
        // File read error, skip
        continue;
      }

      // Config file bonus
      if (this.isConfigFile(filePath)) {
        score += DEFAULT_RELEVANCE_WEIGHTS.configFile;
        reasons.push("config file");
      }

      // Test file penalty (unless explicitly targeted)
      if (this.isTestFile(filePath) && !targetSet.has(absolutePath)) {
        score += DEFAULT_RELEVANCE_WEIGHTS.testFile;
        reasons.push("test file");
      }

      if (score > 0) {
        relevanceScores.push({
          filePath: absolutePath,
          relevanceScore: score,
          reasons,
          tokenCount,
          symbols
        });
      }
    }

    // Sort by relevance score
    relevanceScores.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return relevanceScores;
  }

  // ============================================================================
  // FILE SUMMARIZATION
  // ============================================================================

  async summarizeFile(filePath: string, includeCode: boolean = false): Promise<FileSummary> {
    const absolutePath = this.resolvePath(filePath);
    const content = fs.readFileSync(absolutePath, "utf-8");

    // Extract exports
    const exports = this.extractExports(content);

    // Extract imports as dependencies
    const dependencies = this.extractImports(content);

    // Extract main symbols
    const mainSymbols = this.extractMainSymbols(content);

    // Generate description
    const description = this.generateDescription(filePath, exports, mainSymbols);

    return {
      filePath: absolutePath,
      description,
      exports,
      dependencies,
      mainSymbols,
      tokenCount: countTokens(content)
    };
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const regex = /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|var)\s+(\w+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  private extractMainSymbols(content: string): string[] {
    const symbols: string[] = [];
    const regex = /(?:export\s+)?(?:async\s+)?(?:function|class|interface|type)\s+(\w+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      symbols.push(match[1]);
    }
    return symbols.slice(0, 10); // Limit to 10 main symbols
  }

  private generateDescription(filePath: string, exports: string[], symbols: string[]): string {
    const fileName = path.basename(filePath);
    const dir = path.dirname(filePath);

    if (exports.length > 0) {
      return `${fileName} exports ${exports.slice(0, 5).join(", ")}${exports.length > 5 ? "..." : ""}`;
    } else if (symbols.length > 0) {
      return `${fileName} defines ${symbols.slice(0, 5).join(", ")}${symbols.length > 5 ? "..." : ""}`;
    }
    return `${fileName} in ${path.basename(dir)}`;
  }

  // ============================================================================
  // CHUNKING
  // ============================================================================

  async chunkFile(
    filePath: string,
    maxChunkTokens?: number,
    preserveStructure: boolean = true
  ): Promise<ContextChunk[]> {
    const absolutePath = this.resolvePath(filePath);
    const content = fs.readFileSync(absolutePath, "utf-8");
    const lines = content.split("\n");

    const maxTokens = maxChunkTokens || this.chunkingConfig.maxChunkSize;
    const totalTokens = countTokens(content);

    // If file fits in one chunk, return full file
    if (totalTokens <= maxTokens) {
      return [{
        id: `${filePath}:full`,
        filePath: absolutePath,
        startLine: 1,
        endLine: lines.length,
        content,
        tokenCount: totalTokens,
        relevanceScore: 100,
        chunkType: "full"
      }];
    }

    const chunks: ContextChunk[] = [];

    if (preserveStructure) {
      // Try to preserve function/class boundaries
      chunks.push(...this.chunkByStructure(absolutePath, content, maxTokens));
    } else {
      // Simple line-based chunking
      chunks.push(...this.chunkByLines(absolutePath, content, maxTokens));
    }

    return chunks;
  }

  private chunkByStructure(filePath: string, content: string, maxTokens: number): ContextChunk[] {
    const chunks: ContextChunk[] = [];
    const lines = content.split("\n");

    // Find function/class boundaries using regex
    const boundaries: Array<{ start: number; end: number; type: string; name: string }> = [];

    // Match function declarations
    const funcRegex = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split("\n").length;
      const endLine = this.findClosingBrace(lines, startLine);
      boundaries.push({ start: startLine, end: endLine, type: "function", name: match[1] });
    }

    // Match class declarations
    const classRegex = /^(?:export\s+)?class\s+(\w+)/gm;
    while ((match = classRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split("\n").length;
      const endLine = this.findClosingBrace(lines, startLine);
      boundaries.push({ start: startLine, end: endLine, type: "class", name: match[1] });
    }

    // Sort by start line
    boundaries.sort((a, b) => a.start - b.start);

    // Create chunks from boundaries
    let chunkId = 0;
    for (const boundary of boundaries) {
      const chunkContent = lines.slice(boundary.start - 1, boundary.end).join("\n");
      const tokenCount = countTokens(chunkContent);

      if (tokenCount <= maxTokens) {
        chunks.push({
          id: `${filePath}:${chunkId++}`,
          filePath,
          startLine: boundary.start,
          endLine: boundary.end,
          content: chunkContent,
          tokenCount,
          relevanceScore: 80,
          chunkType: boundary.type as "function" | "class"
        });
      } else {
        // Too large, use line-based chunking for this section
        chunks.push(...this.chunkByLines(filePath, chunkContent, maxTokens, boundary.start));
      }
    }

    // Always include imports section
    const importEnd = this.findImportsEnd(lines);
    if (importEnd > 0) {
      const importContent = lines.slice(0, importEnd).join("\n");
      const importTokens = countTokens(importContent);
      if (importTokens <= maxTokens) {
        chunks.unshift({
          id: `${filePath}:imports`,
          filePath,
          startLine: 1,
          endLine: importEnd,
          content: importContent,
          tokenCount: importTokens,
          relevanceScore: 90,
          chunkType: "imports"
        });
      }
    }

    return chunks;
  }

  private chunkByLines(
    filePath: string,
    content: string,
    maxTokens: number,
    startLineOffset: number = 1
  ): ContextChunk[] {
    const chunks: ContextChunk[] = [];
    const lines = content.split("\n");
    const tokenizer = getTokenizer();

    let chunkId = 0;
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkStartLine = startLineOffset;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTokens = countTokens(line);

      if (currentTokens + lineTokens > maxTokens && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          id: `${filePath}:${chunkId++}`,
          filePath,
          startLine: chunkStartLine,
          endLine: startLineOffset + i - 1,
          content: currentChunk.join("\n"),
          tokenCount: currentTokens,
          relevanceScore: 50,
          chunkType: "full"
        });

        // Start new chunk
        currentChunk = [line];
        currentTokens = lineTokens;
        chunkStartLine = startLineOffset + i;
      } else {
        currentChunk.push(line);
        currentTokens += lineTokens;
      }
    }

    // Save remaining chunk
    if (currentChunk.length > 0) {
      chunks.push({
        id: `${filePath}:${chunkId++}`,
        filePath,
        startLine: chunkStartLine,
        endLine: startLineOffset + lines.length - 1,
        content: currentChunk.join("\n"),
        tokenCount: currentTokens,
        relevanceScore: 50,
        chunkType: "full"
      });
    }

    return chunks;
  }

  private findClosingBrace(lines: string[], startLine: number): number {
    let braceCount = 0;
    let foundFirst = false;

    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === "{") {
          braceCount++;
          foundFirst = true;
        } else if (char === "}") {
          braceCount--;
          if (foundFirst && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }
    return lines.length;
  }

  private findImportsEnd(lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith("import") && !line.startsWith("//") && !line.startsWith("/*")) {
        return i;
      }
    }
    return 0;
  }

  // ============================================================================
  // CONTEXT SELECTION
  // ============================================================================

  private async selectChunks(
    files: FileRelevance[],
    maxTokens: number,
    strategy: ContextStrategy,
    relevantSymbols: string[]
  ): Promise<ContextChunk[]> {
    const chunks: ContextChunk[] = [];
    let usedTokens = 0;

    for (const file of files) {
      if (usedTokens >= maxTokens) break;

      const remainingTokens = maxTokens - usedTokens;

      switch (strategy) {
        case "full_files":
          if (file.tokenCount <= remainingTokens) {
            const fileChunks = await this.chunkFile(file.filePath, remainingTokens, false);
            chunks.push(...fileChunks);
            usedTokens += file.tokenCount;
          }
          break;

        case "smart_chunks":
          const smartChunks = await this.chunkFile(file.filePath, remainingTokens, true);
          // Filter to most relevant chunks
          const relevantChunks = smartChunks.filter(c => {
            // Keep chunks that contain relevant symbols
            for (const symbol of relevantSymbols) {
              if (c.content.includes(symbol)) {
                c.relevanceScore += 20;
                return true;
              }
            }
            return c.chunkType === "imports" || c.relevanceScore >= 70;
          });
          for (const chunk of relevantChunks) {
            if (usedTokens + chunk.tokenCount <= maxTokens) {
              chunks.push(chunk);
              usedTokens += chunk.tokenCount;
            }
          }
          break;

        case "summaries":
          const summary = await this.summarizeFile(file.filePath, false);
          const summaryText = `// File: ${file.filePath}\n// ${summary.description}\n// Exports: ${summary.exports.join(", ")}\n// Dependencies: ${summary.dependencies.join(", ")}`;
          const summaryTokens = countTokens(summaryText);
          if (usedTokens + summaryTokens <= maxTokens) {
            chunks.push({
              id: `${file.filePath}:summary`,
              filePath: file.filePath,
              startLine: 1,
              endLine: 1,
              content: summaryText,
              tokenCount: summaryTokens,
              relevanceScore: file.relevanceScore,
              chunkType: "summary"
            });
            usedTokens += summaryTokens;
          }
          break;

        case "hybrid":
        default:
          // High relevance: full file or smart chunks
          // Medium relevance: summary
          if (file.relevanceScore >= 70 && file.tokenCount <= remainingTokens * 0.3) {
            const fullChunks = await this.chunkFile(file.filePath, remainingTokens, true);
            for (const chunk of fullChunks) {
              if (usedTokens + chunk.tokenCount <= maxTokens) {
                chunks.push(chunk);
                usedTokens += chunk.tokenCount;
              }
            }
          } else {
            const summary = await this.summarizeFile(file.filePath, false);
            const summaryText = `// ${path.basename(file.filePath)}: ${summary.description}`;
            const summaryTokens = countTokens(summaryText);
            if (usedTokens + summaryTokens <= maxTokens) {
              chunks.push({
                id: `${file.filePath}:summary`,
                filePath: file.filePath,
                startLine: 1,
                endLine: 1,
                content: summaryText,
                tokenCount: summaryTokens,
                relevanceScore: file.relevanceScore,
                chunkType: "summary"
              });
              usedTokens += summaryTokens;
            }
          }
          break;
      }
    }

    return chunks;
  }

  // ============================================================================
  // TOKEN ESTIMATION
  // ============================================================================

  async estimateTokens(files: string[]): Promise<TokenBudget> {
    const breakdown: Record<string, number> = {};
    let total = 0;

    for (const file of files) {
      try {
        const absolutePath = this.resolvePath(file);
        const content = fs.readFileSync(absolutePath, "utf-8");
        const tokens = countTokens(content);
        breakdown[file] = tokens;
        total += tokens;
      } catch {
        breakdown[file] = 0;
      }
    }

    const maxTokens = getTokenizer().getMaxContextTokens();

    return {
      total: maxTokens,
      used: total,
      remaining: maxTokens - total,
      breakdown
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async discoverFiles(): Promise<string[]> {
    const patterns = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.py", "**/*.go"];
    const ignore = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: this.repoPath, ignore });
      files.push(...matches);
    }
    return [...new Set(files)];
  }

  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.repoPath, filePath);
  }

  private isTestFile(filePath: string): boolean {
    const patterns = [".test.", ".spec.", "_test.", "_spec.", "/tests/", "/test/", "/__tests__/"];
    return patterns.some(p => filePath.includes(p));
  }

  private isConfigFile(filePath: string): boolean {
    const configFiles = [
      "package.json", "tsconfig.json", "webpack.config", "vite.config",
      ".eslintrc", ".prettierrc", "jest.config", "babel.config"
    ];
    const fileName = path.basename(filePath);
    return configFiles.some(c => fileName.includes(c));
  }
}
