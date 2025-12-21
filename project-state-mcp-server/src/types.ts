// Re-export Prisma types
export {
  ProjectStatus,
  PhaseType,
  PhaseStatus,
  ArtifactType,
  AgentType,
  TaskStatus,
  ConsensusStatus,
  QualityGateLevel,
  QualityGateStatus
} from "@prisma/client";

// Phase configuration
export interface PhaseConfig {
  type: string;
  maxIterations: number;
  requiredArtifacts: string[];
  exitCriteria: string[];
}

// Default phase configurations
export const PHASE_CONFIGS: Record<string, PhaseConfig> = {
  REQUIREMENTS: {
    type: "REQUIREMENTS",
    maxIterations: 10,
    requiredArtifacts: ["REQUIREMENTS", "USER_STORIES"],
    exitCriteria: [
      "All user stories have acceptance criteria",
      "NFRs are quantified",
      "Risk matrix complete",
      "All 3 AIs confirm no critical gaps"
    ]
  },
  ARCHITECTURE: {
    type: "ARCHITECTURE",
    maxIterations: 4,
    requiredArtifacts: ["ARCHITECTURE", "API_CONTRACTS", "DATA_MODEL"],
    exitCriteria: [
      "All NFRs addressed in design",
      "Trade-offs documented",
      "API contracts defined (OpenAPI)",
      "Data models complete",
      "All 3 AIs confirm architecture is sound"
    ]
  },
  PLANNING: {
    type: "PLANNING",
    maxIterations: 3,
    requiredArtifacts: ["EPIC_BREAKDOWN", "TASK_LIST"],
    exitCriteria: [
      "Each task ≤ 4 hours",
      "Dependencies mapped",
      "Each task assigned to agent type",
      "Parallel paths identified",
      "All 3 AIs confirm plan is executable"
    ]
  },
  DEVELOPMENT: {
    type: "DEVELOPMENT",
    maxIterations: 10,
    requiredArtifacts: ["CODE"],
    exitCriteria: [
      "All tasks completed",
      "All quality gates passed",
      "Code committed"
    ]
  },
  TESTING: {
    type: "TESTING",
    maxIterations: 5,
    requiredArtifacts: ["TEST_PLAN"],
    exitCriteria: [
      "Unit test coverage ≥ 80%",
      "Integration tests passing",
      "E2E tests passing",
      "Performance targets met",
      "No critical security issues"
    ]
  },
  DEPLOYMENT: {
    type: "DEPLOYMENT",
    maxIterations: 3,
    requiredArtifacts: ["DOCUMENTATION"],
    exitCriteria: [
      "Deployment successful",
      "Health checks passing",
      "Documentation complete"
    ]
  }
};

// AI Consensus input
export interface ConsensusInput {
  claudeApproved: boolean;
  claudeNotes: string;
  chatgptApproved: boolean;
  chatgptNotes: string;
  geminiApproved: boolean;
  geminiNotes: string;
}

// Iteration result
export interface IterationResult {
  iterationNumber: number;
  consensusReached: boolean;
  needsHumanApproval: boolean;
  feedback: string[];
  canProceed: boolean;
  maxIterationsReached: boolean;
}

// Phase transition result
export interface PhaseTransitionResult {
  success: boolean;
  fromPhase: string;
  toPhase: string | null;
  message: string;
  blockers?: string[];
}

// Project summary
export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  currentPhase: string;
  totalIterations: number;
  completedPhases: number;
  pendingTasks: number;
  completedTasks: number;
}
