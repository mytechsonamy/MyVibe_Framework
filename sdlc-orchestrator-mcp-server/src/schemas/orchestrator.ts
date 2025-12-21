import { z } from "zod";

// Initialize a new SDLC project with full setup
export const InitProjectSchema = z.object({
  name: z.string().min(1).max(100).describe("Project name (e.g., 'todo-list-api')"),
  description: z.string().describe("Brief project description"),
  techStack: z.array(z.string()).describe("Technologies (e.g., ['dotnet', 'postgresql', 'docker'])"),
  maxIterationsPerPhase: z.number().int().min(1).max(20).optional().describe("Max AI iterations per phase before human escalation (default: 10, can be changed in DB)"),
  nfrs: z.object({
    maxResponseTime: z.string().optional().describe("e.g., '200ms'"),
    concurrentUsers: z.number().optional().describe("e.g., 10000"),
    uptime: z.string().optional().describe("e.g., '99.9%'")
  }).optional().describe("Non-functional requirements")
}).strict();

// Get comprehensive project status
export const StatusSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID")
}).strict();

// Continue to next step (auto-determines what to do)
export const ContinueSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  feedback: z.string().optional().describe("Optional feedback/revision instructions")
}).strict();

// Run AI review cycle
export const ReviewCycleSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  artifactType: z.enum([
    "requirements", "architecture", "epic_breakdown", 
    "task_list", "code", "test_plan", "documentation"
  ]).describe("Type of artifact to review")
}).strict();

// Get sprint summary
export const SprintSummarySchema = z.object({
  projectId: z.string().uuid().describe("Project UUID"),
  sprintNumber: z.number().int().min(1).optional().describe("Specific sprint (default: current)")
}).strict();

// Parse user command
export const ParseCommandSchema = z.object({
  input: z.string().describe("User input to parse")
}).strict();

// Get next action recommendation
export const NextActionSchema = z.object({
  projectId: z.string().uuid().describe("Project UUID")
}).strict();

// Validate phase advancement
export const ValidateAdvanceSchema = z.object({
  projectId: z.string().describe("The project ID"),
  phaseState: z.object({
    status: z.string().optional(),
    currentIteration: z.number().optional(),
    maxIterations: z.number().optional(),
    latestIteration: z.object({
      iterationNumber: z.number().optional(),
      chatgptReview: z.string().optional(),
      geminiChallenge: z.string().optional(),
      consensusStatus: z.string().optional(),
      humanApproved: z.boolean().optional(),
      feedback: z.string().optional()
    }).optional()
  }).describe("Current phase state from state_get_phase"),
  projectState: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    currentPhase: z.string(),
    tasks: z.object({
      total: z.number().optional(),
      completed: z.number().optional(),
      pending: z.number().optional()
    }).optional(),
    qualityGates: z.array(z.object({
      taskId: z.string().optional(),
      level: z.string().optional(),
      passed: z.boolean().optional()
    })).optional(),
    artifacts: z.array(z.object({
      type: z.string().optional(),
      version: z.number().optional()
    })).optional()
  }).describe("Project state from state_get_project")
}).strict();

// Run AI review cycle
export const RunAIReviewSchema = z.object({
  projectId: z.string().describe("The project ID"),
  projectName: z.string().describe("The project name (for logging)"),
  artifactType: z.enum([
    "requirements", "architecture", "epic_breakdown",
    "task_list", "code", "test_plan", "documentation"
  ]).describe("Type of artifact to review"),
  artifactContent: z.string().describe("The artifact content to review"),
  currentPhase: z.string().describe("Current SDLC phase"),
  iterationNumber: z.number().describe("Current iteration number")
}).strict();

// Get agents for tech stack
export const GetAgentsSchema = z.object({
  techStack: z.array(z.string()).describe("Technology stack (e.g., ['dotnet', 'postgresql', 'react'])"),
  projectId: z.string().optional().describe("Project ID (optional, for generating registration sequence)"),
  workspacePath: z.string().optional().describe("Project workspace path to load project-specific agent definitions from docs/agents/*.md"),
  phase: z.enum([
    "REQUIREMENTS", "ARCHITECTURE", "PLANNING",
    "DEVELOPMENT", "TESTING", "DEPLOYMENT"
  ]).optional().describe("Filter agents by phase (optional)")
}).strict();

// Validate agent registration
export const ValidateAgentsSchema = z.object({
  registeredAgents: z.array(z.string()).describe("List of registered agent types from state_get_agents"),
  techStack: z.array(z.string()).describe("Project tech stack")
}).strict();

// Get agent context for task execution
export const GetAgentContextSchema = z.object({
  workspacePath: z.string().describe("Project workspace path"),
  agentType: z.string().describe("Agent type (e.g., BACKEND_NODE, FRONTEND_REACT)"),
  taskDescription: z.string().optional().describe("Task description to include in context")
}).strict();

// Generate phase documentation
export const GenerateDocsSchema = z.object({
  projectId: z.string().describe("The project ID"),
  projectName: z.string().describe("The project name"),
  phase: z.enum([
    "REQUIREMENTS", "ARCHITECTURE", "PLANNING",
    "DEVELOPMENT", "TESTING", "DEPLOYMENT"
  ]).describe("Current SDLC phase"),
  artifacts: z.array(z.object({
    type: z.string(),
    content: z.string(),
    version: z.number().optional()
  })).optional().describe("Artifacts created in this phase"),
  iterations: z.array(z.object({
    iterationNumber: z.number(),
    consensusStatus: z.string().optional(),
    chatgptFeedback: z.string().optional(),
    geminiFeedback: z.string().optional(),
    humanApproved: z.boolean().optional()
  })).optional().describe("Iteration history for the phase"),
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    status: z.string().optional(),
    agentType: z.string().optional(),
    epic: z.string().optional(),
    estimatedHours: z.number().optional(),
    actualHours: z.number().optional()
  })).optional().describe("Tasks (for DEVELOPMENT phase)"),
  qualityGates: z.array(z.object({
    level: z.string(),
    passed: z.boolean(),
    details: z.string().optional()
  })).optional().describe("Quality gate results (for TESTING phase)"),
  techStack: z.array(z.string()).describe("Project tech stack")
}).strict();

// Generate changelog
export const GenerateChangelogSchema = z.object({
  projectName: z.string().describe("The project name"),
  version: z.string().describe("Version number (e.g., '1.0.0')"),
  changes: z.array(z.object({
    type: z.enum(["added", "changed", "fixed", "removed"]).describe("Type of change"),
    description: z.string().describe("Description of the change")
  })).describe("List of changes")
}).strict();

// Export types
export type InitProjectInput = z.infer<typeof InitProjectSchema>;
export type StatusInput = z.infer<typeof StatusSchema>;
export type ContinueInput = z.infer<typeof ContinueSchema>;
export type ReviewCycleInput = z.infer<typeof ReviewCycleSchema>;
export type SprintSummaryInput = z.infer<typeof SprintSummarySchema>;
export type ParseCommandInput = z.infer<typeof ParseCommandSchema>;
export type NextActionInput = z.infer<typeof NextActionSchema>;
