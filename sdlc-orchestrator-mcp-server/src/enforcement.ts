/**
 * SDLC Enforcement Module
 *
 * Enforces phase transition rules:
 * 1. AI Review must be completed (ChatGPT + Gemini)
 * 2. Consensus must be reached
 * 3. Human approval must be recorded
 * 4. Quality gates must pass (for DEVELOPMENT/TESTING)
 */

import { PhaseType, PHASE_CONFIGS } from "./workflow.js";

// Phase transition prerequisites
export interface PhasePrerequisites {
  aiReviewRequired: boolean;
  consensusRequired: boolean;
  humanApprovalRequired: boolean;
  qualityGatesRequired: string[];
  artifactsRequired: string[];
}

// Validation result
export interface ValidationResult {
  canAdvance: boolean;
  blockers: string[];
  warnings: string[];
  checksPerformed: CheckResult[];
}

export interface CheckResult {
  check: string;
  passed: boolean;
  details: string;
}

// Phase-specific prerequisites
export const PHASE_PREREQUISITES: Record<PhaseType, PhasePrerequisites> = {
  REQUIREMENTS: {
    aiReviewRequired: true,
    consensusRequired: true,
    humanApprovalRequired: true,
    qualityGatesRequired: [],
    artifactsRequired: ["REQUIREMENTS", "USER_STORIES"]
  },
  ARCHITECTURE: {
    aiReviewRequired: true,
    consensusRequired: true,
    humanApprovalRequired: true,
    qualityGatesRequired: [],
    artifactsRequired: ["ARCHITECTURE", "API_CONTRACTS", "DATA_MODEL"]
  },
  PLANNING: {
    aiReviewRequired: true,
    consensusRequired: true,
    humanApprovalRequired: true,
    qualityGatesRequired: [],
    artifactsRequired: ["EPIC_BREAKDOWN", "TASK_LIST"]
  },
  DEVELOPMENT: {
    aiReviewRequired: false,
    consensusRequired: false,
    humanApprovalRequired: false,
    qualityGatesRequired: ["L1_TASK_COMPLETION", "L2_UNIT_TESTING"],
    artifactsRequired: ["CODE"]
  },
  TESTING: {
    aiReviewRequired: false,
    consensusRequired: false,
    humanApprovalRequired: true,
    qualityGatesRequired: [
      "L3_INTEGRATION_TESTING",
      "L4_E2E_TESTING",
      "L5_PERFORMANCE_TESTING",
      "L6_SECURITY_SCAN"
    ],
    artifactsRequired: ["TEST_PLAN"]
  },
  DEPLOYMENT: {
    aiReviewRequired: false,
    consensusRequired: false,
    humanApprovalRequired: true,
    qualityGatesRequired: [],
    artifactsRequired: ["DOCUMENTATION"]
  }
};

// Phase state interface (from state_get_phase response)
export interface PhaseState {
  status: string;
  currentIteration: number;
  maxIterations: number;
  latestIteration?: {
    iterationNumber: number;
    chatgptReview?: string;
    geminiChallenge?: string;
    consensusStatus?: string;
    humanApproved?: boolean;
    feedback?: string;
  };
}

// Project state interface
export interface ProjectState {
  id: string;
  name: string;
  currentPhase: PhaseType;
  phases: Record<string, {
    status: string;
    currentIteration: number;
  }>;
  tasks?: {
    total: number;
    completed: number;
    pending: number;
  };
  qualityGates?: {
    taskId: string;
    level: string;
    passed: boolean;
  }[];
  artifacts?: {
    type: string;
    version: number;
  }[];
}

/**
 * Validate if phase can be advanced
 */
export function validatePhaseAdvancement(
  currentPhase: PhaseType,
  phaseState: PhaseState,
  projectState: ProjectState
): ValidationResult {
  const prerequisites = PHASE_PREREQUISITES[currentPhase];
  const config = PHASE_CONFIGS[currentPhase];
  const checks: CheckResult[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Check 1: Phase must have an iteration
  const hasIteration = phaseState.latestIteration !== undefined &&
                       phaseState.latestIteration !== null;
  checks.push({
    check: "Iteration exists",
    passed: hasIteration,
    details: hasIteration
      ? `Iteration ${phaseState.currentIteration} exists`
      : "No iteration created for this phase"
  });
  if (!hasIteration) {
    blockers.push("No iteration has been created for this phase. Create an iteration first.");
  }

  // Check 2: AI Review (if required)
  if (prerequisites.aiReviewRequired) {
    const hasChatGPTReview = phaseState.latestIteration?.chatgptReview !== undefined &&
                              phaseState.latestIteration?.chatgptReview !== null;
    const hasGeminiChallenge = phaseState.latestIteration?.geminiChallenge !== undefined &&
                                phaseState.latestIteration?.geminiChallenge !== null;

    checks.push({
      check: "ChatGPT Review",
      passed: hasChatGPTReview,
      details: hasChatGPTReview
        ? "ChatGPT review completed"
        : "ChatGPT review not performed"
    });

    checks.push({
      check: "Gemini Challenge",
      passed: hasGeminiChallenge,
      details: hasGeminiChallenge
        ? "Gemini challenge completed"
        : "Gemini challenge not performed"
    });

    if (!hasChatGPTReview) {
      blockers.push("ChatGPT review has not been performed. Run ai_review_artifact first.");
    }
    if (!hasGeminiChallenge) {
      blockers.push("Gemini challenge has not been performed. Run ai_challenge_artifact first.");
    }
  }

  // Check 3: Consensus (if required)
  if (prerequisites.consensusRequired) {
    const consensusStatus = phaseState.latestIteration?.consensusStatus;
    const consensusApproved = consensusStatus === "APPROVED";

    checks.push({
      check: "AI Consensus",
      passed: consensusApproved,
      details: consensusApproved
        ? "All AIs approved the artifact"
        : `Consensus status: ${consensusStatus || "NOT_CHECKED"}`
    });

    if (!consensusApproved) {
      if (consensusStatus === "NEEDS_REVISION") {
        blockers.push("Consensus not reached. AI feedback needs to be addressed before proceeding.");
      } else if (consensusStatus === "REJECTED") {
        blockers.push("Artifact was rejected by AIs. Major revision required.");
      } else {
        blockers.push("Consensus has not been checked. Run ai_check_consensus first.");
      }
    }
  }

  // Check 4: Human Approval (if required)
  if (prerequisites.humanApprovalRequired) {
    const humanApproved = phaseState.latestIteration?.humanApproved === true;

    checks.push({
      check: "Human Approval",
      passed: humanApproved,
      details: humanApproved
        ? "Human approval received"
        : "Human approval pending"
    });

    if (!humanApproved) {
      blockers.push("Human approval is required before advancing. Ask user to approve with 'onayla' command.");
    }
  }

  // Check 5: Required Artifacts
  const projectArtifacts = projectState.artifacts || [];
  for (const requiredArtifact of prerequisites.artifactsRequired) {
    const hasArtifact = projectArtifacts.some(a => a.type === requiredArtifact);

    checks.push({
      check: `Artifact: ${requiredArtifact}`,
      passed: hasArtifact,
      details: hasArtifact
        ? `${requiredArtifact} artifact saved`
        : `${requiredArtifact} artifact missing`
    });

    if (!hasArtifact) {
      blockers.push(`Required artifact "${requiredArtifact}" has not been saved.`);
    }
  }

  // Check 6: Quality Gates (if required)
  if (prerequisites.qualityGatesRequired.length > 0) {
    const qualityGates = projectState.qualityGates || [];

    for (const requiredGate of prerequisites.qualityGatesRequired) {
      // Check if gate was run and passed
      const gateResults = qualityGates.filter(g => g.level === requiredGate);
      const allPassed = gateResults.length > 0 && gateResults.every(g => g.passed);

      checks.push({
        check: `Quality Gate: ${requiredGate}`,
        passed: allPassed,
        details: allPassed
          ? `${requiredGate} passed`
          : gateResults.length === 0
            ? `${requiredGate} not executed`
            : `${requiredGate} failed`
      });

      if (!allPassed) {
        if (gateResults.length === 0) {
          warnings.push(`Quality gate "${requiredGate}" has not been run.`);
        } else {
          blockers.push(`Quality gate "${requiredGate}" failed. Fix issues before proceeding.`);
        }
      }
    }
  }

  // Check 7: All tasks completed (for DEVELOPMENT phase)
  if (currentPhase === "DEVELOPMENT") {
    const tasks = projectState.tasks;
    const allTasksComplete = tasks && tasks.pending === 0 && tasks.completed > 0;

    checks.push({
      check: "All Tasks Completed",
      passed: allTasksComplete || false,
      details: tasks
        ? `${tasks.completed}/${tasks.total} tasks completed, ${tasks.pending} pending`
        : "No task information available"
    });

    if (!allTasksComplete) {
      blockers.push(`Not all tasks are completed. ${tasks?.pending || 0} tasks still pending.`);
    }
  }

  // Check 8: Max iterations not exceeded (warning)
  // Use phaseState.maxIterations (from DB) instead of config.maxIterations (hardcoded)
  const effectiveMaxIterations = phaseState.maxIterations || config.maxIterations;
  if (phaseState.currentIteration >= effectiveMaxIterations) {
    warnings.push(
      `Maximum iterations (${effectiveMaxIterations}) reached. ` +
      `Options: 1) Use state_update_phase_max_iterations to increase limit, ` +
      `2) Use state_advance_phase with force=true to override, ` +
      `3) Provide human direction for revision.`
    );
  }

  return {
    canAdvance: blockers.length === 0,
    blockers,
    warnings,
    checksPerformed: checks
  };
}

/**
 * Generate enforcement report
 */
export function generateEnforcementReport(
  currentPhase: PhaseType,
  validation: ValidationResult
): string {
  const config = PHASE_CONFIGS[currentPhase];

  let report = `## Phase Advancement Check: ${config.nameTr} (${currentPhase})\n\n`;

  // Status
  if (validation.canAdvance) {
    report += `### Status: ✅ READY TO ADVANCE\n\n`;
  } else {
    report += `### Status: ❌ BLOCKED\n\n`;
  }

  // Checks table
  report += `### Checks Performed\n\n`;
  report += `| Check | Status | Details |\n`;
  report += `|-------|--------|--------|\n`;
  for (const check of validation.checksPerformed) {
    const status = check.passed ? "✅" : "❌";
    report += `| ${check.check} | ${status} | ${check.details} |\n`;
  }
  report += `\n`;

  // Blockers
  if (validation.blockers.length > 0) {
    report += `### Blockers\n\n`;
    for (const blocker of validation.blockers) {
      report += `- ❌ ${blocker}\n`;
    }
    report += `\n`;
  }

  // Warnings
  if (validation.warnings.length > 0) {
    report += `### Warnings\n\n`;
    for (const warning of validation.warnings) {
      report += `- ⚠️ ${warning}\n`;
    }
    report += `\n`;
  }

  // Next steps
  if (!validation.canAdvance) {
    report += `### Required Actions\n\n`;
    report += `Complete the following before phase can advance:\n\n`;

    validation.blockers.forEach((blocker, i) => {
      report += `${i + 1}. ${blocker}\n`;
    });
  }

  return report;
}

/**
 * Get required actions for phase advancement
 */
export function getRequiredActions(
  currentPhase: PhaseType,
  validation: ValidationResult
): string[] {
  const actions: string[] = [];

  for (const check of validation.checksPerformed) {
    if (!check.passed) {
      switch (check.check) {
        case "Iteration exists":
          actions.push("state_create_iteration");
          break;
        case "ChatGPT Review":
          actions.push("ai_review_artifact");
          break;
        case "Gemini Challenge":
          actions.push("ai_challenge_artifact");
          break;
        case "AI Consensus":
          actions.push("ai_check_consensus → state_record_consensus");
          break;
        case "Human Approval":
          actions.push("Ask user: 'onayla' → state_record_human_approval");
          break;
        case "All Tasks Completed":
          actions.push("Complete remaining tasks");
          break;
        default:
          if (check.check.startsWith("Artifact:")) {
            actions.push(`state_save_artifact (${check.check.replace("Artifact: ", "")})`);
          }
          if (check.check.startsWith("Quality Gate:")) {
            actions.push(`state_run_quality_gate (${check.check.replace("Quality Gate: ", "")})`);
          }
      }
    }
  }

  return actions;
}
