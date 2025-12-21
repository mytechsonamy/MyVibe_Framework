import { z } from "zod";

// ============================================================================
// ENUMS AS ZOD
// ============================================================================

export const PhaseTypeSchema = z.enum([
  "REQUIREMENTS",
  "ARCHITECTURE", 
  "PLANNING",
  "DEVELOPMENT",
  "TESTING",
  "DEPLOYMENT"
]);

export const ArtifactTypeSchema = z.enum([
  "REQUIREMENTS",
  "USER_STORIES",
  "ARCHITECTURE",
  "API_CONTRACTS",
  "DATA_MODEL",
  "EPIC_BREAKDOWN",
  "TASK_LIST",
  "CODE",
  "TEST_PLAN",
  "DOCUMENTATION"
]);

export const AgentTypeSchema = z.enum([
  "BACKEND_DOTNET",
  "BACKEND_NODE",
  "BACKEND_PYTHON",
  "FRONTEND_REACT",
  "FRONTEND_MOBILE",
  "DATABASE",
  "DEVOPS",
  "QA_UNIT",
  "QA_INTEGRATION",
  "QA_E2E",
  "QA_PERFORMANCE",
  "SECURITY"
]);

export const TaskStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "BLOCKED"
]);

export const ConsensusStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "NEEDS_REVISION"
]);

export const QualityGateLevelSchema = z.enum([
  "L1_TASK_COMPLETION",
  "L2_UNIT_TESTING",
  "L3_INTEGRATION_TESTING",
  "L4_E2E_TESTING",
  "L5_PERFORMANCE_TESTING",
  "L6_SECURITY_SCAN",
  "L7_REGRESSION_TESTING"
]);

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200).describe("Project name"),
  description: z.string().optional().describe("Project description"),
  techStack: z.array(z.string()).optional().describe("Technology stack (e.g., ['dotnet', 'react', 'postgresql'])"),
  maxIterationsPerPhase: z.number().int().min(1).max(20).default(10).describe("Max iterations per phase before human escalation (can be updated in DB)")
}).strict();

export const GetProjectSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID")
}).strict();

// ============================================================================
// PHASE SCHEMAS
// ============================================================================

export const GetPhaseSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  phaseType: PhaseTypeSchema.optional().describe("Specific phase type (omit for current phase)")
}).strict();

export const StartPhaseSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  phaseType: PhaseTypeSchema.describe("Phase to start")
}).strict();

export const AdvancePhaseSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  force: z.boolean().default(false).describe("Force advance even without full consensus (requires human approval)")
}).strict();

export const UpdatePhaseMaxIterationsSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  phaseType: PhaseTypeSchema.optional().describe("Phase type to update (omit for current phase)"),
  maxIterations: z.number().int().min(1).max(50).describe("New max iterations value"),
  reason: z.string().optional().describe("Reason for increasing max iterations")
}).strict();

// ============================================================================
// ITERATION SCHEMAS
// ============================================================================

export const CreateIterationSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  claudeOutput: z.string().optional().describe("Claude's output for this iteration")
}).strict();

export const RecordReviewSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  iterationNumber: z.number().int().min(1).describe("Iteration number"),
  chatgptReview: z.string().describe("ChatGPT's review response"),
  geminiChallenge: z.string().describe("Gemini's challenge response")
}).strict();

export const RecordConsensusSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  iterationNumber: z.number().int().min(1).describe("Iteration number"),
  claudeApproved: z.boolean().describe("Claude's approval"),
  chatgptApproved: z.boolean().describe("ChatGPT's approval"),
  geminiApproved: z.boolean().describe("Gemini's approval"),
  notes: z.string().optional().describe("Consensus notes")
}).strict();

export const RecordHumanApprovalSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  iterationNumber: z.number().int().min(1).describe("Iteration number"),
  approved: z.boolean().describe("Human approval decision"),
  feedback: z.string().optional().describe("Human feedback"),
  approvedBy: z.string().optional().describe("Approver name/ID")
}).strict();

// ============================================================================
// ARTIFACT SCHEMAS
// ============================================================================

export const SaveArtifactSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  type: ArtifactTypeSchema.describe("Artifact type"),
  title: z.string().min(1).max(200).describe("Artifact title"),
  content: z.string().min(1).describe("Artifact content"),
  metadata: z.record(z.unknown()).optional().describe("Additional metadata")
}).strict();

export const GetArtifactSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  type: ArtifactTypeSchema.describe("Artifact type"),
  version: z.number().int().min(1).optional().describe("Specific version (omit for latest)")
}).strict();

export const GetArtifactsSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  type: ArtifactTypeSchema.optional().describe("Filter by artifact type")
}).strict();

// ============================================================================
// AGENT SCHEMAS
// ============================================================================

export const RegisterAgentSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  agentType: AgentTypeSchema.describe("Agent type"),
  name: z.string().min(1).max(100).describe("Agent display name"),
  techStack: z.array(z.string()).describe("Technologies this agent works with"),
  responsibilities: z.array(z.string()).describe("Agent responsibilities"),
  systemPrompt: z.string().describe("System prompt for AI when acting as this agent"),
  qualityGates: z.array(z.string()).describe("Quality checks agent must pass"),
  collaborators: z.array(z.string()).optional().describe("Agent IDs that can collaborate")
}).strict();

export const GetAgentsSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  agentType: AgentTypeSchema.optional().describe("Filter by agent type")
}).strict();

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  phaseType: PhaseTypeSchema.describe("Phase this task belongs to"),
  agentId: z.string().uuid().optional().describe("Assigned agent UUID"),
  title: z.string().min(1).max(200).describe("Task title"),
  description: z.string().describe("Task description"),
  estimatedHours: z.number().min(0.5).max(8).default(4).describe("Estimated hours (max 8)"),
  dependencies: z.array(z.string().uuid()).optional().describe("Task UUIDs this depends on")
}).strict();

export const UpdateTaskSchema = z.object({
  taskId: z.string().uuid().describe("Task UUID"),
  status: TaskStatusSchema.optional().describe("New status"),
  output: z.string().optional().describe("Task output/result"),
  errorOutput: z.string().optional().describe("Error output if failed"),
  actualHours: z.number().min(0).optional().describe("Actual hours spent")
}).strict();

export const GetTasksSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  phaseType: PhaseTypeSchema.optional().describe("Filter by phase"),
  status: TaskStatusSchema.optional().describe("Filter by status")
}).strict();

// ============================================================================
// QUALITY GATE SCHEMAS
// ============================================================================

export const RunQualityGateSchema = z.object({
  taskId: z.string().uuid().describe("Task UUID"),
  level: QualityGateLevelSchema.describe("Quality gate level"),
  passed: z.boolean().describe("Whether the gate passed"),
  details: z.string().optional().describe("Gate execution details (JSON)")
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type GetProjectInput = z.infer<typeof GetProjectSchema>;
export type GetPhaseInput = z.infer<typeof GetPhaseSchema>;
export type StartPhaseInput = z.infer<typeof StartPhaseSchema>;
export type AdvancePhaseInput = z.infer<typeof AdvancePhaseSchema>;
export type UpdatePhaseMaxIterationsInput = z.infer<typeof UpdatePhaseMaxIterationsSchema>;
export type CreateIterationInput = z.infer<typeof CreateIterationSchema>;
export type RecordReviewInput = z.infer<typeof RecordReviewSchema>;
export type RecordConsensusInput = z.infer<typeof RecordConsensusSchema>;
export type RecordHumanApprovalInput = z.infer<typeof RecordHumanApprovalSchema>;
export type SaveArtifactInput = z.infer<typeof SaveArtifactSchema>;
export type GetArtifactInput = z.infer<typeof GetArtifactSchema>;
export type GetArtifactsInput = z.infer<typeof GetArtifactsSchema>;
export type RegisterAgentInput = z.infer<typeof RegisterAgentSchema>;
export type GetAgentsInput = z.infer<typeof GetAgentsSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type GetTasksInput = z.infer<typeof GetTasksSchema>;
export type RunQualityGateInput = z.infer<typeof RunQualityGateSchema>;
