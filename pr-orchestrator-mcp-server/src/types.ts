// PR/Branch Orchestrator Types

export type BranchType = "feature" | "bugfix" | "hotfix" | "release" | "refactor" | "chore";
export type PRSize = "xs" | "s" | "m" | "l" | "xl";
export type ReviewerType = "code-owner" | "domain-expert" | "team-member" | "ai-suggested";

export interface BranchNamingConfig {
  pattern: string;  // e.g., "{type}/{ticket}-{description}"
  prefixes: Record<BranchType, string>;
  maxLength: number;
  separator: string;
}

export interface BranchInfo {
  name: string;
  type: BranchType;
  ticket?: string;
  description: string;
  baseBranch: string;
  createdAt: string;
  commits: number;
  filesChanged: number;
}

export interface CodeOwner {
  pattern: string;
  owners: string[];
  team?: string;
  mandatory?: boolean;
}

export interface CodeOwnersConfig {
  owners: CodeOwner[];
  defaultOwners: string[];
  requireApprovalFrom: "any" | "all" | "majority";
}

export interface PRTemplate {
  name: string;
  description: string;
  template: string;
  conditions?: {
    branchType?: BranchType[];
    pathPatterns?: string[];
    minChanges?: number;
    maxChanges?: number;
  };
}

export interface PRMetadata {
  title: string;
  description: string;
  type: BranchType;
  ticket?: string;
  size: PRSize;
  labels: string[];
  reviewers: Reviewer[];
  checklist: ChecklistItem[];
  aiProvenance: AIProvenance;
}

export interface Reviewer {
  username: string;
  type: ReviewerType;
  reason: string;
  required: boolean;
}

export interface ChecklistItem {
  text: string;
  checked: boolean;
  required: boolean;
  category: "testing" | "documentation" | "security" | "review" | "deployment";
}

export interface AIProvenance {
  generatedBy: string;
  model: string;
  timestamp: string;
  sessionId?: string;
  confidence: number;
  humanReviewed: boolean;
  modifications: ProvenanceModification[];
}

export interface ProvenanceModification {
  file: string;
  type: "created" | "modified" | "deleted";
  aiGenerated: boolean;
  linesChanged: number;
  description: string;
}

export interface PRAnalysis {
  complexity: number;
  riskScore: number;
  testCoverage: number;
  impactedAreas: string[];
  suggestedReviewers: Reviewer[];
  concerns: PRConcern[];
  suggestions: string[];
}

export interface PRConcern {
  severity: "low" | "medium" | "high" | "critical";
  type: "security" | "performance" | "testing" | "architecture" | "documentation";
  file?: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export interface WorkflowConfig {
  branchNaming: BranchNamingConfig;
  codeOwners: CodeOwnersConfig;
  templates: PRTemplate[];
  labels: LabelConfig[];
  reviewPolicy: ReviewPolicy;
  mergePolicy: MergePolicy;
}

export interface LabelConfig {
  name: string;
  color: string;
  description: string;
  conditions?: {
    pathPatterns?: string[];
    sizeRange?: [PRSize, PRSize];
    branchTypes?: BranchType[];
  };
}

export interface ReviewPolicy {
  minReviewers: number;
  requireCodeOwner: boolean;
  dismissStaleReviews: boolean;
  requireBuildPass: boolean;
  requireTestPass: boolean;
}

export interface MergePolicy {
  allowedMethods: ("merge" | "squash" | "rebase")[];
  defaultMethod: "merge" | "squash" | "rebase";
  deleteBranchOnMerge: boolean;
  requireLinearHistory: boolean;
  autoMergeEnabled: boolean;
}

// Default configurations
export const DEFAULT_BRANCH_NAMING: BranchNamingConfig = {
  pattern: "{type}/{ticket}-{description}",
  prefixes: {
    feature: "feature",
    bugfix: "bugfix",
    hotfix: "hotfix",
    release: "release",
    refactor: "refactor",
    chore: "chore"
  },
  maxLength: 60,
  separator: "-"
};

export const DEFAULT_TEMPLATES: PRTemplate[] = [
  {
    name: "feature",
    description: "Standard feature PR template",
    template: `## Summary
{summary}

## Changes
{changes}

## Testing
{testing}

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Security considerations reviewed

## AI Provenance
{provenance}
`,
    conditions: { branchType: ["feature"] }
  },
  {
    name: "bugfix",
    description: "Bug fix PR template",
    template: `## Bug Description
{bug_description}

## Root Cause
{root_cause}

## Fix
{fix_description}

## Testing
{testing}

## Checklist
- [ ] Root cause identified
- [ ] Tests verify the fix
- [ ] No regression introduced

## AI Provenance
{provenance}
`,
    conditions: { branchType: ["bugfix", "hotfix"] }
  },
  {
    name: "refactor",
    description: "Refactoring PR template",
    template: `## Refactoring Summary
{summary}

## Motivation
{motivation}

## Changes
{changes}

## Impact
{impact}

## Checklist
- [ ] No functional changes
- [ ] All tests pass
- [ ] Performance verified

## AI Provenance
{provenance}
`,
    conditions: { branchType: ["refactor"] }
  }
];

export const SIZE_THRESHOLDS: Record<PRSize, { maxFiles: number; maxLines: number }> = {
  xs: { maxFiles: 5, maxLines: 50 },
  s: { maxFiles: 10, maxLines: 200 },
  m: { maxFiles: 20, maxLines: 500 },
  l: { maxFiles: 50, maxLines: 1000 },
  xl: { maxFiles: Infinity, maxLines: Infinity }
};

export const DEFAULT_LABELS: LabelConfig[] = [
  { name: "size/xs", color: "00ff00", description: "Extra small PR" },
  { name: "size/s", color: "7fff00", description: "Small PR" },
  { name: "size/m", color: "ffff00", description: "Medium PR" },
  { name: "size/l", color: "ff7f00", description: "Large PR" },
  { name: "size/xl", color: "ff0000", description: "Extra large PR - consider splitting" },
  { name: "ai-generated", color: "9b59b6", description: "AI-generated code" },
  { name: "needs-review", color: "1abc9c", description: "Needs code review" },
  { name: "security", color: "e74c3c", description: "Security-related changes" },
  { name: "breaking-change", color: "c0392b", description: "Breaking change" },
  { name: "documentation", color: "3498db", description: "Documentation only" }
];
