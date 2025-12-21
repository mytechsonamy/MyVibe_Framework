// Hotspot & Ownership Analyzer Types

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ChurnCategory = "stable" | "evolving" | "volatile" | "chaotic";

export interface FileHotspot {
  path: string;
  churnScore: number;          // 0-100, higher = more changes
  complexityScore: number;     // 0-100, higher = more complex
  bugProneness: number;        // 0-100, likelihood of containing bugs
  riskLevel: RiskLevel;
  changeFrequency: number;     // commits per month
  lastModified: string;
  authors: AuthorContribution[];
  metrics: FileMetrics;
  trends: ChurnTrend[];
}

export interface AuthorContribution {
  name: string;
  email: string;
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  percentage: number;
  lastContribution: string;
  isActive: boolean;           // contributed in last 90 days
}

export interface FileMetrics {
  lines: number;
  functions: number;
  classes: number;
  cyclomaticComplexity: number;
  dependencies: number;
  importedBy: number;
  age: number;                 // days since creation
  avgCommitsPerMonth: number;
  bugFixCommits: number;
  refactorCommits: number;
}

export interface ChurnTrend {
  period: string;              // e.g., "2024-01", "2024-Q1"
  commits: number;
  linesChanged: number;
  uniqueAuthors: number;
  category: ChurnCategory;
}

export interface OwnershipMap {
  file: string;
  primaryOwner: string;
  ownershipStrength: number;   // 0-100, how clear is ownership
  contributors: AuthorContribution[];
  suggestedOwners: string[];
  domainArea?: string;
  team?: string;
}

export interface DomainArea {
  name: string;
  patterns: string[];
  files: string[];
  primaryOwners: string[];
  stability: number;           // 0-100, higher = more stable
  cohesion: number;            // 0-100, how related are the files
}

export interface BugProneFile {
  path: string;
  bugProneness: number;
  bugFixCommits: number;
  recentBugs: number;          // bugs in last 90 days
  indicators: BugIndicator[];
  suggestedActions: string[];
}

export interface BugIndicator {
  type: "high-churn" | "many-authors" | "complex" | "old-bugs" | "hotfix-target" | "large-file";
  severity: RiskLevel;
  description: string;
  value: number;
}

export interface RiskModel {
  overallRisk: number;         // 0-100
  riskLevel: RiskLevel;
  topRisks: RiskFactor[];
  recommendations: string[];
  riskTrend: "improving" | "stable" | "worsening";
}

export interface RiskFactor {
  name: string;
  impact: number;              // 0-100
  probability: number;         // 0-100
  riskScore: number;
  affectedFiles: string[];
  mitigation: string;
}

export interface ChurnAnalysis {
  period: string;
  totalFiles: number;
  changedFiles: number;
  totalCommits: number;
  totalAuthors: number;
  hotspots: FileHotspot[];
  stableFiles: string[];
  volatileFiles: string[];
  trends: OverallTrend;
}

export interface OverallTrend {
  churnRate: number;           // average changes per file
  churnTrend: "increasing" | "stable" | "decreasing";
  teamActivity: "growing" | "stable" | "shrinking";
  focusAreas: string[];        // directories with most activity
  recommendations: string[];
}

export interface TeamOwnership {
  team: string;
  members: string[];
  ownedFiles: number;
  ownedAreas: DomainArea[];
  responsibility: number;      // 0-100, portion of codebase
  activity: number;            // 0-100, recent activity level
}

// Default thresholds for analysis
export const CHURN_THRESHOLDS = {
  stable: 2,       // <= 2 commits/month
  evolving: 5,     // 3-5 commits/month
  volatile: 10,    // 6-10 commits/month
  chaotic: Infinity // > 10 commits/month
};

export const RISK_WEIGHTS = {
  churn: 0.25,
  complexity: 0.20,
  bugHistory: 0.25,
  authorCount: 0.15,
  age: 0.15
};

export const BUG_INDICATORS_CONFIG = {
  highChurnThreshold: 10,      // commits/month
  manyAuthorsThreshold: 5,     // unique authors
  complexityThreshold: 15,     // cyclomatic complexity
  largeFileThreshold: 500,     // lines
  recentBugWindow: 90          // days
};
