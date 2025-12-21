#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

import { PROrchestrator } from "./services/orchestrator.js";
import {
  CreateBranchSchema,
  ValidateBranchNameSchema,
  GetBranchInfoSchema,
  ParseCodeOwnersSchema,
  GetOwnersForFilesSchema,
  GenerateCodeOwnersSchema,
  GeneratePRTemplateSchema,
  AnalyzePRSchema,
  GetPRSizeSchema,
  GenerateProvenanceSchema,
  TrackAIChangeSchema,
  SuggestReviewersSchema,
  InitWorkflowSchema,
  GetWorkflowConfigSchema,
  GenerateLabelsSchema
} from "./schemas/orchestrator.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "pr_create_branch",
    description: "Create a new branch following naming conventions.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        type: { type: "string", enum: ["feature", "bugfix", "hotfix", "release", "refactor", "chore"] },
        ticket: { type: "string", description: "Ticket/issue ID" },
        description: { type: "string", description: "Branch description" },
        baseBranch: { type: "string", default: "main" }
      },
      required: ["repoPath", "type", "description"]
    }
  },
  {
    name: "pr_validate_branch",
    description: "Validate branch name against conventions.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        branchName: { type: "string", description: "Branch name to validate" }
      },
      required: ["repoPath", "branchName"]
    }
  },
  {
    name: "pr_get_branch_info",
    description: "Get information about current or specified branch.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        branchName: { type: "string" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "pr_parse_codeowners",
    description: "Parse CODEOWNERS file and return ownership rules.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "pr_get_owners",
    description: "Get code owners for specific files.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        files: { type: "array", items: { type: "string" }, description: "Files to check" }
      },
      required: ["repoPath", "files"]
    }
  },
  {
    name: "pr_generate_codeowners",
    description: "Auto-generate CODEOWNERS based on git history.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        strategy: { type: "string", enum: ["git-history", "directory-based", "hybrid"], default: "hybrid" },
        minCommits: { type: "number", default: 5 }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "pr_generate_template",
    description: "Generate PR description from template.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        branchName: { type: "string" },
        summary: { type: "string" },
        testing: { type: "string" },
        additionalContext: { type: "object" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "pr_analyze",
    description: "Analyze PR for complexity, risk, and concerns.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        baseBranch: { type: "string", default: "main" },
        includeSuggestions: { type: "boolean", default: true }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "pr_get_size",
    description: "Get PR size classification (xs, s, m, l, xl).",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        baseBranch: { type: "string", default: "main" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "pr_generate_provenance",
    description: "Generate AI provenance metadata for PR.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        model: { type: "string", default: "claude-opus-4-5" },
        sessionId: { type: "string" },
        baseBranch: { type: "string", default: "main" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "pr_track_ai_change",
    description: "Track an AI-generated change for provenance.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        file: { type: "string", description: "File path" },
        changeType: { type: "string", enum: ["created", "modified", "deleted"] },
        description: { type: "string" },
        linesChanged: { type: "number", default: 0 }
      },
      required: ["repoPath", "file", "changeType", "description"]
    }
  },
  {
    name: "pr_suggest_reviewers",
    description: "Suggest reviewers based on code ownership and history.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        baseBranch: { type: "string", default: "main" },
        maxReviewers: { type: "number", default: 3 },
        includeAISuggested: { type: "boolean", default: true }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "pr_init_workflow",
    description: "Initialize PR workflow configuration.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        preset: { type: "string", enum: ["minimal", "standard", "strict"], default: "standard" },
        outputDir: { type: "string", default: ".github" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "pr_get_workflow_config",
    description: "Get current workflow configuration.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "pr_generate_labels",
    description: "Generate appropriate labels for the PR.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        baseBranch: { type: "string", default: "main" }
      },
      required: ["repoPath"]
    }
  }
];

// Cache for orchestrator instances
const orchestratorCache = new Map<string, PROrchestrator>();

function getOrchestrator(repoPath: string): PROrchestrator {
  if (!orchestratorCache.has(repoPath)) {
    orchestratorCache.set(repoPath, new PROrchestrator(repoPath));
  }
  return orchestratorCache.get(repoPath)!;
}

// Create server
const server = new Server(
  {
    name: "pr-orchestrator-mcp-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "pr_create_branch": {
        const input = CreateBranchSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.createBranch(
          input.type,
          input.description,
          input.ticket,
          input.baseBranch
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "pr_validate_branch": {
        const input = ValidateBranchNameSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.validateBranchName(input.branchName);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "pr_get_branch_info": {
        const input = GetBranchInfoSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.getBranchInfo(input.branchName);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "pr_parse_codeowners": {
        const input = ParseCodeOwnersSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.parseCodeOwners();

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "pr_get_owners": {
        const input = GetOwnersForFilesSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.getOwnersForFiles(input.files);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "pr_generate_codeowners": {
        const input = GenerateCodeOwnersSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.generateCodeOwners(input.strategy, input.minCommits);

        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      }

      case "pr_generate_template": {
        const input = GeneratePRTemplateSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.generatePRTemplate(
          input.branchName,
          input.summary,
          input.testing,
          input.additionalContext
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "pr_analyze": {
        const input = AnalyzePRSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.analyzePR(input.baseBranch);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "pr_get_size": {
        const input = GetPRSizeSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const size = orchestrator.getPRSize(input.baseBranch);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ size }, null, 2)
          }]
        };
      }

      case "pr_generate_provenance": {
        const input = GenerateProvenanceSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.generateProvenance(input.model, input.sessionId);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "pr_track_ai_change": {
        const input = TrackAIChangeSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        orchestrator.trackAIChange(
          input.file,
          input.changeType,
          input.description,
          input.linesChanged
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ tracked: true, file: input.file })
          }]
        };
      }

      case "pr_suggest_reviewers": {
        const input = SuggestReviewersSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.suggestReviewers(input.baseBranch, input.maxReviewers);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ reviewers: result }, null, 2)
          }]
        };
      }

      case "pr_init_workflow": {
        const input = InitWorkflowSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.initWorkflow(input.preset);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              initialized: true,
              preset: input.preset,
              templatesCreated: true,
              reviewPolicy: result.reviewPolicy,
              mergePolicy: result.mergePolicy
            }, null, 2)
          }]
        };
      }

      case "pr_get_workflow_config": {
        const input = GetWorkflowConfigSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.getWorkflowConfig();

        if (!result) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: "No workflow config found. Run pr_init_workflow first." })
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "pr_generate_labels": {
        const input = GenerateLabelsSchema.parse(args);
        const orchestrator = getOrchestrator(input.repoPath);
        const result = orchestrator.generateLabels(input.baseBranch);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ labels: result }, null, 2)
          }]
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PR Orchestrator MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
