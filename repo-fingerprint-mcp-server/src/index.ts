#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

import { RepoFingerprinter } from "./services/fingerprint.js";
import {
  CreateFingerprintSchema,
  GetFingerprintSchema,
  UpdateFingerprintSchema,
  AnalyzeCodingStyleSchema,
  AnalyzeNamingSchema,
  AnalyzeErrorHandlingSchema,
  AnalyzeLoggingSchema,
  DetectPatternsSchema,
  LearnCustomPatternSchema,
  ValidateAgainstFingerprintSchema,
  AnalyzeStructureSchema,
  AnalyzeDependenciesSchema,
  AnalyzeTestingPatternsSchema,
  GenerateStyleGuideSchema,
  GenerateTemplateSchema,
  SuggestConventionSchema
} from "./schemas/fingerprint.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "fingerprint_create",
    description: "Create a fingerprint of the repository's coding style and patterns.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        deep: { type: "boolean", default: false, description: "Perform deep analysis" },
        includeTests: { type: "boolean", default: true },
        maxFiles: { type: "number", default: 100 }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_get",
    description: "Get the existing fingerprint for a repository.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_update",
    description: "Update the fingerprint with new analysis.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        incrementalOnly: { type: "boolean", default: true }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_coding_style",
    description: "Analyze the coding style of the repository.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        files: { type: "array", items: { type: "string" } },
        sampleSize: { type: "number", default: 20 }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_naming",
    description: "Analyze naming conventions in the repository.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        scope: { type: "string", enum: ["all", "files", "code"], default: "all" }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_error_handling",
    description: "Analyze error handling patterns.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        includeExamples: { type: "boolean", default: true }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_logging",
    description: "Analyze logging standards.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        includeExamples: { type: "boolean", default: true }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_detect_patterns",
    description: "Detect common code patterns.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        patternType: { type: "string", enum: ["all", "error", "async", "import", "export", "custom"], default: "all" },
        minOccurrences: { type: "number", default: 3 }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_learn_pattern",
    description: "Learn a custom pattern from the repository.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        name: { type: "string", description: "Pattern name" },
        description: { type: "string", description: "Pattern description" },
        regex: { type: "string", description: "Pattern regex" },
        category: { type: "string" }
      },
      required: ["repoPath", "name", "description", "regex"]
    }
  },
  {
    name: "fingerprint_validate",
    description: "Validate code against the fingerprint.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        code: { type: "string", description: "Code to validate" },
        context: { type: "string" }
      },
      required: ["repoPath", "code"]
    }
  },
  {
    name: "fingerprint_structure",
    description: "Analyze project structure.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        depth: { type: "number", default: 3 }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_dependencies",
    description: "Analyze project dependencies.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        includeDevDeps: { type: "boolean", default: true }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_testing",
    description: "Analyze testing patterns.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        includeExamples: { type: "boolean", default: true }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_style_guide",
    description: "Generate a style guide from the fingerprint.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        format: { type: "string", enum: ["markdown", "json", "html"], default: "markdown" },
        sections: { type: "array", items: { type: "string" } }
      },
      required: ["repoPath"]
    }
  },
  {
    name: "fingerprint_template",
    description: "Generate a code template following project conventions.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        templateType: { type: "string", enum: ["function", "class", "component", "test", "service", "controller"] },
        name: { type: "string", description: "Template name" },
        options: { type: "object" }
      },
      required: ["repoPath", "templateType", "name"]
    }
  },
  {
    name: "fingerprint_suggest",
    description: "Suggest naming convention for new code.",
    inputSchema: {
      type: "object",
      properties: {
        repoPath: { type: "string", description: "Repository path" },
        codeType: { type: "string", enum: ["function", "class", "variable", "constant", "file", "directory"] },
        context: { type: "string", description: "Context or purpose" }
      },
      required: ["repoPath", "codeType", "context"]
    }
  }
];

// Cache for fingerprinter instances
const fingerprinterCache = new Map<string, RepoFingerprinter>();

function getFingerprinter(repoPath: string): RepoFingerprinter {
  if (!fingerprinterCache.has(repoPath)) {
    fingerprinterCache.set(repoPath, new RepoFingerprinter(repoPath));
  }
  return fingerprinterCache.get(repoPath)!;
}

// Create server
const server = new Server(
  {
    name: "repo-fingerprint-mcp-server",
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
      case "fingerprint_create": {
        const input = CreateFingerprintSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = await fingerprinter.createFingerprint(
          input.deep,
          input.includeTests,
          input.maxFiles
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              id: result.id,
              language: result.language,
              framework: result.framework,
              codingStyle: {
                indentation: result.codingStyle.indentation,
                quotes: result.codingStyle.quotes,
                semicolons: result.codingStyle.semicolons,
                asyncStyle: result.codingStyle.asyncStyle
              },
              errorHandling: result.errorHandling.primaryPattern,
              logging: result.loggingStandards.library,
              structure: result.projectStructure.type
            }, null, 2)
          }]
        };
      }

      case "fingerprint_get": {
        const input = GetFingerprintSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.getFingerprint();

        if (!result) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "No fingerprint found. Run fingerprint_create first." }) }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              id: result.id,
              language: result.language,
              framework: result.framework,
              createdAt: result.createdAt,
              updatedAt: result.updatedAt
            }, null, 2)
          }]
        };
      }

      case "fingerprint_update": {
        const input = UpdateFingerprintSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = await fingerprinter.updateFingerprint(input.incrementalOnly);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              updated: true,
              id: result.id,
              updatedAt: result.updatedAt
            }, null, 2)
          }]
        };
      }

      case "fingerprint_coding_style": {
        const input = AnalyzeCodingStyleSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = await fingerprinter.analyzeCodingStyle(input.sampleSize);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "fingerprint_naming": {
        const input = AnalyzeNamingSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.analyzeNaming(input.scope);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              files: { style: result.files.style, confidence: result.files.confidence },
              classes: { style: result.classes.style, confidence: result.classes.confidence },
              functions: { style: result.functions.style, confidence: result.functions.confidence },
              variables: { style: result.variables.style, confidence: result.variables.confidence },
              prefixes: result.prefixes.slice(0, 5),
              suffixes: result.suffixes.slice(0, 5)
            }, null, 2)
          }]
        };
      }

      case "fingerprint_error_handling": {
        const input = AnalyzeErrorHandlingSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.analyzeErrorHandling(input.includeExamples);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "fingerprint_logging": {
        const input = AnalyzeLoggingSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.analyzeLogging(input.includeExamples);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "fingerprint_detect_patterns": {
        const input = DetectPatternsSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.detectPatterns(input.patternType, input.minOccurrences);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              count: result.length,
              patterns: result.slice(0, 20)
            }, null, 2)
          }]
        };
      }

      case "fingerprint_learn_pattern": {
        const input = LearnCustomPatternSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.learnCustomPattern(
          input.name,
          input.description,
          input.regex,
          input.category
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "fingerprint_validate": {
        const input = ValidateAgainstFingerprintSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.validateAgainstFingerprint(input.code, input.context);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "fingerprint_structure": {
        const input = AnalyzeStructureSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.analyzeStructure(input.depth);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              type: result.type,
              srcDirectory: result.srcDirectory,
              testDirectory: result.testDirectory,
              modulePattern: result.modulePattern,
              entryPoints: result.entryPoints,
              directories: result.directories.slice(0, 15)
            }, null, 2)
          }]
        };
      }

      case "fingerprint_dependencies": {
        const input = AnalyzeDependenciesSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.analyzeDependencies(input.includeDevDeps);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "fingerprint_testing": {
        const input = AnalyzeTestingPatternsSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.analyzeTestingPatterns(input.includeExamples);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "fingerprint_style_guide": {
        const input = GenerateStyleGuideSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.generateStyleGuide(input.format);

        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      }

      case "fingerprint_template": {
        const input = GenerateTemplateSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.generateTemplate(
          input.templateType,
          input.name,
          input.options
        );

        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      }

      case "fingerprint_suggest": {
        const input = SuggestConventionSchema.parse(args);
        const fingerprinter = getFingerprinter(input.repoPath);
        const result = fingerprinter.suggestConvention(input.codeType, input.context);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
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
  console.error("Repo Fingerprint MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
