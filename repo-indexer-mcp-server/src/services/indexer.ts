import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  FileInfo,
  Dependency,
  IndexStats,
  RepoIndex,
  SupportedLanguage,
  ImpactResult
} from "../types.js";
import { IndexStorage } from "./storage.js";
import { CodeParser } from "./parser.js";
import { IndexRepoInput } from "../schemas/indexer.js";

const execAsync = promisify(exec);

export class RepoIndexer {
  private storage: IndexStorage;
  private parser: CodeParser;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.storage = new IndexStorage(repoPath);
    this.parser = new CodeParser(repoPath);
  }

  // ============================================================================
  // INDEXING
  // ============================================================================

  async indexRepository(options: IndexRepoInput): Promise<{
    success: boolean;
    stats: IndexStats;
    message: string;
  }> {
    const startTime = Date.now();

    try {
      // Get files to index
      let filesToIndex: string[];

      if (options.incremental && !options.forceReindex) {
        filesToIndex = await this.getChangedFiles();
      } else {
        filesToIndex = await this.parser.discoverFiles();
      }

      console.error(`Found ${filesToIndex.length} files to index`);

      let indexed = 0;
      let skipped = 0;

      for (const filePath of filesToIndex) {
        const result = await this.indexFile(filePath);
        if (result) {
          indexed++;
        } else {
          skipped++;
        }
      }

      // Build dependency graph after indexing
      await this.buildDependencyGraph();

      // Update metadata
      this.storage.updateMetadata();

      const stats = this.storage.getStats();
      stats.indexingDurationMs = Date.now() - startTime;

      return {
        success: true,
        stats,
        message: `Indexed ${indexed} files, skipped ${skipped} in ${stats.indexingDurationMs}ms`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        stats: this.storage.getStats(),
        message: `Indexing failed: ${message}`
      };
    }
  }

  private async indexFile(absolutePath: string): Promise<boolean> {
    const fileInfo = await this.parser.analyzeFile(absolutePath);
    if (!fileInfo || !fileInfo.language) {
      return false;
    }

    // Check if file has changed (incremental update)
    const existingHash = this.storage.getFileHash(absolutePath);
    if (existingHash === fileInfo.hash) {
      return true; // Already indexed, no changes
    }

    // Clear old data for this file
    this.storage.deleteSymbolsForFile(absolutePath);
    this.storage.deleteImportsForFile(absolutePath);
    this.storage.deleteExportsForFile(absolutePath);
    this.storage.deleteDependenciesForFile(absolutePath);

    // Read and parse file
    const content = fs.readFileSync(absolutePath, "utf-8");
    const { symbols, imports, exports } = this.parser.parse(
      absolutePath,
      content,
      fileInfo.language
    );

    // Store file info
    this.storage.upsertFile(fileInfo);

    // Store symbols
    for (const symbol of symbols) {
      this.storage.upsertSymbol(symbol);
    }

    // Store imports
    for (const imp of imports) {
      this.storage.upsertImport(imp);
    }

    // Store exports
    for (const exp of exports) {
      this.storage.upsertExport(exp);
    }

    return true;
  }

  private async getChangedFiles(): Promise<string[]> {
    try {
      // Get git diff for changed files
      const { stdout } = await execAsync(
        "git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only",
        { cwd: this.repoPath }
      );

      const changedFiles = stdout.trim().split("\n").filter(f => f);
      const absolutePaths = changedFiles.map(f => path.join(this.repoPath, f));

      // Also include any new files not in git
      const { stdout: untrackedStdout } = await execAsync(
        "git ls-files --others --exclude-standard",
        { cwd: this.repoPath }
      );

      const untrackedFiles = untrackedStdout.trim().split("\n").filter(f => f);
      absolutePaths.push(...untrackedFiles.map(f => path.join(this.repoPath, f)));

      // Filter to only existing files with supported extensions
      return absolutePaths.filter(f => fs.existsSync(f));
    } catch {
      // Fall back to full discovery if git commands fail
      return this.parser.discoverFiles();
    }
  }

  private async buildDependencyGraph(): Promise<void> {
    const files = this.storage.getAllFiles();
    const fileMap = new Map<string, FileInfo>(files.map(f => [f.relativePath, f]));

    // For each file, resolve its imports to actual file paths
    for (const file of files) {
      if (!file.language) continue;

      const content = fs.readFileSync(file.path, "utf-8");
      const { imports } = this.parser.parse(file.path, content, file.language);

      for (const imp of imports) {
        const resolvedPath = this.resolveImportPath(
          file.path,
          imp.importedFrom,
          file.language
        );

        if (resolvedPath && fs.existsSync(resolvedPath)) {
          const dep: Dependency = {
            id: `${file.path}:${resolvedPath}`,
            sourceFile: file.path,
            targetFile: resolvedPath,
            dependencyType: imp.isDynamic ? "dynamic" : imp.isTypeOnly ? "type-only" : "import",
            importedSymbols: imp.importedSymbols
          };
          this.storage.upsertDependency(dep);
        }
      }
    }
  }

  private resolveImportPath(
    fromFile: string,
    importPath: string,
    language: SupportedLanguage
  ): string | null {
    const fromDir = path.dirname(fromFile);

    // Skip external packages
    if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
      return null;
    }

    // Try different extensions based on language
    const extensions = this.getExtensions(language);
    const basePath = path.resolve(fromDir, importPath);

    for (const ext of extensions) {
      const fullPath = basePath + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }

      // Try index file in directory
      const indexPath = path.join(basePath, `index${ext}`);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }

    // Check if it's already a full path
    if (fs.existsSync(basePath)) {
      return basePath;
    }

    return null;
  }

  private getExtensions(language: SupportedLanguage): string[] {
    switch (language) {
      case "typescript":
        return [".ts", ".tsx", ".d.ts", ".js", ".jsx"];
      case "javascript":
        return [".js", ".jsx", ".mjs", ".cjs"];
      case "python":
        return [".py"];
      case "go":
        return [".go"];
      case "java":
        return [".java"];
      default:
        return [];
    }
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  getStatus(): RepoIndex | null {
    return this.storage.getMetadata();
  }

  querySymbols(options: {
    name?: string;
    namePattern?: string;
    kind?: string[];
    filePath?: string;
    exported?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return this.storage.querySymbols(options);
  }

  getOutgoingDependencies(filePath: string) {
    return this.storage.getOutgoingDependencies(filePath);
  }

  getIncomingDependencies(filePath: string) {
    return this.storage.getIncomingDependencies(filePath);
  }

  // ============================================================================
  // IMPACT ANALYSIS
  // ============================================================================

  analyzeImpact(
    changedFiles: string[],
    depth: number = 3,
    includeTests: boolean = true
  ): ImpactResult {
    const directDependents = new Set<string>();
    const transitiveDependents = new Set<string>();
    const visited = new Set<string>();

    // BFS to find dependents
    const queue: Array<{ file: string; level: number }> = changedFiles.map(f => ({
      file: f,
      level: 0
    }));

    while (queue.length > 0) {
      const { file, level } = queue.shift()!;

      if (visited.has(file) || level > depth) continue;
      visited.add(file);

      const incoming = this.storage.getIncomingDependencies(file);

      for (const dep of incoming) {
        // Skip test files if not included
        if (!includeTests && this.isTestFile(dep.sourceFile)) {
          continue;
        }

        if (level === 0) {
          directDependents.add(dep.sourceFile);
        } else {
          transitiveDependents.add(dep.sourceFile);
        }

        queue.push({ file: dep.sourceFile, level: level + 1 });
      }
    }

    // Get affected symbols
    const affectedSymbols = this.storage.querySymbols({
      filePath: changedFiles[0],
      exported: true
    });

    // Calculate risk score based on number of dependents
    const totalDependents = directDependents.size + transitiveDependents.size;
    const riskScore = Math.min(100, totalDependents * 5);

    return {
      directDependents: Array.from(directDependents),
      transitiveDependents: Array.from(transitiveDependents),
      affectedSymbols,
      riskScore,
      hotspotScore: this.calculateHotspotScore(changedFiles[0])
    };
  }

  private isTestFile(filePath: string): boolean {
    const testPatterns = [
      ".test.",
      ".spec.",
      "_test.",
      "_spec.",
      "/tests/",
      "/test/",
      "/__tests__/"
    ];
    return testPatterns.some(p => filePath.includes(p));
  }

  private calculateHotspotScore(filePath: string): number {
    // In a real implementation, this would analyze git history
    // for change frequency and bug density
    const incomingCount = this.storage.getIncomingDependencies(filePath).length;
    const outgoingCount = this.storage.getOutgoingDependencies(filePath).length;

    return Math.min(100, (incomingCount + outgoingCount) * 3);
  }

  // ============================================================================
  // DEPENDENCY GRAPH GENERATION
  // ============================================================================

  generateDependencyGraph(
    format: "adjacency" | "edges" | "mermaid" = "edges",
    maxDepth: number = 5
  ): string {
    const files = this.storage.getAllFiles();
    const edges: Array<{ from: string; to: string }> = [];

    for (const file of files) {
      const deps = this.storage.getOutgoingDependencies(file.path);
      for (const dep of deps) {
        edges.push({
          from: file.relativePath,
          to: path.relative(this.repoPath, dep.targetFile)
        });
      }
    }

    switch (format) {
      case "adjacency":
        const adjacency: Record<string, string[]> = {};
        for (const edge of edges) {
          if (!adjacency[edge.from]) adjacency[edge.from] = [];
          adjacency[edge.from].push(edge.to);
        }
        return JSON.stringify(adjacency, null, 2);

      case "mermaid":
        let mermaid = "graph TD\n";
        const nodeIds = new Map<string, string>();
        let nodeCounter = 0;

        const getNodeId = (name: string) => {
          if (!nodeIds.has(name)) {
            nodeIds.set(name, `N${nodeCounter++}`);
          }
          return nodeIds.get(name)!;
        };

        for (const edge of edges.slice(0, 100)) { // Limit for readability
          const fromId = getNodeId(edge.from);
          const toId = getNodeId(edge.to);
          const fromLabel = path.basename(edge.from);
          const toLabel = path.basename(edge.to);
          mermaid += `    ${fromId}["${fromLabel}"] --> ${toId}["${toLabel}"]\n`;
        }
        return mermaid;

      case "edges":
      default:
        return JSON.stringify(edges, null, 2);
    }
  }

  // ============================================================================
  // GIT HISTORY ANALYSIS
  // ============================================================================

  async getFileChurn(filePath: string, days: number = 90): Promise<{
    commitCount: number;
    uniqueAuthors: number;
    lastModified: string;
    additions: number;
    deletions: number;
  }> {
    try {
      const relativePath = path.relative(this.repoPath, filePath);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get commit count
      const { stdout: commitStdout } = await execAsync(
        `git log --oneline --since="${since}" -- "${relativePath}" | wc -l`,
        { cwd: this.repoPath }
      );
      const commitCount = parseInt(commitStdout.trim()) || 0;

      // Get unique authors
      const { stdout: authorsStdout } = await execAsync(
        `git log --format='%ae' --since="${since}" -- "${relativePath}" | sort -u | wc -l`,
        { cwd: this.repoPath }
      );
      const uniqueAuthors = parseInt(authorsStdout.trim()) || 0;

      // Get last modified date
      const { stdout: lastModStdout } = await execAsync(
        `git log -1 --format='%ci' -- "${relativePath}"`,
        { cwd: this.repoPath }
      );
      const lastModified = lastModStdout.trim() || "unknown";

      // Get additions/deletions
      const { stdout: statsStdout } = await execAsync(
        `git log --numstat --format="" --since="${since}" -- "${relativePath}" | awk '{add+=$1; del+=$2} END {print add, del}'`,
        { cwd: this.repoPath }
      );
      const [additions, deletions] = statsStdout.trim().split(' ').map(n => parseInt(n) || 0);

      return { commitCount, uniqueAuthors, lastModified, additions, deletions };
    } catch {
      return { commitCount: 0, uniqueAuthors: 0, lastModified: "unknown", additions: 0, deletions: 0 };
    }
  }

  async getRecentlyChangedFiles(days: number = 7): Promise<string[]> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { stdout } = await execAsync(
        `git log --name-only --format="" --since="${since}" | sort -u`,
        { cwd: this.repoPath }
      );
      return stdout.trim().split('\n').filter(f => f && fs.existsSync(path.join(this.repoPath, f)));
    } catch {
      return [];
    }
  }

  async getBlameInfo(filePath: string): Promise<Array<{
    line: number;
    author: string;
    date: string;
    commit: string;
  }>> {
    try {
      const relativePath = path.relative(this.repoPath, filePath);
      const { stdout } = await execAsync(
        `git blame --line-porcelain "${relativePath}" | grep -E '^(author |author-time |[a-f0-9]{40} )'`,
        { cwd: this.repoPath, maxBuffer: 10 * 1024 * 1024 }
      );

      const lines = stdout.trim().split('\n');
      const blameInfo: Array<{ line: number; author: string; date: string; commit: string }> = [];
      let currentLine = 1;
      let currentCommit = "";
      let currentAuthor = "";
      let currentDate = "";

      for (const line of lines) {
        if (/^[a-f0-9]{40}/.test(line)) {
          currentCommit = line.split(' ')[0];
          currentLine = parseInt(line.split(' ')[2]) || currentLine;
        } else if (line.startsWith('author ')) {
          currentAuthor = line.replace('author ', '');
        } else if (line.startsWith('author-time ')) {
          const timestamp = parseInt(line.replace('author-time ', ''));
          currentDate = new Date(timestamp * 1000).toISOString().split('T')[0];
          blameInfo.push({
            line: currentLine,
            author: currentAuthor,
            date: currentDate,
            commit: currentCommit.substring(0, 8)
          });
        }
      }

      return blameInfo;
    } catch {
      return [];
    }
  }

  // ============================================================================
  // HOTSPOT DETECTION
  // ============================================================================

  async getHotspots(
    metric: "dependencies" | "dependents" | "complexity" | "churn" = "dependents",
    limit: number = 20
  ): Promise<Array<{ file: string; score: number; details: string }>> {
    const files = this.storage.getAllFiles();
    const scores: Array<{ file: string; score: number; details: string }> = [];

    for (const file of files) {
      let score = 0;
      let details = "";

      switch (metric) {
        case "dependents":
          const incoming = this.storage.getIncomingDependencies(file.path);
          score = incoming.length;
          details = `${incoming.length} files depend on this`;
          break;

        case "dependencies":
          const outgoing = this.storage.getOutgoingDependencies(file.path);
          score = outgoing.length;
          details = `imports ${outgoing.length} files`;
          break;

        case "complexity":
          const symbols = this.storage.querySymbols({ filePath: file.path });
          score = symbols.length;
          details = `${symbols.length} symbols defined`;
          break;

        case "churn":
          const churn = await this.getFileChurn(file.path, 90);
          score = churn.commitCount * 2 + churn.uniqueAuthors * 3;
          details = `${churn.commitCount} commits, ${churn.uniqueAuthors} authors, +${churn.additions}/-${churn.deletions}`;
          break;
      }

      scores.push({ file: file.relativePath, score, details });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, limit);
  }

  close(): void {
    this.storage.close();
  }
}
