import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  PHASE_CONFIGS,
  SPRINT_CONFIG,
  COMMAND_MAP,
  RESPONSE_TEMPLATES,
  PhaseType
} from "./workflow.js";

import {
  InitProjectSchema,
  StatusSchema,
  ContinueSchema,
  ReviewCycleSchema,
  SprintSummarySchema,
  ParseCommandSchema,
  NextActionSchema,
  ValidateAdvanceSchema,
  RunAIReviewSchema,
  GetAgentsSchema,
  ValidateAgentsSchema,
  GenerateDocsSchema,
  GenerateChangelogSchema
} from "./schemas/orchestrator.js";

import {
  validatePhaseAdvancement,
  generateEnforcementReport,
  getRequiredActions,
  PHASE_PREREQUISITES,
  PhaseState,
  ProjectState
} from "./enforcement.js";

import {
  AGENT_REGISTRY,
  AgentType,
  getAgentsByPhase,
  getAgentsForTechStack,
  generateAgentRegistrationSequence,
  validateAgentRegistration
} from "./agents.js";

import {
  generatePhaseDocuments,
  generateDocumentWriteSequence,
  generateChangelog,
  DocumentInput
} from "./documentation.js";

const server = new McpServer({
  name: "sdlc-orchestrator-mcp-server",
  version: "1.0.0"
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPhaseConfig(phase: string): typeof PHASE_CONFIGS[PhaseType] | null {
  return PHASE_CONFIGS[phase as PhaseType] || null;
}

function generateToolCallSequence(phase: PhaseType, action: string): string[] {
  const config = PHASE_CONFIGS[phase];
  
  switch (action) {
    case "start_iteration":
      return [
        "state_create_iteration",
        "// Claude creates artifact content",
        "state_save_artifact",
        "dev_file_write"
      ];
    
    case "run_review":
      return [
        "ai_review_artifact (ChatGPT)",
        "ai_challenge_artifact (Gemini)",
        "state_record_review",
        "ai_check_consensus",
        "state_record_consensus"
      ];
    
    case "iterate":
      return [
        "// Claude revises based on feedback",
        "state_save_artifact",
        "dev_file_write",
        "ai_review_artifact",
        "ai_challenge_artifact",
        "state_record_consensus"
      ];
    
    case "advance_phase":
      return [
        "state_record_human_approval",
        "dev_git_commit",
        "state_advance_phase"
      ];
    
    case "execute_task":
      return [
        "state_update_task (IN_PROGRESS)",
        "dev_file_write (code)",
        "state_update_task (COMPLETED)",
        "state_run_quality_gate"
      ];
    
    case "complete_sprint":
      return [
        "dev_git_commit",
        "// Summary report"
      ];
    
    default:
      return config.toolsUsed;
  }
}

// ============================================================================
// TOOLS
// ============================================================================

server.tool(
  "sdlc_init",
  "Initialize a new SDLC project - creates project, workspace, git repo, and organized folder structure with phase-specific documentation directories",
  InitProjectSchema.shape,
  async (params) => {
    const workspaceName = params.name.toLowerCase().replace(/\s+/g, "-");

    // Define folder structure for the project
    const folderStructure = {
      description: "Project folder organization",
      directories: [
        "docs/01-requirements",
        "docs/02-architecture",
        "docs/03-planning",
        "docs/04-development",
        "docs/05-testing",
        "docs/06-deployment",
        "src",
        "tests",
        ".sdlc"
      ],
      purposeMap: {
        "docs/01-requirements": "Requirements documents, user stories, NFRs",
        "docs/02-architecture": "Architecture decisions, C4 diagrams, API contracts",
        "docs/03-planning": "Epic breakdown, task lists, sprint plans",
        "docs/04-development": "Development notes, code documentation",
        "docs/05-testing": "Test plans, test results, coverage reports",
        "docs/06-deployment": "Deployment guides, runbooks, release notes",
        "src": "Source code",
        "tests": "Test files",
        ".sdlc": "SDLC metadata and state files"
      }
    };

    const initSequence = {
      description: `New SDLC Project: ${params.name}`,
      steps: [
        {
          step: 1,
          action: "Create project in database",
          tool: "state_create_project",
          params: {
            name: params.name,
            description: params.description,
            techStack: params.techStack,
            maxIterationsPerPhase: params.maxIterationsPerPhase || 10  // Default 10, can be overridden per project
          }
        },
        {
          step: 2,
          action: "Create workspace folder",
          tool: "dev_create_workspace",
          params: {
            projectId: "{{PROJECT_ID}}",
            name: workspaceName,
            description: params.description,
            techStack: params.techStack
          }
        },
        {
          step: 3,
          action: "Create project folder structure",
          tool: "dev_exec_command",
          params: {
            projectId: "{{PROJECT_ID}}",
            command: `mkdir -p ${folderStructure.directories.join(" ")}`
          },
          note: "Creates organized directory structure for all SDLC phases"
        },
        {
          step: 4,
          action: "Create .sdlc/config.json with project metadata",
          tool: "dev_file_write",
          params: {
            projectId: "{{PROJECT_ID}}",
            path: ".sdlc/config.json",
            content: JSON.stringify({
              projectId: "{{PROJECT_ID}}",
              projectName: params.name,
              createdAt: new Date().toISOString(),
              techStack: params.techStack,
              nfrs: params.nfrs || {
                maxResponseTime: "200ms",
                concurrentUsers: 10000,
                uptime: "99.9%"
              },
              folderStructure: folderStructure.purposeMap
            }, null, 2)
          }
        },
        {
          step: 5,
          action: "Create initial README.md",
          tool: "dev_file_write",
          params: {
            projectId: "{{PROJECT_ID}}",
            path: "README.md",
            content: `# ${params.name}\n\n${params.description}\n\n## Project Structure\n\n\`\`\`\n${folderStructure.directories.map(d => d + "/").join("\n")}\n\`\`\`\n\n## Tech Stack\n\n${params.techStack.map(t => `- ${t}`).join("\n")}\n\n## SDLC Status\n\nThis project follows the MyVibe SDLC framework with AI-assisted development.\n\nCurrent Phase: REQUIREMENTS\n`
          }
        },
        {
          step: 6,
          action: "Initialize git repository",
          tool: "dev_git_init",
          params: {
            projectId: "{{PROJECT_ID}}",
            initialBranch: "main"
          }
        },
        {
          step: 7,
          action: "Create .gitignore",
          tool: "dev_file_write",
          params: {
            projectId: "{{PROJECT_ID}}",
            path: ".gitignore",
            content: "node_modules/\n.env\n.env.local\n*.log\ndist/\nbuild/\n.DS_Store\n.sdlc/state.json\n"
          }
        },
        {
          step: 8,
          action: "Initial commit",
          tool: "dev_git_commit",
          params: {
            projectId: "{{PROJECT_ID}}",
            message: "Initial project setup with SDLC folder structure"
          }
        },
        {
          step: 9,
          action: "Start REQUIREMENTS phase",
          tool: "state_start_phase",
          params: {
            projectId: "{{PROJECT_ID}}",
            phaseType: "REQUIREMENTS"
          }
        }
      ],
      folderStructure,
      nextAction: "Begin requirements gathering. Use `sdlc_continue` to proceed.",
      nfrs: params.nfrs || {
        maxResponseTime: "200ms",
        concurrentUsers: 10000,
        uptime: "99.9%"
      }
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: "Execute these steps in order to initialize the project:",
          initSequence,
          folderStructure,
          hint: "After running these tools, use `sdlc_continue` with the projectId to proceed."
        }, null, 2)
      }]
    };
  }
);

server.tool(
  "sdlc_status",
  "Get comprehensive project status with next action recommendation",
  StatusSchema.shape,
  async (params) => {
    // This tool returns what information to gather and display
    const statusQuery = {
      description: "Gather project status",
      gather: [
        {
          tool: "state_get_project",
          params: { projectId: params.projectId },
          extract: ["status", "currentPhase", "phases"]
        },
        {
          tool: "state_get_phase",
          params: { projectId: params.projectId },
          extract: ["status", "currentIteration", "maxIterations"]
        },
        {
          tool: "state_get_tasks",
          params: { projectId: params.projectId },
          extract: ["total", "completed", "pending", "inProgress"]
        },
        {
          tool: "dev_file_list",
          params: { projectId: params.projectId, recursive: true },
          extract: ["files", "count"]
        }
      ],
      displayFormat: `
📊 **Proje Durumu**

| Alan | Değer |
|------|-------|
| Faz | {{currentPhase}} |
| İterasyon | {{currentIteration}}/{{maxIterations}} |
| Tasks | {{completed}}/{{total}} tamamlandı |
| Dosyalar | {{fileCount}} dosya |

**Sonraki Adım:** {{nextAction}}
`
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: "Execute these queries to get status:",
          statusQuery,
          shortCommands: {
            "devam/d": "Continue to next step",
            "durum/s": "Show this status",
            "tasks/t": "List all tasks",
            "dosyalar/f": "List workspace files",
            "review": "Run AI review cycle",
            "yardım/?": "Show help"
          }
        }, null, 2)
      }]
    };
  }
);

server.tool(
  "sdlc_continue",
  "Continue to the next logical step in the SDLC workflow (auto-determines action). Returns EXECUTABLE DIRECTIVE that MUST be followed.",
  ContinueSchema.shape,
  async (params) => {
    // This tool returns an EXECUTABLE DIRECTIVE - Claude MUST execute these steps automatically

    const projectId = params.projectId;
    const feedback = params.feedback;

    // Build execution sequence based on phase
    const executionDirective = {
      type: "EXECUTABLE_DIRECTIVE",
      autoExecute: true,
      description: "Execute the following steps in order. Do NOT ask user for confirmation.",

      // Step 1: Always start by getting current state
      prerequisite: {
        description: "First, get current phase state to determine which branch to execute",
        tool: "mcp__project-state__state_get_phase",
        params: { projectId },
        storeResultAs: "phaseState"
      },

      // Decision branches based on phase state
      branches: {
        // When phase has no iteration yet
        "NO_ITERATION": {
          condition: "phaseState.latestIteration === null || phaseState.currentIteration === 0",
          action: "CREATE_ITERATION",
          steps: [
            {
              step: 1,
              tool: "mcp__project-state__state_create_iteration",
              params: { projectId, claudeOutput: "Starting new iteration" },
              description: "Create new iteration for current phase"
            }
          ],
          nextAction: "After creating iteration, create/update artifact and run AI review"
        },

        // When iteration exists but no AI review done
        "ITERATION_NO_REVIEW": {
          condition: "phaseState.latestIteration && !phaseState.latestIteration.chatgptReview",
          action: "RUN_AI_REVIEW",
          steps: [
            {
              step: 1,
              tool: "mcp__ai-gateway__ai_review_artifact",
              params: { projectId, projectName: "{{projectName}}", artifactType: "{{artifactType}}", artifact: "{{artifactContent}}", phase: "{{currentPhase}}" },
              description: "Get ChatGPT review",
              storeResultAs: "chatgptReview"
            },
            {
              step: 2,
              tool: "mcp__ai-gateway__ai_challenge_artifact",
              params: { projectId, projectName: "{{projectName}}", artifactType: "{{artifactType}}", artifact: "{{artifactContent}}", phase: "{{currentPhase}}" },
              description: "Get Gemini challenge",
              storeResultAs: "geminiChallenge"
            },
            {
              step: 3,
              tool: "mcp__project-state__state_record_review",
              params: { projectId, iterationNumber: "{{currentIteration}}", chatgptReview: "{{chatgptReview}}", geminiChallenge: "{{geminiChallenge}}" },
              description: "Record both reviews"
            },
            {
              step: 4,
              tool: "mcp__ai-gateway__ai_check_consensus",
              params: { artifact: "{{artifactContent}}", artifactType: "{{artifactType}}", chatgptReview: "{{chatgptReview}}", geminiChallenge: "{{geminiChallenge}}" },
              description: "Check if consensus reached",
              storeResultAs: "consensusResult"
            },
            {
              step: 5,
              tool: "mcp__project-state__state_record_consensus",
              params: { projectId, iterationNumber: "{{currentIteration}}", claudeApproved: true, chatgptApproved: "{{consensusResult.chatgpt.approved}}", geminiApproved: "{{consensusResult.gemini.approved}}" },
              description: "Record consensus status"
            }
          ],
          nextAction: "Based on consensus result, either proceed to human approval or auto-iterate"
        },

        // When consensus needs revision (not approved)
        "CONSENSUS_NEEDS_REVISION": {
          condition: "consensusResult.consensus.status === 'NEEDS_REVISION' || consensusResult.consensus.status === 'rejected'",
          action: "AUTO_NEGOTIATE_AND_ITERATE",
          autoProcess: true,
          note: "DO NOT ask user. Execute automatically.",
          steps: [
            {
              step: 1,
              tool: "mcp__ai-gateway__ai_negotiate",
              params: { projectId, projectName: "{{projectName}}", artifact: "{{artifactContent}}", artifactType: "{{artifactType}}", disagreements: "{{consensusResult.disagreements.items}}", currentIteration: "{{currentIteration}}", maxIterations: "{{maxIterations}}" },
              description: "Negotiate disagreements between AI agents",
              storeResultAs: "negotiationResult"
            },
            {
              step: 2,
              condition: "negotiationResult.consensusReached",
              action: "Proceed to human approval",
              elseAction: "Create new iteration and repeat review cycle"
            }
          ]
        },

        // When consensus approved, need human approval
        "CONSENSUS_APPROVED": {
          condition: "consensusResult.consensus.status === 'APPROVED' && !phaseState.latestIteration.humanApproved",
          action: "REQUEST_HUMAN_APPROVAL",
          message: "✅ AI Consensus sağlandı. İnsan onayı gerekiyor.\n\nOnaylamak için: 'onayla' veya 'devam'\nRevize istemek için: 'revize: [feedback]'"
        },

        // Development phase specific
        "DEVELOPMENT_TASKS": {
          condition: "phaseState.type === 'DEVELOPMENT'",
          action: "EXECUTE_DEVELOPMENT",
          steps: [
            {
              step: 1,
              tool: "mcp__project-state__state_get_tasks",
              params: { projectId, status: "PENDING" },
              description: "Get pending tasks",
              storeResultAs: "pendingTasks"
            },
            {
              step: 2,
              condition: "pendingTasks.length > 0",
              description: "Pick first task by dependency order and execute",
              tool: "mcp__project-state__state_update_task",
              params: { taskId: "{{pendingTasks[0].id}}", status: "IN_PROGRESS" }
            }
          ],
          note: "For each task: implement code, run AI review on code, mark complete"
        }
      },

      // Critical rules for autonomous operation
      autonomousRules: {
        principle: "MINIMIZE USER INTERRUPTION",
        mandatory: [
          "EXECUTE all steps automatically without asking user",
          "When consensus fails: AUTO-negotiate and AUTO-iterate",
          "Do NOT show options menu - just execute",
          "Do NOT ask 'how to proceed' - follow the branch logic",
          "ONLY stop for user input when: (1) consensus APPROVED and need human approval, or (2) max iterations with CRITICAL issues"
        ],
        maxIterations: {
          REQUIREMENTS: 5,
          ARCHITECTURE: 4,
          PLANNING: 3,
          DEVELOPMENT: 10
        }
      },

      feedback
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          directive: executionDirective,
          message: "⚡ EXECUTABLE DIRECTIVE: Follow the steps above automatically. Do NOT ask user for confirmation between steps."
        }, null, 2)
      }]
    };
  }
);

server.tool(
  "sdlc_review",
  "Run the AI review cycle (ChatGPT review + Gemini challenge + consensus)",
  ReviewCycleSchema.shape,
  async (params) => {
    const reviewSequence = {
      description: `AI Review Cycle for ${params.artifactType}`,
      steps: [
        {
          step: 1,
          action: "Get artifact content",
          tool: "state_get_artifact",
          params: { projectId: params.projectId, type: params.artifactType.toUpperCase() }
        },
        {
          step: 2,
          action: "ChatGPT Review",
          tool: "ai_review_artifact",
          params: {
            artifact: "{{artifact_content}}",
            artifactType: params.artifactType,
            role: "reviewer"
          },
          expectOutput: ["approved", "feedback", "severity"]
        },
        {
          step: 3,
          action: "Gemini Challenge",
          tool: "ai_challenge_artifact",
          params: {
            artifact: "{{artifact_content}}",
            artifactType: params.artifactType,
            role: "challenger"
          },
          expectOutput: ["approved", "challenges", "edge_cases"]
        },
        {
          step: 4,
          action: "Record reviews",
          tool: "state_record_review",
          params: {
            projectId: params.projectId,
            iterationNumber: "{{current_iteration}}",
            chatgptReview: "{{chatgpt_response}}",
            geminiChallenge: "{{gemini_response}}"
          }
        },
        {
          step: 5,
          action: "Check consensus",
          tool: "ai_check_consensus",
          params: {
            artifact: "{{artifact_content}}",
            artifactType: params.artifactType,
            chatgptReview: "{{chatgpt_response}}",
            geminiChallenge: "{{gemini_response}}"
          }
        },
        {
          step: 6,
          action: "Record consensus",
          tool: "state_record_consensus",
          params: {
            projectId: params.projectId,
            iterationNumber: "{{current_iteration}}",
            claudeApproved: true,
            chatgptApproved: "{{chatgpt_approved}}",
            geminiApproved: "{{gemini_approved}}"
          }
        }
      ],
      
      outcomeHandling: {
        "all_approved": "Ready for human approval. Ask user to confirm.",
        "partial_approval": "Show feedback summary. Ask: `devam` to iterate or `detay` for more info.",
        "all_rejected": "Major revision needed. Show critical issues."
      }
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: "Execute AI review cycle:",
          reviewSequence
        }, null, 2)
      }]
    };
  }
);

server.tool(
  "sdlc_sprint",
  "Get sprint summary and plan next sprint",
  SprintSummarySchema.shape,
  async (params) => {
    const sprintQuery = {
      description: "Sprint Summary",
      
      gather: [
        {
          tool: "state_get_tasks",
          params: { projectId: params.projectId, status: "COMPLETED" },
          label: "completedTasks"
        },
        {
          tool: "state_get_tasks",
          params: { projectId: params.projectId, status: "PENDING" },
          label: "pendingTasks"
        },
        {
          tool: "dev_git_log",
          params: { projectId: params.projectId, limit: 10 },
          label: "recentCommits"
        }
      ],
      
      calculateMetrics: {
        tasksCompleted: "completedTasks.length",
        tasksPending: "pendingTasks.length",
        estimatedHours: "sum(completedTasks.estimatedHours)",
        actualHours: "sum(completedTasks.actualHours)",
        velocity: "estimatedHours / actualHours"
      },
      
      nextSprintPlanning: {
        maxTasks: SPRINT_CONFIG.maxTasksPerSprint,
        maxHours: SPRINT_CONFIG.maxHoursPerSprint,
        selectCriteria: "Pick tasks with no pending dependencies, prioritize by epic order"
      },
      
      displayFormat: `
📈 **Sprint {{sprintNumber}} Özeti**

| Metrik | Değer |
|--------|-------|
| Tamamlanan | {{tasksCompleted}} task |
| Tahmini | {{estimatedHours}}h |
| Gerçek | {{actualHours}}h |
| Verimlilik | {{velocity}}x |

**Sonraki Sprint:** {{nextSprintTasks}} task, ~{{nextSprintHours}}h

\`devam\` yazarak sonraki sprint'e başla.
`
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: "Execute sprint summary queries:",
          sprintQuery
        }, null, 2)
      }]
    };
  }
);

server.tool(
  "sdlc_next",
  "Get the single next action to take (most specific recommendation)",
  NextActionSchema.shape,
  async (params) => {
    const nextActionLogic = {
      description: "Determine the single most important next action",
      
      querySequence: [
        "state_get_project → get currentPhase",
        "state_get_phase → get iteration status, consensus",
        "state_get_tasks → get pending tasks (if DEVELOPMENT)"
      ],
      
      responseFormat: {
        action: "string - what to do",
        tool: "string - primary tool to use",
        params: "object - tool parameters",
        userPrompt: "string - what to ask user (if needed)"
      },
      
      examples: [
        {
          scenario: "REQUIREMENTS phase, no iteration yet",
          response: {
            action: "Create requirements document",
            tool: "state_create_iteration",
            followUp: "Then create REQUIREMENTS artifact"
          }
        },
        {
          scenario: "Iteration exists, no review",
          response: {
            action: "Run AI review cycle",
            tool: "sdlc_review",
            params: { artifactType: "requirements" }
          }
        },
        {
          scenario: "Consensus rejected",
          response: {
            action: "Revise based on feedback",
            userPrompt: "AI'lar şu sorunları buldu: [issues]. Düzeltip devam edeyim mi?"
          }
        },
        {
          scenario: "DEVELOPMENT, tasks pending",
          response: {
            action: "Execute next task",
            task: "{{next_task_title}}",
            tool: "dev_file_write"
          }
        }
      ]
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: "Query state and return single next action:",
          nextActionLogic,
          hint: "Always end with a clear action or question for the user."
        }, null, 2)
      }]
    };
  }
);

server.tool(
  "sdlc_help",
  "Show available commands and current workflow state",
  { },
  async () => {
    const helpContent = {
      title: "SDLC Orchestrator - Komut Rehberi",
      
      quickCommands: {
        "devam / d / c": "Sonraki adıma geç",
        "durum / s": "Proje durumunu göster",
        "tasks / t": "Task listesini göster",
        "dosyalar / f": "Workspace dosyalarını göster",
        "review": "AI review cycle başlat",
        "sprint": "Sprint özetini göster",
        "commit": "Değişiklikleri commit et",
        "log": "Git log göster",
        "detay": "Daha fazla detay göster",
        "revize: [mesaj]": "Belirtilen değişikliği yap",
        "onayla": "Human approval ver",
        "durdur": "Workflow'u duraklat",
        "yardım / ?": "Bu yardımı göster"
      },
      
      phases: Object.values(PHASE_CONFIGS).map(p => ({
        name: p.nameTr,
        type: p.type,
        maxIterations: p.maxIterations,
        deliverables: p.deliverables.length
      })),
      
      workflow: `
REQUIREMENTS → ARCHITECTURE → PLANNING → DEVELOPMENT → TESTING → DEPLOYMENT
     ↓              ↓             ↓            ↓            ↓          ↓
   5 iter        4 iter       3 iter      10 iter       5 iter      3 iter
`,
      
      tips: [
        "Her fazda AI consensus gerekli (Claude + ChatGPT + Gemini)",
        "Consensus sonrası human approval istenir",
        "DEVELOPMENT fazında sprint'ler halinde ilerlenir",
        "Kısa komutlar kullanabilirsin: d, s, t, f, ?"
      ]
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          help: helpContent
        }, null, 2)
      }]
    };
  }
);

// ============================================================================
// TOOL: sdlc_validate_advance
// ============================================================================

server.tool(
  "sdlc_validate_advance",
  "Validate if current phase can be advanced. Checks AI reviews, consensus, human approval, and quality gates.",
  ValidateAdvanceSchema.shape,
  async (params) => {
    try {
      const { phaseState, projectState } = params;
      const currentPhase = projectState.currentPhase as PhaseType;

      // Validate phase advancement
      const validation = validatePhaseAdvancement(
        currentPhase,
        phaseState as PhaseState,
        projectState as ProjectState
      );

      // Generate report
      const report = generateEnforcementReport(currentPhase, validation);

      // Get required actions if blocked
      const requiredActions = validation.canAdvance
        ? []
        : getRequiredActions(currentPhase, validation);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            canAdvance: validation.canAdvance,
            currentPhase,
            nextPhase: validation.canAdvance
              ? PHASE_CONFIGS[currentPhase].nextPhase
              : null,
            blockers: validation.blockers,
            warnings: validation.warnings,
            checksPerformed: validation.checksPerformed,
            requiredActions,
            report,
            message: validation.canAdvance
              ? `✅ Phase ${currentPhase} can be advanced to ${PHASE_CONFIGS[currentPhase].nextPhase}`
              : `❌ Phase ${currentPhase} cannot be advanced. ${validation.blockers.length} blocker(s) found.`
          }, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: sdlc_run_ai_review
// ============================================================================

server.tool(
  "sdlc_run_ai_review",
  "Automatically run the complete AI review cycle. Enforces that both ChatGPT review and Gemini challenge are executed.",
  RunAIReviewSchema.shape,
  async (params) => {
    const { projectId, projectName, artifactType, artifactContent, currentPhase, iterationNumber } = params;

    // This returns the sequence of tool calls that MUST be executed
    const reviewSequence = {
      description: "Mandatory AI Review Cycle",
      enforcement: "All steps must be completed in order. Skipping any step will block phase advancement.",

      steps: [
        {
          step: 1,
          name: "ChatGPT Review",
          tool: "ai_review_artifact",
          params: {
            artifact: artifactContent,
            artifactType,
            projectId,
            projectName,
            phase: currentPhase
          },
          mandatory: true,
          purpose: "Get UX-focused review and improvement suggestions"
        },
        {
          step: 2,
          name: "Gemini Challenge",
          tool: "ai_challenge_artifact",
          params: {
            artifact: artifactContent,
            artifactType,
            projectId,
            projectName,
            phase: currentPhase,
            focusAreas: ["security", "edge_cases", "scalability"]
          },
          mandatory: true,
          purpose: "Challenge with edge cases and security concerns"
        },
        {
          step: 3,
          name: "Record Reviews",
          tool: "state_record_review",
          params: {
            projectId,
            iterationNumber,
            chatgptReview: "{{STEP_1_RESPONSE}}",
            geminiChallenge: "{{STEP_2_RESPONSE}}"
          },
          mandatory: true,
          purpose: "Persist review results in database"
        },
        {
          step: 4,
          name: "Check Consensus",
          tool: "ai_check_consensus",
          params: {
            artifact: artifactContent,
            artifactType,
            chatgptReview: "{{STEP_1_RESPONSE}}",
            geminiChallenge: "{{STEP_2_RESPONSE}}"
          },
          mandatory: true,
          purpose: "Determine if all AIs approve"
        },
        {
          step: 5,
          name: "Record Consensus",
          tool: "state_record_consensus",
          params: {
            projectId,
            iterationNumber,
            claudeApproved: true,
            chatgptApproved: "{{STEP_4_CHATGPT_APPROVED}}",
            geminiApproved: "{{STEP_4_GEMINI_APPROVED}}",
            claudeNotes: "Artifact created and submitted for review",
            chatgptNotes: "{{STEP_4_CHATGPT_NOTES}}",
            geminiNotes: "{{STEP_4_GEMINI_NOTES}}"
          },
          mandatory: true,
          purpose: "Record final consensus status"
        }
      ],

      postConditions: {
        "APPROVED": {
          nextAction: "Request human approval",
          message: "✅ AI consensus reached. Ask user: 'Onaylıyor musunuz? (onayla/revize)'"
        },
        "NEEDS_REVISION": {
          nextAction: "Start negotiation - DO NOT ask user",
          message: "🔄 Consensus not reached. Starting agent negotiation automatically.",
          autoAction: {
            tool: "ai_negotiate",
            description: "Agents will negotiate disagreements without user intervention",
            continueUntil: "consensus OR max_iterations_with_critical_issues"
          }
        },
        "REJECTED": {
          nextAction: "Auto-iterate with combined feedback - DO NOT ask user",
          message: "🔄 Artifact needs revision. Auto-iterating based on AI feedback.",
          autoAction: {
            tool: "state_create_iteration",
            description: "Create new iteration with AI feedback automatically",
            continueUntil: "consensus OR max_iterations"
          }
        }
      },

      negotiationFlow: {
        description: "When consensus is not reached, follow this flow automatically",
        steps: [
          {
            step: "6a",
            condition: "NEEDS_REVISION or REJECTED",
            action: "Start negotiation",
            tool: "ai_negotiate",
            params: {
              disagreements: "{{STEP_5_DISAGREEMENTS}}",
              currentIteration: "{{current_iteration}}",
              maxIterations: "{{max_iterations}}",
              maxNegotiationRounds: 3
            }
          },
          {
            step: "6b",
            condition: "Negotiation result",
            outcomes: {
              "consensusReached": "Proceed to human approval (Step 7)",
              "requiresHumanDecision": "Show critical issues to user for decision",
              "continueIteration": "Auto-create new iteration and repeat from Step 1"
            }
          }
        ],
        important: "DO NOT ask user for preferences during negotiation. Only escalate when max iterations reached AND critical issues remain."
      }
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: "Execute this AI review cycle. ALL steps are mandatory.",
          reviewSequence,
          warning: "Skipping any step will result in phase advancement being blocked by sdlc_validate_advance.",

          // CRITICAL AUTOMATION DIRECTIVE
          automationDirective: {
            rule: "NO_USER_INTERACTION_UNTIL_MAX_ITERATION",
            description: "When consensus is not reached (NEEDS_REVISION or REJECTED), you MUST automatically proceed WITHOUT asking the user.",
            actions: {
              "NEEDS_REVISION": [
                "1. Call ai_negotiate with the disagreements",
                "2. If negotiation succeeds → proceed to human approval",
                "3. If negotiation has unresolved non-critical issues → revise artifact and create new iteration",
                "4. ONLY if max iteration reached AND critical issues remain → ask user for decision"
              ],
              "REJECTED": [
                "1. Combine all feedback from ChatGPT and Gemini",
                "2. Revise the artifact addressing all issues",
                "3. Create new iteration automatically",
                "4. Run review cycle again",
                "5. ONLY if max iteration reached → ask user"
              ]
            },
            forbidden: [
              "DO NOT show options menu to user",
              "DO NOT ask 'How do you want to proceed?'",
              "DO NOT ask 'Which issues to fix?'",
              "DO NOT wait for user input between iterations"
            ],
            userInteractionAllowed: "ONLY when consensus is APPROVED (for human approval) OR when max iterations reached with unresolved CRITICAL issues"
          }
        }, null, 2)
      }]
    };
  }
);

// ============================================================================
// TOOL: sdlc_get_agents
// ============================================================================

server.tool(
  "sdlc_get_agents",
  "Get agents required for a project based on tech stack. Returns agent definitions and registration sequence.",
  GetAgentsSchema.shape,
  async (params) => {
    try {
      const { techStack, projectId, phase } = params;

      // Get required agents for tech stack
      const requiredAgents = getAgentsForTechStack(techStack);

      // Get full agent definitions
      let agents = requiredAgents.map(type => AGENT_REGISTRY[type]);

      // Filter by phase if specified
      if (phase) {
        agents = agents.filter(a => a.phases.includes(phase as any));
      }

      // Generate registration sequence if projectId provided
      const registrationSequence = projectId
        ? generateAgentRegistrationSequence(projectId, techStack)
        : null;

      // Group by phase for display
      const agentsByPhase: Record<string, typeof agents> = {};
      for (const agent of agents) {
        for (const p of agent.phases) {
          if (!agentsByPhase[p]) agentsByPhase[p] = [];
          agentsByPhase[p].push(agent);
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            totalAgents: agents.length,
            agents: agents.map(a => ({
              type: a.type,
              name: a.name,
              description: a.description,
              phases: a.phases,
              qualityGates: a.qualityGates
            })),
            agentsByPhase: Object.fromEntries(
              Object.entries(agentsByPhase).map(([p, a]) => [p, a.map(x => x.type)])
            ),
            registrationSequence,
            message: `Found ${agents.length} agents for tech stack: ${techStack.join(', ')}`
          }, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: sdlc_validate_agents
// ============================================================================

server.tool(
  "sdlc_validate_agents",
  "Validate that all required agents are registered for a project",
  ValidateAgentsSchema.shape,
  async (params) => {
    try {
      const { registeredAgents, techStack } = params;

      const validation = validateAgentRegistration(
        registeredAgents as AgentType[],
        techStack
      );

      // Get details for missing agents
      const missingAgentDetails = validation.missingAgents.map(type => ({
        type,
        name: AGENT_REGISTRY[type].name,
        description: AGENT_REGISTRY[type].description,
        phases: AGENT_REGISTRY[type].phases
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            valid: validation.valid,
            registeredCount: validation.registeredAgents.length,
            missingCount: validation.missingAgents.length,
            missingAgents: missingAgentDetails,
            message: validation.valid
              ? "✅ All required agents are registered"
              : `⚠️ ${validation.missingAgents.length} agent(s) missing. Register them before proceeding to PLANNING phase.`,
            registrationCommands: validation.missingAgents.map(type => ({
              tool: "state_register_agent",
              params: {
                agentType: type,
                name: AGENT_REGISTRY[type].name,
                capabilities: AGENT_REGISTRY[type].capabilities
              }
            }))
          }, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: sdlc_generate_docs
// ============================================================================

server.tool(
  "sdlc_generate_docs",
  "Generate documentation for a phase based on artifacts and consensus. Creates phase summaries, README, and phase-specific documents.",
  GenerateDocsSchema.shape,
  async (params) => {
    try {
      // Map params to DocumentInput with defaults for optional fields
      const input: DocumentInput = {
        projectId: params.projectId,
        projectName: params.projectName,
        phase: params.phase as PhaseType,
        artifacts: (params.artifacts || []).map(a => ({
          type: a.type,
          content: a.content,
          version: a.version ?? 1
        })),
        iterations: (params.iterations || []).map(i => ({
          iterationNumber: i.iterationNumber,
          consensusStatus: i.consensusStatus ?? "pending",
          chatgptFeedback: i.chatgptFeedback,
          geminiFeedback: i.geminiFeedback,
          humanApproved: i.humanApproved ?? false
        })),
        tasks: params.tasks?.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status ?? "pending",
          agentType: t.agentType ?? "unknown",
          epic: t.epic ?? "default",
          estimatedHours: t.estimatedHours ?? 0,
          actualHours: t.actualHours
        })),
        qualityGates: params.qualityGates,
        techStack: params.techStack
      };

      // Generate documents
      const documents = generatePhaseDocuments(input);

      // Generate write sequence
      const writeSequence = generateDocumentWriteSequence(
        params.projectId,
        documents
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            documentsGenerated: documents.length,
            documents: documents.map(d => ({
              type: d.type,
              title: d.title,
              filename: d.filename,
              phase: d.phase,
              generatedAt: d.generatedAt,
              contentPreview: d.content.substring(0, 200) + '...'
            })),
            writeSequence,
            message: `Generated ${documents.length} document(s) for ${params.phase} phase. Execute the write sequence to save them.`
          }, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: sdlc_generate_changelog
// ============================================================================

server.tool(
  "sdlc_generate_changelog",
  "Generate a changelog entry for a release",
  GenerateChangelogSchema.shape,
  async (params) => {
    try {
      const changelog = generateChangelog(
        params.projectName,
        params.version,
        params.changes
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            document: {
              type: changelog.type,
              title: changelog.title,
              filename: changelog.filename,
              generatedAt: changelog.generatedAt
            },
            content: changelog.content,
            message: `Changelog generated for version ${params.version}`
          }, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("SDLC Orchestrator MCP Server started");
  console.error("Tools: sdlc_init, sdlc_status, sdlc_continue, sdlc_review, sdlc_sprint, sdlc_next, sdlc_help, sdlc_validate_advance, sdlc_run_ai_review, sdlc_get_agents, sdlc_validate_agents, sdlc_generate_docs, sdlc_generate_changelog");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
