import { z } from "zod";

// ============================================================================
// SESSION MANAGEMENT SCHEMAS
// ============================================================================

export const CreateSessionSchema = z.object({
  projectPath: z.string().describe("Project workspace path"),
  projectName: z.string().describe("Project name"),
  metadata: z.object({
    language: z.string().optional(),
    framework: z.string().optional(),
    phase: z.string().optional()
  }).optional()
}).strict();

export const GetSessionSchema = z.object({
  sessionId: z.string().optional().describe("Session ID (default: latest for project)"),
  projectPath: z.string().optional().describe("Project path to find session")
}).strict();

export const ListSessionsSchema = z.object({
  projectPath: z.string().optional().describe("Filter by project"),
  status: z.enum(["active", "paused", "completed", "abandoned"]).optional(),
  limit: z.number().default(10)
}).strict();

export const UpdateSessionSchema = z.object({
  sessionId: z.string(),
  status: z.enum(["active", "paused", "completed", "abandoned"]).optional(),
  metadata: z.record(z.any()).optional()
}).strict();

// ============================================================================
// SNAPSHOT SCHEMAS
// ============================================================================

export const CreateSnapshotSchema = z.object({
  sessionId: z.string().optional().describe("Session ID (auto-detect if not provided)"),
  projectPath: z.string().optional().describe("Project path"),
  trigger: z.enum(["auto", "manual", "phase-transition", "error-recovery", "checkpoint"]).default("manual"),
  summary: z.string().optional().describe("Snapshot description")
}).strict();

export const GetSnapshotSchema = z.object({
  snapshotId: z.string().optional().describe("Specific snapshot"),
  sessionId: z.string().optional().describe("Latest from session")
}).strict();

export const ListSnapshotsSchema = z.object({
  sessionId: z.string(),
  limit: z.number().default(10)
}).strict();

// ============================================================================
// CONTEXT TRACKING SCHEMAS
// ============================================================================

export const TrackFileAccessSchema = z.object({
  sessionId: z.string().optional(),
  projectPath: z.string().optional(),
  filePath: z.string(),
  relevanceScore: z.number().min(0).max(100).optional()
}).strict();

export const TrackChangeSchema = z.object({
  sessionId: z.string().optional(),
  projectPath: z.string().optional(),
  file: z.string(),
  type: z.enum(["created", "modified", "deleted"]),
  summary: z.string(),
  linesChanged: z.number().optional()
}).strict();

export const RecordDecisionSchema = z.object({
  sessionId: z.string().optional(),
  projectPath: z.string().optional(),
  type: z.enum(["architecture", "implementation", "testing", "deployment"]),
  question: z.string(),
  context: z.string(),
  resolution: z.string().optional(),
  options: z.array(z.string()).optional()
}).strict();

export const RecordConversationSchema = z.object({
  sessionId: z.string().optional(),
  projectPath: z.string().optional(),
  topic: z.string(),
  outcome: z.string(),
  keyPoints: z.array(z.string())
}).strict();

// ============================================================================
// RESUMPTION SCHEMAS
// ============================================================================

export const ResumeSessionSchema = z.object({
  projectPath: z.string().describe("Project to resume"),
  snapshotId: z.string().optional().describe("Specific snapshot to resume from")
}).strict();

export const GetResumptionContextSchema = z.object({
  projectPath: z.string(),
  includeFullContext: z.boolean().default(false)
}).strict();

// ============================================================================
// CLEANUP SCHEMAS
// ============================================================================

export const CleanupSessionsSchema = z.object({
  olderThanDays: z.number().default(30),
  status: z.enum(["completed", "abandoned"]).optional(),
  dryRun: z.boolean().default(true)
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type GetSessionInput = z.infer<typeof GetSessionSchema>;
export type ListSessionsInput = z.infer<typeof ListSessionsSchema>;
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;
export type CreateSnapshotInput = z.infer<typeof CreateSnapshotSchema>;
export type GetSnapshotInput = z.infer<typeof GetSnapshotSchema>;
export type ListSnapshotsInput = z.infer<typeof ListSnapshotsSchema>;
export type TrackFileAccessInput = z.infer<typeof TrackFileAccessSchema>;
export type TrackChangeInput = z.infer<typeof TrackChangeSchema>;
export type RecordDecisionInput = z.infer<typeof RecordDecisionSchema>;
export type RecordConversationInput = z.infer<typeof RecordConversationSchema>;
export type ResumeSessionInput = z.infer<typeof ResumeSessionSchema>;
export type GetResumptionContextInput = z.infer<typeof GetResumptionContextSchema>;
export type CleanupSessionsInput = z.infer<typeof CleanupSessionsSchema>;
