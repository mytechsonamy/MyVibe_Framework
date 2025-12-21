// Repo Fingerprinting Types

export type Language = "typescript" | "javascript" | "python" | "go" | "java" | "rust" | "other";
export type PatternConfidence = "high" | "medium" | "low";

export interface RepoFingerprint {
  id: string;
  repoPath: string;
  language: Language;
  framework?: string;
  createdAt: string;
  updatedAt: string;
  codingStyle: CodingStyle;
  errorHandling: ErrorHandlingPatterns;
  loggingStandards: LoggingStandards;
  namingConventions: NamingConventions;
  testingPatterns: TestingPatterns;
  projectStructure: ProjectStructure;
  dependencies: DependencyProfile;
  customPatterns: CustomPattern[];
}

export interface CodingStyle {
  indentation: "spaces" | "tabs";
  indentSize: number;
  quotes: "single" | "double";
  semicolons: boolean;
  trailingCommas: "none" | "es5" | "all";
  lineLength: number;
  bracketSpacing: boolean;
  arrowFunctionStyle: "expression" | "block";
  preferConst: boolean;
  asyncStyle: "async-await" | "promises" | "callbacks" | "mixed";
  importStyle: "named" | "default" | "mixed";
  exportStyle: "named" | "default" | "mixed";
  typeAnnotations: "strict" | "partial" | "minimal" | "none";
  samples: CodeSample[];
}

export interface ErrorHandlingPatterns {
  primaryPattern: "try-catch" | "result-type" | "error-callback" | "throw" | "mixed";
  customErrorClasses: boolean;
  errorLogging: boolean;
  errorReporting: string[];  // e.g., "sentry", "bugsnag"
  recoveryStrategies: string[];
  validationApproach: "zod" | "joi" | "yup" | "custom" | "none";
  httpErrorHandling: HTTPErrorPattern;
  samples: CodeSample[];
}

export interface HTTPErrorPattern {
  statusCodes: boolean;
  errorFormat: "json" | "text" | "custom";
  includeStack: boolean;
  errorMessages: "generic" | "detailed" | "localized";
}

export interface LoggingStandards {
  library: string;  // e.g., "winston", "pino", "console", "bunyan"
  levels: string[];
  structured: boolean;
  includeTimestamp: boolean;
  includeContext: boolean;
  sensitiveDataHandling: "mask" | "omit" | "none";
  logFormat: "json" | "text" | "custom";
  samples: CodeSample[];
}

export interface NamingConventions {
  files: NamingPattern;
  directories: NamingPattern;
  classes: NamingPattern;
  functions: NamingPattern;
  variables: NamingPattern;
  constants: NamingPattern;
  interfaces: NamingPattern;
  types: NamingPattern;
  enums: NamingPattern;
  testFiles: NamingPattern;
  componentFiles: NamingPattern;
  prefixes: PrefixPattern[];
  suffixes: SuffixPattern[];
}

export interface NamingPattern {
  style: "camelCase" | "PascalCase" | "snake_case" | "kebab-case" | "SCREAMING_SNAKE_CASE";
  confidence: PatternConfidence;
  exceptions: string[];
  samples: string[];
}

export interface PrefixPattern {
  pattern: string;
  usage: string;
  examples: string[];
}

export interface SuffixPattern {
  pattern: string;
  usage: string;
  examples: string[];
}

export interface TestingPatterns {
  framework: string;  // e.g., "jest", "vitest", "mocha", "pytest"
  style: "bdd" | "tdd" | "mixed";
  coverageTarget: number;
  mockingApproach: string;
  fixturePattern: string;
  testLocation: "colocated" | "separate" | "mixed";
  namingPattern: string;
  samples: CodeSample[];
}

export interface ProjectStructure {
  type: "monorepo" | "single" | "microservices";
  srcDirectory: string;
  testDirectory: string;
  configLocation: string;
  entryPoints: string[];
  modulePattern: "feature" | "layer" | "domain" | "mixed";
  directories: DirectoryPattern[];
}

export interface DirectoryPattern {
  path: string;
  purpose: string;
  contents: string[];
}

export interface DependencyProfile {
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
  totalDependencies: number;
  coreDependencies: string[];
  devDependencies: string[];
  peerDependencies: string[];
  commonPatterns: DependencyPattern[];
}

export interface DependencyPattern {
  category: string;
  libraries: string[];
  usage: string;
}

export interface CustomPattern {
  name: string;
  description: string;
  pattern: string;
  examples: string[];
  frequency: number;
  confidence: PatternConfidence;
}

export interface CodeSample {
  file: string;
  code: string;
  context: string;
}

export interface PatternMatch {
  pattern: string;
  occurrences: number;
  files: string[];
  confidence: PatternConfidence;
}

export interface StyleGuide {
  title: string;
  sections: StyleGuideSection[];
  generatedAt: string;
}

export interface StyleGuideSection {
  name: string;
  description: string;
  rules: StyleRule[];
}

export interface StyleRule {
  rule: string;
  rationale: string;
  examples: {
    good: string;
    bad?: string;
  };
}

// Detection thresholds
export const DETECTION_THRESHOLDS = {
  highConfidence: 0.8,
  mediumConfidence: 0.5,
  lowConfidence: 0.3,
  minSamples: 5
};

// Common patterns to detect
export const COMMON_PATTERNS = {
  errorHandling: [
    /try\s*{[\s\S]*?}\s*catch/g,
    /\.catch\s*\(/g,
    /throw\s+new\s+\w*Error/g,
    /Result<.*,.*>/g,
    /Either<.*,.*>/g
  ],
  logging: [
    /console\.(log|error|warn|info|debug)/g,
    /logger\.(log|error|warn|info|debug)/g,
    /log\.(log|error|warn|info|debug)/g
  ],
  asyncPatterns: [
    /async\s+\w+/g,
    /await\s+/g,
    /\.then\s*\(/g,
    /Promise\.(all|race|resolve|reject)/g
  ]
};
