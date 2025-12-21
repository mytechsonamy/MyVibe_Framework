import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  ChangeSet,
  FileChange,
  BreakingChange,
  PRSlice,
  DeliveryPlan,
  FeatureFlag,
  RolloutPlan,
  CompatibilityPlan,
  RiskAssessment,
  RiskLevel,
  DeliveryStrategy,
  DEFAULT_SLICE_CONFIG,
  ROLLOUT_DEFAULTS,
  MigrationScript,
  DeprecationNotice
} from "../types.js";

const execAsync = promisify(exec);

export class DeliveryPlanner {
  private repoPath: string;
  private plans: Map<string, DeliveryPlan> = new Map();

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  // ============================================================================
  // CHANGE ANALYSIS
  // ============================================================================

  async analyzeChanges(
    baseBranch: string = "main",
    targetBranch?: string,
    includePaths?: string[],
    excludePaths?: string[]
  ): Promise<ChangeSet> {
    const target = targetBranch || "HEAD";

    // Get changed files from git
    const { stdout: diffOutput } = await execAsync(
      `git diff --numstat ${baseBranch}...${target}`,
      { cwd: this.repoPath }
    );

    const files: FileChange[] = [];
    let totalLOC = 0;
    const modules = new Set<string>();

    for (const line of diffOutput.trim().split("\n").filter(l => l)) {
      const [additions, deletions, filePath] = line.split("\t");
      if (!filePath) continue;

      // Apply path filters
      if (includePaths && !includePaths.some(p => filePath.startsWith(p))) continue;
      if (excludePaths && excludePaths.some(p => filePath.startsWith(p))) continue;

      const add = parseInt(additions) || 0;
      const del = parseInt(deletions) || 0;
      totalLOC += add + del;

      const module = this.getModuleName(filePath);
      modules.add(module);

      const changeType = await this.getChangeType(filePath, baseBranch, target);
      files.push({
        path: filePath,
        changeType,
        additions: add,
        deletions: del,
        module,
        isPublicAPI: this.isPublicAPI(filePath)
      });
    }

    // Detect breaking changes
    const breakingChanges = await this.detectBreakingChanges(files.map(f => f.path));

    return {
      id: `changeset-${Date.now()}`,
      files,
      estimatedLOC: totalLOC,
      affectedModules: Array.from(modules),
      breakingChanges,
      dependencies: await this.detectDependencies(files.map(f => f.path))
    };
  }

  private async getChangeType(
    filePath: string,
    baseBranch: string,
    targetBranch: string
  ): Promise<"add" | "modify" | "delete" | "rename"> {
    try {
      const { stdout } = await execAsync(
        `git diff --name-status ${baseBranch}...${targetBranch} -- "${filePath}"`,
        { cwd: this.repoPath }
      );
      const status = stdout.trim().charAt(0);
      switch (status) {
        case "A": return "add";
        case "D": return "delete";
        case "R": return "rename";
        default: return "modify";
      }
    } catch {
      return "modify";
    }
  }

  private getModuleName(filePath: string): string {
    const parts = filePath.split("/");
    if (parts.length >= 2) {
      // src/services/foo.ts -> services
      // packages/core/src/index.ts -> packages/core
      if (parts[0] === "src" && parts.length >= 2) {
        return parts[1];
      }
      if (parts[0] === "packages" && parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
      return parts[0];
    }
    return "root";
  }

  private isPublicAPI(filePath: string): boolean {
    const publicPatterns = [
      /^src\/index\.ts$/,
      /^src\/api\//,
      /^packages\/[^/]+\/src\/index\.ts$/,
      /\.d\.ts$/,
      /openapi\.ya?ml$/,
      /swagger\.json$/
    ];
    return publicPatterns.some(p => p.test(filePath));
  }

  async detectBreakingChanges(changedFiles: string[]): Promise<BreakingChange[]> {
    const breakingChanges: BreakingChange[] = [];

    for (const filePath of changedFiles) {
      const absolutePath = path.join(this.repoPath, filePath);
      if (!fs.existsSync(absolutePath)) continue;

      const content = fs.readFileSync(absolutePath, "utf-8");

      // Check for API breaking changes
      if (this.isPublicAPI(filePath)) {
        // Removed exports
        const removedExports = await this.findRemovedExports(filePath);
        for (const exp of removedExports) {
          breakingChanges.push({
            type: "api",
            description: `Removed export: ${exp}`,
            affectedConsumers: [],
            migrationRequired: true,
            severity: "high"
          });
        }

        // Changed function signatures
        const changedSignatures = this.detectSignatureChanges(content, filePath);
        breakingChanges.push(...changedSignatures);
      }

      // Check for schema changes
      if (filePath.includes("schema") || filePath.includes("migration") || filePath.includes("prisma")) {
        const schemaChanges = this.detectSchemaChanges(content);
        breakingChanges.push(...schemaChanges);
      }

      // Check for config changes
      if (filePath.includes("config") || filePath.endsWith(".env.example")) {
        const configChanges = this.detectConfigChanges(content);
        breakingChanges.push(...configChanges);
      }
    }

    return breakingChanges;
  }

  private async findRemovedExports(filePath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `git diff HEAD~1 HEAD -- "${filePath}" | grep "^-export"`,
        { cwd: this.repoPath }
      );
      return stdout.trim().split("\n")
        .filter(l => l)
        .map(l => l.replace(/^-export\s+(default\s+)?/, "").split(/\s+/)[0]);
    } catch {
      return [];
    }
  }

  private detectSignatureChanges(content: string, filePath: string): BreakingChange[] {
    const changes: BreakingChange[] = [];

    // Look for required parameter additions (simple heuristic)
    const funcRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      const params = match[2];
      // If there are required params without defaults, could be breaking
      if (params.includes(":") && !params.includes("?") && !params.includes("=")) {
        // This is a heuristic - would need diff to be accurate
      }
    }

    return changes;
  }

  private detectSchemaChanges(content: string): BreakingChange[] {
    const changes: BreakingChange[] = [];

    // Look for column removals or type changes
    if (content.includes("DROP COLUMN") || content.includes("dropColumn")) {
      changes.push({
        type: "schema",
        description: "Column removal detected",
        affectedConsumers: [],
        migrationRequired: true,
        severity: "high"
      });
    }

    if (content.includes("ALTER COLUMN") || content.includes("modifyColumn")) {
      changes.push({
        type: "schema",
        description: "Column modification detected",
        affectedConsumers: [],
        migrationRequired: true,
        severity: "medium"
      });
    }

    return changes;
  }

  private detectConfigChanges(content: string): BreakingChange[] {
    const changes: BreakingChange[] = [];

    // Look for removed or renamed config keys
    // This is a simplified check
    if (content.includes("REMOVED:") || content.includes("DEPRECATED:")) {
      changes.push({
        type: "config",
        description: "Configuration change detected",
        affectedConsumers: [],
        migrationRequired: false,
        severity: "medium"
      });
    }

    return changes;
  }

  private async detectDependencies(changedFiles: string[]): Promise<string[]> {
    const deps = new Set<string>();

    for (const filePath of changedFiles) {
      const absolutePath = path.join(this.repoPath, filePath);
      if (!fs.existsSync(absolutePath)) continue;

      try {
        const content = fs.readFileSync(absolutePath, "utf-8");
        const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
            deps.add(importPath.split("/")[0]);
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return Array.from(deps);
  }

  // ============================================================================
  // PR SLICING
  // ============================================================================

  sliceChanges(
    files: FileChange[],
    strategy: "by-module" | "by-layer" | "by-feature" | "by-risk" = "by-module",
    maxFilesPerPR: number = DEFAULT_SLICE_CONFIG.maxFilesPerPR,
    maxLOCPerPR: number = DEFAULT_SLICE_CONFIG.maxLOCPerPR
  ): PRSlice[] {
    const slices: PRSlice[] = [];

    switch (strategy) {
      case "by-module":
        return this.sliceByModule(files, maxFilesPerPR, maxLOCPerPR);
      case "by-layer":
        return this.sliceByLayer(files, maxFilesPerPR, maxLOCPerPR);
      case "by-feature":
        return this.sliceByFeature(files, maxFilesPerPR, maxLOCPerPR);
      case "by-risk":
        return this.sliceByRisk(files, maxFilesPerPR, maxLOCPerPR);
      default:
        return this.sliceByModule(files, maxFilesPerPR, maxLOCPerPR);
    }
  }

  private sliceByModule(files: FileChange[], maxFiles: number, maxLOC: number): PRSlice[] {
    const moduleGroups = new Map<string, FileChange[]>();

    for (const file of files) {
      const group = moduleGroups.get(file.module) || [];
      group.push(file);
      moduleGroups.set(file.module, group);
    }

    const slices: PRSlice[] = [];
    let order = 1;

    for (const [module, moduleFiles] of moduleGroups) {
      // Split if too large
      let currentSlice: FileChange[] = [];
      let currentLOC = 0;

      for (const file of moduleFiles) {
        const fileLOC = file.additions + file.deletions;

        if (currentSlice.length >= maxFiles || currentLOC + fileLOC > maxLOC) {
          if (currentSlice.length > 0) {
            slices.push(this.createSlice(module, currentSlice, order++));
            currentSlice = [];
            currentLOC = 0;
          }
        }

        currentSlice.push(file);
        currentLOC += fileLOC;
      }

      if (currentSlice.length > 0) {
        slices.push(this.createSlice(module, currentSlice, order++));
      }
    }

    return this.orderSlicesByDependency(slices);
  }

  private sliceByLayer(files: FileChange[], maxFiles: number, maxLOC: number): PRSlice[] {
    const layers = ["types", "utils", "services", "controllers", "routes", "tests"];
    const layerGroups = new Map<string, FileChange[]>();

    for (const file of files) {
      const layer = layers.find(l => file.path.includes(`/${l}/`)) || "other";
      const group = layerGroups.get(layer) || [];
      group.push(file);
      layerGroups.set(layer, group);
    }

    const slices: PRSlice[] = [];
    let order = 1;

    // Process in layer order (bottom-up)
    for (const layer of [...layers, "other"]) {
      const layerFiles = layerGroups.get(layer) || [];
      if (layerFiles.length === 0) continue;

      let currentSlice: FileChange[] = [];
      let currentLOC = 0;

      for (const file of layerFiles) {
        const fileLOC = file.additions + file.deletions;

        if (currentSlice.length >= maxFiles || currentLOC + fileLOC > maxLOC) {
          if (currentSlice.length > 0) {
            slices.push(this.createSlice(`${layer}-layer`, currentSlice, order++));
            currentSlice = [];
            currentLOC = 0;
          }
        }

        currentSlice.push(file);
        currentLOC += fileLOC;
      }

      if (currentSlice.length > 0) {
        slices.push(this.createSlice(`${layer}-layer`, currentSlice, order++));
      }
    }

    return slices;
  }

  private sliceByFeature(files: FileChange[], maxFiles: number, maxLOC: number): PRSlice[] {
    // Group files that share common path prefixes
    const featureGroups = new Map<string, FileChange[]>();

    for (const file of files) {
      const pathParts = file.path.split("/");
      const feature = pathParts.length >= 3 ? pathParts.slice(0, 3).join("/") : pathParts[0];
      const group = featureGroups.get(feature) || [];
      group.push(file);
      featureGroups.set(feature, group);
    }

    const slices: PRSlice[] = [];
    let order = 1;

    for (const [feature, featureFiles] of featureGroups) {
      const featureName = feature.split("/").pop() || feature;
      slices.push(this.createSlice(featureName, featureFiles, order++));
    }

    return this.orderSlicesByDependency(slices);
  }

  private sliceByRisk(files: FileChange[], maxFiles: number, maxLOC: number): PRSlice[] {
    // Sort files by risk (public API first, then by change size)
    const sortedFiles = [...files].sort((a, b) => {
      if (a.isPublicAPI && !b.isPublicAPI) return -1;
      if (!a.isPublicAPI && b.isPublicAPI) return 1;
      return (b.additions + b.deletions) - (a.additions + a.deletions);
    });

    const slices: PRSlice[] = [];
    let order = 1;
    let currentSlice: FileChange[] = [];
    let currentLOC = 0;

    for (const file of sortedFiles) {
      const fileLOC = file.additions + file.deletions;

      if (currentSlice.length >= maxFiles || currentLOC + fileLOC > maxLOC) {
        if (currentSlice.length > 0) {
          const riskLevel = currentSlice.some(f => f.isPublicAPI) ? "high" : "medium";
          slices.push(this.createSlice(`risk-${riskLevel}`, currentSlice, order++));
          currentSlice = [];
          currentLOC = 0;
        }
      }

      currentSlice.push(file);
      currentLOC += fileLOC;
    }

    if (currentSlice.length > 0) {
      const riskLevel = currentSlice.some(f => f.isPublicAPI) ? "high" : "medium";
      slices.push(this.createSlice(`risk-${riskLevel}`, currentSlice, order++));
    }

    return slices;
  }

  private createSlice(name: string, files: FileChange[], order: number): PRSlice {
    const totalLOC = files.reduce((sum, f) => sum + f.additions + f.deletions, 0);
    const hasPublicAPI = files.some(f => f.isPublicAPI);
    const hasTests = files.some(f => f.path.includes(".test.") || f.path.includes(".spec."));

    return {
      id: `slice-${order}-${name.replace(/[^a-z0-9]/gi, "-")}`,
      title: `[${order}] ${this.formatSliceTitle(name, files)}`,
      description: this.generateSliceDescription(files),
      files: files.map(f => f.path),
      order,
      dependencies: [],
      estimatedReviewTime: this.estimateReviewTime(totalLOC),
      riskLevel: this.assessSliceRisk(files, hasPublicAPI),
      testingStrategy: hasTests ? "included" : "add tests before merge",
      rollbackPlan: `git revert <commit-hash>`
    };
  }

  private formatSliceTitle(name: string, files: FileChange[]): string {
    const actionCounts = {
      add: files.filter(f => f.changeType === "add").length,
      modify: files.filter(f => f.changeType === "modify").length,
      delete: files.filter(f => f.changeType === "delete").length
    };

    const actions = [];
    if (actionCounts.add > 0) actions.push(`add ${actionCounts.add}`);
    if (actionCounts.modify > 0) actions.push(`update ${actionCounts.modify}`);
    if (actionCounts.delete > 0) actions.push(`remove ${actionCounts.delete}`);

    return `${name}: ${actions.join(", ")} files`;
  }

  private generateSliceDescription(files: FileChange[]): string {
    const modules = [...new Set(files.map(f => f.module))];
    const totalLOC = files.reduce((sum, f) => sum + f.additions + f.deletions, 0);

    return `Changes ${files.length} files across ${modules.join(", ")}. Total: +${files.reduce((s, f) => s + f.additions, 0)}/-${files.reduce((s, f) => s + f.deletions, 0)} LOC.`;
  }

  private estimateReviewTime(loc: number): string {
    // ~200 LOC per 10 minutes
    const minutes = Math.ceil(loc / 20);
    if (minutes < 60) return `${minutes} min`;
    return `${Math.round(minutes / 60 * 10) / 10} hours`;
  }

  private assessSliceRisk(files: FileChange[], hasPublicAPI: boolean): RiskLevel {
    if (hasPublicAPI) return "high";

    const totalLOC = files.reduce((sum, f) => sum + f.additions + f.deletions, 0);
    if (totalLOC > 500) return "high";
    if (totalLOC > 200) return "medium";
    return "low";
  }

  private orderSlicesByDependency(slices: PRSlice[]): PRSlice[] {
    // Simple topological sort based on module dependencies
    // Types/utils come first, then services, then controllers
    const priority: Record<string, number> = {
      types: 0,
      utils: 1,
      models: 2,
      services: 3,
      controllers: 4,
      routes: 5,
      tests: 6
    };

    return slices.sort((a, b) => {
      const aP = Object.keys(priority).find(k => a.id.includes(k)) || "other";
      const bP = Object.keys(priority).find(k => b.id.includes(k)) || "other";
      return (priority[aP] ?? 99) - (priority[bP] ?? 99);
    }).map((slice, idx) => ({
      ...slice,
      order: idx + 1
    }));
  }

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================

  generateFeatureFlags(
    slices: PRSlice[],
    flagSystem: "launchdarkly" | "unleash" | "custom" | "env-vars" = "env-vars",
    includeKillSwitch: boolean = true
  ): FeatureFlag[] {
    return slices.map(slice => ({
      name: this.generateFlagName(slice.title),
      description: slice.description,
      type: "boolean" as const,
      defaultValue: "false",
      targetedSlices: [slice.id],
      killSwitch: includeKillSwitch,
      expirationDate: this.calculateFlagExpiration()
    }));
  }

  private generateFlagName(title: string): string {
    return title
      .toLowerCase()
      .replace(/^\[\d+\]\s*/, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 50);
  }

  private calculateFlagExpiration(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 3); // 3 months default
    return date.toISOString().split("T")[0];
  }

  generateFlagCode(
    flagName: string,
    language: "typescript" | "javascript" | "python" | "go",
    flagType: "boolean" | "percentage" | "user-segment" = "boolean",
    defaultValue: string = "false"
  ): string {
    switch (language) {
      case "typescript":
      case "javascript":
        return this.generateTSFlagCode(flagName, flagType, defaultValue);
      case "python":
        return this.generatePythonFlagCode(flagName, flagType, defaultValue);
      case "go":
        return this.generateGoFlagCode(flagName, flagType, defaultValue);
    }
  }

  private generateTSFlagCode(name: string, type: string, defaultValue: string): string {
    return `// Feature Flag: ${name}
const FF_${name.toUpperCase()} = process.env.FF_${name.toUpperCase()} === 'true' || ${defaultValue};

export function is${this.toPascalCase(name)}Enabled(): boolean {
  return FF_${name.toUpperCase()};
}

// Usage:
// if (is${this.toPascalCase(name)}Enabled()) {
//   // New implementation
// } else {
//   // Old implementation
// }
`;
  }

  private generatePythonFlagCode(name: string, type: string, defaultValue: string): string {
    const upperName = name.toUpperCase();
    return `# Feature Flag: ${name}
import os

FF_${upperName} = os.getenv('FF_${upperName}', '${defaultValue}').lower() == 'true'

def is_${name}_enabled() -> bool:
    return FF_${upperName}

# Usage:
# if is_${name}_enabled():
#     # New implementation
# else:
#     # Old implementation
`;
  }

  private generateGoFlagCode(name: string, type: string, defaultValue: string): string {
    return `// Feature Flag: ${name}
package features

import "os"

var ff${this.toPascalCase(name)} = os.Getenv("FF_${name.toUpperCase()}") == "true"

func Is${this.toPascalCase(name)}Enabled() bool {
    return ff${this.toPascalCase(name)}
}

// Usage:
// if features.Is${this.toPascalCase(name)}Enabled() {
//     // New implementation
// } else {
//     // Old implementation
// }
`;
  }

  private toPascalCase(str: string): string {
    return str.split("_").map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join("");
  }

  // ============================================================================
  // ROLLOUT PLANNING
  // ============================================================================

  createRolloutPlan(
    stages: Array<"internal" | "canary" | "beta" | "gradual" | "full"> = ["internal", "canary", "gradual", "full"],
    metrics: string[] = [],
    autoRollback: boolean = true
  ): RolloutPlan {
    return {
      stages: stages.map(s => ROLLOUT_DEFAULTS[s]),
      rollbackTriggers: autoRollback ? [
        { metric: "error_rate", threshold: "> 1%", action: "rollback", severity: "critical" },
        { metric: "latency_p99", threshold: "> 2x baseline", action: "pause", severity: "high" },
        { metric: "success_rate", threshold: "< 99%", action: "alert", severity: "medium" }
      ] : [],
      monitoringMetrics: metrics.length > 0 ? metrics : [
        "error_rate",
        "latency_p50",
        "latency_p99",
        "throughput",
        "cpu_usage",
        "memory_usage"
      ],
      successCriteria: [
        "No P0/P1 incidents",
        "Error rate < 0.1%",
        "Latency within 10% of baseline",
        "No rollbacks triggered"
      ]
    };
  }

  generateRollbackPlan(slice: PRSlice): string {
    return `# Rollback Plan for ${slice.title}

## Quick Rollback
\`\`\`bash
# Revert the commit
git revert <commit-hash>
git push origin main
\`\`\`

## Feature Flag Disable
\`\`\`bash
# Disable feature flag immediately
export FF_${this.generateFlagName(slice.title).toUpperCase()}=false
# Restart services
\`\`\`

## Data Rollback (if applicable)
1. Identify affected records
2. Run rollback migration
3. Verify data integrity

## Verification Steps
1. Check error rates return to baseline
2. Verify affected users can proceed
3. Monitor for 30 minutes
4. Update incident ticket
`;
  }

  // ============================================================================
  // COMPATIBILITY PLANNING
  // ============================================================================

  generateCompatibilityPlan(
    breakingChanges: BreakingChange[],
    deprecationPeriod: string = "30 days",
    versioningStrategy: "url-path" | "header" | "query-param" = "url-path"
  ): CompatibilityPlan {
    const deprecations: DeprecationNotice[] = breakingChanges
      .filter(bc => bc.type === "api")
      .map(bc => ({
        item: bc.description.replace("Removed export: ", ""),
        type: "api" as const,
        message: `This API will be removed. ${bc.description}`,
        sunsetDate: this.calculateSunsetDate(deprecationPeriod),
        replacement: undefined
      }));

    const migrations: MigrationScript[] = breakingChanges
      .filter(bc => bc.type === "schema")
      .map((bc, idx) => ({
        name: `migration_${idx + 1}_${bc.description.toLowerCase().replace(/\s+/g, "_")}`,
        type: "schema" as const,
        upScript: "-- Add migration SQL here",
        downScript: "-- Add rollback SQL here",
        order: idx + 1,
        idempotent: true
      }));

    return {
      apiVersioning: {
        strategy: versioningStrategy,
        currentVersion: "v1",
        newVersion: "v2",
        sunsetDate: this.calculateSunsetDate(deprecationPeriod)
      },
      dataBackfill: [],
      deprecationNotices: deprecations,
      migrationScripts: migrations
    };
  }

  private calculateSunsetDate(period: string): string {
    const date = new Date();
    const match = period.match(/(\d+)\s*(day|week|month)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit === "day") date.setDate(date.getDate() + value);
      if (unit === "week") date.setDate(date.getDate() + value * 7);
      if (unit === "month") date.setMonth(date.getMonth() + value);
    }
    return date.toISOString().split("T")[0];
  }

  // ============================================================================
  // DELIVERY PLAN MANAGEMENT
  // ============================================================================

  async createDeliveryPlan(
    name: string,
    strategy: DeliveryStrategy = "feature-flag",
    baseBranch: string = "main",
    autoSlice: boolean = true
  ): Promise<DeliveryPlan> {
    const changeSet = await this.analyzeChanges(baseBranch);
    const slices = autoSlice ? this.sliceChanges(changeSet.files) : [];
    const featureFlags = this.generateFeatureFlags(slices);
    const rolloutPlan = this.createRolloutPlan();
    const compatibilityPlan = this.generateCompatibilityPlan(changeSet.breakingChanges);

    const plan: DeliveryPlan = {
      id: `plan-${Date.now()}`,
      name,
      strategy,
      totalChanges: changeSet.estimatedLOC,
      slices,
      featureFlags,
      rolloutPlan,
      backwardsCompatibility: compatibilityPlan,
      estimatedDuration: this.estimateDuration(slices),
      riskAssessment: this.assessOverallRisk(changeSet, slices)
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  getDeliveryPlan(planId: string): DeliveryPlan | undefined {
    return this.plans.get(planId);
  }

  private estimateDuration(slices: PRSlice[]): string {
    // Assume 1 PR per day for review/merge
    const days = slices.length;
    if (days <= 5) return `${days} days`;
    if (days <= 10) return `${Math.ceil(days / 5)} weeks`;
    return `${Math.ceil(days / 20)} months`;
  }

  private assessOverallRisk(changeSet: ChangeSet, slices: PRSlice[]): RiskAssessment {
    const factors = [];

    if (changeSet.breakingChanges.length > 0) {
      factors.push({
        factor: "Breaking changes detected",
        impact: "high" as RiskLevel,
        likelihood: "high" as RiskLevel,
        mitigation: "Feature flags and gradual rollout"
      });
    }

    if (changeSet.estimatedLOC > 1000) {
      factors.push({
        factor: "Large change set (>1000 LOC)",
        impact: "medium" as RiskLevel,
        likelihood: "medium" as RiskLevel,
        mitigation: "Incremental PRs with thorough review"
      });
    }

    const publicAPIChanges = slices.filter(s => s.riskLevel === "high").length;
    if (publicAPIChanges > 0) {
      factors.push({
        factor: `${publicAPIChanges} high-risk slices affecting public API`,
        impact: "high" as RiskLevel,
        likelihood: "medium" as RiskLevel,
        mitigation: "API versioning and deprecation notices"
      });
    }

    const overallRisk: RiskLevel =
      factors.some(f => f.impact === "critical") ? "critical" :
      factors.filter(f => f.impact === "high").length >= 2 ? "high" :
      factors.some(f => f.impact === "high") ? "medium" : "low";

    return {
      overallRisk,
      factors,
      mitigations: [
        "Use feature flags for all new functionality",
        "Implement gradual rollout with monitoring",
        "Prepare rollback procedures for each PR",
        "Add comprehensive tests before each merge"
      ],
      approvalRequired: overallRisk === "high" || overallRisk === "critical"
        ? ["Tech Lead", "Security Team"]
        : ["Tech Lead"]
    };
  }

  validateDeliveryPlan(planId: string): { valid: boolean; issues: string[] } {
    const plan = this.plans.get(planId);
    if (!plan) {
      return { valid: false, issues: ["Plan not found"] };
    }

    const issues: string[] = [];

    // Check for circular dependencies
    const visited = new Set<string>();
    for (const slice of plan.slices) {
      if (this.hasCircularDependency(slice, plan.slices, visited)) {
        issues.push(`Circular dependency detected for ${slice.id}`);
      }
    }

    // Check rollback plans exist
    for (const slice of plan.slices) {
      if (!slice.rollbackPlan) {
        issues.push(`Missing rollback plan for ${slice.id}`);
      }
    }

    // Check feature flags
    for (const flag of plan.featureFlags) {
      if (!flag.name || flag.name.length < 3) {
        issues.push(`Invalid feature flag name: ${flag.name}`);
      }
    }

    return { valid: issues.length === 0, issues };
  }

  private hasCircularDependency(
    slice: PRSlice,
    allSlices: PRSlice[],
    visited: Set<string>
  ): boolean {
    if (visited.has(slice.id)) return true;
    visited.add(slice.id);

    for (const depId of slice.dependencies) {
      const depSlice = allSlices.find(s => s.id === depId);
      if (depSlice && this.hasCircularDependency(depSlice, allSlices, new Set(visited))) {
        return true;
      }
    }

    return false;
  }
}
