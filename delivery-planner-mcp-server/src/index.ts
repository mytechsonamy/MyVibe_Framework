#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

import { DeliveryPlanner } from "./services/planner.js";
import {
  AnalyzeChangesSchema,
  DetectBreakingChangesSchema,
  SliceChangesSchema,
  GenerateFeatureFlagsSchema,
  GenerateFlagCodeSchema,
  CreateRolloutPlanSchema,
  GenerateRollbackPlanSchema,
  GenerateCompatibilityPlanSchema,
  CreateDeliveryPlanSchema,
  GetDeliveryPlanSchema,
  ValidateDeliveryPlanSchema
} from "./schemas/planner.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "delivery_analyze_changes",
    description: "Analyze changes between branches. Detects modified files, breaking changes, affected modules, and dependencies.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        baseBranch: { type: "string", default: "main", description: "Base branch" },
        targetBranch: { type: "string", description: "Target branch (default: HEAD)" },
        includePaths: { type: "array", items: { type: "string" }, description: "Only analyze these paths" },
        excludePaths: { type: "array", items: { type: "string" }, description: "Exclude these paths" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "delivery_detect_breaking",
    description: "Detect breaking changes in modified files. Checks API changes, schema modifications, and config updates.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        changedFiles: { type: "array", items: { type: "string" }, description: "Changed files" },
        checkAPI: { type: "boolean", default: true },
        checkSchema: { type: "boolean", default: true },
        checkConfig: { type: "boolean", default: true }
      },
      required: ["repoPath", "changedFiles"]
    }
  },
  {
    name: "delivery_slice_changes",
    description: "Slice changes into reviewable PR chunks. Strategies: by-module, by-layer, by-feature, by-risk.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        changedFiles: { type: "array", items: { type: "string" }, description: "Files to slice" },
        strategy: { type: "string", enum: ["by-module", "by-layer", "by-feature", "by-risk"], default: "by-module" },
        maxFilesPerPR: { type: "number", default: 15 },
        maxLOCPerPR: { type: "number", default: 500 },
        groupTests: { type: "boolean", default: true },
        atomicChanges: { type: "boolean", default: true }
      },
      required: ["repoPath", "changedFiles"]
    }
  },
  {
    name: "delivery_generate_flags",
    description: "Generate feature flag definitions for PR slices. Supports LaunchDarkly, Unleash, or env vars.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        slices: { type: "array", items: { type: "object" }, description: "PR slices" },
        flagSystem: { type: "string", enum: ["launchdarkly", "unleash", "custom", "env-vars"], default: "env-vars" },
        includeKillSwitch: { type: "boolean", default: true }
      },
      required: ["repoPath", "slices"]
    }
  },
  {
    name: "delivery_generate_flag_code",
    description: "Generate feature flag code snippet for a specific language.",
    inputSchema: {
      type: "object",
      properties: {
        flagName: { type: "string", description: "Feature flag name" },
        language: { type: "string", enum: ["typescript", "javascript", "python", "go"] },
        flagType: { type: "string", enum: ["boolean", "percentage", "user-segment"], default: "boolean" },
        defaultValue: { type: "string", default: "false" }
      },
      required: ["flagName", "language"]
    }
  },
  {
    name: "delivery_create_rollout",
    description: "Create a rollout plan with stages, metrics, and rollback triggers.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        deliveryPlanId: { type: "string", description: "Delivery plan ID" },
        stages: { type: "array", items: { type: "string" }, description: "Rollout stages" },
        metrics: { type: "array", items: { type: "string" }, description: "Metrics to monitor" },
        autoRollback: { type: "boolean", default: true }
      },
      required: ["repoPath", "deliveryPlanId"]
    }
  },
  {
    name: "delivery_rollback_plan",
    description: "Generate a detailed rollback plan for a PR slice.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        sliceId: { type: "string", description: "PR slice ID" },
        includeDataRollback: { type: "boolean", default: true },
        includeFeatureFlagDisable: { type: "boolean", default: true }
      },
      required: ["repoPath", "sliceId"]
    }
  },
  {
    name: "delivery_compatibility_plan",
    description: "Generate backwards compatibility plan with deprecation notices and migrations.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        breakingChanges: { type: "array", items: { type: "object" }, description: "Breaking changes" },
        deprecationPeriod: { type: "string", default: "30 days" },
        versioningStrategy: { type: "string", enum: ["url-path", "header", "query-param"], default: "url-path" }
      },
      required: ["repoPath", "breakingChanges"]
    }
  },
  {
    name: "delivery_create_plan",
    description: "Create a complete delivery plan with slices, flags, rollout, and compatibility plans.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        name: { type: "string", description: "Plan name" },
        strategy: { type: "string", enum: ["feature-flag", "branch-by-abstraction", "strangler-fig", "parallel-run", "dark-launch"], default: "feature-flag" },
        baseBranch: { type: "string", default: "main" },
        autoSlice: { type: "boolean", default: true }
      },
      required: ["repoPath", "name"]
    }
  },
  {
    name: "delivery_get_plan",
    description: "Get an existing delivery plan by ID.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        planId: { type: "string", description: "Plan ID" }
      },
      required: ["repoPath", "planId"]
    }
  },
  {
    name: "delivery_validate_plan",
    description: "Validate a delivery plan for issues like circular dependencies or missing rollback plans.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        planId: { type: "string", description: "Plan ID" },
        checkDependencies: { type: "boolean", default: true },
        checkRollback: { type: "boolean", default: true },
        checkTests: { type: "boolean", default: true }
      },
      required: ["repoPath", "planId"]
    }
  }
];

// Cache for planners
const plannerCache = new Map<string, DeliveryPlanner>();

function getPlanner(repoPath: string): DeliveryPlanner {
  if (!plannerCache.has(repoPath)) {
    plannerCache.set(repoPath, new DeliveryPlanner(repoPath));
  }
  return plannerCache.get(repoPath)!;
}

// Create server
const server = new Server(
  {
    name: "delivery-planner-mcp-server",
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
      case "delivery_analyze_changes": {
        const input = AnalyzeChangesSchema.parse(args);
        const planner = getPlanner(input.repoPath);
        const changes = await planner.analyzeChanges(
          input.baseBranch,
          input.targetBranch,
          input.includePaths,
          input.excludePaths
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              id: changes.id,
              totalFiles: changes.files.length,
              totalLOC: changes.estimatedLOC,
              affectedModules: changes.affectedModules,
              breakingChanges: changes.breakingChanges.length,
              files: changes.files.slice(0, 20),
              hasMore: changes.files.length > 20
            }, null, 2)
          }]
        };
      }

      case "delivery_detect_breaking": {
        const input = DetectBreakingChangesSchema.parse(args);
        const planner = getPlanner(input.repoPath);
        const breakingChanges = await planner.detectBreakingChanges(input.changedFiles);

        return {
          content: [{ type: "text", text: JSON.stringify({ breakingChanges }, null, 2) }]
        };
      }

      case "delivery_slice_changes": {
        const input = SliceChangesSchema.parse(args);
        const planner = getPlanner(input.repoPath);

        // Convert file paths to FileChange objects
        const fileChanges = input.changedFiles.map(f => ({
          path: f,
          changeType: "modify" as const,
          additions: 50,
          deletions: 10,
          module: f.split("/")[0],
          isPublicAPI: f.includes("index.") || f.includes("/api/")
        }));

        const slices = planner.sliceChanges(
          fileChanges,
          input.strategy,
          input.maxFilesPerPR,
          input.maxLOCPerPR
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              totalSlices: slices.length,
              slices: slices.map(s => ({
                id: s.id,
                title: s.title,
                order: s.order,
                files: s.files.length,
                riskLevel: s.riskLevel,
                estimatedReviewTime: s.estimatedReviewTime
              }))
            }, null, 2)
          }]
        };
      }

      case "delivery_generate_flags": {
        const input = GenerateFeatureFlagsSchema.parse(args);
        const planner = getPlanner(input.repoPath);

        const slices = input.slices.map((s: any) => ({
          id: s.id || `slice-${Math.random().toString(36).substr(2, 9)}`,
          title: s.title || "Unnamed slice",
          description: s.description || "",
          files: s.files || [],
          order: s.order || 1,
          dependencies: [],
          estimatedReviewTime: "30 min",
          riskLevel: "medium" as const,
          testingStrategy: "",
          rollbackPlan: ""
        }));

        const flags = planner.generateFeatureFlags(slices, input.flagSystem, input.includeKillSwitch);

        return {
          content: [{ type: "text", text: JSON.stringify({ featureFlags: flags }, null, 2) }]
        };
      }

      case "delivery_generate_flag_code": {
        const input = GenerateFlagCodeSchema.parse(args);
        const planner = getPlanner(process.cwd());
        const code = planner.generateFlagCode(
          input.flagName,
          input.language,
          input.flagType,
          input.defaultValue
        );

        return {
          content: [{ type: "text", text: code }]
        };
      }

      case "delivery_create_rollout": {
        const input = CreateRolloutPlanSchema.parse(args);
        const planner = getPlanner(input.repoPath);
        const rolloutPlan = planner.createRolloutPlan(
          input.stages as any,
          input.metrics,
          input.autoRollback
        );

        return {
          content: [{ type: "text", text: JSON.stringify(rolloutPlan, null, 2) }]
        };
      }

      case "delivery_rollback_plan": {
        const input = GenerateRollbackPlanSchema.parse(args);
        const planner = getPlanner(input.repoPath);

        const dummySlice = {
          id: input.sliceId,
          title: input.sliceId,
          description: "",
          files: [],
          order: 1,
          dependencies: [],
          estimatedReviewTime: "",
          riskLevel: "medium" as const,
          testingStrategy: "",
          rollbackPlan: ""
        };

        const plan = planner.generateRollbackPlan(dummySlice);

        return {
          content: [{ type: "text", text: plan }]
        };
      }

      case "delivery_compatibility_plan": {
        const input = GenerateCompatibilityPlanSchema.parse(args);
        const planner = getPlanner(input.repoPath);

        const breakingChanges = input.breakingChanges.map(bc => ({
          type: bc.type as any,
          description: bc.description,
          affectedConsumers: bc.affectedConsumers,
          migrationRequired: true,
          severity: "high" as const
        }));

        const plan = planner.generateCompatibilityPlan(
          breakingChanges,
          input.deprecationPeriod,
          input.versioningStrategy
        );

        return {
          content: [{ type: "text", text: JSON.stringify(plan, null, 2) }]
        };
      }

      case "delivery_create_plan": {
        const input = CreateDeliveryPlanSchema.parse(args);
        const planner = getPlanner(input.repoPath);
        const plan = await planner.createDeliveryPlan(
          input.name,
          input.strategy,
          input.baseBranch,
          input.autoSlice
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              id: plan.id,
              name: plan.name,
              strategy: plan.strategy,
              totalChanges: plan.totalChanges,
              sliceCount: plan.slices.length,
              flagCount: plan.featureFlags.length,
              riskLevel: plan.riskAssessment.overallRisk,
              estimatedDuration: plan.estimatedDuration
            }, null, 2)
          }]
        };
      }

      case "delivery_get_plan": {
        const input = GetDeliveryPlanSchema.parse(args);
        const planner = getPlanner(input.repoPath);
        const plan = planner.getDeliveryPlan(input.planId);

        if (!plan) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Plan not found" }) }],
            isError: true
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(plan, null, 2) }]
        };
      }

      case "delivery_validate_plan": {
        const input = ValidateDeliveryPlanSchema.parse(args);
        const planner = getPlanner(input.repoPath);
        const result = planner.validateDeliveryPlan(input.planId);

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
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
  console.error("Delivery Planner MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
