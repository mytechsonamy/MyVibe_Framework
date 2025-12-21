// Architecture Guardrails Types

export type RuleSeverity = "error" | "warning" | "info";
export type RuleCategory =
  | "layer-boundary"      // Layer violation checks
  | "dependency"          // Dependency rules
  | "naming"              // Naming conventions
  | "structure"           // File/folder structure
  | "pattern"             // Design patterns
  | "security"            // Security rules
  | "performance";        // Performance anti-patterns

export interface ArchRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: RuleSeverity;
  file: string;
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface ArchConfig {
  extends?: string;
  rules: Record<string, RuleConfig>;
  layers?: LayerDefinition[];
  boundaries?: BoundaryRule[];
  patterns?: PatternRule[];
  naming?: NamingRule[];
}

export type RuleConfig = boolean | RuleSeverity | [RuleSeverity, Record<string, any>];

export interface LayerDefinition {
  name: string;
  patterns: string[];  // Glob patterns for files in this layer
  allowedDependencies: string[];  // Other layers this can depend on
  disallowedDependencies?: string[];  // Explicit disallows
}

export interface BoundaryRule {
  from: string;  // Source pattern/layer
  to: string;    // Target pattern/layer
  allow: boolean;
  message?: string;
}

export interface PatternRule {
  name: string;
  description: string;
  filePattern: string;
  mustContain?: string[];   // Required patterns
  mustNotContain?: string[]; // Forbidden patterns
  mustExport?: string[];    // Required exports
  maxLines?: number;
  maxComplexity?: number;
}

export interface NamingRule {
  pattern: string;       // File pattern to match
  convention: NamingConvention;
  scope: "file" | "class" | "function" | "variable" | "constant" | "type";
  exceptions?: string[];
}

export type NamingConvention =
  | "camelCase"
  | "PascalCase"
  | "snake_case"
  | "SCREAMING_SNAKE_CASE"
  | "kebab-case";

export interface AnalysisResult {
  totalFiles: number;
  analyzedFiles: number;
  violations: RuleViolation[];
  byRule: Record<string, number>;
  bySeverity: Record<RuleSeverity, number>;
  score: number;  // 0-100, higher = better
}

export interface DependencyViolation {
  sourceFile: string;
  sourceLayer: string;
  targetFile: string;
  targetLayer: string;
  importLine: number;
  message: string;
}

export interface LayerAnalysis {
  layers: {
    name: string;
    files: number;
    internalDeps: number;
    externalDeps: number;
    violations: number;
  }[];
  violations: DependencyViolation[];
  graph: Record<string, string[]>;
}

export interface PatternCompliance {
  pattern: string;
  compliantFiles: number;
  nonCompliantFiles: number;
  violations: {
    file: string;
    issues: string[];
  }[];
}

// Built-in rule definitions
export const BUILT_IN_RULES: ArchRule[] = [
  // Layer boundary rules
  {
    id: "no-circular-deps",
    name: "No Circular Dependencies",
    description: "Prevents circular dependencies between modules",
    category: "dependency",
    severity: "error",
    enabled: true
  },
  {
    id: "layer-boundary",
    name: "Layer Boundary",
    description: "Enforces layer dependency rules (e.g., controllers cannot import from other controllers)",
    category: "layer-boundary",
    severity: "error",
    enabled: true
  },
  {
    id: "no-relative-parent-imports",
    name: "No Relative Parent Imports",
    description: "Disallows imports using ../../ patterns beyond a certain depth",
    category: "dependency",
    severity: "warning",
    enabled: true,
    config: { maxDepth: 2 }
  },

  // Structure rules
  {
    id: "single-responsibility",
    name: "Single Responsibility",
    description: "Files should not exceed a maximum number of exports",
    category: "structure",
    severity: "warning",
    enabled: true,
    config: { maxExports: 5 }
  },
  {
    id: "max-file-lines",
    name: "Maximum File Lines",
    description: "Files should not exceed maximum line count",
    category: "structure",
    severity: "warning",
    enabled: true,
    config: { maxLines: 500 }
  },
  {
    id: "index-exports-only",
    name: "Index Exports Only",
    description: "Index files should only contain exports, no logic",
    category: "structure",
    severity: "error",
    enabled: true
  },

  // Naming rules
  {
    id: "component-naming",
    name: "Component Naming",
    description: "React components should be PascalCase",
    category: "naming",
    severity: "warning",
    enabled: true
  },
  {
    id: "constant-naming",
    name: "Constant Naming",
    description: "Constants should be SCREAMING_SNAKE_CASE",
    category: "naming",
    severity: "warning",
    enabled: true
  },
  {
    id: "file-naming",
    name: "File Naming Convention",
    description: "Files should follow naming convention (kebab-case or PascalCase for components)",
    category: "naming",
    severity: "warning",
    enabled: true
  },

  // Pattern rules
  {
    id: "service-pattern",
    name: "Service Pattern",
    description: "Services should follow the service pattern (class with methods)",
    category: "pattern",
    severity: "info",
    enabled: true
  },
  {
    id: "repository-pattern",
    name: "Repository Pattern",
    description: "Data access should go through repositories",
    category: "pattern",
    severity: "info",
    enabled: false
  },
  {
    id: "dto-pattern",
    name: "DTO Pattern",
    description: "Controllers should use DTOs for input/output",
    category: "pattern",
    severity: "info",
    enabled: false
  },

  // Security rules
  {
    id: "no-secrets",
    name: "No Hardcoded Secrets",
    description: "Detects potential hardcoded secrets/passwords",
    category: "security",
    severity: "error",
    enabled: true
  },
  {
    id: "no-sql-injection",
    name: "No SQL Injection",
    description: "Detects potential SQL injection vulnerabilities",
    category: "security",
    severity: "error",
    enabled: true
  },
  {
    id: "validate-input",
    name: "Validate Input",
    description: "API endpoints should validate input",
    category: "security",
    severity: "warning",
    enabled: true
  },

  // Performance rules
  {
    id: "no-sync-fs",
    name: "No Sync FS Operations",
    description: "Avoid synchronous file system operations",
    category: "performance",
    severity: "warning",
    enabled: true
  },
  {
    id: "limit-bundle-size",
    name: "Limit Bundle Size",
    description: "Warn about large imports that increase bundle size",
    category: "performance",
    severity: "info",
    enabled: false
  }
];

// Default layer configuration for common architectures
export const LAYER_PRESETS: Record<string, LayerDefinition[]> = {
  "clean-architecture": [
    { name: "domain", patterns: ["**/domain/**", "**/entities/**"], allowedDependencies: [] },
    { name: "application", patterns: ["**/application/**", "**/use-cases/**"], allowedDependencies: ["domain"] },
    { name: "infrastructure", patterns: ["**/infrastructure/**", "**/repositories/**"], allowedDependencies: ["domain", "application"] },
    { name: "presentation", patterns: ["**/presentation/**", "**/controllers/**", "**/routes/**"], allowedDependencies: ["domain", "application"] }
  ],
  "mvc": [
    { name: "models", patterns: ["**/models/**"], allowedDependencies: [] },
    { name: "services", patterns: ["**/services/**"], allowedDependencies: ["models"] },
    { name: "controllers", patterns: ["**/controllers/**"], allowedDependencies: ["models", "services"] },
    { name: "routes", patterns: ["**/routes/**"], allowedDependencies: ["controllers"] }
  ],
  "hexagonal": [
    { name: "domain", patterns: ["**/domain/**"], allowedDependencies: [] },
    { name: "ports", patterns: ["**/ports/**"], allowedDependencies: ["domain"] },
    { name: "adapters", patterns: ["**/adapters/**"], allowedDependencies: ["domain", "ports"] },
    { name: "app", patterns: ["**/app/**", "**/application/**"], allowedDependencies: ["domain", "ports"] }
  ]
};
