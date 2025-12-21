// Incremental Delivery Planner Types

export type DeliveryStrategy =
  | "feature-flag"      // Behind feature flags
  | "branch-by-abstraction"  // Abstraction layer first
  | "strangler-fig"     // Gradual replacement
  | "parallel-run"      // Run old and new simultaneously
  | "dark-launch";      // Deploy but don't expose

export type RolloutStage =
  | "internal"          // Internal testing only
  | "canary"            // Small % of users
  | "beta"              // Opt-in users
  | "gradual"           // Gradual percentage increase
  | "full";             // 100% rollout

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ChangeSet {
  id: string;
  files: FileChange[];
  estimatedLOC: number;
  affectedModules: string[];
  breakingChanges: BreakingChange[];
  dependencies: string[];
}

export interface FileChange {
  path: string;
  changeType: "add" | "modify" | "delete" | "rename";
  additions: number;
  deletions: number;
  module: string;
  isPublicAPI: boolean;
}

export interface BreakingChange {
  type: "api" | "schema" | "behavior" | "config" | "dependency";
  description: string;
  affectedConsumers: string[];
  migrationRequired: boolean;
  severity: RiskLevel;
}

export interface PRSlice {
  id: string;
  title: string;
  description: string;
  files: string[];
  order: number;
  dependencies: string[];  // IDs of PRs this depends on
  estimatedReviewTime: string;
  riskLevel: RiskLevel;
  testingStrategy: string;
  rollbackPlan: string;
}

export interface DeliveryPlan {
  id: string;
  name: string;
  strategy: DeliveryStrategy;
  totalChanges: number;
  slices: PRSlice[];
  featureFlags: FeatureFlag[];
  rolloutPlan: RolloutPlan;
  backwardsCompatibility: CompatibilityPlan;
  estimatedDuration: string;
  riskAssessment: RiskAssessment;
}

export interface FeatureFlag {
  name: string;
  description: string;
  type: "boolean" | "percentage" | "user-segment";
  defaultValue: string;
  targetedSlices: string[];  // PR slice IDs
  killSwitch: boolean;
  expirationDate?: string;
}

export interface RolloutPlan {
  stages: RolloutStageConfig[];
  rollbackTriggers: RollbackTrigger[];
  monitoringMetrics: string[];
  successCriteria: string[];
}

export interface RolloutStageConfig {
  stage: RolloutStage;
  percentage: number;
  duration: string;
  criteria: string[];
  autoAdvance: boolean;
}

export interface RollbackTrigger {
  metric: string;
  threshold: string;
  action: "alert" | "pause" | "rollback";
  severity: RiskLevel;
}

export interface CompatibilityPlan {
  apiVersioning: APIVersionStrategy;
  dataBackfill: DataBackfillPlan[];
  deprecationNotices: DeprecationNotice[];
  migrationScripts: MigrationScript[];
}

export interface APIVersionStrategy {
  strategy: "url-path" | "header" | "query-param";
  currentVersion: string;
  newVersion: string;
  sunsetDate?: string;
}

export interface DataBackfillPlan {
  table: string;
  script: string;
  estimatedRows: number;
  canRunOnline: boolean;
  rollbackScript: string;
}

export interface DeprecationNotice {
  item: string;
  type: "api" | "field" | "method" | "config";
  message: string;
  sunsetDate: string;
  replacement?: string;
}

export interface MigrationScript {
  name: string;
  type: "schema" | "data" | "config";
  upScript: string;
  downScript: string;
  order: number;
  idempotent: boolean;
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  factors: RiskFactor[];
  mitigations: string[];
  approvalRequired: string[];
}

export interface RiskFactor {
  factor: string;
  impact: RiskLevel;
  likelihood: RiskLevel;
  mitigation: string;
}

export interface SliceRecommendation {
  strategy: "by-module" | "by-layer" | "by-feature" | "by-risk";
  reason: string;
  estimatedPRs: number;
  maxPRSize: number;
}

export const DEFAULT_SLICE_CONFIG = {
  maxFilesPerPR: 15,
  maxLOCPerPR: 500,
  maxReviewTimeMinutes: 30,
  preferAtomicChanges: true,
  groupByModule: true,
  separateTests: false
};

export const ROLLOUT_DEFAULTS: Record<RolloutStage, RolloutStageConfig> = {
  internal: { stage: "internal", percentage: 0, duration: "2 days", criteria: ["all tests pass"], autoAdvance: false },
  canary: { stage: "canary", percentage: 1, duration: "1 day", criteria: ["error rate < 0.1%"], autoAdvance: true },
  beta: { stage: "beta", percentage: 10, duration: "3 days", criteria: ["no critical bugs"], autoAdvance: false },
  gradual: { stage: "gradual", percentage: 50, duration: "1 week", criteria: ["metrics stable"], autoAdvance: true },
  full: { stage: "full", percentage: 100, duration: "ongoing", criteria: ["rollout complete"], autoAdvance: false }
};
