import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  FileHotspot,
  AuthorContribution,
  FileMetrics,
  ChurnTrend,
  OwnershipMap,
  DomainArea,
  BugProneFile,
  BugIndicator,
  RiskModel,
  RiskFactor,
  ChurnAnalysis,
  OverallTrend,
  TeamOwnership,
  RiskLevel,
  ChurnCategory,
  CHURN_THRESHOLDS,
  RISK_WEIGHTS,
  BUG_INDICATORS_CONFIG
} from "../types.js";

export class HotspotAnalyzer {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  // ============================================================================
  // HOTSPOT ANALYSIS
  // ============================================================================

  async analyzeHotspots(
    days: number = 90,
    limit: number = 20,
    includeStable: boolean = false
  ): Promise<FileHotspot[]> {
    const since = this.getDateSince(days);
    const hotspots: FileHotspot[] = [];

    // Get all changed files in the period
    const changedFiles = this.getChangedFiles(since);

    for (const file of changedFiles) {
      const hotspot = await this.getFileHotspot(file, true);
      if (hotspot) {
        hotspots.push(hotspot);
      }
    }

    // Sort by churn score (descending)
    hotspots.sort((a, b) => b.churnScore - a.churnScore);

    // Filter stable if requested
    if (!includeStable) {
      return hotspots
        .filter(h => h.churnScore > 20)
        .slice(0, limit);
    }

    return hotspots.slice(0, limit);
  }

  async getFileHotspot(filePath: string, includeHistory: boolean = true): Promise<FileHotspot | null> {
    const fullPath = path.join(this.repoPath, filePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    // Get commit history for the file
    const commits = this.getFileCommits(filePath);
    const authors = this.getFileAuthors(filePath);
    const metrics = this.getFileMetrics(filePath);

    // Calculate scores
    const churnScore = this.calculateChurnScore(commits.length, 90);
    const complexityScore = this.calculateComplexityScore(metrics);
    const bugProneness = this.calculateBugProneness(filePath, commits, authors.length);

    // Get trends if requested
    const trends: ChurnTrend[] = includeHistory ? this.getChurnTrends(filePath) : [];

    // Determine risk level
    const riskLevel = this.determineRiskLevel(churnScore, complexityScore, bugProneness);

    // Get last modified date
    let lastModified = new Date().toISOString();
    try {
      const output = execSync(`git log -1 --format=%aI -- "${filePath}"`, {
        cwd: this.repoPath,
        encoding: "utf-8"
      }).trim();
      if (output) lastModified = output;
    } catch {
      // Use current date
    }

    return {
      path: filePath,
      churnScore,
      complexityScore,
      bugProneness,
      riskLevel,
      changeFrequency: commits.length / 3, // per month (90 days)
      lastModified,
      authors,
      metrics,
      trends
    };
  }

  analyzeChurn(
    period: "week" | "month" | "quarter" | "year" = "month",
    groupBy: "file" | "directory" | "author" = "file"
  ): ChurnAnalysis {
    const days = this.periodToDays(period);
    const since = this.getDateSince(days);

    // Get all commits in period
    const commits = this.getCommitsInPeriod(since);
    const changedFiles = this.getChangedFiles(since);
    const authors = this.getAuthorsInPeriod(since);

    // Get hotspots
    const hotspots = changedFiles
      .map(f => this.getFileHotspotSync(f))
      .filter((h): h is FileHotspot => h !== null)
      .sort((a, b) => b.churnScore - a.churnScore)
      .slice(0, 20);

    // Categorize files
    const stableFiles = hotspots
      .filter(h => h.churnScore < 20)
      .map(h => h.path);
    const volatileFiles = hotspots
      .filter(h => h.churnScore > 60)
      .map(h => h.path);

    // Calculate trends
    const trends = this.calculateOverallTrends(changedFiles, commits.length, authors.length);

    // Get total files in repo
    let totalFiles = 0;
    try {
      const output = execSync(
        `find . -type f -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" | wc -l`,
        { cwd: this.repoPath, encoding: "utf-8", shell: "/bin/bash" }
      );
      totalFiles = parseInt(output.trim(), 10) || 0;
    } catch {
      totalFiles = changedFiles.length;
    }

    return {
      period: `Last ${days} days`,
      totalFiles,
      changedFiles: changedFiles.length,
      totalCommits: commits.length,
      totalAuthors: authors.length,
      hotspots,
      stableFiles,
      volatileFiles,
      trends
    };
  }

  private getFileHotspotSync(filePath: string): FileHotspot | null {
    const fullPath = path.join(this.repoPath, filePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const commits = this.getFileCommits(filePath);
    const authors = this.getFileAuthors(filePath);
    const metrics = this.getFileMetrics(filePath);

    const churnScore = this.calculateChurnScore(commits.length, 90);
    const complexityScore = this.calculateComplexityScore(metrics);
    const bugProneness = this.calculateBugProneness(filePath, commits, authors.length);
    const riskLevel = this.determineRiskLevel(churnScore, complexityScore, bugProneness);

    return {
      path: filePath,
      churnScore,
      complexityScore,
      bugProneness,
      riskLevel,
      changeFrequency: commits.length / 3,
      lastModified: new Date().toISOString(),
      authors,
      metrics,
      trends: []
    };
  }

  // ============================================================================
  // OWNERSHIP ANALYSIS
  // ============================================================================

  getOwnershipMap(targetPath?: string, minContributions: number = 3): OwnershipMap[] {
    const files = targetPath
      ? this.getFilesInPath(targetPath)
      : this.getAllFiles();

    const ownershipMaps: OwnershipMap[] = [];

    for (const file of files.slice(0, 100)) { // Limit for performance
      const contributors = this.getFileAuthors(file);
      const filteredContributors = contributors.filter(c => c.commits >= minContributions);

      if (filteredContributors.length === 0) continue;

      const primaryOwner = filteredContributors[0];
      const ownershipStrength = this.calculateOwnershipStrength(filteredContributors);

      ownershipMaps.push({
        file,
        primaryOwner: primaryOwner.name,
        ownershipStrength,
        contributors: filteredContributors,
        suggestedOwners: filteredContributors.slice(0, 3).map(c => c.name),
        domainArea: this.inferDomainArea(file)
      });
    }

    return ownershipMaps;
  }

  findOwners(files: string[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (const file of files) {
      const authors = this.getFileAuthors(file);
      result[file] = authors.slice(0, 3).map(a => a.name);
    }

    return result;
  }

  analyzeDomainAreas(depth: number = 2): DomainArea[] {
    const domains: Map<string, DomainArea> = new Map();

    // Get all directories at specified depth
    const directories = this.getDirectoriesAtDepth(depth);

    for (const dir of directories) {
      const files = this.getFilesInPath(dir);
      if (files.length === 0) continue;

      // Get all authors for this domain
      const authorCounts: Record<string, number> = {};
      let totalChurn = 0;

      for (const file of files) {
        const authors = this.getFileAuthors(file);
        for (const author of authors) {
          authorCounts[author.name] = (authorCounts[author.name] || 0) + author.commits;
        }
        const commits = this.getFileCommits(file);
        totalChurn += commits.length;
      }

      const sortedAuthors = Object.entries(authorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);

      const avgChurn = totalChurn / files.length;
      const stability = Math.max(0, 100 - avgChurn * 5);

      domains.set(dir, {
        name: dir,
        patterns: [`${dir}/**/*`],
        files,
        primaryOwners: sortedAuthors.slice(0, 3),
        stability,
        cohesion: this.calculateCohesion(files)
      });
    }

    return Array.from(domains.values())
      .sort((a, b) => b.files.length - a.files.length);
  }

  getTeamOwnership(teamMapping?: Record<string, string[]>): TeamOwnership[] {
    if (!teamMapping) {
      // Infer teams from email domains
      teamMapping = this.inferTeamsFromEmails();
    }

    const teamOwnership: TeamOwnership[] = [];

    for (const [team, members] of Object.entries(teamMapping)) {
      const ownedFiles: Set<string> = new Set();
      let totalCommits = 0;

      for (const file of this.getAllFiles().slice(0, 200)) {
        const authors = this.getFileAuthors(file);
        for (const author of authors) {
          if (members.includes(author.name) || members.includes(author.email)) {
            ownedFiles.add(file);
            totalCommits += author.commits;
          }
        }
      }

      const domains = this.analyzeDomainAreas(2)
        .filter(d => d.primaryOwners.some(o => members.includes(o)));

      teamOwnership.push({
        team,
        members,
        ownedFiles: ownedFiles.size,
        ownedAreas: domains,
        responsibility: 0, // Would need total files count
        activity: Math.min(100, totalCommits)
      });
    }

    return teamOwnership;
  }

  // ============================================================================
  // BUG ANALYSIS
  // ============================================================================

  findBugProneFiles(
    days: number = 180,
    limit: number = 20,
    bugPatterns: string[] = ["fix", "bug", "issue", "error", "crash", "hotfix"]
  ): BugProneFile[] {
    const since = this.getDateSince(days);
    const bugProneFiles: BugProneFile[] = [];

    // Find commits with bug-related messages
    const bugCommits = this.findBugFixCommits(since, bugPatterns);

    // Group by file
    const filesBugs: Record<string, number> = {};
    for (const commit of bugCommits) {
      const files = this.getFilesInCommit(commit);
      for (const file of files) {
        filesBugs[file] = (filesBugs[file] || 0) + 1;
      }
    }

    // Analyze each file
    for (const [file, bugCount] of Object.entries(filesBugs)) {
      const indicators = this.analyzeBugIndicators(file);
      const bugProneness = this.calculateFileBugProneness(bugCount, indicators);

      bugProneFiles.push({
        path: file,
        bugProneness,
        bugFixCommits: bugCount,
        recentBugs: this.countRecentBugs(file, 90, bugPatterns),
        indicators,
        suggestedActions: this.suggestBugFixActions(indicators)
      });
    }

    return bugProneFiles
      .sort((a, b) => b.bugProneness - a.bugProneness)
      .slice(0, limit);
  }

  analyzeBugIndicators(filePath: string): BugIndicator[] {
    const indicators: BugIndicator[] = [];
    const metrics = this.getFileMetrics(filePath);
    const authors = this.getFileAuthors(filePath);
    const commits = this.getFileCommits(filePath);
    const config = BUG_INDICATORS_CONFIG;

    // High churn
    const churnPerMonth = commits.length / 3;
    if (churnPerMonth > config.highChurnThreshold) {
      indicators.push({
        type: "high-churn",
        severity: churnPerMonth > 20 ? "critical" : "high",
        description: `High change frequency: ${churnPerMonth.toFixed(1)} commits/month`,
        value: churnPerMonth
      });
    }

    // Many authors
    if (authors.length > config.manyAuthorsThreshold) {
      indicators.push({
        type: "many-authors",
        severity: "medium",
        description: `Many contributors: ${authors.length} authors`,
        value: authors.length
      });
    }

    // High complexity
    if (metrics.cyclomaticComplexity > config.complexityThreshold) {
      indicators.push({
        type: "complex",
        severity: metrics.cyclomaticComplexity > 30 ? "high" : "medium",
        description: `High complexity: ${metrics.cyclomaticComplexity}`,
        value: metrics.cyclomaticComplexity
      });
    }

    // Large file
    if (metrics.lines > config.largeFileThreshold) {
      indicators.push({
        type: "large-file",
        severity: metrics.lines > 1000 ? "high" : "medium",
        description: `Large file: ${metrics.lines} lines`,
        value: metrics.lines
      });
    }

    return indicators;
  }

  // ============================================================================
  // RISK ANALYSIS
  // ============================================================================

  calculateRiskModel(
    scope: "full" | "changed" | "critical" = "full",
    baseBranch: string = "main"
  ): RiskModel {
    let files: string[];

    switch (scope) {
      case "changed":
        files = this.getChangedFilesFromBranch(baseBranch);
        break;
      case "critical":
        files = this.getCriticalFiles();
        break;
      default:
        files = this.getAllFiles().slice(0, 100);
    }

    const riskFactors: RiskFactor[] = [];
    let totalRisk = 0;

    // Analyze each risk category
    const churnRisk = this.analyzeChurnRisk(files);
    if (churnRisk) riskFactors.push(churnRisk);

    const complexityRisk = this.analyzeComplexityRisk(files);
    if (complexityRisk) riskFactors.push(complexityRisk);

    const ownershipRisk = this.analyzeOwnershipRisk(files);
    if (ownershipRisk) riskFactors.push(ownershipRisk);

    // Calculate overall risk
    for (const factor of riskFactors) {
      totalRisk += factor.riskScore * 0.33;
    }

    const riskLevel = this.riskScoreToLevel(totalRisk);

    return {
      overallRisk: Math.round(totalRisk),
      riskLevel,
      topRisks: riskFactors.sort((a, b) => b.riskScore - a.riskScore),
      recommendations: this.generateRiskRecommendations(riskFactors),
      riskTrend: "stable" // Would need historical data
    };
  }

  getRiskTrend(periods: number = 6, periodType: "week" | "month" = "month"): { period: string; risk: number }[] {
    const trends: { period: string; risk: number }[] = [];
    const daysPerPeriod = periodType === "week" ? 7 : 30;

    for (let i = periods - 1; i >= 0; i--) {
      const endDays = i * daysPerPeriod;
      const startDays = (i + 1) * daysPerPeriod;
      const periodLabel = this.getPeriodLabel(endDays, periodType);

      // Simple risk calculation based on churn in period
      const commits = this.getCommitsInPeriod(
        this.getDateSince(startDays),
        this.getDateSince(endDays)
      );

      const risk = Math.min(100, commits.length * 2);
      trends.push({ period: periodLabel, risk });
    }

    return trends;
  }

  identifyRiskFactors(changedFiles?: string[]): RiskFactor[] {
    const files = changedFiles || this.getChangedFilesFromBranch("main");
    const factors: RiskFactor[] = [];

    // Check for high-risk patterns
    const sensitivePatterns = [
      { pattern: /auth|security|password|secret/i, name: "Security-sensitive changes" },
      { pattern: /database|migration|schema/i, name: "Database changes" },
      { pattern: /config|env|settings/i, name: "Configuration changes" },
      { pattern: /api|endpoint|route/i, name: "API changes" }
    ];

    for (const { pattern, name } of sensitivePatterns) {
      const matchingFiles = files.filter(f => pattern.test(f));
      if (matchingFiles.length > 0) {
        factors.push({
          name,
          impact: 70,
          probability: 50,
          riskScore: 60,
          affectedFiles: matchingFiles,
          mitigation: `Review ${name.toLowerCase()} carefully`
        });
      }
    }

    return factors;
  }

  // ============================================================================
  // AUTHOR ANALYSIS
  // ============================================================================

  analyzeAuthorContributions(days: number = 365, minCommits: number = 5): AuthorContribution[] {
    const since = this.getDateSince(days);
    const authors: Map<string, AuthorContribution> = new Map();

    try {
      const log = execSync(
        `git log --since="${since}" --format="%an|%ae" --no-merges`,
        { cwd: this.repoPath, encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }
      );

      for (const line of log.split("\n")) {
        const [name, email] = line.split("|");
        if (!name) continue;

        if (!authors.has(email)) {
          authors.set(email, {
            name,
            email,
            commits: 0,
            linesAdded: 0,
            linesDeleted: 0,
            percentage: 0,
            lastContribution: "",
            isActive: false
          });
        }

        const author = authors.get(email)!;
        author.commits++;
      }
    } catch {
      return [];
    }

    // Filter by minCommits and calculate percentages
    const total = Array.from(authors.values()).reduce((sum, a) => sum + a.commits, 0);
    const result = Array.from(authors.values())
      .filter(a => a.commits >= minCommits)
      .map(a => ({
        ...a,
        percentage: Math.round((a.commits / total) * 100),
        isActive: a.commits > 0 // Would need more logic
      }))
      .sort((a, b) => b.commits - a.commits);

    return result;
  }

  getFileAuthors(filePath: string): AuthorContribution[] {
    const authors: Map<string, AuthorContribution> = new Map();

    try {
      const log = execSync(
        `git log --format="%an|%ae|%aI" --numstat -- "${filePath}"`,
        { cwd: this.repoPath, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
      );

      const lines = log.split("\n");
      let currentAuthor = { name: "", email: "", date: "" };

      for (const line of lines) {
        if (line.includes("|") && line.includes("@")) {
          const [name, email, date] = line.split("|");
          currentAuthor = { name, email, date };

          if (!authors.has(email)) {
            authors.set(email, {
              name,
              email,
              commits: 0,
              linesAdded: 0,
              linesDeleted: 0,
              percentage: 0,
              lastContribution: date,
              isActive: this.isRecentDate(date, 90)
            });
          }
          authors.get(email)!.commits++;
        } else if (line.match(/^\d+\t\d+/)) {
          const [added, deleted] = line.split("\t").map(n => parseInt(n, 10) || 0);
          if (authors.has(currentAuthor.email)) {
            const author = authors.get(currentAuthor.email)!;
            author.linesAdded += added;
            author.linesDeleted += deleted;
          }
        }
      }
    } catch {
      return [];
    }

    // Calculate percentages
    const total = Array.from(authors.values()).reduce((sum, a) => sum + a.commits, 0);
    return Array.from(authors.values())
      .map(a => ({ ...a, percentage: Math.round((a.commits / total) * 100) }))
      .sort((a, b) => b.commits - a.commits);
  }

  findInactiveOwners(inactiveDays: number = 90): { file: string; inactiveOwners: string[] }[] {
    const result: { file: string; inactiveOwners: string[] }[] = [];
    const since = this.getDateSince(inactiveDays);

    // Get active authors
    const activeAuthors = new Set<string>();
    try {
      const log = execSync(
        `git log --since="${since}" --format="%ae" --no-merges`,
        { cwd: this.repoPath, encoding: "utf-8" }
      );
      for (const email of log.split("\n")) {
        if (email.trim()) activeAuthors.add(email.trim());
      }
    } catch {
      return result;
    }

    // Check each file's owners
    for (const file of this.getAllFiles().slice(0, 50)) {
      const authors = this.getFileAuthors(file);
      const inactiveOwners = authors
        .filter(a => a.percentage > 20 && !activeAuthors.has(a.email))
        .map(a => a.name);

      if (inactiveOwners.length > 0) {
        result.push({ file, inactiveOwners });
      }
    }

    return result;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getDateSince(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split("T")[0];
  }

  private periodToDays(period: "week" | "month" | "quarter" | "year"): number {
    switch (period) {
      case "week": return 7;
      case "month": return 30;
      case "quarter": return 90;
      case "year": return 365;
    }
  }

  private getChangedFiles(since: string): string[] {
    try {
      const output = execSync(
        `git log --since="${since}" --name-only --format="" --no-merges | sort -u`,
        { cwd: this.repoPath, encoding: "utf-8", shell: "/bin/bash", maxBuffer: 50 * 1024 * 1024 }
      );
      return output.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  private getChangedFilesFromBranch(baseBranch: string): string[] {
    try {
      const output = execSync(
        `git diff --name-only origin/${baseBranch}...HEAD`,
        { cwd: this.repoPath, encoding: "utf-8" }
      );
      return output.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  private getFileCommits(filePath: string): string[] {
    try {
      const output = execSync(
        `git log --oneline -- "${filePath}"`,
        { cwd: this.repoPath, encoding: "utf-8" }
      );
      return output.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  private getCommitsInPeriod(since: string, until?: string): string[] {
    try {
      let cmd = `git log --since="${since}" --oneline --no-merges`;
      if (until) cmd += ` --until="${until}"`;
      const output = execSync(cmd, { cwd: this.repoPath, encoding: "utf-8" });
      return output.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  private getAuthorsInPeriod(since: string): string[] {
    try {
      const output = execSync(
        `git log --since="${since}" --format="%ae" --no-merges | sort -u`,
        { cwd: this.repoPath, encoding: "utf-8", shell: "/bin/bash" }
      );
      return output.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  private getFileMetrics(filePath: string): FileMetrics {
    const fullPath = path.join(this.repoPath, filePath);
    let lines = 0;
    let functions = 0;
    let classes = 0;

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      lines = content.split("\n").length;

      // Simple pattern matching for functions and classes
      functions = (content.match(/function\s+\w+|=>\s*{|async\s+\w+\s*\(/g) || []).length;
      classes = (content.match(/class\s+\w+/g) || []).length;
    } catch {
      // File not readable
    }

    return {
      lines,
      functions,
      classes,
      cyclomaticComplexity: Math.ceil(functions * 1.5),
      dependencies: 0,
      importedBy: 0,
      age: 0,
      avgCommitsPerMonth: 0,
      bugFixCommits: 0,
      refactorCommits: 0
    };
  }

  private getAllFiles(): string[] {
    try {
      const output = execSync(
        `git ls-files`,
        { cwd: this.repoPath, encoding: "utf-8" }
      );
      return output.trim().split("\n").filter(f =>
        f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".py") ||
        f.endsWith(".go") || f.endsWith(".java") || f.endsWith(".tsx") || f.endsWith(".jsx")
      );
    } catch {
      return [];
    }
  }

  private getFilesInPath(targetPath: string): string[] {
    try {
      const output = execSync(
        `git ls-files "${targetPath}"`,
        { cwd: this.repoPath, encoding: "utf-8" }
      );
      return output.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  private getDirectoriesAtDepth(depth: number): string[] {
    try {
      const output = execSync(
        `find . -mindepth ${depth} -maxdepth ${depth} -type d | grep -v node_modules | grep -v .git`,
        { cwd: this.repoPath, encoding: "utf-8", shell: "/bin/bash" }
      );
      return output.trim().split("\n")
        .filter(Boolean)
        .map(d => d.replace("./", ""));
    } catch {
      return [];
    }
  }

  private getCriticalFiles(): string[] {
    // Return files that match critical patterns
    const patterns = [
      "**/auth/**", "**/security/**", "**/config/**",
      "**/database/**", "**/api/**"
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      try {
        const output = execSync(
          `git ls-files "${pattern}"`,
          { cwd: this.repoPath, encoding: "utf-8" }
        );
        files.push(...output.trim().split("\n").filter(Boolean));
      } catch {
        continue;
      }
    }

    return [...new Set(files)];
  }

  private calculateChurnScore(commits: number, days: number): number {
    const commitsPerMonth = (commits / days) * 30;
    return Math.min(100, Math.round(commitsPerMonth * 10));
  }

  private calculateComplexityScore(metrics: FileMetrics): number {
    const lineScore = Math.min(50, metrics.lines / 20);
    const complexityScore = Math.min(50, metrics.cyclomaticComplexity * 3);
    return Math.round(lineScore + complexityScore);
  }

  private calculateBugProneness(filePath: string, commits: string[], authorCount: number): number {
    let score = 0;

    // Bug-related commits
    const bugCommits = commits.filter(c =>
      /fix|bug|issue|error|crash/i.test(c)
    ).length;
    score += bugCommits * 10;

    // High author count indicates potential knowledge gaps
    if (authorCount > 5) score += 15;
    if (authorCount > 10) score += 10;

    // High churn
    const churnScore = this.calculateChurnScore(commits.length, 90);
    if (churnScore > 50) score += 20;

    return Math.min(100, score);
  }

  private determineRiskLevel(churn: number, complexity: number, bugProneness: number): RiskLevel {
    const avgScore = (churn + complexity + bugProneness) / 3;

    if (avgScore >= 70) return "critical";
    if (avgScore >= 50) return "high";
    if (avgScore >= 30) return "medium";
    return "low";
  }

  private riskScoreToLevel(score: number): RiskLevel {
    if (score >= 70) return "critical";
    if (score >= 50) return "high";
    if (score >= 30) return "medium";
    return "low";
  }

  private getChurnTrends(filePath: string): ChurnTrend[] {
    const trends: ChurnTrend[] = [];

    // Get last 6 months of data
    for (let i = 0; i < 6; i++) {
      const endDays = i * 30;
      const startDays = (i + 1) * 30;
      const since = this.getDateSince(startDays);
      const until = this.getDateSince(endDays);

      try {
        const commits = execSync(
          `git log --since="${since}" --until="${until}" --oneline -- "${filePath}"`,
          { cwd: this.repoPath, encoding: "utf-8" }
        ).trim().split("\n").filter(Boolean).length;

        const category = this.categorizeChurn(commits);

        trends.push({
          period: this.getPeriodLabel(startDays, "month"),
          commits,
          linesChanged: 0,
          uniqueAuthors: 0,
          category
        });
      } catch {
        trends.push({
          period: this.getPeriodLabel(startDays, "month"),
          commits: 0,
          linesChanged: 0,
          uniqueAuthors: 0,
          category: "stable"
        });
      }
    }

    return trends.reverse();
  }

  private categorizeChurn(commitsPerMonth: number): ChurnCategory {
    if (commitsPerMonth <= CHURN_THRESHOLDS.stable) return "stable";
    if (commitsPerMonth <= CHURN_THRESHOLDS.evolving) return "evolving";
    if (commitsPerMonth <= CHURN_THRESHOLDS.volatile) return "volatile";
    return "chaotic";
  }

  private getPeriodLabel(daysAgo: number, type: "week" | "month"): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    if (type === "week") {
      return `Week of ${date.toISOString().split("T")[0]}`;
    }
    return date.toISOString().slice(0, 7); // YYYY-MM
  }

  private calculateOwnershipStrength(contributors: AuthorContribution[]): number {
    if (contributors.length === 0) return 0;
    if (contributors.length === 1) return 100;

    // Strong ownership if top contributor has > 50% of commits
    const topPercentage = contributors[0].percentage;
    if (topPercentage > 70) return 90;
    if (topPercentage > 50) return 70;
    if (topPercentage > 30) return 50;
    return 30;
  }

  private inferDomainArea(filePath: string): string | undefined {
    const parts = filePath.split("/");
    if (parts.length >= 2) {
      return parts.slice(0, 2).join("/");
    }
    return undefined;
  }

  private calculateCohesion(files: string[]): number {
    // Simple heuristic: files in same directory = higher cohesion
    const dirs = new Set(files.map(f => path.dirname(f)));
    return Math.max(0, 100 - (dirs.size - 1) * 20);
  }

  private inferTeamsFromEmails(): Record<string, string[]> {
    const teams: Record<string, string[]> = {};

    try {
      const log = execSync(
        `git log --format="%ae" --no-merges | sort -u`,
        { cwd: this.repoPath, encoding: "utf-8", shell: "/bin/bash" }
      );

      for (const email of log.split("\n").filter(Boolean)) {
        const domain = email.split("@")[1] || "unknown";
        if (!teams[domain]) teams[domain] = [];
        teams[domain].push(email);
      }
    } catch {
      // Ignore
    }

    return teams;
  }

  private findBugFixCommits(since: string, patterns: string[]): string[] {
    const patternRegex = patterns.join("|");
    try {
      const output = execSync(
        `git log --since="${since}" --oneline --no-merges --grep="${patternRegex}"`,
        { cwd: this.repoPath, encoding: "utf-8" }
      );
      return output.trim().split("\n").filter(Boolean).map(l => l.split(" ")[0]);
    } catch {
      return [];
    }
  }

  private getFilesInCommit(commitHash: string): string[] {
    try {
      const output = execSync(
        `git show --name-only --format="" ${commitHash}`,
        { cwd: this.repoPath, encoding: "utf-8" }
      );
      return output.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  private countRecentBugs(filePath: string, days: number, patterns: string[]): number {
    const since = this.getDateSince(days);
    const patternRegex = patterns.join("|");
    try {
      const output = execSync(
        `git log --since="${since}" --oneline --grep="${patternRegex}" -- "${filePath}"`,
        { cwd: this.repoPath, encoding: "utf-8" }
      );
      return output.trim().split("\n").filter(Boolean).length;
    } catch {
      return 0;
    }
  }

  private calculateFileBugProneness(bugCount: number, indicators: BugIndicator[]): number {
    let score = bugCount * 15;

    for (const indicator of indicators) {
      switch (indicator.severity) {
        case "critical": score += 30; break;
        case "high": score += 20; break;
        case "medium": score += 10; break;
        case "low": score += 5; break;
      }
    }

    return Math.min(100, score);
  }

  private suggestBugFixActions(indicators: BugIndicator[]): string[] {
    const actions: string[] = [];

    for (const indicator of indicators) {
      switch (indicator.type) {
        case "high-churn":
          actions.push("Consider stabilizing this file before adding new features");
          break;
        case "many-authors":
          actions.push("Establish clear ownership and review process");
          break;
        case "complex":
          actions.push("Refactor to reduce complexity");
          break;
        case "large-file":
          actions.push("Consider splitting into smaller modules");
          break;
      }
    }

    return [...new Set(actions)];
  }

  private analyzeChurnRisk(files: string[]): RiskFactor | null {
    let highChurnFiles = 0;

    for (const file of files) {
      const commits = this.getFileCommits(file);
      if (commits.length > 15) highChurnFiles++;
    }

    if (highChurnFiles === 0) return null;

    return {
      name: "High Churn",
      impact: 60,
      probability: 70,
      riskScore: Math.min(100, highChurnFiles * 20),
      affectedFiles: files.filter(f => this.getFileCommits(f).length > 15),
      mitigation: "Stabilize high-churn files before major changes"
    };
  }

  private analyzeComplexityRisk(files: string[]): RiskFactor | null {
    let complexFiles = 0;

    for (const file of files) {
      const metrics = this.getFileMetrics(file);
      if (metrics.cyclomaticComplexity > 15) complexFiles++;
    }

    if (complexFiles === 0) return null;

    return {
      name: "High Complexity",
      impact: 50,
      probability: 60,
      riskScore: Math.min(100, complexFiles * 25),
      affectedFiles: files.slice(0, 5),
      mitigation: "Refactor complex files to reduce cognitive load"
    };
  }

  private analyzeOwnershipRisk(files: string[]): RiskFactor | null {
    let orphanedFiles = 0;

    for (const file of files.slice(0, 20)) {
      const authors = this.getFileAuthors(file);
      const activeAuthors = authors.filter(a => a.isActive);
      if (activeAuthors.length === 0) orphanedFiles++;
    }

    if (orphanedFiles === 0) return null;

    return {
      name: "Ownership Gaps",
      impact: 40,
      probability: 50,
      riskScore: Math.min(100, orphanedFiles * 15),
      affectedFiles: [],
      mitigation: "Assign owners to orphaned files"
    };
  }

  private generateRiskRecommendations(factors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    for (const factor of factors) {
      recommendations.push(factor.mitigation);
    }

    if (factors.some(f => f.riskScore > 70)) {
      recommendations.push("Consider a focused risk reduction sprint");
    }

    return recommendations;
  }

  private calculateOverallTrends(
    changedFiles: string[],
    commits: number,
    authors: number
  ): OverallTrend {
    const churnRate = changedFiles.length > 0 ? commits / changedFiles.length : 0;

    // Get focus areas (top directories)
    const dirCounts: Record<string, number> = {};
    for (const file of changedFiles) {
      const dir = path.dirname(file).split("/")[0] || ".";
      dirCounts[dir] = (dirCounts[dir] || 0) + 1;
    }

    const focusAreas = Object.entries(dirCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dir]) => dir);

    const recommendations: string[] = [];
    if (churnRate > 5) {
      recommendations.push("High churn rate - consider stabilization");
    }
    if (authors < 2) {
      recommendations.push("Low bus factor - encourage knowledge sharing");
    }

    return {
      churnRate,
      churnTrend: "stable",
      teamActivity: "stable",
      focusAreas,
      recommendations
    };
  }

  private isRecentDate(dateStr: string, days: number): boolean {
    const date = new Date(dateStr);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    return date > threshold;
  }
}
