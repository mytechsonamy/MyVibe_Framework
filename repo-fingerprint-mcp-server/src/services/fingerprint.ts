import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  RepoFingerprint,
  CodingStyle,
  ErrorHandlingPatterns,
  LoggingStandards,
  NamingConventions,
  TestingPatterns,
  ProjectStructure,
  DependencyProfile,
  CustomPattern,
  PatternMatch,
  StyleGuide,
  CodeSample,
  Language,
  PatternConfidence,
  DETECTION_THRESHOLDS,
  COMMON_PATTERNS,
  NamingPattern
} from "../types.js";

export class RepoFingerprinter {
  private repoPath: string;
  private fingerprint: RepoFingerprint | null = null;
  private customPatterns: CustomPattern[] = [];

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  // ============================================================================
  // FINGERPRINT MANAGEMENT
  // ============================================================================

  async createFingerprint(
    deep: boolean = false,
    includeTests: boolean = true,
    maxFiles: number = 100
  ): Promise<RepoFingerprint> {
    const language = this.detectLanguage();
    const framework = this.detectFramework();

    const fingerprint: RepoFingerprint = {
      id: this.generateId(),
      repoPath: this.repoPath,
      language,
      framework,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      codingStyle: await this.analyzeCodingStyle(maxFiles),
      errorHandling: this.analyzeErrorHandling(true),
      loggingStandards: this.analyzeLogging(true),
      namingConventions: this.analyzeNaming("all"),
      testingPatterns: this.analyzeTestingPatterns(true),
      projectStructure: this.analyzeStructure(3),
      dependencies: this.analyzeDependencies(true),
      customPatterns: this.customPatterns
    };

    this.fingerprint = fingerprint;
    this.saveFingerprint(fingerprint);

    return fingerprint;
  }

  getFingerprint(): RepoFingerprint | null {
    if (this.fingerprint) return this.fingerprint;

    // Try to load from disk
    const fingerprintPath = path.join(this.repoPath, ".fingerprint.json");
    if (fs.existsSync(fingerprintPath)) {
      const content = fs.readFileSync(fingerprintPath, "utf-8");
      this.fingerprint = JSON.parse(content);
      return this.fingerprint;
    }

    return null;
  }

  async updateFingerprint(incrementalOnly: boolean = true): Promise<RepoFingerprint> {
    const existing = this.getFingerprint();
    if (!existing) {
      return this.createFingerprint();
    }

    // Update with new analysis
    const updated: RepoFingerprint = {
      ...existing,
      updatedAt: new Date().toISOString(),
      codingStyle: await this.analyzeCodingStyle(50),
      errorHandling: this.analyzeErrorHandling(true),
      loggingStandards: this.analyzeLogging(true)
    };

    this.fingerprint = updated;
    this.saveFingerprint(updated);

    return updated;
  }

  private saveFingerprint(fingerprint: RepoFingerprint): void {
    const fingerprintPath = path.join(this.repoPath, ".fingerprint.json");
    fs.writeFileSync(fingerprintPath, JSON.stringify(fingerprint, null, 2));
  }

  private generateId(): string {
    return `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // LANGUAGE & FRAMEWORK DETECTION
  // ============================================================================

  private detectLanguage(): Language {
    const files = this.getSourceFiles();
    const counts: Record<string, number> = {};

    for (const file of files) {
      const ext = path.extname(file);
      counts[ext] = (counts[ext] || 0) + 1;
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return "other";

    const topExt = sorted[0][0];
    switch (topExt) {
      case ".ts":
      case ".tsx": return "typescript";
      case ".js":
      case ".jsx": return "javascript";
      case ".py": return "python";
      case ".go": return "go";
      case ".java": return "java";
      case ".rs": return "rust";
      default: return "other";
    }
  }

  private detectFramework(): string | undefined {
    const packageJsonPath = path.join(this.repoPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps["next"]) return "next.js";
      if (deps["@nestjs/core"]) return "nestjs";
      if (deps["express"]) return "express";
      if (deps["react"]) return "react";
      if (deps["vue"]) return "vue";
      if (deps["@angular/core"]) return "angular";
      if (deps["fastify"]) return "fastify";
    }

    // Check for Python frameworks
    const requirementsPath = path.join(this.repoPath, "requirements.txt");
    if (fs.existsSync(requirementsPath)) {
      const content = fs.readFileSync(requirementsPath, "utf-8");
      if (content.includes("django")) return "django";
      if (content.includes("flask")) return "flask";
      if (content.includes("fastapi")) return "fastapi";
    }

    return undefined;
  }

  // ============================================================================
  // CODING STYLE ANALYSIS
  // ============================================================================

  async analyzeCodingStyle(sampleSize: number = 20): Promise<CodingStyle> {
    const files = this.getSourceFiles().slice(0, sampleSize);
    const samples: CodeSample[] = [];

    let spacesCount = 0;
    let tabsCount = 0;
    let singleQuotes = 0;
    let doubleQuotes = 0;
    let semicolons = 0;
    let noSemicolons = 0;
    let asyncAwait = 0;
    let promises = 0;
    let typeAnnotations = 0;
    let totalLines = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.repoPath, file), "utf-8");
        const lines = content.split("\n");
        totalLines += lines.length;

        // Indentation
        for (const line of lines) {
          if (line.startsWith("  ")) spacesCount++;
          if (line.startsWith("\t")) tabsCount++;
        }

        // Quotes
        singleQuotes += (content.match(/'/g) || []).length;
        doubleQuotes += (content.match(/"/g) || []).length;

        // Semicolons
        const stmtEndings = content.match(/[;}\)]\s*$/gm) || [];
        for (const ending of stmtEndings) {
          if (ending.includes(";")) semicolons++;
          else noSemicolons++;
        }

        // Async patterns
        asyncAwait += (content.match(/async\s+/g) || []).length;
        promises += (content.match(/\.then\s*\(/g) || []).length;

        // Type annotations
        typeAnnotations += (content.match(/:\s*\w+/g) || []).length;

        // Collect sample
        if (samples.length < 5 && lines.length > 10) {
          samples.push({
            file,
            code: lines.slice(0, 20).join("\n"),
            context: "File header"
          });
        }
      } catch {
        continue;
      }
    }

    // Detect indent size
    let indentSize = 2;
    if (spacesCount > 0) {
      // Sample first file to detect indent size
      const firstFile = files[0];
      if (firstFile) {
        try {
          const content = fs.readFileSync(path.join(this.repoPath, firstFile), "utf-8");
          const indentMatch = content.match(/^( +)\S/m);
          if (indentMatch) {
            indentSize = indentMatch[1].length;
          }
        } catch {
          // Use default
        }
      }
    }

    return {
      indentation: tabsCount > spacesCount ? "tabs" : "spaces",
      indentSize,
      quotes: singleQuotes > doubleQuotes ? "single" : "double",
      semicolons: semicolons > noSemicolons,
      trailingCommas: "es5", // Would need more analysis
      lineLength: 100, // Would need more analysis
      bracketSpacing: true, // Would need more analysis
      arrowFunctionStyle: "expression",
      preferConst: true,
      asyncStyle: asyncAwait > promises ? "async-await" : promises > 0 ? "promises" : "mixed",
      importStyle: "mixed",
      exportStyle: "mixed",
      typeAnnotations: typeAnnotations > totalLines * 0.1 ? "strict" :
                       typeAnnotations > totalLines * 0.05 ? "partial" : "minimal",
      samples
    };
  }

  analyzeNaming(scope: "all" | "files" | "code" = "all"): NamingConventions {
    const files = this.getSourceFiles().slice(0, 50);
    const fileNames: string[] = [];
    const dirNames: string[] = [];
    const classNames: string[] = [];
    const functionNames: string[] = [];
    const variableNames: string[] = [];
    const constantNames: string[] = [];

    for (const file of files) {
      fileNames.push(path.basename(file, path.extname(file)));
      dirNames.push(...file.split("/").slice(0, -1));

      try {
        const content = fs.readFileSync(path.join(this.repoPath, file), "utf-8");

        // Extract class names
        const classes = content.match(/class\s+(\w+)/g) || [];
        classNames.push(...classes.map(c => c.replace("class ", "")));

        // Extract function names
        const funcs = content.match(/function\s+(\w+)/g) || [];
        functionNames.push(...funcs.map(f => f.replace("function ", "")));

        // Arrow functions with names
        const arrows = content.match(/const\s+(\w+)\s*=\s*(?:async\s*)?\(/g) || [];
        functionNames.push(...arrows.map(a => a.match(/const\s+(\w+)/)?.[1] || ""));

        // Variables (let/var)
        const vars = content.match(/(?:let|var)\s+(\w+)/g) || [];
        variableNames.push(...vars.map(v => v.replace(/(?:let|var)\s+/, "")));

        // Constants
        const consts = content.match(/const\s+([A-Z_][A-Z0-9_]*)\s*=/g) || [];
        constantNames.push(...consts.map(c => c.match(/const\s+(\w+)/)?.[1] || ""));
      } catch {
        continue;
      }
    }

    return {
      files: this.detectNamingPattern(fileNames, "files"),
      directories: this.detectNamingPattern([...new Set(dirNames)], "directories"),
      classes: this.detectNamingPattern(classNames, "classes"),
      functions: this.detectNamingPattern(functionNames, "functions"),
      variables: this.detectNamingPattern(variableNames, "variables"),
      constants: this.detectNamingPattern(constantNames, "constants"),
      interfaces: this.detectNamingPattern([], "interfaces"), // Would need more analysis
      types: this.detectNamingPattern([], "types"),
      enums: this.detectNamingPattern([], "enums"),
      testFiles: {
        style: "camelCase",
        confidence: "medium",
        exceptions: [],
        samples: files.filter(f => f.includes(".test.") || f.includes(".spec.")).slice(0, 5)
      },
      componentFiles: {
        style: "PascalCase",
        confidence: "medium",
        exceptions: [],
        samples: files.filter(f => f.includes("components/")).slice(0, 5)
      },
      prefixes: this.detectPrefixes(files),
      suffixes: this.detectSuffixes(files)
    };
  }

  private detectNamingPattern(names: string[], context: string): NamingPattern {
    if (names.length === 0) {
      return {
        style: "camelCase",
        confidence: "low",
        exceptions: [],
        samples: []
      };
    }

    let camelCase = 0;
    let pascalCase = 0;
    let snakeCase = 0;
    let kebabCase = 0;
    let screamingSnake = 0;

    for (const name of names) {
      if (/^[a-z][a-zA-Z0-9]*$/.test(name)) camelCase++;
      if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) pascalCase++;
      if (/^[a-z][a-z0-9_]*$/.test(name)) snakeCase++;
      if (/^[a-z][a-z0-9-]*$/.test(name)) kebabCase++;
      if (/^[A-Z][A-Z0-9_]*$/.test(name)) screamingSnake++;
    }

    const counts = [
      { style: "camelCase" as const, count: camelCase },
      { style: "PascalCase" as const, count: pascalCase },
      { style: "snake_case" as const, count: snakeCase },
      { style: "kebab-case" as const, count: kebabCase },
      { style: "SCREAMING_SNAKE_CASE" as const, count: screamingSnake }
    ];

    const sorted = counts.sort((a, b) => b.count - a.count);
    const topStyle = sorted[0];
    const confidence: PatternConfidence =
      topStyle.count / names.length > DETECTION_THRESHOLDS.highConfidence ? "high" :
      topStyle.count / names.length > DETECTION_THRESHOLDS.mediumConfidence ? "medium" : "low";

    return {
      style: topStyle.style,
      confidence,
      exceptions: [],
      samples: names.slice(0, 10)
    };
  }

  private detectPrefixes(files: string[]): { pattern: string; usage: string; examples: string[] }[] {
    const prefixes: Record<string, string[]> = {};

    for (const file of files) {
      const name = path.basename(file, path.extname(file));
      const prefixMatch = name.match(/^(use|get|set|is|has|can|should|on|handle)/);
      if (prefixMatch) {
        const prefix = prefixMatch[1];
        if (!prefixes[prefix]) prefixes[prefix] = [];
        prefixes[prefix].push(name);
      }
    }

    return Object.entries(prefixes)
      .filter(([, examples]) => examples.length >= 3)
      .map(([pattern, examples]) => ({
        pattern,
        usage: this.inferPrefixUsage(pattern),
        examples: examples.slice(0, 5)
      }));
  }

  private detectSuffixes(files: string[]): { pattern: string; usage: string; examples: string[] }[] {
    const suffixes: Record<string, string[]> = {};

    for (const file of files) {
      const name = path.basename(file, path.extname(file));
      const suffixMatch = name.match(/(Service|Controller|Repository|Handler|Provider|Factory|Helper|Utils|Manager|Component|Hook)$/);
      if (suffixMatch) {
        const suffix = suffixMatch[1];
        if (!suffixes[suffix]) suffixes[suffix] = [];
        suffixes[suffix].push(name);
      }
    }

    return Object.entries(suffixes)
      .filter(([, examples]) => examples.length >= 2)
      .map(([pattern, examples]) => ({
        pattern,
        usage: this.inferSuffixUsage(pattern),
        examples: examples.slice(0, 5)
      }));
  }

  private inferPrefixUsage(prefix: string): string {
    const usages: Record<string, string> = {
      use: "React hooks",
      get: "Getter functions",
      set: "Setter functions",
      is: "Boolean check functions",
      has: "Existence check functions",
      can: "Permission check functions",
      should: "Conditional check functions",
      on: "Event handlers",
      handle: "Event handlers"
    };
    return usages[prefix] || "General utility";
  }

  private inferSuffixUsage(suffix: string): string {
    const usages: Record<string, string> = {
      Service: "Business logic services",
      Controller: "Request handlers",
      Repository: "Data access layer",
      Handler: "Event/action handlers",
      Provider: "Dependency providers",
      Factory: "Object creation",
      Helper: "Utility functions",
      Utils: "Utility functions",
      Manager: "State/resource management",
      Component: "UI components",
      Hook: "React hooks"
    };
    return usages[suffix] || "General purpose";
  }

  // ============================================================================
  // ERROR HANDLING ANALYSIS
  // ============================================================================

  analyzeErrorHandling(includeExamples: boolean = true): ErrorHandlingPatterns {
    const files = this.getSourceFiles().slice(0, 30);
    const samples: CodeSample[] = [];

    let tryCatch = 0;
    let throwNew = 0;
    let catchCallback = 0;
    let customErrors = 0;
    let errorLogging = 0;

    const errorReporting: Set<string> = new Set();
    const validationLibs: Set<string> = new Set();

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.repoPath, file), "utf-8");

        // Count patterns
        tryCatch += (content.match(/try\s*{/g) || []).length;
        throwNew += (content.match(/throw\s+new/g) || []).length;
        catchCallback += (content.match(/\.catch\s*\(/g) || []).length;
        customErrors += (content.match(/class\s+\w*Error\s+extends/g) || []).length;
        errorLogging += (content.match(/(?:console|logger)\.error/g) || []).length;

        // Error reporting services
        if (content.includes("sentry")) errorReporting.add("sentry");
        if (content.includes("bugsnag")) errorReporting.add("bugsnag");
        if (content.includes("rollbar")) errorReporting.add("rollbar");

        // Validation libraries
        if (content.includes("zod")) validationLibs.add("zod");
        if (content.includes("joi")) validationLibs.add("joi");
        if (content.includes("yup")) validationLibs.add("yup");

        // Collect samples
        if (includeExamples && samples.length < 3) {
          const tryCatchMatch = content.match(/try\s*{[\s\S]*?}\s*catch[\s\S]*?}/);
          if (tryCatchMatch) {
            samples.push({
              file,
              code: tryCatchMatch[0].slice(0, 200),
              context: "Error handling pattern"
            });
          }
        }
      } catch {
        continue;
      }
    }

    // Determine primary pattern
    let primaryPattern: ErrorHandlingPatterns["primaryPattern"] = "mixed";
    const total = tryCatch + catchCallback + throwNew;
    if (tryCatch > total * 0.6) primaryPattern = "try-catch";
    else if (catchCallback > total * 0.6) primaryPattern = "error-callback";
    else if (throwNew > total * 0.6) primaryPattern = "throw";

    // Determine validation approach
    let validationApproach: ErrorHandlingPatterns["validationApproach"] = "none";
    if (validationLibs.has("zod")) validationApproach = "zod";
    else if (validationLibs.has("joi")) validationApproach = "joi";
    else if (validationLibs.has("yup")) validationApproach = "yup";

    return {
      primaryPattern,
      customErrorClasses: customErrors > 0,
      errorLogging: errorLogging > 0,
      errorReporting: Array.from(errorReporting),
      recoveryStrategies: [],
      validationApproach,
      httpErrorHandling: {
        statusCodes: true,
        errorFormat: "json",
        includeStack: false,
        errorMessages: "detailed"
      },
      samples
    };
  }

  // ============================================================================
  // LOGGING ANALYSIS
  // ============================================================================

  analyzeLogging(includeExamples: boolean = true): LoggingStandards {
    const files = this.getSourceFiles().slice(0, 30);
    const samples: CodeSample[] = [];

    let consoleLog = 0;
    let winston = 0;
    let pino = 0;
    let bunyan = 0;
    let structured = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.repoPath, file), "utf-8");

        consoleLog += (content.match(/console\.(log|error|warn|info|debug)/g) || []).length;
        winston += (content.match(/winston/g) || []).length;
        pino += (content.match(/pino/g) || []).length;
        bunyan += (content.match(/bunyan/g) || []).length;

        // Check for structured logging
        if (content.match(/logger\.(log|info|error)\s*\(\s*{/)) {
          structured++;
        }

        // Collect samples
        if (includeExamples && samples.length < 3) {
          const logMatch = content.match(/(?:console|logger)\.\w+\s*\([^)]+\)/);
          if (logMatch) {
            samples.push({
              file,
              code: logMatch[0],
              context: "Logging pattern"
            });
          }
        }
      } catch {
        continue;
      }
    }

    // Determine library
    let library = "console";
    if (winston > 0) library = "winston";
    else if (pino > 0) library = "pino";
    else if (bunyan > 0) library = "bunyan";

    return {
      library,
      levels: ["debug", "info", "warn", "error"],
      structured: structured > 5,
      includeTimestamp: true,
      includeContext: structured > 5,
      sensitiveDataHandling: "mask",
      logFormat: structured > 5 ? "json" : "text",
      samples
    };
  }

  // ============================================================================
  // PATTERN DETECTION
  // ============================================================================

  detectPatterns(
    patternType: "all" | "error" | "async" | "import" | "export" | "custom" = "all",
    minOccurrences: number = 3
  ): PatternMatch[] {
    const files = this.getSourceFiles().slice(0, 50);
    const patterns: Map<string, { count: number; files: Set<string> }> = new Map();

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.repoPath, file), "utf-8");

        // Error patterns
        if (patternType === "all" || patternType === "error") {
          for (const pattern of COMMON_PATTERNS.errorHandling) {
            const matches = content.match(pattern) || [];
            if (matches.length > 0) {
              const key = `error:${pattern.source}`;
              if (!patterns.has(key)) {
                patterns.set(key, { count: 0, files: new Set() });
              }
              patterns.get(key)!.count += matches.length;
              patterns.get(key)!.files.add(file);
            }
          }
        }

        // Async patterns
        if (patternType === "all" || patternType === "async") {
          for (const pattern of COMMON_PATTERNS.asyncPatterns) {
            const matches = content.match(pattern) || [];
            if (matches.length > 0) {
              const key = `async:${pattern.source}`;
              if (!patterns.has(key)) {
                patterns.set(key, { count: 0, files: new Set() });
              }
              patterns.get(key)!.count += matches.length;
              patterns.get(key)!.files.add(file);
            }
          }
        }
      } catch {
        continue;
      }
    }

    return Array.from(patterns.entries())
      .filter(([, data]) => data.count >= minOccurrences)
      .map(([pattern, data]) => ({
        pattern,
        occurrences: data.count,
        files: Array.from(data.files),
        confidence: (data.count > 20 ? "high" : data.count > 10 ? "medium" : "low") as PatternConfidence
      }))
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  learnCustomPattern(
    name: string,
    description: string,
    regex: string,
    category?: string
  ): CustomPattern {
    const files = this.getSourceFiles().slice(0, 50);
    const examples: string[] = [];
    let frequency = 0;

    const pattern = new RegExp(regex, "g");

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.repoPath, file), "utf-8");
        const matches = content.match(pattern) || [];
        frequency += matches.length;
        if (examples.length < 5) {
          examples.push(...matches.slice(0, 5 - examples.length));
        }
      } catch {
        continue;
      }
    }

    const customPattern: CustomPattern = {
      name,
      description,
      pattern: regex,
      examples,
      frequency,
      confidence: frequency > 20 ? "high" : frequency > 10 ? "medium" : "low"
    };

    this.customPatterns.push(customPattern);
    return customPattern;
  }

  validateAgainstFingerprint(code: string, context?: string): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const fingerprint = this.getFingerprint();
    if (!fingerprint) {
      return { valid: true, issues: ["No fingerprint available"], suggestions: [] };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check indentation
    const lines = code.split("\n");
    for (const line of lines) {
      if (fingerprint.codingStyle.indentation === "spaces" && line.startsWith("\t")) {
        issues.push("Uses tabs instead of spaces");
        break;
      }
      if (fingerprint.codingStyle.indentation === "tabs" && line.match(/^ +/)) {
        issues.push("Uses spaces instead of tabs");
        break;
      }
    }

    // Check quotes
    const singleQuotes = (code.match(/'/g) || []).length;
    const doubleQuotes = (code.match(/"/g) || []).length;
    if (fingerprint.codingStyle.quotes === "single" && doubleQuotes > singleQuotes) {
      issues.push("Uses double quotes instead of single quotes");
    }
    if (fingerprint.codingStyle.quotes === "double" && singleQuotes > doubleQuotes) {
      issues.push("Uses single quotes instead of double quotes");
    }

    // Check semicolons
    const hasSemicolons = code.includes(";");
    if (fingerprint.codingStyle.semicolons && !hasSemicolons) {
      suggestions.push("Consider adding semicolons");
    }
    if (!fingerprint.codingStyle.semicolons && hasSemicolons) {
      suggestions.push("Consider removing semicolons");
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }

  // ============================================================================
  // STRUCTURE ANALYSIS
  // ============================================================================

  analyzeStructure(depth: number = 3): ProjectStructure {
    const directories: { path: string; purpose: string; contents: string[] }[] = [];

    // Detect structure type
    let type: ProjectStructure["type"] = "single";
    if (fs.existsSync(path.join(this.repoPath, "packages"))) type = "monorepo";
    if (fs.existsSync(path.join(this.repoPath, "lerna.json"))) type = "monorepo";
    if (fs.existsSync(path.join(this.repoPath, "services"))) type = "microservices";

    // Find src directory
    let srcDirectory = "src";
    if (fs.existsSync(path.join(this.repoPath, "lib"))) srcDirectory = "lib";
    if (fs.existsSync(path.join(this.repoPath, "app"))) srcDirectory = "app";

    // Find test directory
    let testDirectory = "test";
    if (fs.existsSync(path.join(this.repoPath, "tests"))) testDirectory = "tests";
    if (fs.existsSync(path.join(this.repoPath, "__tests__"))) testDirectory = "__tests__";

    // Analyze directories
    try {
      const output = execSync(
        `find . -type d -maxdepth ${depth} | grep -v node_modules | grep -v .git`,
        { cwd: this.repoPath, encoding: "utf-8", shell: "/bin/bash" }
      );

      for (const dir of output.trim().split("\n").filter(Boolean)) {
        const cleanDir = dir.replace("./", "");
        if (!cleanDir) continue;

        directories.push({
          path: cleanDir,
          purpose: this.inferDirectoryPurpose(cleanDir),
          contents: this.getFilesInDirectory(cleanDir).slice(0, 10)
        });
      }
    } catch {
      // Ignore
    }

    // Detect module pattern
    let modulePattern: ProjectStructure["modulePattern"] = "mixed";
    const hasFeatures = directories.some(d => d.path.includes("features") || d.path.includes("modules"));
    const hasLayers = directories.some(d =>
      d.path.includes("controllers") || d.path.includes("services") || d.path.includes("repositories")
    );
    const hasDomain = directories.some(d => d.path.includes("domain") || d.path.includes("entities"));

    if (hasFeatures) modulePattern = "feature";
    else if (hasLayers) modulePattern = "layer";
    else if (hasDomain) modulePattern = "domain";

    return {
      type,
      srcDirectory,
      testDirectory,
      configLocation: ".",
      entryPoints: this.findEntryPoints(),
      modulePattern,
      directories
    };
  }

  analyzeDependencies(includeDevDeps: boolean = true): DependencyProfile {
    const packageJsonPath = path.join(this.repoPath, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      return {
        packageManager: "npm",
        totalDependencies: 0,
        coreDependencies: [],
        devDependencies: [],
        peerDependencies: [],
        commonPatterns: []
      };
    }

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const deps = pkg.dependencies || {};
    const devDeps = pkg.devDependencies || {};
    const peerDeps = pkg.peerDependencies || {};

    // Detect package manager
    let packageManager: DependencyProfile["packageManager"] = "npm";
    if (fs.existsSync(path.join(this.repoPath, "yarn.lock"))) packageManager = "yarn";
    if (fs.existsSync(path.join(this.repoPath, "pnpm-lock.yaml"))) packageManager = "pnpm";
    if (fs.existsSync(path.join(this.repoPath, "bun.lockb"))) packageManager = "bun";

    // Categorize dependencies
    const patterns: { category: string; libraries: string[]; usage: string }[] = [];

    const categories: Record<string, { libs: string[]; desc: string }> = {
      testing: { libs: ["jest", "vitest", "mocha", "@testing-library"], desc: "Testing framework" },
      http: { libs: ["axios", "fetch", "got", "node-fetch"], desc: "HTTP client" },
      database: { libs: ["prisma", "typeorm", "mongoose", "knex", "sequelize"], desc: "Database ORM" },
      validation: { libs: ["zod", "joi", "yup", "class-validator"], desc: "Validation library" },
      logging: { libs: ["winston", "pino", "bunyan", "morgan"], desc: "Logging library" }
    };

    for (const [category, { libs, desc }] of Object.entries(categories)) {
      const found = libs.filter(lib =>
        Object.keys(deps).some(d => d.includes(lib)) ||
        Object.keys(devDeps).some(d => d.includes(lib))
      );
      if (found.length > 0) {
        patterns.push({ category, libraries: found, usage: desc });
      }
    }

    return {
      packageManager,
      totalDependencies: Object.keys(deps).length + Object.keys(devDeps).length,
      coreDependencies: Object.keys(deps).slice(0, 20),
      devDependencies: includeDevDeps ? Object.keys(devDeps).slice(0, 20) : [],
      peerDependencies: Object.keys(peerDeps),
      commonPatterns: patterns
    };
  }

  analyzeTestingPatterns(includeExamples: boolean = true): TestingPatterns {
    const samples: CodeSample[] = [];

    // Detect testing framework
    let framework = "jest";
    const deps = this.analyzeDependencies(true);
    if (deps.devDependencies.includes("vitest")) framework = "vitest";
    if (deps.devDependencies.includes("mocha")) framework = "mocha";

    // Find test files
    const testFiles = this.getSourceFiles().filter(f =>
      f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__")
    );

    let style: TestingPatterns["style"] = "mixed";
    let bddCount = 0;
    let tddCount = 0;

    for (const file of testFiles.slice(0, 10)) {
      try {
        const content = fs.readFileSync(path.join(this.repoPath, file), "utf-8");

        // Detect BDD vs TDD
        if (content.includes("describe") && content.includes("it(")) bddCount++;
        if (content.includes("test(")) tddCount++;

        if (includeExamples && samples.length < 3) {
          const testMatch = content.match(/(?:it|test)\s*\([^)]+\)/);
          if (testMatch) {
            samples.push({
              file,
              code: testMatch[0],
              context: "Test pattern"
            });
          }
        }
      } catch {
        continue;
      }
    }

    if (bddCount > tddCount * 2) style = "bdd";
    else if (tddCount > bddCount * 2) style = "tdd";

    // Detect test location
    let testLocation: TestingPatterns["testLocation"] = "mixed";
    const hasTestDir = fs.existsSync(path.join(this.repoPath, "test")) ||
                       fs.existsSync(path.join(this.repoPath, "tests")) ||
                       fs.existsSync(path.join(this.repoPath, "__tests__"));
    const hasColocated = testFiles.some(f => !f.includes("test/") && !f.includes("tests/") && !f.includes("__tests__"));

    if (hasTestDir && !hasColocated) testLocation = "separate";
    else if (!hasTestDir && hasColocated) testLocation = "colocated";

    return {
      framework,
      style,
      coverageTarget: 80,
      mockingApproach: framework === "jest" ? "jest.mock" : "vitest.mock",
      fixturePattern: "fixtures/",
      testLocation,
      namingPattern: "*.test.ts",
      samples
    };
  }

  // ============================================================================
  // STYLE GUIDE GENERATION
  // ============================================================================

  generateStyleGuide(format: "markdown" | "json" | "html" = "markdown"): string {
    const fingerprint = this.getFingerprint() || this.createFingerprint() as unknown as RepoFingerprint;

    const guide: StyleGuide = {
      title: `${path.basename(this.repoPath)} Style Guide`,
      generatedAt: new Date().toISOString(),
      sections: [
        {
          name: "Coding Style",
          description: "General coding conventions",
          rules: [
            {
              rule: `Use ${fingerprint.codingStyle.indentation} with ${fingerprint.codingStyle.indentSize} spaces`,
              rationale: "Consistent indentation improves readability",
              examples: { good: `function foo() {\n  return bar;\n}` }
            },
            {
              rule: `Use ${fingerprint.codingStyle.quotes} quotes`,
              rationale: "Consistent quote style throughout the codebase",
              examples: {
                good: fingerprint.codingStyle.quotes === "single" ? "const x = 'hello';" : 'const x = "hello";',
                bad: fingerprint.codingStyle.quotes === "single" ? 'const x = "hello";' : "const x = 'hello';"
              }
            },
            {
              rule: fingerprint.codingStyle.semicolons ? "Use semicolons" : "Omit semicolons",
              rationale: "Consistent statement termination",
              examples: { good: fingerprint.codingStyle.semicolons ? "const x = 1;" : "const x = 1" }
            }
          ]
        },
        {
          name: "Naming Conventions",
          description: "How to name things",
          rules: [
            {
              rule: `Files: ${fingerprint.namingConventions.files.style}`,
              rationale: "Consistent file naming",
              examples: { good: fingerprint.namingConventions.files.samples[0] || "user-service.ts" }
            },
            {
              rule: `Classes: ${fingerprint.namingConventions.classes.style}`,
              rationale: "Classes should be easily identifiable",
              examples: { good: "class UserService {}" }
            },
            {
              rule: `Functions: ${fingerprint.namingConventions.functions.style}`,
              rationale: "Functions describe actions",
              examples: { good: "function getUserById(id: string) {}" }
            }
          ]
        },
        {
          name: "Error Handling",
          description: "How to handle errors",
          rules: [
            {
              rule: `Primary pattern: ${fingerprint.errorHandling.primaryPattern}`,
              rationale: "Consistent error handling improves debugging",
              examples: { good: fingerprint.errorHandling.samples[0]?.code || "try { ... } catch (e) { ... }" }
            }
          ]
        }
      ]
    };

    if (format === "json") {
      return JSON.stringify(guide, null, 2);
    }

    if (format === "markdown") {
      let md = `# ${guide.title}\n\n`;
      md += `Generated: ${guide.generatedAt}\n\n`;

      for (const section of guide.sections) {
        md += `## ${section.name}\n\n`;
        md += `${section.description}\n\n`;

        for (const rule of section.rules) {
          md += `### ${rule.rule}\n\n`;
          md += `${rule.rationale}\n\n`;
          md += `**Good:**\n\`\`\`typescript\n${rule.examples.good}\n\`\`\`\n\n`;
          if (rule.examples.bad) {
            md += `**Bad:**\n\`\`\`typescript\n${rule.examples.bad}\n\`\`\`\n\n`;
          }
        }
      }

      return md;
    }

    // HTML format
    return `<!DOCTYPE html>
<html>
<head><title>${guide.title}</title></head>
<body>
<h1>${guide.title}</h1>
<p>Generated: ${guide.generatedAt}</p>
${guide.sections.map(s => `
<h2>${s.name}</h2>
<p>${s.description}</p>
${s.rules.map(r => `<h3>${r.rule}</h3><p>${r.rationale}</p>`).join("")}
`).join("")}
</body>
</html>`;
  }

  generateTemplate(
    templateType: "function" | "class" | "component" | "test" | "service" | "controller",
    name: string,
    options?: Record<string, unknown>
  ): string {
    const fingerprint = this.getFingerprint();
    const style = fingerprint?.codingStyle || { quotes: "single", semicolons: true };
    const q = style.quotes === "single" ? "'" : '"';
    const semi = style.semicolons ? ";" : "";

    switch (templateType) {
      case "function":
        return `export function ${name}(): void {
  // TODO: Implement
}${semi}
`;

      case "class":
        return `export class ${name} {
  constructor() {
    // TODO: Initialize
  }
}${semi}
`;

      case "component":
        return `import React from ${q}react${q}${semi}

interface ${name}Props {
  // TODO: Define props
}

export function ${name}({ }: ${name}Props) {
  return (
    <div>
      {/* TODO: Implement */}
    </div>
  )${semi}
}${semi}
`;

      case "test":
        return `import { describe, it, expect } from ${q}vitest${q}${semi}
import { ${name} } from ${q}./${name}${q}${semi}

describe(${q}${name}${q}, () => {
  it(${q}should work${q}, () => {
    // TODO: Implement test
    expect(true).toBe(true)${semi}
  })${semi}
})${semi}
`;

      case "service":
        return `export class ${name}Service {
  constructor() {
    // TODO: Inject dependencies
  }

  async execute(): Promise<void> {
    // TODO: Implement
  }
}${semi}
`;

      case "controller":
        return `export class ${name}Controller {
  constructor() {
    // TODO: Inject services
  }

  async handle(req: Request, res: Response): Promise<void> {
    // TODO: Implement
  }
}${semi}
`;

      default:
        return `// Template for ${templateType}\n`;
    }
  }

  suggestConvention(
    codeType: "function" | "class" | "variable" | "constant" | "file" | "directory",
    context: string
  ): { suggestion: string; examples: string[]; rationale: string } {
    const fingerprint = this.getFingerprint();
    if (!fingerprint) {
      return {
        suggestion: "No fingerprint available",
        examples: [],
        rationale: "Create a fingerprint first"
      };
    }

    let pattern: NamingPattern;
    switch (codeType) {
      case "function":
        pattern = fingerprint.namingConventions.functions;
        break;
      case "class":
        pattern = fingerprint.namingConventions.classes;
        break;
      case "variable":
        pattern = fingerprint.namingConventions.variables;
        break;
      case "constant":
        pattern = fingerprint.namingConventions.constants;
        break;
      case "file":
        pattern = fingerprint.namingConventions.files;
        break;
      case "directory":
        pattern = fingerprint.namingConventions.directories;
        break;
      default:
        pattern = { style: "camelCase", confidence: "low", exceptions: [], samples: [] };
    }

    return {
      suggestion: `Use ${pattern.style} for ${codeType}s`,
      examples: pattern.samples,
      rationale: `Based on analysis of ${pattern.samples.length} existing ${codeType}s with ${pattern.confidence} confidence`
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getSourceFiles(): string[] {
    try {
      const output = execSync(
        `git ls-files`,
        { cwd: this.repoPath, encoding: "utf-8" }
      );
      return output.trim().split("\n").filter(f =>
        f.endsWith(".ts") || f.endsWith(".tsx") ||
        f.endsWith(".js") || f.endsWith(".jsx") ||
        f.endsWith(".py") || f.endsWith(".go") ||
        f.endsWith(".java") || f.endsWith(".rs")
      );
    } catch {
      return [];
    }
  }

  private getFilesInDirectory(dir: string): string[] {
    try {
      const fullPath = path.join(this.repoPath, dir);
      if (!fs.existsSync(fullPath)) return [];
      return fs.readdirSync(fullPath).filter(f => !f.startsWith("."));
    } catch {
      return [];
    }
  }

  private inferDirectoryPurpose(dir: string): string {
    const purposes: Record<string, string> = {
      src: "Source code",
      lib: "Library code",
      test: "Tests",
      tests: "Tests",
      __tests__: "Tests",
      components: "UI components",
      services: "Business services",
      controllers: "Request handlers",
      models: "Data models",
      utils: "Utilities",
      helpers: "Helper functions",
      hooks: "React hooks",
      api: "API routes",
      config: "Configuration",
      types: "Type definitions",
      schemas: "Schemas",
      middleware: "Middleware",
      routes: "Routes"
    };

    const name = path.basename(dir);
    return purposes[name] || "General";
  }

  private findEntryPoints(): string[] {
    const entryPoints: string[] = [];
    const commonEntries = [
      "src/index.ts", "src/main.ts", "src/app.ts",
      "index.ts", "main.ts", "app.ts",
      "src/index.js", "index.js"
    ];

    for (const entry of commonEntries) {
      if (fs.existsSync(path.join(this.repoPath, entry))) {
        entryPoints.push(entry);
      }
    }

    return entryPoints;
  }
}
