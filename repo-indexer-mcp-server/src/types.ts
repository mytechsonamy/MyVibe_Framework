// Repository Intelligence Indexer Types

export type SupportedLanguage = "typescript" | "javascript" | "python" | "go" | "java";

export type SymbolKind =
  | "function"
  | "class"
  | "interface"
  | "type"
  | "variable"
  | "constant"
  | "method"
  | "property"
  | "enum"
  | "module"
  | "namespace";

export interface FileInfo {
  path: string;
  relativePath: string;
  language: SupportedLanguage | null;
  size: number;
  hash: string; // SHA-256 for content-addressable storage
  lastModified: number;
  lineCount: number;
  isGenerated: boolean; // @generated marker detected
}

export interface Symbol {
  id: string; // hash of file:line:name
  name: string;
  kind: SymbolKind;
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  signature?: string; // function signature, type definition
  documentation?: string; // JSDoc, docstring
  exportType: "default" | "named" | "none";
  visibility: "public" | "private" | "protected" | "internal";
  parentSymbol?: string; // for nested symbols (methods in classes)
}

export interface Import {
  id: string;
  filePath: string;
  importedFrom: string; // module path or relative path
  importedSymbols: string[]; // ["default", "foo", "bar"] or ["*"]
  isTypeOnly: boolean;
  isDynamic: boolean; // dynamic import()
  line: number;
}

export interface Export {
  id: string;
  filePath: string;
  exportedSymbol: string;
  exportedAs?: string; // for renamed exports
  isDefault: boolean;
  isTypeOnly: boolean;
  isReExport: boolean;
  reExportFrom?: string;
}

export interface Dependency {
  id: string;
  sourceFile: string;
  targetFile: string;
  dependencyType: "import" | "require" | "dynamic" | "type-only";
  importedSymbols: string[];
}

export interface CallSite {
  id: string;
  callerFile: string;
  callerSymbol: string;
  calleeFile: string;
  calleeSymbol: string;
  line: number;
  column: number;
  isAsync: boolean;
}

export interface RepoIndex {
  version: string;
  repoPath: string;
  createdAt: string;
  updatedAt: string;
  stats: IndexStats;
}

export interface IndexStats {
  totalFiles: number;
  indexedFiles: number;
  skippedFiles: number;
  totalSymbols: number;
  totalImports: number;
  totalExports: number;
  totalDependencies: number;
  languageBreakdown: Record<SupportedLanguage, number>;
  indexingDurationMs: number;
}

export interface IndexConfig {
  repoPath: string;
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSize: number; // bytes, default 1MB
  languages: SupportedLanguage[];
  followSymlinks: boolean;
  includeNodeModules: boolean;
  includeGenerated: boolean;
}

export const DEFAULT_INDEX_CONFIG: Partial<IndexConfig> = {
  includePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.py", "**/*.go"],
  excludePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/vendor/**",
    "**/__pycache__/**",
    "**/*.min.js",
    "**/*.bundle.js"
  ],
  maxFileSize: 1024 * 1024, // 1MB
  languages: ["typescript", "javascript", "python", "go"],
  followSymlinks: false,
  includeNodeModules: false,
  includeGenerated: false
};

// Query types
export interface SymbolQuery {
  name?: string;
  namePattern?: string; // regex
  kind?: SymbolKind[];
  filePath?: string;
  filePattern?: string;
  limit?: number;
  offset?: number;
}

export interface DependencyQuery {
  sourceFile?: string;
  targetFile?: string;
  direction?: "incoming" | "outgoing" | "both";
  depth?: number; // for transitive dependencies
  includeTypeOnly?: boolean;
}

export interface ImpactQuery {
  filePath: string;
  symbolName?: string;
  depth?: number;
  includeTests?: boolean;
}

export interface ImpactResult {
  directDependents: string[];
  transitiveDependents: string[];
  affectedSymbols: Symbol[];
  riskScore: number; // 0-100
  hotspotScore: number; // based on change frequency
}
