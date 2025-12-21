#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

import { HotspotAnalyzer } from "./services/analyzer.js";
import {
  AnalyzeHotspotsSchema,
  GetFileHotspotSchema,
  AnalyzeChurnSchema,
  GetOwnershipMapSchema,
  FindOwnersSchema,
  AnalyzeDomainAreasSchema,
  GetTeamOwnershipSchema,
  FindBugProneFilesSchema,
  AnalyzeBugIndicatorsSchema,
  CalculateRiskModelSchema,
  GetRiskTrendSchema,
  IdentifyRiskFactorsSchema,
  AnalyzeAuthorContributionsSchema,
  GetFileAuthorsSchema,
  FindInactiveOwnersSchema
} from "./schemas/analyzer.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "hotspot_analyze",
    description: "Analyze code hotspots - files with high churn and complexity.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        days: { type: "number", default: 90, description: "Analysis period in days" },
        limit: { type: "number", default: 20, description: "Max hotspots to return" },
        includeStable: { type: "boolean", default: false }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "hotspot_file",
    description: "Get detailed hotspot analysis for a specific file.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        filePath: { type: "string", description: "File to analyze" },
        includeHistory: { type: "boolean", default: true }
      },
      required: ["repoPath", "filePath"]
    }
  },
  {
    name: "hotspot_churn",
    description: "Analyze code churn patterns over time.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        period: { type: "string", enum: ["week", "month", "quarter", "year"], default: "month" },
        groupBy: { type: "string", enum: ["file", "directory", "author"], default: "file" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "ownership_map",
    description: "Get ownership map for files based on git history.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        path: { type: "string", description: "Specific path to analyze" },
        minContributions: { type: "number", default: 3 }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "ownership_find",
    description: "Find owners for specific files.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        files: { type: "array", items: { type: "string" }, description: "Files to find owners for" }
      },
      required: ["repoPath", "files"]
    }
  },
  {
    name: "ownership_domains",
    description: "Analyze domain areas and their owners.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        depth: { type: "number", default: 2, description: "Directory depth for domain detection" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "ownership_teams",
    description: "Get team ownership distribution.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        teamMapping: { type: "object", description: "Team -> members mapping" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "bugs_find_prone",
    description: "Find bug-prone files based on commit history.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        days: { type: "number", default: 180, description: "Analysis period" },
        limit: { type: "number", default: 20 },
        bugPatterns: { type: "array", items: { type: "string" }, description: "Commit message patterns for bugs" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "bugs_indicators",
    description: "Analyze bug indicators for a specific file.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        filePath: { type: "string", description: "File to analyze" }
      },
      required: ["repoPath", "filePath"]
    }
  },
  {
    name: "risk_model",
    description: "Calculate overall risk model for the codebase.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        scope: { type: "string", enum: ["full", "changed", "critical"], default: "full" },
        baseBranch: { type: "string", default: "main" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "risk_trend",
    description: "Get risk trend over time.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        periods: { type: "number", default: 6 },
        periodType: { type: "string", enum: ["week", "month"], default: "month" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "risk_factors",
    description: "Identify specific risk factors for changes.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        changedFiles: { type: "array", items: { type: "string" } }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "authors_contributions",
    description: "Analyze author contributions to the codebase.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        days: { type: "number", default: 365 },
        minCommits: { type: "number", default: 5 }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "authors_file",
    description: "Get authors for a specific file.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        filePath: { type: "string", description: "File to analyze" }
      },
      required: ["repoPath", "filePath"]
    }
  },
  {
    name: "authors_inactive",
    description: "Find files with inactive owners.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        inactiveDays: { type: "number", default: 90 }
      },
      required: ["repoPath"]
    }
  }
];

// Cache for analyzer instances
const analyzerCache = new Map<string, HotspotAnalyzer>();

function getAnalyzer(repoPath: string): HotspotAnalyzer {
  if (!analyzerCache.has(repoPath)) {
    analyzerCache.set(repoPath, new HotspotAnalyzer(repoPath));
  }
  return analyzerCache.get(repoPath)!;
}

// Create server
const server = new Server(
  {
    name: "hotspot-analyzer-mcp-server",
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
      case "hotspot_analyze": {
        const input = AnalyzeHotspotsSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = await analyzer.analyzeHotspots(input.days, input.limit, input.includeStable);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              count: result.length,
              hotspots: result.map(h => ({
                path: h.path,
                churnScore: h.churnScore,
                complexityScore: h.complexityScore,
                bugProneness: h.bugProneness,
                riskLevel: h.riskLevel,
                changeFrequency: h.changeFrequency,
                authors: h.authors.length
              }))
            }, null, 2)
          }]
        };
      }

      case "hotspot_file": {
        const input = GetFileHotspotSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = await analyzer.getFileHotspot(input.filePath, input.includeHistory);

        if (!result) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "File not found" }) }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "hotspot_churn": {
        const input = AnalyzeChurnSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.analyzeChurn(input.period, input.groupBy);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              period: result.period,
              totalFiles: result.totalFiles,
              changedFiles: result.changedFiles,
              totalCommits: result.totalCommits,
              totalAuthors: result.totalAuthors,
              volatileFiles: result.volatileFiles.length,
              stableFiles: result.stableFiles.length,
              trends: result.trends
            }, null, 2)
          }]
        };
      }

      case "ownership_map": {
        const input = GetOwnershipMapSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.getOwnershipMap(input.path, input.minContributions);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              files: result.length,
              ownership: result.slice(0, 20).map(o => ({
                file: o.file,
                primaryOwner: o.primaryOwner,
                ownershipStrength: o.ownershipStrength,
                contributors: o.contributors.length
              }))
            }, null, 2)
          }]
        };
      }

      case "ownership_find": {
        const input = FindOwnersSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.findOwners(input.files);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "ownership_domains": {
        const input = AnalyzeDomainAreasSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.analyzeDomainAreas(input.depth);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              domains: result.length,
              areas: result.slice(0, 10).map(d => ({
                name: d.name,
                files: d.files.length,
                primaryOwners: d.primaryOwners,
                stability: d.stability,
                cohesion: d.cohesion
              }))
            }, null, 2)
          }]
        };
      }

      case "ownership_teams": {
        const input = GetTeamOwnershipSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.getTeamOwnership(input.teamMapping);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              teams: result.map(t => ({
                team: t.team,
                members: t.members.length,
                ownedFiles: t.ownedFiles,
                ownedAreas: t.ownedAreas.length,
                activity: t.activity
              }))
            }, null, 2)
          }]
        };
      }

      case "bugs_find_prone": {
        const input = FindBugProneFilesSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.findBugProneFiles(input.days, input.limit, input.bugPatterns);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              count: result.length,
              files: result.map(f => ({
                path: f.path,
                bugProneness: f.bugProneness,
                bugFixCommits: f.bugFixCommits,
                recentBugs: f.recentBugs,
                indicators: f.indicators.length,
                suggestedActions: f.suggestedActions
              }))
            }, null, 2)
          }]
        };
      }

      case "bugs_indicators": {
        const input = AnalyzeBugIndicatorsSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.analyzeBugIndicators(input.filePath);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ indicators: result }, null, 2)
          }]
        };
      }

      case "risk_model": {
        const input = CalculateRiskModelSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.calculateRiskModel(input.scope, input.baseBranch);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "risk_trend": {
        const input = GetRiskTrendSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.getRiskTrend(input.periods, input.periodType);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ trends: result }, null, 2)
          }]
        };
      }

      case "risk_factors": {
        const input = IdentifyRiskFactorsSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.identifyRiskFactors(input.changedFiles);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ factors: result }, null, 2)
          }]
        };
      }

      case "authors_contributions": {
        const input = AnalyzeAuthorContributionsSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.analyzeAuthorContributions(input.days, input.minCommits);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              authors: result.length,
              contributions: result.slice(0, 20)
            }, null, 2)
          }]
        };
      }

      case "authors_file": {
        const input = GetFileAuthorsSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.getFileAuthors(input.filePath);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ authors: result }, null, 2)
          }]
        };
      }

      case "authors_inactive": {
        const input = FindInactiveOwnersSchema.parse(args);
        const analyzer = getAnalyzer(input.repoPath);
        const result = analyzer.findInactiveOwners(input.inactiveDays);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              filesWithInactiveOwners: result.length,
              files: result.slice(0, 20)
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
  console.error("Hotspot Analyzer MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
