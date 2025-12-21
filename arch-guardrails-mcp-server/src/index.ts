#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

import { ArchGuardrails } from "./services/guardrails.js";
import {
  InitConfigSchema,
  LoadConfigSchema,
  UpdateRuleSchema,
  AnalyzeSchema,
  AnalyzeLayersSchema,
  FindCircularDepsSchema,
  CheckSecuritySchema,
  GenerateReportSchema,
  GetScoreSchema
} from "./schemas/guardrails.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "arch_init",
    description: "Initialize architecture guardrails config with a preset (clean-architecture, mvc, hexagonal).",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        preset: { type: "string", enum: ["clean-architecture", "mvc", "hexagonal", "custom"], default: "mvc" },
        outputFile: { type: "string", default: ".arch-guardrails.json" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "arch_load_config",
    description: "Load existing architecture guardrails configuration.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        configFile: { type: "string" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "arch_update_rule",
    description: "Enable/disable or configure a specific architecture rule.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        ruleId: { type: "string", description: "Rule ID" },
        enabled: { type: "boolean" },
        severity: { type: "string", enum: ["error", "warning", "info"] },
        config: { type: "object" }
      },
      required: ["repoPath", "ruleId"]
    }
  },
  {
    name: "arch_analyze",
    description: "Run architecture analysis on the codebase. Checks all enabled rules.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        files: { type: "array", items: { type: "string" }, description: "Specific files" },
        rules: { type: "array", items: { type: "string" }, description: "Specific rules" },
        fix: { type: "boolean", default: false, description: "Auto-fix violations" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "arch_analyze_layers",
    description: "Analyze layer dependencies and violations.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        layers: { type: "array", items: { type: "object" }, description: "Layer definitions" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "arch_find_circular",
    description: "Find circular dependencies in the codebase.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        entryPoints: { type: "array", items: { type: "string" } }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "arch_check_security",
    description: "Run security-focused architecture checks (secrets, SQL injection, input validation).",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        files: { type: "array", items: { type: "string" } },
        rules: { type: "array", items: { type: "string", enum: ["no-secrets", "no-sql-injection", "validate-input"] } }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "arch_report",
    description: "Generate architecture analysis report in markdown, JSON, or HTML format.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        format: { type: "string", enum: ["json", "markdown", "html"], default: "markdown" },
        includeDetails: { type: "boolean", default: true },
        outputFile: { type: "string" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "arch_score",
    description: "Get the architecture health score (0-100).",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" }
      },
      required: ["repoPath"]
    }
  }
];

// Cache for guardrails instances
const guardrailsCache = new Map<string, ArchGuardrails>();

function getGuardrails(repoPath: string): ArchGuardrails {
  if (!guardrailsCache.has(repoPath)) {
    guardrailsCache.set(repoPath, new ArchGuardrails(repoPath));
  }
  return guardrailsCache.get(repoPath)!;
}

// Create server
const server = new Server(
  {
    name: "arch-guardrails-mcp-server",
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
      case "arch_init": {
        const input = InitConfigSchema.parse(args);
        const guardrails = getGuardrails(input.repoPath);
        const config = await guardrails.initConfig(input.preset, input.outputFile);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              preset: input.preset,
              configFile: input.outputFile,
              layers: config.layers?.length || 0,
              rules: Object.keys(config.rules).length
            }, null, 2)
          }]
        };
      }

      case "arch_load_config": {
        const input = LoadConfigSchema.parse(args);
        const guardrails = getGuardrails(input.repoPath);
        const config = await guardrails.loadConfig(input.configFile);

        if (!config) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: "No config file found. Run arch_init first." })
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              loaded: true,
              layers: config.layers?.length || 0,
              rules: Object.keys(config.rules).length
            }, null, 2)
          }]
        };
      }

      case "arch_update_rule": {
        const input = UpdateRuleSchema.parse(args);
        const guardrails = getGuardrails(input.repoPath);
        const rule = guardrails.updateRule(input.ruleId, input.enabled, input.severity, input.config);

        if (!rule) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: `Rule ${input.ruleId} not found` })
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              updated: true,
              rule: {
                id: rule.id,
                name: rule.name,
                enabled: rule.enabled,
                severity: rule.severity
              }
            }, null, 2)
          }]
        };
      }

      case "arch_analyze": {
        const input = AnalyzeSchema.parse(args);
        const guardrails = getGuardrails(input.repoPath);
        await guardrails.loadConfig();
        const result = await guardrails.analyze(input.files, input.rules, input.fix);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              score: result.score,
              files: result.analyzedFiles,
              violations: {
                total: result.violations.length,
                errors: result.bySeverity.error,
                warnings: result.bySeverity.warning,
                info: result.bySeverity.info
              },
              topIssues: result.violations.slice(0, 10).map(v => ({
                rule: v.ruleName,
                severity: v.severity,
                file: v.file,
                line: v.line,
                message: v.message
              }))
            }, null, 2)
          }]
        };
      }

      case "arch_analyze_layers": {
        const input = AnalyzeLayersSchema.parse(args);
        const guardrails = getGuardrails(input.repoPath);
        await guardrails.loadConfig();
        const result = await guardrails.analyzeLayers(input.layers);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              layers: result.layers,
              violations: result.violations.length,
              topViolations: result.violations.slice(0, 10).map(v => ({
                from: `${v.sourceLayer}:${v.sourceFile}`,
                to: `${v.targetLayer}:${v.targetFile}`,
                message: v.message
              })),
              graph: result.graph
            }, null, 2)
          }]
        };
      }

      case "arch_find_circular": {
        const input = FindCircularDepsSchema.parse(args);
        const guardrails = getGuardrails(input.repoPath);
        const cycles = await guardrails.findCircularDeps(input.entryPoints);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              found: cycles.length,
              cycles: cycles.slice(0, 20).map(c => c.join(" -> "))
            }, null, 2)
          }]
        };
      }

      case "arch_check_security": {
        const input = CheckSecuritySchema.parse(args);
        const guardrails = getGuardrails(input.repoPath);

        const securityRules = input.rules || ["no-secrets", "no-sql-injection", "validate-input"];
        const result = await guardrails.analyze(input.files, securityRules);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              issues: result.violations.length,
              critical: result.bySeverity.error,
              warnings: result.bySeverity.warning,
              findings: result.violations.map(v => ({
                rule: v.ruleName,
                severity: v.severity,
                file: v.file,
                line: v.line,
                message: v.message,
                suggestion: v.suggestion
              }))
            }, null, 2)
          }]
        };
      }

      case "arch_report": {
        const input = GenerateReportSchema.parse(args);
        const guardrails = getGuardrails(input.repoPath);
        await guardrails.loadConfig();
        const report = await guardrails.generateReport(input.format);

        return {
          content: [{
            type: "text",
            text: report
          }]
        };
      }

      case "arch_score": {
        const input = GetScoreSchema.parse(args);
        const guardrails = getGuardrails(input.repoPath);
        await guardrails.loadConfig();
        const result = await guardrails.analyze();

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              score: result.score,
              grade: result.score >= 90 ? "A" :
                     result.score >= 80 ? "B" :
                     result.score >= 70 ? "C" :
                     result.score >= 60 ? "D" : "F",
              violations: result.violations.length,
              files: result.analyzedFiles
            }, null, 2)
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
  console.error("Architecture Guardrails MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
