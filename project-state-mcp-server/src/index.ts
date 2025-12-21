import { initLogger } from './services/logger.js';
const logger = initLogger('project-state');
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getDb, disconnectDb, checkDbConnection } from "./services/db.js";
import { PHASE_CONFIGS, ConsensusStatus, PhaseStatus, PhaseType } from "./types.js";
import {
  CreateProjectSchema,
  GetProjectSchema,
  GetPhaseSchema,
  StartPhaseSchema,
  AdvancePhaseSchema,
  UpdatePhaseMaxIterationsSchema,
  CreateIterationSchema,
  RecordReviewSchema,
  RecordConsensusSchema,
  RecordHumanApprovalSchema,
  SaveArtifactSchema,
  GetArtifactSchema,
  GetArtifactsSchema,
  RegisterAgentSchema,
  GetAgentsSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  GetTasksSchema,
  RunQualityGateSchema
} from "./schemas/state.js";

// Create MCP Server
const server = new McpServer({
  name: "project-state-mcp-server",
  version: "1.0.0"
});

// Helper to get current phase
async function getCurrentPhase(projectId: string) {
  const db = getDb();
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      phases: {
        where: { type: undefined }, // Will be overwritten
        include: { iterations: true }
      }
    }
  });

  if (!project) return null;

  const phase = await db.phase.findUnique({
    where: {
      projectId_type: {
        projectId,
        type: project.currentPhaseType
      }
    },
    include: { iterations: { orderBy: { number: "desc" }, take: 1 } }
  });

  return { project, phase };
}

// ============================================================================
// PROJECT TOOLS
// ============================================================================

server.tool(
  "state_create_project",
  "Create a new SDLC project with initial configuration",
  CreateProjectSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const project = await db.project.create({
        data: {
          name: params.name,
          description: params.description,
          techStack: params.techStack || [],
          maxIterationsPerPhase: params.maxIterationsPerPhase || 5,
          // Create all phases upfront
          phases: {
            create: Object.keys(PHASE_CONFIGS).map(type => ({
              type: type as PhaseType,
              maxIterations: PHASE_CONFIGS[type].maxIterations
            }))
          }
        },
        include: { phases: true }
      });

      // 📊 LOG: Project created
      logger.logProjectCreated(project.id, project.name, params.techStack || []);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            project: {
              id: project.id,
              name: project.name,
              status: project.status,
              currentPhase: project.currentPhaseType,
              phases: project.phases.map(p => ({ type: p.type, status: p.status }))
            },
            message: `Project "${project.name}" created successfully. Start with REQUIREMENTS phase.`
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error('error', { message: `Failed to create project: ${error}` });
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }],
        isError: true
      };
    }
  }
);

server.tool(
  "state_get_project",
  "Get project status and summary",
  GetProjectSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const project = await db.project.findUnique({
        where: { id: params.projectId },
        include: {
          phases: { include: { iterations: true, tasks: true } },
          artifacts: { orderBy: { version: "desc" } },
          agents: true
        }
      });

      if (!project) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: "Project not found" }) }],
          isError: true
        };
      }

      const currentPhase = project.phases.find(p => p.type === project.currentPhaseType);
      const totalTasks = project.phases.reduce((sum, p) => sum + p.tasks.length, 0);
      const completedTasks = project.phases.reduce((sum, p) => sum + p.tasks.filter(t => t.status === "COMPLETED").length, 0);

      // 📊 LOG: Phase status for dashboard
      if (currentPhase) {
        logger.logPhaseStatus(
          project.id,
          project.name,
          project.currentPhaseType,
          currentPhase.currentIteration,
          currentPhase.maxIterations,
          currentPhase.status
        );

        // Log phase progress for each phase
        for (const phase of project.phases) {
          const phaseTasks = phase.tasks.length;
          const phaseCompleted = phase.tasks.filter(t => t.status === "COMPLETED").length;
          const progressPercent = phaseTasks > 0 ? Math.round((phaseCompleted / phaseTasks) * 100) : (phase.status === "COMPLETED" ? 100 : 0);

          logger.logPhaseProgress(
            project.id,
            project.name,
            phase.type,
            progressPercent,
            phaseCompleted,
            phaseTasks
          );
        }
      }

      const summary = {
        id: project.id,
        name: project.name,
        status: project.status,
        currentPhase: project.currentPhaseType,
        techStack: project.techStack,
        phases: project.phases.map(p => ({
          type: p.type,
          status: p.status,
          iteration: p.currentIteration,
          maxIterations: p.maxIterations,
          taskCount: p.tasks.length,
          completedTasks: p.tasks.filter(t => t.status === "COMPLETED").length
        })),
        artifactCount: project.artifacts.length,
        agentCount: project.agents.length,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      };

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, project: summary }, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }],
        isError: true
      };
    }
  }
);

// ============================================================================
// PHASE TOOLS
// ============================================================================

server.tool(
  "state_get_phase",
  "Get current or specific phase status with iteration details",
  GetPhaseSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const project = await db.project.findUnique({ where: { id: params.projectId } });
      if (!project) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Project not found" }) }], isError: true };
      }

      const phaseType = params.phaseType || project.currentPhaseType;
      const phase = await db.phase.findUnique({
        where: { projectId_type: { projectId: params.projectId, type: phaseType } },
        include: {
          iterations: { orderBy: { number: "desc" } },
          tasks: { include: { qualityGates: true } }
        }
      });

      if (!phase) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Phase not found" }) }], isError: true };
      }

      const config = PHASE_CONFIGS[phase.type];
      const latestIteration = phase.iterations[0];

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            phase: {
              type: phase.type,
              status: phase.status,
              currentIteration: phase.currentIteration,
              maxIterations: phase.maxIterations,
              iterationsRemaining: phase.maxIterations - phase.currentIteration,
              config: {
                requiredArtifacts: config.requiredArtifacts,
                exitCriteria: config.exitCriteria
              },
              latestIteration: latestIteration ? {
                number: latestIteration.number,
                consensusStatus: latestIteration.consensusStatus,
                humanApproved: latestIteration.humanApproved
              } : null,
              tasks: {
                total: phase.tasks.length,
                pending: phase.tasks.filter(t => t.status === "PENDING").length,
                inProgress: phase.tasks.filter(t => t.status === "IN_PROGRESS").length,
                completed: phase.tasks.filter(t => t.status === "COMPLETED").length,
                failed: phase.tasks.filter(t => t.status === "FAILED").length
              }
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "state_start_phase",
  "Start a specific phase (sets status to IN_PROGRESS)",
  StartPhaseSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const project = await db.project.findUnique({ where: { id: params.projectId } });

      const phase = await db.phase.update({
        where: { projectId_type: { projectId: params.projectId, type: params.phaseType } },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          currentIteration: 1
        }
      });

      // Update project's current phase
      await db.project.update({
        where: { id: params.projectId },
        data: { currentPhaseType: params.phaseType }
      });

      // 📊 LOG: Phase started
      logger.logPhaseStarted(
        params.projectId,
        project?.name || 'Unknown',
        params.phaseType,
        phase.maxIterations
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            phase: { type: phase.type, status: phase.status, iteration: phase.currentIteration },
            message: `Phase ${phase.type} started. Begin iteration 1.`
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "state_advance_phase",
  "Advance to next phase (requires consensus or human approval)",
  AdvancePhaseSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const project = await db.project.findUnique({ where: { id: params.projectId } });
      if (!project) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Project not found" }) }], isError: true };
      }

      const currentPhase = await db.phase.findUnique({
        where: { projectId_type: { projectId: params.projectId, type: project.currentPhaseType } },
        include: { iterations: { orderBy: { number: "desc" }, take: 1 } }
      });

      if (!currentPhase) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Current phase not found" }) }], isError: true };
      }

      // Check if consensus reached or human approved
      const latestIteration = currentPhase.iterations[0];
      const canAdvance = params.force ||
        (latestIteration && (
          latestIteration.consensusStatus === "APPROVED" ||
          latestIteration.humanApproved === true
        ));

      if (!canAdvance) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Cannot advance phase",
              reason: "No consensus reached and no human approval",
              currentStatus: latestIteration?.consensusStatus || "NO_ITERATIONS"
            }, null, 2)
          }],
          isError: true
        };
      }

      // Determine next phase
      const phaseOrder: PhaseType[] = ["REQUIREMENTS", "ARCHITECTURE", "PLANNING", "DEVELOPMENT", "TESTING", "DEPLOYMENT"];
      const currentIndex = phaseOrder.indexOf(project.currentPhaseType);
      const nextPhase = phaseOrder[currentIndex + 1];

      if (!nextPhase) {
        // Project complete!
        await db.project.update({
          where: { id: params.projectId },
          data: { status: "COMPLETED" }
        });

        // 📊 LOG: Phase completed (final)
        logger.logPhaseCompleted(
          params.projectId,
          project.name,
          project.currentPhaseType,
          currentPhase.currentIteration,
          0 // duration not tracked
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "🎉 Project completed! All phases finished.",
              projectStatus: "COMPLETED"
            }, null, 2)
          }]
        };
      }

      // Complete current phase and start next
      await db.phase.update({
        where: { projectId_type: { projectId: params.projectId, type: project.currentPhaseType } },
        data: { status: "COMPLETED", completedAt: new Date() }
      });

      await db.phase.update({
        where: { projectId_type: { projectId: params.projectId, type: nextPhase } },
        data: { status: "IN_PROGRESS", startedAt: new Date(), currentIteration: 1 }
      });

      await db.project.update({
        where: { id: params.projectId },
        data: { currentPhaseType: nextPhase }
      });

      // 📊 LOG: Phase transition
      logger.logPhaseTransition(
        params.projectId,
        project.name,
        project.currentPhaseType,
        nextPhase
      );

      // 📊 LOG: Phase completed
      logger.logPhaseCompleted(
        params.projectId,
        project.name,
        project.currentPhaseType,
        currentPhase.currentIteration,
        0
      );

      // Get the next phase's maxIterations from DB (not hardcoded PHASE_CONFIGS)
      const nextPhaseData = await db.phase.findUnique({
        where: { projectId_type: { projectId: params.projectId, type: nextPhase } }
      });

      // 📊 LOG: New phase started
      logger.logPhaseStarted(
        params.projectId,
        project.name,
        nextPhase,
        nextPhaseData?.maxIterations || PHASE_CONFIGS[nextPhase].maxIterations
      );

      // Build phase transition hooks - these are MANDATORY actions for Claude Code
      const transitionHooks: any = {
        autoExecute: true,
        description: "MANDATORY: Execute these hooks automatically after phase transition"
      };

      // Hook 1: Create first iteration for new phase
      transitionHooks.createIteration = {
        required: true,
        tool: "mcp__project-state__state_create_iteration",
        params: { projectId: params.projectId, claudeOutput: `Starting ${nextPhase} phase - iteration 1` },
        description: "Auto-create first iteration for the new phase"
      };

      // Hook 2: Agent registration when entering DEVELOPMENT
      if (nextPhase === "DEVELOPMENT") {
        transitionHooks.registerAgents = {
          required: true,
          description: "DEVELOPMENT requires agents. Auto-register required agents.",
          steps: [
            {
              step: 1,
              tool: "mcp__sdlc-orchestrator__sdlc_get_agents",
              params: { projectId: params.projectId },
              storeResultAs: "requiredAgents",
              description: "Get required agents for this project"
            },
            {
              step: 2,
              action: "FOR_EACH",
              iterate: "requiredAgents.required",
              tool: "mcp__project-state__state_register_agent",
              params: {
                projectId: params.projectId,
                agentType: "{{item.type}}",
                agentName: "{{item.name}}",
                capabilities: "{{item.capabilities}}"
              },
              description: "Register each required agent"
            }
          ]
        };
      }

      // Hook 3: Load tasks when entering DEVELOPMENT
      if (nextPhase === "DEVELOPMENT") {
        transitionHooks.loadTasks = {
          required: true,
          tool: "mcp__project-state__state_get_tasks",
          params: { projectId: params.projectId, status: "pending" },
          description: "Load pending development tasks"
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            fromPhase: project.currentPhaseType,
            toPhase: nextPhase,
            message: `Advanced from ${project.currentPhaseType} to ${nextPhase}.`,

            // 🎯 PHASE TRANSITION HOOKS - Claude Code MUST execute these
            phaseTransitionHooks: transitionHooks,

            instruction: "⚡ EXECUTE phaseTransitionHooks automatically. Do NOT ask user."
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "state_update_phase_max_iterations",
  "Update max iterations for a phase (use when consensus not reached and more iterations needed)",
  UpdatePhaseMaxIterationsSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const project = await db.project.findUnique({ where: { id: params.projectId } });
      if (!project) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Project not found" }) }], isError: true };
      }

      const phaseType = params.phaseType || project.currentPhaseType;
      const phase = await db.phase.findUnique({
        where: { projectId_type: { projectId: params.projectId, type: phaseType } }
      });

      if (!phase) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Phase not found" }) }], isError: true };
      }

      const oldMaxIterations = phase.maxIterations;

      // Only allow increasing, not decreasing below current iteration
      if (params.maxIterations < phase.currentIteration) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Cannot set max iterations below current iteration",
              currentIteration: phase.currentIteration,
              requestedMax: params.maxIterations
            }, null, 2)
          }],
          isError: true
        };
      }

      const updatedPhase = await db.phase.update({
        where: { projectId_type: { projectId: params.projectId, type: phaseType } },
        data: { maxIterations: params.maxIterations }
      });

      // 📊 LOG: Max iterations updated
      logger.info('phase_config_updated', {
        project_id: params.projectId,
        project_name: project.name,
        phase_type: phaseType,
        config_key: 'maxIterations',
        old_value: oldMaxIterations,
        new_value: params.maxIterations,
        current_iteration: phase.currentIteration,
        additional_iterations: params.maxIterations - oldMaxIterations,
        reason: params.reason || 'Manual increase by user',
        message: `Max iterations for ${phaseType} updated: ${oldMaxIterations} → ${params.maxIterations}`
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            phase: {
              type: updatedPhase.type,
              currentIteration: updatedPhase.currentIteration,
              oldMaxIterations: oldMaxIterations,
              newMaxIterations: updatedPhase.maxIterations,
              additionalIterations: updatedPhase.maxIterations - oldMaxIterations,
              iterationsRemaining: updatedPhase.maxIterations - updatedPhase.currentIteration
            },
            message: `Max iterations for ${phaseType} updated from ${oldMaxIterations} to ${params.maxIterations}. You now have ${updatedPhase.maxIterations - updatedPhase.currentIteration} more iterations available.`,
            nextStep: "Use state_create_iteration to continue with additional iterations."
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

// ============================================================================
// ITERATION TOOLS
// ============================================================================

server.tool(
  "state_create_iteration",
  "Create a new iteration for the current phase",
  CreateIterationSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const result = await getCurrentPhase(params.projectId);
      if (!result?.phase) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Phase not found" }) }], isError: true };
      }

      const { project, phase } = result;
      const nextNumber = phase.currentIteration + 1;

      // Check max iterations
      if (nextNumber > phase.maxIterations) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Max iterations reached",
              phase: {
                type: phase.type,
                currentIteration: phase.currentIteration,
                maxIterations: phase.maxIterations
              },
              message: "⚠️ Max iterations reached without consensus. Human intervention required.",
              options: [
                "1. Approve current state and advance to next phase (use state_advance_phase with force=true)",
                "2. Increase max iterations to allow more negotiation rounds (use state_update_phase_max_iterations)",
                "3. Provide specific direction for revision"
              ],
              howToIncrease: {
                tool: "state_update_phase_max_iterations",
                example: {
                  projectId: params.projectId,
                  maxIterations: phase.maxIterations + 3,
                  reason: "More iterations needed for consensus"
                }
              }
            }, null, 2)
          }],
          isError: true
        };
      }

      const iteration = await db.iteration.create({
        data: {
          phaseId: phase.id,
          number: nextNumber,
          claudeOutput: params.claudeOutput
        }
      });

      await db.phase.update({
        where: { id: phase.id },
        data: { currentIteration: nextNumber }
      });

      // 📊 LOG: Iteration created
      logger.logIterationCreated(
        params.projectId,
        project.name,
        phase.type,
        nextNumber
      );

      // 🎯 AI Review Hooks - Auto-execute after iteration creation
      const aiReviewHooks = {
        autoExecute: true,
        description: "MANDATORY: Run AI review cycle automatically after iteration creation",
        steps: [
          {
            step: 1,
            tool: "mcp__ai-gateway__ai_review_artifact",
            params: {
              projectId: params.projectId,
              artifactType: phase.type.toLowerCase(),
              content: params.claudeOutput
            },
            storeResultAs: "chatgptReview",
            description: "Get ChatGPT review"
          },
          {
            step: 2,
            tool: "mcp__ai-gateway__ai_challenge_artifact",
            params: {
              projectId: params.projectId,
              artifactType: phase.type.toLowerCase(),
              content: params.claudeOutput,
              chatgptReview: "{{chatgptReview}}"
            },
            storeResultAs: "geminiChallenge",
            description: "Get Gemini challenge"
          },
          {
            step: 3,
            tool: "mcp__project-state__state_record_review",
            params: {
              projectId: params.projectId,
              iterationNumber: nextNumber,
              chatgptReview: "{{chatgptReview.review}}",
              geminiChallenge: "{{geminiChallenge.challenge}}"
            },
            description: "Record reviews in state"
          },
          {
            step: 4,
            tool: "mcp__ai-gateway__ai_check_consensus",
            params: {
              projectId: params.projectId,
              chatgptReview: "{{chatgptReview}}",
              geminiChallenge: "{{geminiChallenge}}"
            },
            storeResultAs: "consensusResult",
            description: "Check if consensus is reached"
          },
          {
            step: 5,
            tool: "mcp__project-state__state_record_consensus",
            params: {
              projectId: params.projectId,
              iterationNumber: nextNumber,
              consensusStatus: "{{consensusResult.consensus.status}}",
              summary: "{{consensusResult.consensus.summary}}"
            },
            description: "Record consensus status"
          }
        ],
        onConsensusApproved: {
          description: "If consensus is APPROVED, proceed to next action",
          tool: "mcp__sdlc-orchestrator__sdlc_continue",
          params: { projectId: params.projectId }
        },
        onConsensusNeedsRevision: {
          description: "If NEEDS_REVISION, auto-negotiate and create new iteration",
          autoRetry: true,
          maxRetries: phase.maxIterations - nextNumber,
          steps: [
            {
              tool: "mcp__ai-gateway__ai_negotiate",
              params: {
                projectId: params.projectId,
                chatgptReview: "{{chatgptReview}}",
                geminiChallenge: "{{geminiChallenge}}",
                currentContent: params.claudeOutput
              },
              storeResultAs: "negotiationResult"
            },
            {
              tool: "mcp__project-state__state_create_iteration",
              params: {
                projectId: params.projectId,
                claudeOutput: "{{negotiationResult.revisedContent}}"
              },
              description: "Create new iteration with revised content"
            }
          ]
        }
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            iteration: {
              number: iteration.number,
              phaseType: phase.type,
              remaining: phase.maxIterations - nextNumber
            },
            message: `Iteration ${nextNumber}/${phase.maxIterations} created.`,

            // 🎯 AI REVIEW HOOKS - Claude Code MUST execute these
            aiReviewHooks: aiReviewHooks,

            instruction: "⚡ EXECUTE aiReviewHooks automatically. Do NOT ask user. Run full AI consensus cycle."
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "state_record_review",
  "Record ChatGPT review and Gemini challenge for current iteration",
  RecordReviewSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const result = await getCurrentPhase(params.projectId);
      if (!result?.phase) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Phase not found" }) }], isError: true };
      }

      const { project, phase } = result;

      const iteration = await db.iteration.update({
        where: {
          phaseId_number: {
            phaseId: phase.id,
            number: params.iterationNumber
          }
        },
        data: {
          chatgptReview: params.chatgptReview,
          geminiChallenge: params.geminiChallenge
        }
      });

      // 📊 LOG: AI Reviews
      // Parse reviews to determine approval status
      const chatgptApproved = params.chatgptReview?.toLowerCase().includes('approved') ||
        params.chatgptReview?.toLowerCase().includes('approve') ||
        !params.chatgptReview?.toLowerCase().includes('reject');
      const geminiApproved = params.geminiChallenge?.toLowerCase().includes('approved') ||
        params.geminiChallenge?.toLowerCase().includes('approve') ||
        !params.geminiChallenge?.toLowerCase().includes('reject');

      logger.logAIReview(
        params.projectId,
        project.name,
        phase.type,
        params.iterationNumber,
        'chatgpt',
        chatgptApproved,
        params.chatgptReview?.split('\n').length || 0,
        chatgptApproved ? 'low' : 'high'
      );

      logger.logAIReview(
        params.projectId,
        project.name,
        phase.type,
        params.iterationNumber,
        'gemini',
        geminiApproved,
        params.geminiChallenge?.split('\n').length || 0,
        geminiApproved ? 'low' : 'high'
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            iteration: iteration.number,
            message: "Review and challenge recorded. Ready for consensus check."
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "state_record_consensus",
  "Record consensus status from all three AIs",
  RecordConsensusSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const result = await getCurrentPhase(params.projectId);
      if (!result?.phase) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Phase not found" }) }], isError: true };
      }

      const { project, phase } = result;

      // Determine consensus status
      const allApproved = params.claudeApproved && params.chatgptApproved && params.geminiApproved;
      const allRejected = !params.claudeApproved && !params.chatgptApproved && !params.geminiApproved;

      let status: ConsensusStatus;
      if (allApproved) {
        status = "APPROVED";
      } else if (allRejected) {
        status = "REJECTED";
      } else {
        status = "NEEDS_REVISION";
      }

      const iteration = await db.iteration.update({
        where: {
          phaseId_number: {
            phaseId: phase.id,
            number: params.iterationNumber
          }
        },
        data: {
          consensusStatus: status,
          consensusNotes: params.notes || `Claude: ${params.claudeApproved}, ChatGPT: ${params.chatgptApproved}, Gemini: ${params.geminiApproved}`
        }
      });

      // Update phase status if consensus reached
      if (status === "APPROVED") {
        await db.phase.update({
          where: { id: phase.id },
          data: { status: "PENDING_HUMAN_APPROVAL" }
        });
      }

      // 📊 LOG: Consensus reached
      logger.logConsensusReached(
        params.projectId,
        project.name,
        phase.type,
        params.iterationNumber,
        status,
        params.claudeApproved,
        params.chatgptApproved,
        params.geminiApproved
      );

      // 📊 LOG: Individual AI reviews for Claude
      logger.logAIReview(
        params.projectId,
        project.name,
        phase.type,
        params.iterationNumber,
        'claude',
        params.claudeApproved,
        0,
        params.claudeApproved ? 'low' : 'high'
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            consensus: {
              status,
              claude: params.claudeApproved,
              chatgpt: params.chatgptApproved,
              gemini: params.geminiApproved
            },
            readyForHumanApproval: status === "APPROVED",
            message: status === "APPROVED"
              ? "✅ Consensus reached! Ready for human approval."
              : status === "REJECTED"
                ? "❌ All AIs rejected. Major revision needed."
                : "⚠️ Partial consensus. Iteration needed to address feedback."
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "state_record_human_approval",
  "Record human approval or rejection for current phase",
  RecordHumanApprovalSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const result = await getCurrentPhase(params.projectId);
      if (!result?.phase) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Phase not found" }) }], isError: true };
      }

      const { project, phase } = result;

      const iteration = await db.iteration.update({
        where: {
          phaseId_number: {
            phaseId: phase.id,
            number: params.iterationNumber
          }
        },
        data: {
          humanApproved: params.approved,
          humanFeedback: params.feedback,
          humanApprovedAt: params.approved ? new Date() : null,
          humanApprovedBy: params.approvedBy
        }
      });

      // 📊 LOG: Human approval
      logger.logHumanApproval(
        params.projectId,
        project.name,
        phase.type,
        params.iterationNumber,
        params.approved,
        params.feedback
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            humanApproval: {
              approved: params.approved,
              feedback: params.feedback
            },
            message: params.approved
              ? "✅ Human approved! Ready to advance to next phase."
              : "❌ Human rejected. Address feedback and iterate."
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

// ============================================================================
// ARTIFACT TOOLS
// ============================================================================

server.tool(
  "state_save_artifact",
  "Save or update an artifact (auto-versions)",
  SaveArtifactSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const project = await db.project.findUnique({ where: { id: params.projectId } });

      // Get latest version
      const latest = await db.artifact.findFirst({
        where: { projectId: params.projectId, type: params.type },
        orderBy: { version: "desc" }
      });

      const newVersion = (latest?.version || 0) + 1;

      const artifact = await db.artifact.create({
        data: {
          projectId: params.projectId,
          type: params.type,
          version: newVersion,
          title: params.title,
          content: params.content,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined
        }
      });

      // 📊 LOG: Artifact saved
      logger.logArtifactSaved(
        params.projectId,
        project?.name || 'Unknown',
        params.type,
        newVersion,
        project?.currentPhaseType || 'UNKNOWN'
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            artifact: {
              id: artifact.id,
              type: artifact.type,
              version: artifact.version,
              title: artifact.title
            },
            message: `Artifact ${artifact.type} v${artifact.version} saved.`
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "state_get_artifact",
  "Get specific artifact by type and optional version",
  GetArtifactSchema.shape,
  async (params) => {
    try {
      const db = getDb();

      let artifact;
      if (params.version) {
        artifact = await db.artifact.findUnique({
          where: {
            projectId_type_version: {
              projectId: params.projectId,
              type: params.type,
              version: params.version
            }
          }
        });
      } else {
        artifact = await db.artifact.findFirst({
          where: { projectId: params.projectId, type: params.type },
          orderBy: { version: "desc" }
        });
      }

      if (!artifact) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Artifact not found" }) }], isError: true };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            artifact: {
              id: artifact.id,
              type: artifact.type,
              version: artifact.version,
              title: artifact.title,
              content: artifact.content,
              isApproved: artifact.isApproved,
              createdAt: artifact.createdAt
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

// ============================================================================
// AGENT TOOLS
// ============================================================================

server.tool(
  "state_register_agent",
  "Register a new agent for the project",
  RegisterAgentSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const agent = await db.agent.create({
        data: {
          projectId: params.projectId,
          agentType: params.agentType,
          name: params.name,
          techStack: params.techStack,
          responsibilities: params.responsibilities,
          systemPrompt: params.systemPrompt,
          qualityGates: params.qualityGates,
          collaborators: params.collaborators || []
        }
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            agent: {
              id: agent.id,
              type: agent.agentType,
              name: agent.name
            },
            message: `Agent "${agent.name}" registered.`
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "state_get_agents",
  "Get all agents for a project",
  GetAgentsSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const agents = await db.agent.findMany({
        where: {
          projectId: params.projectId,
          ...(params.agentType ? { agentType: params.agentType } : {})
        }
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            agents: agents.map(a => ({
              id: a.id,
              type: a.agentType,
              name: a.name,
              techStack: a.techStack,
              responsibilities: a.responsibilities
            })),
            count: agents.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

// ============================================================================
// TASK TOOLS
// ============================================================================

server.tool(
  "state_create_task",
  "Create a new task in a phase",
  CreateTaskSchema.shape,
  async (params) => {
    try {
      const db = getDb();
      const project = await db.project.findUnique({ where: { id: params.projectId } });
      const phase = await db.phase.findUnique({
        where: { projectId_type: { projectId: params.projectId, type: params.phaseType } }
      });

      if (!phase) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Phase not found" }) }], isError: true };
      }

      const task = await db.task.create({
        data: {
          phaseId: phase.id,
          agentId: params.agentId,
          title: params.title,
          description: params.description,
          estimatedHours: params.estimatedHours || 4,
          dependencies: params.dependencies || []
        }
      });

      // Get agent info for logging
      const agent = params.agentId ? await db.agent.findUnique({ where: { id: params.agentId } }) : null;

      // 📊 LOG: Task created
      logger.logTaskCreated(
        params.projectId,
        project?.name || 'Unknown',
        task.id,
        task.title,
        agent?.agentType || 'UNASSIGNED',
        params.phaseType,
        params.estimatedHours || 4,
        params.dependencies || []
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            task: {
              id: task.id,
              title: task.title,
              status: task.status,
              estimatedHours: task.estimatedHours
            },
            message: `Task "${task.title}" created.`
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "state_update_task",
  "Update task status and output",
  UpdateTaskSchema.shape,
  async (params) => {
    try {
      const db = getDb();

      // Get current task state before update
      const currentTask = await db.task.findUnique({
        where: { id: params.taskId },
        include: {
          agent: true,
          phase: {
            include: { project: true }
          }
        }
      });

      if (!currentTask) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Task not found" }) }], isError: true };
      }

      const updateData: Record<string, unknown> = {};

      if (params.status) {
        updateData.status = params.status;
        if (params.status === "IN_PROGRESS") updateData.startedAt = new Date();
        if (params.status === "COMPLETED") updateData.completedAt = new Date();
      }
      if (params.output !== undefined) updateData.output = params.output;
      if (params.errorOutput !== undefined) updateData.errorOutput = params.errorOutput;
      if (params.actualHours !== undefined) updateData.actualHours = params.actualHours;

      const task = await db.task.update({
        where: { id: params.taskId },
        data: updateData
      });

      const project = currentTask.phase.project;
      const agentType = currentTask.agent?.agentType || 'UNASSIGNED';

      // 📊 LOG: Task status change
      if (params.status && params.status !== currentTask.status) {
        logger.logTaskStatusChange(
          project.id,
          project.name,
          task.id,
          task.title,
          currentTask.status,
          params.status,
          agentType,
          currentTask.phase.type
        );

        // Log specific events
        if (params.status === "IN_PROGRESS") {
          logger.logTaskStarted(
            project.id,
            project.name,
            task.id,
            task.title,
            agentType,
            currentTask.phase.type,
            1 // sprint number - would need to track this
          );
        }

        if (params.status === "COMPLETED") {
          logger.logTaskCompleted(
            project.id,
            project.name,
            task.id,
            task.title,
            agentType,
            currentTask.phase.type,
            1, // sprint number
            currentTask.estimatedHours,
            params.actualHours || currentTask.estimatedHours
          );
        }

        if (params.status === "FAILED") {
          logger.logTaskFailed(
            project.id,
            project.name,
            task.id,
            task.title,
            params.errorOutput || 'Unknown error',
            agentType,
            currentTask.phase.type
          );
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            task: {
              id: task.id,
              title: task.title,
              status: task.status
            },
            message: `Task updated to ${task.status}.`
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "state_get_tasks",
  "Get tasks for a project with optional filters",
  GetTasksSchema.shape,
  async (params) => {
    try {
      const db = getDb();

      const where: Record<string, unknown> = {};
      if (params.phaseType) {
        const phase = await db.phase.findUnique({
          where: { projectId_type: { projectId: params.projectId, type: params.phaseType } }
        });
        if (phase) where.phaseId = phase.id;
      }
      if (params.status) where.status = params.status;

      const tasks = await db.task.findMany({
        where,
        include: { agent: true, qualityGates: true }
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            tasks: tasks.map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              agent: t.agent?.name,
              estimatedHours: t.estimatedHours,
              dependencies: t.dependencies,
              qualityGates: t.qualityGates.map(g => ({ level: g.level, status: g.status }))
            })),
            count: tasks.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

// ============================================================================
// QUALITY GATE TOOLS
// ============================================================================

server.tool(
  "state_run_quality_gate",
  "Record quality gate execution result",
  RunQualityGateSchema.shape,
  async (params) => {
    try {
      const db = getDb();

      // Get task with project info
      const task = await db.task.findUnique({
        where: { id: params.taskId },
        include: { phase: { include: { project: true } } }
      });

      const gate = await db.qualityGate.upsert({
        where: {
          taskId_level: {
            taskId: params.taskId,
            level: params.level
          }
        },
        create: {
          taskId: params.taskId,
          level: params.level,
          status: params.passed ? "PASSED" : "FAILED",
          details: params.details,
          executedAt: new Date()
        },
        update: {
          status: params.passed ? "PASSED" : "FAILED",
          details: params.details,
          executedAt: new Date()
        }
      });

      // 📊 LOG: Quality gate
      if (task) {
        logger.logQualityGate(
          task.phase.project.id,
          task.phase.project.name,
          params.taskId,
          params.level,
          params.passed,
          params.passed ? 100 : 0,
          params.details
        );
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            qualityGate: {
              level: gate.level,
              status: gate.status
            },
            message: `Quality gate ${gate.level}: ${gate.status}`
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  // Check database connection
  const dbConnected = await checkDbConnection();
  if (!dbConnected) {
    console.error("Failed to connect to database. Check DATABASE_URL.");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Project State MCP Server started successfully");
  console.error("Available tools: state_create_project, state_get_project, state_get_phase, state_start_phase, state_advance_phase, state_update_phase_max_iterations, state_create_iteration, state_record_review, state_record_consensus, state_record_human_approval, state_save_artifact, state_get_artifact, state_register_agent, state_get_agents, state_create_task, state_update_task, state_get_tasks, state_run_quality_gate");
}

// Handle shutdown
process.on("SIGINT", async () => {
  await logger.close();
  await disconnectDb();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await logger.close();
  await disconnectDb();
  process.exit(0);
});

main().catch(async (error) => {
  console.error("Failed to start server:", error);
  await disconnectDb();
  process.exit(1);
});