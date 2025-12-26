// Session Persistence Types

export type SessionStatus = "active" | "paused" | "completed" | "abandoned";
export type SnapshotTrigger = "auto" | "manual" | "phase-transition" | "error-recovery" | "checkpoint";

export interface Session {
  id: string;
  projectId: string;
  projectPath: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  metadata: SessionMetadata;
  snapshots: SessionSnapshot[];
}

export interface SessionMetadata {
  projectName: string;
  language: string;
  framework?: string;
  currentPhase: string;
  currentIteration: number;
  totalTasks: number;
  completedTasks: number;
  lastAction: string;
}

export interface SessionSnapshot {
  id: string;
  sessionId: string;
  trigger: SnapshotTrigger;
  createdAt: string;
  summary: string;

  // Project State
  projectState: ProjectStateSnapshot;

  // Code Context
  codeContext: CodeContextSnapshot;

  // AI Memory
  aiMemory: AIMemorySnapshot;

  // Workspace State
  workspaceState: WorkspaceStateSnapshot;
}

export interface ProjectStateSnapshot {
  phase: string;
  iteration: number;
  status: string;
  artifacts: ArtifactRef[];
  pendingDecisions: Decision[];
  recentReviews: ReviewSummary[];
}

export interface ArtifactRef {
  type: string;
  name: string;
  version: number;
  path?: string;
}

export interface Decision {
  id: string;
  type: "architecture" | "implementation" | "testing" | "deployment";
  question: string;
  context: string;
  options?: string[];
  resolved: boolean;
  resolution?: string;
  timestamp: string;
}

export interface ReviewSummary {
  reviewer: string;
  artifact: string;
  status: "approved" | "needs_revision" | "pending";
  keyPoints: string[];
  timestamp: string;
}

export interface CodeContextSnapshot {
  activeFiles: FileContext[];
  recentChanges: ChangeRecord[];
  hotPaths: string[];  // Frequently accessed paths
  importantSymbols: SymbolRef[];
}

export interface FileContext {
  path: string;
  lastAccessed: string;
  accessCount: number;
  relevanceScore: number;
  summary?: string;
}

export interface ChangeRecord {
  file: string;
  type: "created" | "modified" | "deleted";
  timestamp: string;
  summary: string;
  linesChanged: number;
}

export interface SymbolRef {
  name: string;
  type: "function" | "class" | "interface" | "type";
  file: string;
  importance: "high" | "medium" | "low";
}

export interface AIMemorySnapshot {
  recentConversations: ConversationSummary[];
  keyDecisions: KeyDecision[];
  pendingQuestions: PendingQuestion[];
  learnedPatterns: LearnedPattern[];
}

export interface ConversationSummary {
  timestamp: string;
  topic: string;
  outcome: string;
  keyPoints: string[];
}

export interface KeyDecision {
  id: string;
  topic: string;
  decision: string;
  rationale: string;
  timestamp: string;
  impact: "high" | "medium" | "low";
}

export interface PendingQuestion {
  id: string;
  question: string;
  context: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
}

export interface LearnedPattern {
  name: string;
  pattern: string;
  usage: string;
  examples: string[];
}

export interface WorkspaceStateSnapshot {
  branch: string;
  uncommittedChanges: string[];
  stagedFiles: string[];
  lastCommit: string;
  lastCommitMessage: string;
  testResults?: TestResultSnapshot;
  buildStatus?: BuildStatusSnapshot;
}

export interface TestResultSnapshot {
  passed: number;
  failed: number;
  skipped: number;
  lastRun: string;
  failedTests: string[];
}

export interface BuildStatusSnapshot {
  status: "success" | "failure" | "pending";
  lastBuild: string;
  errors?: string[];
}

export interface ResumptionContext {
  session: Session;
  snapshot: SessionSnapshot;
  summary: ResumptionSummary;
  suggestedActions: SuggestedAction[];
}

export interface ResumptionSummary {
  projectName: string;
  currentPhase: string;
  progress: string;  // e.g., "3/10 tasks completed"
  lastActivity: string;
  timeSinceLastActive: string;
  keyHighlights: string[];
}

export interface SuggestedAction {
  action: string;
  reason: string;
  priority: "high" | "medium" | "low";
  command?: string;
}

// Storage configuration
export const SESSION_CONFIG = {
  autoSnapshotInterval: 5 * 60 * 1000,  // 5 minutes
  maxSnapshotsPerSession: 50,
  snapshotRetentionDays: 30,
  maxActiveFilesTracked: 20,
  maxRecentChanges: 100,
  maxConversationHistory: 10
};
