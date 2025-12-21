import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  BranchInfo,
  BranchType,
  CodeOwner,
  CodeOwnersConfig,
  PRMetadata,
  PRSize,
  PRAnalysis,
  PRConcern,
  Reviewer,
  ChecklistItem,
  AIProvenance,
  ProvenanceModification,
  WorkflowConfig,
  DEFAULT_BRANCH_NAMING,
  DEFAULT_TEMPLATES,
  DEFAULT_LABELS,
  SIZE_THRESHOLDS
} from "../types.js";

export class PROrchestrator {
  private repoPath: string;
  private codeOwners: CodeOwner[] = [];
  private aiChanges: ProvenanceModification[] = [];

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  // ============================================================================
  // BRANCH OPERATIONS
  // ============================================================================

  createBranch(
    type: BranchType,
    description: string,
    ticket?: string,
    baseBranch: string = "main"
  ): { branchName: string; created: boolean } {
    const branchName = this.generateBranchName(type, description, ticket);

    try {
      // Fetch latest
      execSync(`git fetch origin`, { cwd: this.repoPath, stdio: "pipe" });

      // Create and checkout branch
      execSync(`git checkout -b ${branchName} origin/${baseBranch}`, {
        cwd: this.repoPath,
        stdio: "pipe"
      });

      return { branchName, created: true };
    } catch {
      return { branchName, created: false };
    }
  }

  generateBranchName(type: BranchType, description: string, ticket?: string): string {
    const config = DEFAULT_BRANCH_NAMING;
    const prefix = config.prefixes[type];

    // Sanitize description
    const sanitized = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, config.separator)
      .substring(0, 40);

    let branchName: string;
    if (ticket) {
      branchName = `${prefix}/${ticket}${config.separator}${sanitized}`;
    } else {
      branchName = `${prefix}/${sanitized}`;
    }

    return branchName.substring(0, config.maxLength);
  }

  validateBranchName(branchName: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const config = DEFAULT_BRANCH_NAMING;

    // Check length
    if (branchName.length > config.maxLength) {
      issues.push(`Branch name exceeds ${config.maxLength} characters`);
    }

    // Check prefix
    const prefixValues = Object.values(config.prefixes);
    const hasValidPrefix = prefixValues.some(p => branchName.startsWith(p + "/"));
    if (!hasValidPrefix) {
      issues.push(`Branch should start with one of: ${prefixValues.join(", ")}`);
    }

    // Check for invalid characters
    if (!/^[a-z0-9\-\/]+$/.test(branchName)) {
      issues.push("Branch name should only contain lowercase letters, numbers, hyphens, and slashes");
    }

    // Check for consecutive special characters
    if (/[\-\/]{2,}/.test(branchName)) {
      issues.push("Avoid consecutive hyphens or slashes");
    }

    return { valid: issues.length === 0, issues };
  }

  getBranchInfo(branchName?: string): BranchInfo {
    const branch = branchName || this.getCurrentBranch();

    // Parse branch name
    const parts = branch.split("/");
    const typeStr = parts[0] as BranchType;
    const description = parts.slice(1).join("/");

    // Extract ticket if present
    const ticketMatch = description.match(/^([A-Z]+-\d+)/);
    const ticket = ticketMatch ? ticketMatch[1] : undefined;

    // Get commit count
    let commits = 0;
    try {
      const output = execSync(`git rev-list --count origin/main..${branch}`, {
        cwd: this.repoPath,
        encoding: "utf-8"
      }).trim();
      commits = parseInt(output, 10) || 0;
    } catch {
      commits = 0;
    }

    // Get files changed
    let filesChanged = 0;
    try {
      const output = execSync(`git diff --name-only origin/main...${branch}`, {
        cwd: this.repoPath,
        encoding: "utf-8"
      });
      filesChanged = output.trim().split("\n").filter(Boolean).length;
    } catch {
      filesChanged = 0;
    }

    // Get creation date
    let createdAt = new Date().toISOString();
    try {
      const output = execSync(`git log --format=%aI --reverse ${branch} | head -1`, {
        cwd: this.repoPath,
        encoding: "utf-8",
        shell: "/bin/bash"
      }).trim();
      if (output) createdAt = output;
    } catch {
      // Use current date as fallback
    }

    return {
      name: branch,
      type: typeStr || "feature",
      ticket,
      description: ticket ? description.replace(`${ticket}-`, "") : description,
      baseBranch: "main",
      createdAt,
      commits,
      filesChanged
    };
  }

  private getCurrentBranch(): string {
    try {
      return execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: this.repoPath,
        encoding: "utf-8"
      }).trim();
    } catch {
      return "main";
    }
  }

  // ============================================================================
  // CODEOWNERS OPERATIONS
  // ============================================================================

  parseCodeOwners(): CodeOwnersConfig {
    const codeOwnersPath = path.join(this.repoPath, ".github", "CODEOWNERS");
    const altPath = path.join(this.repoPath, "CODEOWNERS");

    let content = "";
    if (fs.existsSync(codeOwnersPath)) {
      content = fs.readFileSync(codeOwnersPath, "utf-8");
    } else if (fs.existsSync(altPath)) {
      content = fs.readFileSync(altPath, "utf-8");
    }

    const owners: CodeOwner[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;

      const pattern = parts[0];
      const ownersList = parts.slice(1).filter(p => p.startsWith("@"));

      owners.push({
        pattern,
        owners: ownersList.map(o => o.replace("@", "")),
        mandatory: trimmed.includes("[MANDATORY]")
      });
    }

    this.codeOwners = owners;

    return {
      owners,
      defaultOwners: owners.find(o => o.pattern === "*")?.owners || [],
      requireApprovalFrom: "any"
    };
  }

  getOwnersForFiles(files: string[]): Record<string, string[]> {
    if (this.codeOwners.length === 0) {
      this.parseCodeOwners();
    }

    const result: Record<string, string[]> = {};

    for (const file of files) {
      const owners: string[] = [];

      for (const rule of this.codeOwners) {
        if (this.matchPattern(file, rule.pattern)) {
          owners.push(...rule.owners);
        }
      }

      result[file] = [...new Set(owners)];
    }

    return result;
  }

  private matchPattern(file: string, pattern: string): boolean {
    // Simple glob matching
    if (pattern === "*") return true;

    const regexPattern = pattern
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, ".");

    return new RegExp(`^${regexPattern}$`).test(file);
  }

  generateCodeOwners(
    strategy: "git-history" | "directory-based" | "hybrid" = "hybrid",
    minCommits: number = 5
  ): string {
    const contributors: Record<string, Record<string, number>> = {};

    // Get git history
    try {
      const log = execSync(
        `git log --format="%ae" --name-only --no-merges`,
        { cwd: this.repoPath, encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }
      );

      const lines = log.split("\n");
      let currentAuthor = "";

      for (const line of lines) {
        if (line.includes("@")) {
          currentAuthor = line.trim();
        } else if (line.trim() && currentAuthor) {
          const file = line.trim();
          if (!contributors[file]) {
            contributors[file] = {};
          }
          contributors[file][currentAuthor] = (contributors[file][currentAuthor] || 0) + 1;
        }
      }
    } catch {
      // Git history not available
    }

    // Generate CODEOWNERS content
    const lines: string[] = [
      "# CODEOWNERS - Auto-generated based on git history",
      "# Last updated: " + new Date().toISOString(),
      ""
    ];

    // Group by directory
    const dirOwners: Record<string, string[]> = {};

    for (const [file, authorCounts] of Object.entries(contributors)) {
      const dir = path.dirname(file);
      const topContributors = Object.entries(authorCounts)
        .filter(([, count]) => count >= minCommits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([author]) => `@${author.split("@")[0]}`);

      if (topContributors.length > 0) {
        if (!dirOwners[dir]) {
          dirOwners[dir] = [];
        }
        dirOwners[dir].push(...topContributors);
      }
    }

    // Dedupe and generate rules
    for (const [dir, owners] of Object.entries(dirOwners).sort()) {
      const uniqueOwners = [...new Set(owners)].slice(0, 3);
      if (uniqueOwners.length > 0) {
        lines.push(`${dir}/ ${uniqueOwners.join(" ")}`);
      }
    }

    return lines.join("\n");
  }

  // ============================================================================
  // PR TEMPLATE OPERATIONS
  // ============================================================================

  generatePRTemplate(
    branchName?: string,
    summary?: string,
    testing?: string,
    additionalContext?: Record<string, string>
  ): PRMetadata {
    const branch = branchName || this.getCurrentBranch();
    const branchInfo = this.getBranchInfo(branch);

    // Find matching template
    const template = DEFAULT_TEMPLATES.find(t =>
      t.conditions?.branchType?.includes(branchInfo.type)
    ) || DEFAULT_TEMPLATES[0];

    // Get changes for description
    const changes = this.getChangeSummary("main");

    // Generate PR size
    const size = this.getPRSize("main");

    // Get suggested reviewers
    const reviewers = this.suggestReviewers("main", 3);

    // Build checklist
    const checklist = this.buildChecklist(branchInfo.type);

    // Build AI provenance
    const provenance = this.generateProvenance("claude-opus-4-5");

    // Generate description
    let description = template.template
      .replace("{summary}", summary || `${branchInfo.type}: ${branchInfo.description}`)
      .replace("{changes}", changes.map(c => `- ${c}`).join("\n"))
      .replace("{testing}", testing || "- [ ] Manual testing completed\n- [ ] Unit tests pass")
      .replace("{provenance}", this.formatProvenance(provenance));

    // Apply additional context
    if (additionalContext) {
      for (const [key, value] of Object.entries(additionalContext)) {
        description = description.replace(`{${key}}`, value);
      }
    }

    // Generate title
    const title = branchInfo.ticket
      ? `[${branchInfo.ticket}] ${branchInfo.description}`
      : `${branchInfo.type}: ${branchInfo.description}`;

    // Generate labels
    const labels = this.generateLabels("main");

    return {
      title,
      description,
      type: branchInfo.type,
      ticket: branchInfo.ticket,
      size,
      labels,
      reviewers,
      checklist,
      aiProvenance: provenance
    };
  }

  private getChangeSummary(baseBranch: string): string[] {
    try {
      const diff = execSync(`git diff --stat origin/${baseBranch}...HEAD`, {
        cwd: this.repoPath,
        encoding: "utf-8"
      });

      const lines = diff.trim().split("\n").slice(0, -1);
      return lines.map(line => {
        const parts = line.trim().split("|");
        return parts[0].trim();
      }).filter(Boolean);
    } catch {
      return [];
    }
  }

  private buildChecklist(branchType: BranchType): ChecklistItem[] {
    const items: ChecklistItem[] = [
      { text: "Code review completed", checked: false, required: true, category: "review" },
      { text: "Unit tests pass", checked: false, required: true, category: "testing" },
      { text: "No security vulnerabilities introduced", checked: false, required: true, category: "security" }
    ];

    if (branchType === "feature") {
      items.push(
        { text: "Documentation updated", checked: false, required: false, category: "documentation" },
        { text: "Integration tests pass", checked: false, required: false, category: "testing" }
      );
    }

    if (branchType === "hotfix") {
      items.push(
        { text: "Root cause identified", checked: false, required: true, category: "review" },
        { text: "Regression test added", checked: false, required: true, category: "testing" }
      );
    }

    return items;
  }

  // ============================================================================
  // PR ANALYSIS
  // ============================================================================

  analyzePR(baseBranch: string = "main"): PRAnalysis {
    const concerns: PRConcern[] = [];
    const suggestions: string[] = [];

    // Get files changed
    let filesChanged: string[] = [];
    let linesChanged = 0;
    try {
      filesChanged = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, {
        cwd: this.repoPath,
        encoding: "utf-8"
      }).trim().split("\n").filter(Boolean);

      const stat = execSync(`git diff --shortstat origin/${baseBranch}...HEAD`, {
        cwd: this.repoPath,
        encoding: "utf-8"
      });
      const insertions = stat.match(/(\d+) insertions?/);
      const deletions = stat.match(/(\d+) deletions?/);
      linesChanged = (parseInt(insertions?.[1] || "0", 10)) + (parseInt(deletions?.[1] || "0", 10));
    } catch {
      // No changes
    }

    // Calculate complexity (simple heuristic)
    const complexity = Math.min(100, Math.round((filesChanged.length * 5) + (linesChanged * 0.1)));

    // Calculate risk score
    let riskScore = 0;

    // High-risk files
    const sensitivePatterns = [
      /security/i, /auth/i, /password/i, /secret/i,
      /config/i, /database/i, /migration/i
    ];

    for (const file of filesChanged) {
      if (sensitivePatterns.some(p => p.test(file))) {
        riskScore += 20;
        concerns.push({
          severity: "high",
          type: "security",
          file,
          message: "Changes to sensitive file",
          suggestion: "Ensure security review is conducted"
        });
      }
    }

    // Large PR warning
    if (linesChanged > 500) {
      riskScore += 15;
      concerns.push({
        severity: "medium",
        type: "architecture",
        message: `Large PR with ${linesChanged} lines changed`,
        suggestion: "Consider splitting into smaller PRs"
      });
    }

    if (filesChanged.length > 20) {
      riskScore += 10;
      concerns.push({
        severity: "medium",
        type: "architecture",
        message: `Many files changed (${filesChanged.length})`,
        suggestion: "Review for unrelated changes"
      });
    }

    // Impacted areas
    const impactedAreas = [...new Set(filesChanged.map(f => path.dirname(f).split("/")[0]))];

    // Suggestions
    if (filesChanged.some(f => f.includes("test"))) {
      suggestions.push("Tests are included - ensure coverage is adequate");
    } else {
      suggestions.push("Consider adding tests for the changes");
    }

    // Get reviewers
    const suggestedReviewers = this.suggestReviewers(baseBranch, 3);

    return {
      complexity,
      riskScore: Math.min(100, riskScore),
      testCoverage: 0, // Would need actual coverage data
      impactedAreas,
      suggestedReviewers,
      concerns,
      suggestions
    };
  }

  getPRSize(baseBranch: string = "main"): PRSize {
    try {
      const stat = execSync(`git diff --shortstat origin/${baseBranch}...HEAD`, {
        cwd: this.repoPath,
        encoding: "utf-8"
      });

      const files = stat.match(/(\d+) files? changed/);
      const insertions = stat.match(/(\d+) insertions?/);
      const deletions = stat.match(/(\d+) deletions?/);

      const fileCount = parseInt(files?.[1] || "0", 10);
      const lineCount = parseInt(insertions?.[1] || "0", 10) + parseInt(deletions?.[1] || "0", 10);

      for (const [size, thresholds] of Object.entries(SIZE_THRESHOLDS) as [PRSize, { maxFiles: number; maxLines: number }][]) {
        if (fileCount <= thresholds.maxFiles && lineCount <= thresholds.maxLines) {
          return size;
        }
      }

      return "xl";
    } catch {
      return "m";
    }
  }

  // ============================================================================
  // AI PROVENANCE
  // ============================================================================

  generateProvenance(
    model: string = "claude-opus-4-5",
    sessionId?: string
  ): AIProvenance {
    return {
      generatedBy: "MyVibe Framework",
      model,
      timestamp: new Date().toISOString(),
      sessionId,
      confidence: 0.95,
      humanReviewed: false,
      modifications: this.aiChanges
    };
  }

  trackAIChange(
    file: string,
    changeType: "created" | "modified" | "deleted",
    description: string,
    linesChanged: number = 0
  ): void {
    this.aiChanges.push({
      file,
      type: changeType,
      aiGenerated: true,
      linesChanged,
      description
    });
  }

  private formatProvenance(provenance: AIProvenance): string {
    const lines = [
      `- **Generated by**: ${provenance.generatedBy}`,
      `- **Model**: ${provenance.model}`,
      `- **Timestamp**: ${provenance.timestamp}`,
      `- **Confidence**: ${Math.round(provenance.confidence * 100)}%`,
      `- **Human Reviewed**: ${provenance.humanReviewed ? "Yes" : "No"}`
    ];

    if (provenance.modifications.length > 0) {
      lines.push("", "**AI-Generated Changes:**");
      for (const mod of provenance.modifications.slice(0, 10)) {
        lines.push(`- \`${mod.file}\`: ${mod.type} - ${mod.description}`);
      }
      if (provenance.modifications.length > 10) {
        lines.push(`- ... and ${provenance.modifications.length - 10} more`);
      }
    }

    return lines.join("\n");
  }

  // ============================================================================
  // REVIEWER SUGGESTIONS
  // ============================================================================

  suggestReviewers(
    baseBranch: string = "main",
    maxReviewers: number = 3
  ): Reviewer[] {
    const reviewers: Reviewer[] = [];

    // Get files changed
    let filesChanged: string[] = [];
    try {
      filesChanged = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, {
        cwd: this.repoPath,
        encoding: "utf-8"
      }).trim().split("\n").filter(Boolean);
    } catch {
      return reviewers;
    }

    // Get code owners
    const fileOwners = this.getOwnersForFiles(filesChanged);
    const ownerCounts: Record<string, number> = {};

    for (const owners of Object.values(fileOwners)) {
      for (const owner of owners) {
        ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
      }
    }

    // Sort by relevance
    const sortedOwners = Object.entries(ownerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxReviewers);

    for (const [owner, count] of sortedOwners) {
      reviewers.push({
        username: owner,
        type: "code-owner",
        reason: `Owns ${count} of ${filesChanged.length} changed files`,
        required: count > filesChanged.length / 2
      });
    }

    // Add recent contributors if needed
    if (reviewers.length < maxReviewers) {
      try {
        const recentAuthors = execSync(
          `git log --format="%an" --no-merges origin/${baseBranch}..HEAD | sort | uniq -c | sort -rn | head -5`,
          { cwd: this.repoPath, encoding: "utf-8", shell: "/bin/bash" }
        );

        for (const line of recentAuthors.trim().split("\n")) {
          if (reviewers.length >= maxReviewers) break;
          const parts = line.trim().split(/\s+/);
          const author = parts.slice(1).join(" ");
          if (author && !reviewers.find(r => r.username === author)) {
            reviewers.push({
              username: author,
              type: "team-member",
              reason: "Recent contributor to this area",
              required: false
            });
          }
        }
      } catch {
        // Ignore
      }
    }

    return reviewers;
  }

  // ============================================================================
  // WORKFLOW CONFIGURATION
  // ============================================================================

  initWorkflow(preset: "minimal" | "standard" | "strict" = "standard"): WorkflowConfig {
    const config: WorkflowConfig = {
      branchNaming: DEFAULT_BRANCH_NAMING,
      codeOwners: {
        owners: [],
        defaultOwners: [],
        requireApprovalFrom: preset === "strict" ? "all" : "any"
      },
      templates: DEFAULT_TEMPLATES,
      labels: DEFAULT_LABELS,
      reviewPolicy: {
        minReviewers: preset === "minimal" ? 1 : preset === "strict" ? 2 : 1,
        requireCodeOwner: preset !== "minimal",
        dismissStaleReviews: preset === "strict",
        requireBuildPass: true,
        requireTestPass: true
      },
      mergePolicy: {
        allowedMethods: preset === "strict" ? ["squash"] : ["merge", "squash", "rebase"],
        defaultMethod: "squash",
        deleteBranchOnMerge: true,
        requireLinearHistory: preset === "strict",
        autoMergeEnabled: preset !== "strict"
      }
    };

    // Create .github directory structure
    const githubDir = path.join(this.repoPath, ".github");
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir, { recursive: true });
    }

    // Write PR template
    const prTemplatePath = path.join(githubDir, "PULL_REQUEST_TEMPLATE.md");
    fs.writeFileSync(prTemplatePath, DEFAULT_TEMPLATES[0].template);

    return config;
  }

  getWorkflowConfig(): WorkflowConfig | null {
    const configPath = path.join(this.repoPath, ".github", "workflow-config.json");

    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    }

    return null;
  }

  generateLabels(baseBranch: string = "main"): string[] {
    const labels: string[] = [];

    // Size label
    const size = this.getPRSize(baseBranch);
    labels.push(`size/${size}`);

    // Check for AI-generated changes
    if (this.aiChanges.length > 0) {
      labels.push("ai-generated");
    }

    // Check files for specific labels
    let filesChanged: string[] = [];
    try {
      filesChanged = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, {
        cwd: this.repoPath,
        encoding: "utf-8"
      }).trim().split("\n").filter(Boolean);
    } catch {
      return labels;
    }

    // Documentation check
    if (filesChanged.every(f => f.endsWith(".md") || f.includes("docs/"))) {
      labels.push("documentation");
    }

    // Security check
    if (filesChanged.some(f => /security|auth|password|secret/i.test(f))) {
      labels.push("security");
    }

    // Breaking change check (heuristic)
    const branchInfo = this.getBranchInfo();
    if (branchInfo.description.toLowerCase().includes("breaking")) {
      labels.push("breaking-change");
    }

    labels.push("needs-review");

    return labels;
  }
}
