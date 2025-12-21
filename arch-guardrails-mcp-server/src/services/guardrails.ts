import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  ArchRule,
  ArchConfig,
  RuleViolation,
  RuleSeverity,
  LayerDefinition,
  LayerAnalysis,
  DependencyViolation,
  PatternCompliance,
  AnalysisResult,
  NamingConvention,
  BUILT_IN_RULES,
  LAYER_PRESETS
} from "../types.js";

const execAsync = promisify(exec);

export class ArchGuardrails {
  private repoPath: string;
  private config: ArchConfig | null = null;
  private rules: Map<string, ArchRule>;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.rules = new Map(BUILT_IN_RULES.map(r => [r.id, r]));
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  async initConfig(
    preset: "clean-architecture" | "mvc" | "hexagonal" | "custom" = "mvc",
    outputFile: string = ".arch-guardrails.json"
  ): Promise<ArchConfig> {
    const config: ArchConfig = {
      rules: {},
      layers: LAYER_PRESETS[preset] || [],
      boundaries: [],
      patterns: [],
      naming: []
    };

    // Enable default rules
    for (const rule of BUILT_IN_RULES) {
      if (rule.enabled) {
        config.rules[rule.id] = rule.severity;
      }
    }

    // Save config
    const configPath = path.join(this.repoPath, outputFile);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    this.config = config;
    return config;
  }

  async loadConfig(configFile?: string): Promise<ArchConfig | null> {
    const possiblePaths = configFile
      ? [path.join(this.repoPath, configFile)]
      : [
          path.join(this.repoPath, ".arch-guardrails.json"),
          path.join(this.repoPath, "arch-guardrails.config.json"),
          path.join(this.repoPath, ".archrc.json")
        ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf-8");
        this.config = JSON.parse(content);
        return this.config;
      }
    }

    return null;
  }

  updateRule(
    ruleId: string,
    enabled?: boolean,
    severity?: RuleSeverity,
    config?: Record<string, any>
  ): ArchRule | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    if (enabled !== undefined) rule.enabled = enabled;
    if (severity !== undefined) rule.severity = severity;
    if (config !== undefined) rule.config = { ...rule.config, ...config };

    this.rules.set(ruleId, rule);
    return rule;
  }

  // ============================================================================
  // MAIN ANALYSIS
  // ============================================================================

  async analyze(
    files?: string[],
    ruleIds?: string[],
    autoFix: boolean = false
  ): Promise<AnalysisResult> {
    const filesToAnalyze = files || await this.discoverFiles();
    const rulesToCheck = ruleIds
      ? Array.from(this.rules.values()).filter(r => ruleIds.includes(r.id) && r.enabled)
      : Array.from(this.rules.values()).filter(r => r.enabled);

    const violations: RuleViolation[] = [];

    for (const file of filesToAnalyze) {
      const absolutePath = path.join(this.repoPath, file);
      if (!fs.existsSync(absolutePath)) continue;

      const content = fs.readFileSync(absolutePath, "utf-8");

      for (const rule of rulesToCheck) {
        const ruleViolations = await this.checkRule(rule, file, content);
        violations.push(...ruleViolations);
      }
    }

    // Auto-fix if requested
    if (autoFix) {
      const fixable = violations.filter(v => v.autoFixable);
      // Implementation of auto-fix would go here
    }

    const byRule: Record<string, number> = {};
    const bySeverity: Record<RuleSeverity, number> = { error: 0, warning: 0, info: 0 };

    for (const v of violations) {
      byRule[v.ruleId] = (byRule[v.ruleId] || 0) + 1;
      bySeverity[v.severity]++;
    }

    const score = this.calculateScore(violations, filesToAnalyze.length);

    return {
      totalFiles: filesToAnalyze.length,
      analyzedFiles: filesToAnalyze.length,
      violations,
      byRule,
      bySeverity,
      score
    };
  }

  private async checkRule(rule: ArchRule, file: string, content: string): Promise<RuleViolation[]> {
    switch (rule.id) {
      case "no-circular-deps":
        return []; // Handled separately in findCircularDeps
      case "layer-boundary":
        return this.checkLayerBoundary(rule, file, content);
      case "no-relative-parent-imports":
        return this.checkRelativeImports(rule, file, content);
      case "single-responsibility":
        return this.checkSingleResponsibility(rule, file, content);
      case "max-file-lines":
        return this.checkMaxLines(rule, file, content);
      case "index-exports-only":
        return this.checkIndexExports(rule, file, content);
      case "component-naming":
        return this.checkComponentNaming(rule, file, content);
      case "constant-naming":
        return this.checkConstantNaming(rule, file, content);
      case "file-naming":
        return this.checkFileNaming(rule, file);
      case "no-secrets":
        return this.checkSecrets(rule, file, content);
      case "no-sql-injection":
        return this.checkSqlInjection(rule, file, content);
      case "validate-input":
        return this.checkInputValidation(rule, file, content);
      case "no-sync-fs":
        return this.checkSyncFs(rule, file, content);
      default:
        return [];
    }
  }

  private checkLayerBoundary(rule: ArchRule, file: string, content: string): RuleViolation[] {
    if (!this.config?.layers) return [];

    const violations: RuleViolation[] = [];
    const fileLayer = this.getFileLayer(file);
    if (!fileLayer) return [];

    const imports = this.extractImports(content);
    const allowedLayers = new Set(fileLayer.allowedDependencies);

    for (const imp of imports) {
      if (imp.path.startsWith(".")) {
        const targetFile = this.resolveImportPath(file, imp.path);
        const targetLayer = this.getFileLayer(targetFile);

        if (targetLayer && targetLayer.name !== fileLayer.name && !allowedLayers.has(targetLayer.name)) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            file,
            line: imp.line,
            message: `Layer violation: ${fileLayer.name} cannot import from ${targetLayer.name}`,
            suggestion: `Move shared code to a common layer or refactor the dependency`,
            autoFixable: false
          });
        }
      }
    }

    return violations;
  }

  private checkRelativeImports(rule: ArchRule, file: string, content: string): RuleViolation[] {
    const maxDepth = rule.config?.maxDepth || 2;
    const violations: RuleViolation[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/from\s+['"](\.\.[\/\\].*)['"]/);
      if (match) {
        const depth = (match[1].match(/\.\./g) || []).length;
        if (depth > maxDepth) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            file,
            line: i + 1,
            message: `Relative import depth (${depth}) exceeds maximum (${maxDepth})`,
            suggestion: `Use absolute imports or path aliases`,
            autoFixable: false
          });
        }
      }
    }

    return violations;
  }

  private checkSingleResponsibility(rule: ArchRule, file: string, content: string): RuleViolation[] {
    const maxExports = rule.config?.maxExports || 5;
    const exports = (content.match(/\bexport\s+(default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+/g) || []).length;

    if (exports > maxExports) {
      return [{
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        file,
        message: `File has ${exports} exports, exceeding maximum of ${maxExports}`,
        suggestion: `Consider splitting into multiple files`,
        autoFixable: false
      }];
    }

    return [];
  }

  private checkMaxLines(rule: ArchRule, file: string, content: string): RuleViolation[] {
    const maxLines = rule.config?.maxLines || 500;
    const lineCount = content.split("\n").length;

    if (lineCount > maxLines) {
      return [{
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        file,
        message: `File has ${lineCount} lines, exceeding maximum of ${maxLines}`,
        suggestion: `Consider refactoring into smaller files`,
        autoFixable: false
      }];
    }

    return [];
  }

  private checkIndexExports(rule: ArchRule, file: string, content: string): RuleViolation[] {
    if (!file.endsWith("index.ts") && !file.endsWith("index.js")) return [];

    // Check for non-export statements
    const lines = content.split("\n");
    const violations: RuleViolation[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) continue;
      if (line.startsWith("export") || line.startsWith("import")) continue;

      // Found logic in index file
      if (line.includes("function") || line.includes("class") || line.includes("const ") && !line.includes("export")) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          file,
          line: i + 1,
          message: `Index files should only contain exports, not logic`,
          suggestion: `Move this code to a separate file`,
          autoFixable: false
        });
      }
    }

    return violations;
  }

  private checkComponentNaming(rule: ArchRule, file: string, content: string): RuleViolation[] {
    if (!file.endsWith(".tsx") && !file.endsWith(".jsx")) return [];

    const violations: RuleViolation[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/(?:export\s+)?(?:default\s+)?function\s+([a-z]\w*)\s*\(/);
      if (match) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          file,
          line: i + 1,
          message: `React component "${match[1]}" should be PascalCase`,
          suggestion: `Rename to "${this.toPascalCase(match[1])}"`,
          autoFixable: true
        });
      }
    }

    return violations;
  }

  private checkConstantNaming(rule: ArchRule, file: string, content: string): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      // Check for const at module level that looks like a constant (not a function)
      const match = lines[i].match(/^(?:export\s+)?const\s+([a-z]\w*)\s*=\s*['"{\d\[]/);
      if (match && !match[1].includes("_")) {
        const name = match[1];
        // Skip if it looks like a variable (camelCase is fine for variables)
        if (name.match(/^[a-z][a-z0-9]*$/i)) {
          // Only flag if it seems like a constant value
          if (lines[i].includes("= '") || lines[i].includes('= "') || lines[i].match(/=\s*\d+/)) {
            // Skip - too many false positives
          }
        }
      }
    }

    return violations;
  }

  private checkFileNaming(rule: ArchRule, file: string): RuleViolation[] {
    const fileName = path.basename(file, path.extname(file));

    // Skip test files and index files
    if (fileName.includes(".test") || fileName.includes(".spec") || fileName === "index") {
      return [];
    }

    // Check for PascalCase for components
    if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
      if (!fileName.match(/^[A-Z][a-zA-Z0-9]*$/)) {
        return [{
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          file,
          message: `Component file "${fileName}" should be PascalCase`,
          suggestion: `Rename to "${this.toPascalCase(fileName)}"`,
          autoFixable: false
        }];
      }
    } else {
      // Other files should be kebab-case or camelCase
      if (!fileName.match(/^[a-z][a-z0-9-]*$/)) {
        // Only warn if it's clearly wrong
        if (fileName.includes("_") && !fileName.startsWith("_")) {
          return [{
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            file,
            message: `File "${fileName}" should use kebab-case`,
            suggestion: `Rename to "${fileName.replace(/_/g, "-")}"`,
            autoFixable: false
          }];
        }
      }
    }

    return [];
  }

  private checkSecrets(rule: ArchRule, file: string, content: string): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const lines = content.split("\n");

    const secretPatterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][A-Za-z0-9+/=]{20,}['"]/i,
      /private[_-]?key\s*[:=]\s*['"]/i
    ];

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of secretPatterns) {
        if (pattern.test(lines[i])) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            file,
            line: i + 1,
            message: `Potential hardcoded secret detected`,
            suggestion: `Use environment variables or a secret manager`,
            autoFixable: false
          });
          break;
        }
      }
    }

    return violations;
  }

  private checkSqlInjection(rule: ArchRule, file: string, content: string): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const lines = content.split("\n");

    const sqlPatterns = [
      /query\s*\(\s*`[^`]*\$\{/,
      /execute\s*\(\s*`[^`]*\$\{/,
      /raw\s*\(\s*`[^`]*\$\{/
    ];

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of sqlPatterns) {
        if (pattern.test(lines[i])) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            file,
            line: i + 1,
            message: `Potential SQL injection vulnerability`,
            suggestion: `Use parameterized queries instead of string interpolation`,
            autoFixable: false
          });
          break;
        }
      }
    }

    return violations;
  }

  private checkInputValidation(rule: ArchRule, file: string, content: string): RuleViolation[] {
    if (!file.includes("controller") && !file.includes("route") && !file.includes("handler")) {
      return [];
    }

    const violations: RuleViolation[] = [];

    // Check if there's any validation
    const hasValidation = content.includes("validate") ||
                          content.includes("Zod") ||
                          content.includes("Joi") ||
                          content.includes("yup") ||
                          content.includes("class-validator");

    if (!hasValidation && (content.includes("req.body") || content.includes("request.body"))) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        file,
        message: `API handler uses request body without apparent validation`,
        suggestion: `Add input validation using Zod, Joi, or class-validator`,
        autoFixable: false
      });
    }

    return violations;
  }

  private checkSyncFs(rule: ArchRule, file: string, content: string): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const lines = content.split("\n");

    const syncMethods = ["readFileSync", "writeFileSync", "existsSync", "mkdirSync", "readdirSync"];

    for (let i = 0; i < lines.length; i++) {
      for (const method of syncMethods) {
        if (lines[i].includes(method)) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            file,
            line: i + 1,
            message: `Synchronous file system operation: ${method}`,
            suggestion: `Use async version: ${method.replace("Sync", "")} with promises`,
            autoFixable: false
          });
        }
      }
    }

    return violations;
  }

  // ============================================================================
  // LAYER ANALYSIS
  // ============================================================================

  async analyzeLayers(layers?: LayerDefinition[]): Promise<LayerAnalysis> {
    const layerDefs = layers || this.config?.layers || [];
    const violations: DependencyViolation[] = [];
    const graph: Record<string, string[]> = {};
    const layerStats: LayerAnalysis["layers"] = [];

    for (const layer of layerDefs) {
      const files = await this.getFilesInLayer(layer);
      let internalDeps = 0;
      let externalDeps = 0;
      let layerViolations = 0;

      for (const file of files) {
        const absolutePath = path.join(this.repoPath, file);
        if (!fs.existsSync(absolutePath)) continue;

        const content = fs.readFileSync(absolutePath, "utf-8");
        const imports = this.extractImports(content);

        for (const imp of imports) {
          if (imp.path.startsWith(".")) {
            const targetFile = this.resolveImportPath(file, imp.path);
            const targetLayer = this.getFileLayer(targetFile);

            if (targetLayer) {
              if (targetLayer.name === layer.name) {
                internalDeps++;
              } else if (layer.allowedDependencies.includes(targetLayer.name)) {
                externalDeps++;
              } else {
                layerViolations++;
                violations.push({
                  sourceFile: file,
                  sourceLayer: layer.name,
                  targetFile,
                  targetLayer: targetLayer.name,
                  importLine: imp.line,
                  message: `${layer.name} cannot depend on ${targetLayer.name}`
                });
              }
            }
          }
        }
      }

      graph[layer.name] = layer.allowedDependencies;

      layerStats.push({
        name: layer.name,
        files: files.length,
        internalDeps,
        externalDeps,
        violations: layerViolations
      });
    }

    return { layers: layerStats, violations, graph };
  }

  async findCircularDeps(entryPoints?: string[]): Promise<string[][]> {
    const files = entryPoints || await this.discoverFiles();
    const deps = new Map<string, string[]>();

    // Build dependency graph
    for (const file of files) {
      const absolutePath = path.join(this.repoPath, file);
      if (!fs.existsSync(absolutePath)) continue;

      const content = fs.readFileSync(absolutePath, "utf-8");
      const imports = this.extractImports(content);
      const fileDeps: string[] = [];

      for (const imp of imports) {
        if (imp.path.startsWith(".")) {
          const resolved = this.resolveImportPath(file, imp.path);
          if (resolved) fileDeps.push(resolved);
        }
      }

      deps.set(file, fileDeps);
    }

    // Find cycles using DFS
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();
    const currentPath: string[] = [];

    const dfs = (node: string) => {
      if (stack.has(node)) {
        const cycleStart = currentPath.indexOf(node);
        cycles.push([...currentPath.slice(cycleStart), node]);
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      stack.add(node);
      currentPath.push(node);

      for (const dep of deps.get(node) || []) {
        dfs(dep);
      }

      stack.delete(node);
      currentPath.pop();
    };

    for (const file of deps.keys()) {
      dfs(file);
    }

    return cycles;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async discoverFiles(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) | grep -v node_modules | grep -v dist | head -1000`,
        { cwd: this.repoPath }
      );
      return stdout.trim().split("\n").filter(f => f).map(f => f.replace(/^\.\//, ""));
    } catch {
      return [];
    }
  }

  private async getFilesInLayer(layer: LayerDefinition): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of layer.patterns) {
      try {
        const { stdout } = await execAsync(
          `find . -path "${pattern}" -type f | head -500`,
          { cwd: this.repoPath }
        );
        files.push(...stdout.trim().split("\n").filter(f => f).map(f => f.replace(/^\.\//, "")));
      } catch {
        // Pattern didn't match anything
      }
    }

    return [...new Set(files)];
  }

  private getFileLayer(file: string): LayerDefinition | null {
    if (!this.config?.layers) return null;

    for (const layer of this.config.layers) {
      for (const pattern of layer.patterns) {
        const regex = new RegExp(pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*"));
        if (regex.test(file)) {
          return layer;
        }
      }
    }

    return null;
  }

  private extractImports(content: string): Array<{ path: string; line: number }> {
    const imports: Array<{ path: string; line: number }> = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/);
      if (match) {
        imports.push({ path: match[1], line: i + 1 });
      }
    }

    return imports;
  }

  private resolveImportPath(fromFile: string, importPath: string): string {
    const fromDir = path.dirname(fromFile);
    let resolved = path.normalize(path.join(fromDir, importPath));

    // Try with extensions
    const extensions = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (fs.existsSync(path.join(this.repoPath, withExt))) {
        return withExt;
      }
    }

    return resolved;
  }

  private calculateScore(violations: RuleViolation[], fileCount: number): number {
    if (fileCount === 0) return 100;

    let penalty = 0;
    for (const v of violations) {
      switch (v.severity) {
        case "error": penalty += 10; break;
        case "warning": penalty += 3; break;
        case "info": penalty += 1; break;
      }
    }

    return Math.max(0, Math.round(100 - (penalty / fileCount) * 10));
  }

  private toPascalCase(str: string): string {
    return str.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");
  }

  // ============================================================================
  // REPORTING
  // ============================================================================

  async generateReport(format: "json" | "markdown" | "html" = "markdown"): Promise<string> {
    const analysis = await this.analyze();
    const layers = await this.analyzeLayers();
    const circular = await this.findCircularDeps();

    switch (format) {
      case "json":
        return JSON.stringify({ analysis, layers, circular }, null, 2);

      case "markdown":
        return this.generateMarkdownReport(analysis, layers, circular);

      case "html":
        return this.generateHtmlReport(analysis, layers, circular);
    }
  }

  private generateMarkdownReport(
    analysis: AnalysisResult,
    layers: LayerAnalysis,
    circular: string[][]
  ): string {
    let md = `# Architecture Guardrails Report\n\n`;
    md += `**Score:** ${analysis.score}/100\n\n`;
    md += `**Files Analyzed:** ${analysis.analyzedFiles}\n\n`;

    md += `## Summary\n\n`;
    md += `| Severity | Count |\n`;
    md += `|----------|-------|\n`;
    md += `| Errors | ${analysis.bySeverity.error} |\n`;
    md += `| Warnings | ${analysis.bySeverity.warning} |\n`;
    md += `| Info | ${analysis.bySeverity.info} |\n\n`;

    if (analysis.violations.length > 0) {
      md += `## Violations\n\n`;
      for (const v of analysis.violations.slice(0, 50)) {
        md += `### ${v.severity.toUpperCase()}: ${v.ruleName}\n`;
        md += `- **File:** ${v.file}${v.line ? `:${v.line}` : ""}\n`;
        md += `- **Message:** ${v.message}\n`;
        if (v.suggestion) md += `- **Suggestion:** ${v.suggestion}\n`;
        md += `\n`;
      }
    }

    if (circular.length > 0) {
      md += `## Circular Dependencies\n\n`;
      for (const cycle of circular) {
        md += `- ${cycle.join(" -> ")}\n`;
      }
    }

    md += `\n## Layer Analysis\n\n`;
    md += `| Layer | Files | Internal Deps | External Deps | Violations |\n`;
    md += `|-------|-------|---------------|---------------|------------|\n`;
    for (const layer of layers.layers) {
      md += `| ${layer.name} | ${layer.files} | ${layer.internalDeps} | ${layer.externalDeps} | ${layer.violations} |\n`;
    }

    return md;
  }

  private generateHtmlReport(
    analysis: AnalysisResult,
    layers: LayerAnalysis,
    circular: string[][]
  ): string {
    // Simple HTML report
    return `<!DOCTYPE html>
<html>
<head><title>Architecture Report</title></head>
<body>
<h1>Architecture Guardrails Report</h1>
<p>Score: ${analysis.score}/100</p>
<p>Errors: ${analysis.bySeverity.error}, Warnings: ${analysis.bySeverity.warning}</p>
</body>
</html>`;
  }
}
