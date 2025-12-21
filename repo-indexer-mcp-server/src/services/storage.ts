import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import {
  FileInfo,
  Symbol,
  Import,
  Export,
  Dependency,
  RepoIndex,
  IndexStats,
  SupportedLanguage
} from "../types.js";

export class IndexStorage {
  private db: Database.Database;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    const indexDir = path.join(repoPath, ".sdlc", "index");

    // Ensure index directory exists
    if (!fs.existsSync(indexDir)) {
      fs.mkdirSync(indexDir, { recursive: true });
    }

    const dbPath = path.join(indexDir, "repo-index.db");
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrent access
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");

    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      -- Repository metadata
      CREATE TABLE IF NOT EXISTS repo_index (
        id INTEGER PRIMARY KEY,
        version TEXT NOT NULL,
        repo_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Indexed files with content hash for incremental updates
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        relative_path TEXT NOT NULL,
        language TEXT,
        size INTEGER NOT NULL,
        hash TEXT NOT NULL,
        last_modified INTEGER NOT NULL,
        line_count INTEGER NOT NULL,
        is_generated INTEGER DEFAULT 0,
        indexed_at TEXT NOT NULL
      );

      -- Symbol index
      CREATE TABLE IF NOT EXISTS symbols (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        file_path TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        start_column INTEGER NOT NULL,
        end_column INTEGER NOT NULL,
        signature TEXT,
        documentation TEXT,
        export_type TEXT DEFAULT 'none',
        visibility TEXT DEFAULT 'public',
        parent_symbol TEXT,
        FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE
      );

      -- Import statements
      CREATE TABLE IF NOT EXISTS imports (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        imported_from TEXT NOT NULL,
        imported_symbols TEXT NOT NULL, -- JSON array
        is_type_only INTEGER DEFAULT 0,
        is_dynamic INTEGER DEFAULT 0,
        line INTEGER NOT NULL,
        FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE
      );

      -- Export statements
      CREATE TABLE IF NOT EXISTS exports (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        exported_symbol TEXT NOT NULL,
        exported_as TEXT,
        is_default INTEGER DEFAULT 0,
        is_type_only INTEGER DEFAULT 0,
        is_re_export INTEGER DEFAULT 0,
        re_export_from TEXT,
        FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE
      );

      -- File dependencies (derived from imports)
      CREATE TABLE IF NOT EXISTS dependencies (
        id TEXT PRIMARY KEY,
        source_file TEXT NOT NULL,
        target_file TEXT NOT NULL,
        dependency_type TEXT NOT NULL,
        imported_symbols TEXT NOT NULL, -- JSON array
        FOREIGN KEY (source_file) REFERENCES files(path) ON DELETE CASCADE
      );

      -- Indexes for fast queries
      CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
      CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);
      CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_path);
      CREATE INDEX IF NOT EXISTS idx_imports_file ON imports(file_path);
      CREATE INDEX IF NOT EXISTS idx_imports_from ON imports(imported_from);
      CREATE INDEX IF NOT EXISTS idx_exports_file ON exports(file_path);
      CREATE INDEX IF NOT EXISTS idx_deps_source ON dependencies(source_file);
      CREATE INDEX IF NOT EXISTS idx_deps_target ON dependencies(target_file);
      CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
      CREATE INDEX IF NOT EXISTS idx_files_lang ON files(language);
    `);
  }

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  getFileByPath(filePath: string): FileInfo | null {
    const row = this.db.prepare(`
      SELECT * FROM files WHERE path = ?
    `).get(filePath) as any;

    if (!row) return null;

    return {
      path: row.path,
      relativePath: row.relative_path,
      language: row.language,
      size: row.size,
      hash: row.hash,
      lastModified: row.last_modified,
      lineCount: row.line_count,
      isGenerated: row.is_generated === 1
    };
  }

  getFileHash(filePath: string): string | null {
    const row = this.db.prepare(`
      SELECT hash FROM files WHERE path = ?
    `).get(filePath) as any;
    return row?.hash || null;
  }

  upsertFile(file: FileInfo): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO files
        (path, relative_path, language, size, hash, last_modified, line_count, is_generated, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      file.path,
      file.relativePath,
      file.language,
      file.size,
      file.hash,
      file.lastModified,
      file.lineCount,
      file.isGenerated ? 1 : 0,
      new Date().toISOString()
    );
  }

  deleteFile(filePath: string): void {
    this.db.prepare("DELETE FROM files WHERE path = ?").run(filePath);
  }

  getAllFiles(): FileInfo[] {
    const rows = this.db.prepare("SELECT * FROM files").all() as any[];
    return rows.map(row => ({
      path: row.path,
      relativePath: row.relative_path,
      language: row.language,
      size: row.size,
      hash: row.hash,
      lastModified: row.last_modified,
      lineCount: row.line_count,
      isGenerated: row.is_generated === 1
    }));
  }

  // ============================================================================
  // SYMBOL OPERATIONS
  // ============================================================================

  upsertSymbol(symbol: Symbol): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO symbols
        (id, name, kind, file_path, start_line, end_line, start_column, end_column,
         signature, documentation, export_type, visibility, parent_symbol)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      symbol.id,
      symbol.name,
      symbol.kind,
      symbol.filePath,
      symbol.startLine,
      symbol.endLine,
      symbol.startColumn,
      symbol.endColumn,
      symbol.signature || null,
      symbol.documentation || null,
      symbol.exportType,
      symbol.visibility,
      symbol.parentSymbol || null
    );
  }

  deleteSymbolsForFile(filePath: string): void {
    this.db.prepare("DELETE FROM symbols WHERE file_path = ?").run(filePath);
  }

  querySymbols(options: {
    name?: string;
    namePattern?: string;
    kind?: string[];
    filePath?: string;
    exported?: boolean;
    limit?: number;
    offset?: number;
  }): Symbol[] {
    let query = "SELECT * FROM symbols WHERE 1=1";
    const params: any[] = [];

    if (options.name) {
      query += " AND name = ?";
      params.push(options.name);
    }

    if (options.namePattern) {
      query += " AND name REGEXP ?";
      params.push(options.namePattern);
    }

    if (options.kind && options.kind.length > 0) {
      query += ` AND kind IN (${options.kind.map(() => "?").join(", ")})`;
      params.push(...options.kind);
    }

    if (options.filePath) {
      query += " AND file_path = ?";
      params.push(options.filePath);
    }

    if (options.exported) {
      query += " AND export_type != 'none'";
    }

    query += " ORDER BY file_path, start_line";
    query += ` LIMIT ? OFFSET ?`;
    params.push(options.limit || 50, options.offset || 0);

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(this.rowToSymbol);
  }

  private rowToSymbol(row: any): Symbol {
    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      filePath: row.file_path,
      startLine: row.start_line,
      endLine: row.end_line,
      startColumn: row.start_column,
      endColumn: row.end_column,
      signature: row.signature || undefined,
      documentation: row.documentation || undefined,
      exportType: row.export_type,
      visibility: row.visibility,
      parentSymbol: row.parent_symbol || undefined
    };
  }

  // ============================================================================
  // IMPORT/EXPORT OPERATIONS
  // ============================================================================

  upsertImport(imp: Import): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO imports
        (id, file_path, imported_from, imported_symbols, is_type_only, is_dynamic, line)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      imp.id,
      imp.filePath,
      imp.importedFrom,
      JSON.stringify(imp.importedSymbols),
      imp.isTypeOnly ? 1 : 0,
      imp.isDynamic ? 1 : 0,
      imp.line
    );
  }

  upsertExport(exp: Export): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO exports
        (id, file_path, exported_symbol, exported_as, is_default, is_type_only, is_re_export, re_export_from)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exp.id,
      exp.filePath,
      exp.exportedSymbol,
      exp.exportedAs || null,
      exp.isDefault ? 1 : 0,
      exp.isTypeOnly ? 1 : 0,
      exp.isReExport ? 1 : 0,
      exp.reExportFrom || null
    );
  }

  deleteImportsForFile(filePath: string): void {
    this.db.prepare("DELETE FROM imports WHERE file_path = ?").run(filePath);
  }

  deleteExportsForFile(filePath: string): void {
    this.db.prepare("DELETE FROM exports WHERE file_path = ?").run(filePath);
  }

  // ============================================================================
  // DEPENDENCY OPERATIONS
  // ============================================================================

  upsertDependency(dep: Dependency): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO dependencies
        (id, source_file, target_file, dependency_type, imported_symbols)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      dep.id,
      dep.sourceFile,
      dep.targetFile,
      dep.dependencyType,
      JSON.stringify(dep.importedSymbols)
    );
  }

  deleteDependenciesForFile(filePath: string): void {
    this.db.prepare("DELETE FROM dependencies WHERE source_file = ?").run(filePath);
  }

  getOutgoingDependencies(filePath: string): Dependency[] {
    const rows = this.db.prepare(`
      SELECT * FROM dependencies WHERE source_file = ?
    `).all(filePath) as any[];

    return rows.map(row => ({
      id: row.id,
      sourceFile: row.source_file,
      targetFile: row.target_file,
      dependencyType: row.dependency_type,
      importedSymbols: JSON.parse(row.imported_symbols)
    }));
  }

  getIncomingDependencies(filePath: string): Dependency[] {
    const rows = this.db.prepare(`
      SELECT * FROM dependencies WHERE target_file = ?
    `).all(filePath) as any[];

    return rows.map(row => ({
      id: row.id,
      sourceFile: row.source_file,
      targetFile: row.target_file,
      dependencyType: row.dependency_type,
      importedSymbols: JSON.parse(row.imported_symbols)
    }));
  }

  // ============================================================================
  // STATS AND METADATA
  // ============================================================================

  getStats(): IndexStats {
    const fileStats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN language IS NOT NULL THEN 1 ELSE 0 END) as indexed,
        SUM(CASE WHEN language IS NULL THEN 1 ELSE 0 END) as skipped
      FROM files
    `).get() as any;

    const symbolCount = this.db.prepare("SELECT COUNT(*) as count FROM symbols").get() as any;
    const importCount = this.db.prepare("SELECT COUNT(*) as count FROM imports").get() as any;
    const exportCount = this.db.prepare("SELECT COUNT(*) as count FROM exports").get() as any;
    const depCount = this.db.prepare("SELECT COUNT(*) as count FROM dependencies").get() as any;

    const langBreakdown = this.db.prepare(`
      SELECT language, COUNT(*) as count FROM files
      WHERE language IS NOT NULL
      GROUP BY language
    `).all() as any[];

    const breakdown: Record<SupportedLanguage, number> = {
      typescript: 0,
      javascript: 0,
      python: 0,
      go: 0,
      java: 0
    };

    for (const row of langBreakdown) {
      if (row.language in breakdown) {
        breakdown[row.language as SupportedLanguage] = row.count;
      }
    }

    return {
      totalFiles: fileStats?.total || 0,
      indexedFiles: fileStats?.indexed || 0,
      skippedFiles: fileStats?.skipped || 0,
      totalSymbols: symbolCount?.count || 0,
      totalImports: importCount?.count || 0,
      totalExports: exportCount?.count || 0,
      totalDependencies: depCount?.count || 0,
      languageBreakdown: breakdown,
      indexingDurationMs: 0
    };
  }

  updateMetadata(): void {
    const existing = this.db.prepare("SELECT id FROM repo_index LIMIT 1").get();

    if (existing) {
      this.db.prepare(`
        UPDATE repo_index SET updated_at = ? WHERE id = 1
      `).run(new Date().toISOString());
    } else {
      this.db.prepare(`
        INSERT INTO repo_index (id, version, repo_path, created_at, updated_at)
        VALUES (1, '1.0.0', ?, ?, ?)
      `).run(this.repoPath, new Date().toISOString(), new Date().toISOString());
    }
  }

  getMetadata(): RepoIndex | null {
    const row = this.db.prepare("SELECT * FROM repo_index LIMIT 1").get() as any;
    if (!row) return null;

    return {
      version: row.version,
      repoPath: row.repo_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      stats: this.getStats()
    };
  }

  close(): void {
    this.db.close();
  }
}
