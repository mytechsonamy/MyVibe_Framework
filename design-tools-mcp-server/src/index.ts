#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

import { DesignService } from "./services/design.js";
import {
  CreateFileSchema,
  CreateFrameSchema,
  AddComponentSchema,
  CreateFlowSchema,
  GetFileSchema,
  ExtractTokensSchema,
  ExportTokensSchema,
  ReviewAccessibilitySchema,
  ReviewConsistencySchema,
  GenerateComponentMapSchema
} from "./schemas/design.js";

// Tool definitions
const tools: Tool[] = [
  // ============================================================================
  // FIGMA TOOLS
  // ============================================================================
  {
    name: "design_create_file",
    description: "Create a new Figma design file for the project. Returns file ID and URL.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        projectName: { type: "string", description: "Project name for the design file" },
        designType: {
          type: "string",
          enum: ["wireframe", "mockup", "prototype"],
          default: "wireframe",
          description: "Type of design file"
        }
      },
      required: ["projectId", "projectName"]
    }
  },
  {
    name: "design_create_frame",
    description: "Create a new frame/artboard in a Figma file. Supports mobile, tablet, desktop, and component frames.",
    inputSchema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "Figma file ID" },
        frameName: { type: "string", description: "Name of the frame/artboard" },
        frameType: {
          type: "string",
          enum: ["mobile", "tablet", "desktop", "component"],
          default: "mobile"
        },
        width: { type: "number", description: "Frame width in pixels" },
        height: { type: "number", description: "Frame height in pixels" }
      },
      required: ["fileId", "frameName"]
    }
  },
  {
    name: "design_add_component",
    description: "Add a UI component to a Figma frame. Supports buttons, inputs, cards, navigation, modals, etc.",
    inputSchema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "Figma file ID" },
        frameId: { type: "string", description: "Frame ID to add component to" },
        componentType: {
          type: "string",
          enum: ["button", "input", "card", "nav", "modal", "list", "form", "header", "footer", "sidebar"]
        },
        properties: {
          type: "object",
          description: "Component properties (label, variant, size, etc.)"
        }
      },
      required: ["fileId", "frameId", "componentType"]
    }
  },
  {
    name: "design_create_flow",
    description: "Create a user flow diagram connecting screens with actions and conditions.",
    inputSchema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "Figma file ID" },
        flowName: { type: "string", description: "Name of the user flow" },
        screens: {
          type: "array",
          items: { type: "string" },
          description: "List of screen/frame IDs in the flow"
        },
        connections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              action: { type: "string" },
              condition: { type: "string" }
            },
            required: ["from", "to", "action"]
          },
          description: "Flow connections between screens"
        }
      },
      required: ["fileId", "flowName", "screens", "connections"]
    }
  },
  {
    name: "design_get_file",
    description: "Get Figma file details including frames, components, and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "Figma file ID" }
      },
      required: ["fileId"]
    }
  },
  // ============================================================================
  // DESIGN TOKEN TOOLS
  // ============================================================================
  {
    name: "design_extract_tokens",
    description: "Extract design tokens (colors, typography, spacing, shadows) from a Figma file.",
    inputSchema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "Figma file ID to extract tokens from" }
      },
      required: ["fileId"]
    }
  },
  {
    name: "design_export_tokens",
    description: "Export design tokens to CSS, SCSS, JSON, Tailwind config, or styled-components theme.",
    inputSchema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "Figma file ID" },
        format: {
          type: "string",
          enum: ["css", "scss", "json", "tailwind", "styled-components"],
          default: "css"
        },
        outputPath: { type: "string", description: "Output file path" }
      },
      required: ["fileId"]
    }
  },
  // ============================================================================
  // REVIEW TOOLS
  // ============================================================================
  {
    name: "design_review_accessibility",
    description: "Run accessibility checks on a design. Checks contrast, touch targets, labels, and WCAG compliance.",
    inputSchema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "Figma file ID to review" }
      },
      required: ["fileId"]
    }
  },
  {
    name: "design_review_consistency",
    description: "Check design consistency against design system rules. Validates spacing, typography, colors, and naming.",
    inputSchema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "Figma file ID to review" },
        designSystemId: { type: "string", description: "Design system file ID to compare against" }
      },
      required: ["fileId"]
    }
  },
  // ============================================================================
  // COMPONENT MAPPING
  // ============================================================================
  {
    name: "design_generate_component_map",
    description: "Generate component mapping for frontend development. Creates file structure and prop definitions.",
    inputSchema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "Figma file ID" },
        framework: {
          type: "string",
          enum: ["react", "vue", "angular", "svelte"],
          default: "react"
        },
        outputPath: { type: "string", description: "Output directory for component map" }
      },
      required: ["fileId"]
    }
  }
];

// Singleton design service
const designService = new DesignService();

// Create server
const server = new Server(
  {
    name: "design-tools-mcp-server",
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
      // ========================================================================
      // FIGMA TOOLS
      // ========================================================================
      case "design_create_file": {
        const input = CreateFileSchema.parse(args);
        const file = designService.createFile(
          input.projectId,
          input.projectName,
          input.designType
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              fileId: file.id,
              fileName: file.name,
              fileUrl: file.url,
              designType: file.designType
            }, null, 2)
          }]
        };
      }

      case "design_create_frame": {
        const input = CreateFrameSchema.parse(args);
        const frame = designService.createFrame(
          input.fileId,
          input.frameName,
          input.frameType,
          input.width,
          input.height
        );

        if (!frame) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "File not found" }) }],
            isError: true
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              frameId: frame.id,
              frameName: frame.name,
              dimensions: { width: frame.width, height: frame.height }
            }, null, 2)
          }]
        };
      }

      case "design_add_component": {
        const input = AddComponentSchema.parse(args);
        const component = designService.addComponent(
          input.fileId,
          input.frameId,
          input.componentType,
          input.properties
        );

        if (!component) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "File or frame not found" }) }],
            isError: true
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              componentId: component.id,
              componentName: component.name,
              componentType: component.type,
              variants: component.variants.length,
              properties: component.properties.length
            }, null, 2)
          }]
        };
      }

      case "design_create_flow": {
        const input = CreateFlowSchema.parse(args);
        const flow = designService.createFlow(
          input.fileId,
          input.flowName,
          input.screens,
          input.connections
        );

        if (!flow) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "File not found" }) }],
            isError: true
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              flowId: flow.id,
              flowName: flow.name,
              screenCount: flow.screens.length,
              connectionCount: flow.connections.length
            }, null, 2)
          }]
        };
      }

      case "design_get_file": {
        const input = GetFileSchema.parse(args);
        const file = designService.getFile(input.fileId);

        if (!file) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "File not found" }) }],
            isError: true
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              id: file.id,
              name: file.name,
              url: file.url,
              designType: file.designType,
              frameCount: file.frames.length,
              componentCount: file.components.length,
              frames: file.frames.map(f => ({
                id: f.id,
                name: f.name,
                type: f.type,
                dimensions: { width: f.width, height: f.height },
                childCount: f.children.length
              })),
              lastModified: file.lastModified
            }, null, 2)
          }]
        };
      }

      // ========================================================================
      // DESIGN TOKEN TOOLS
      // ========================================================================
      case "design_extract_tokens": {
        const input = ExtractTokensSchema.parse(args);
        const tokens = designService.extractTokens(input.fileId);

        if (!tokens) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "File not found" }) }],
            isError: true
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              extracted: {
                colors: tokens.colors.length,
                typography: tokens.typography.length,
                spacing: tokens.spacing.length,
                shadows: tokens.shadows.length,
                borderRadius: tokens.borderRadius.length
              },
              tokens
            }, null, 2)
          }]
        };
      }

      case "design_export_tokens": {
        const input = ExportTokensSchema.parse(args);
        const result = designService.exportTokens(input.fileId, input.format);

        if (!result) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Tokens not found. Run design_extract_tokens first." }) }],
            isError: true
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              format: input.format,
              filename: result.filename,
              content: result.content
            }, null, 2)
          }]
        };
      }

      // ========================================================================
      // REVIEW TOOLS
      // ========================================================================
      case "design_review_accessibility": {
        const input = ReviewAccessibilitySchema.parse(args);
        const report = designService.reviewAccessibility(input.fileId);

        if (!report) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "File not found" }) }],
            isError: true
          };
        }

        const summary = `
## Accessibility Review Report

**Score**: ${report.score}/100 ${report.score >= 80 ? "✅" : report.score >= 60 ? "⚠️" : "❌"}

### Issues Found (${report.issues.length})
${report.issues.map(i => `- **[${i.severity.toUpperCase()}]** ${i.element}: ${i.description}
  - WCAG: ${i.wcagCriteria}
  - Fix: ${i.suggestion}`).join("\n\n")}

### Passed Checks
${report.passed.map(p => `- ✅ ${p}`).join("\n")}

### Recommendations
${report.suggestions.map(s => `- 💡 ${s}`).join("\n")}
`;

        return {
          content: [{ type: "text", text: summary }]
        };
      }

      case "design_review_consistency": {
        const input = ReviewConsistencySchema.parse(args);
        const report = designService.reviewConsistency(input.fileId, input.designSystemId);

        if (!report) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "File not found" }) }],
            isError: true
          };
        }

        const summary = `
## Design Consistency Report

**Score**: ${report.score}/100 ${report.score >= 80 ? "✅" : report.score >= 60 ? "⚠️" : "❌"}

### Violations Found (${report.violations.length})
${report.violations.map(v => `- **${v.type.toUpperCase()}** - ${v.element}
  - Expected: ${v.expected}
  - Actual: ${v.actual}
  - Fix: ${v.suggestion}`).join("\n\n")}

### Recommendations
${report.suggestions.map(s => `- 💡 ${s}`).join("\n")}
`;

        return {
          content: [{ type: "text", text: summary }]
        };
      }

      // ========================================================================
      // COMPONENT MAPPING
      // ========================================================================
      case "design_generate_component_map": {
        const input = GenerateComponentMapSchema.parse(args);
        const result = designService.generateComponentMap(input.fileId, input.framework);

        if (!result) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "File not found" }) }],
            isError: true
          };
        }

        const summary = `
## Component Map Generated

**Framework**: ${input.framework}
**Components**: ${result.components.length}

### Component Structure
\`\`\`
${result.tree.path}/
${result.components.map(c => `├── ${c.componentName}`).join("\n")}
\`\`\`

### Component Details
${result.components.map(c => `
#### ${c.componentName}
- **File**: \`${c.filePath}\`
- **Figma**: ${c.figmaName} (${c.figmaId})
- **Props**: ${c.props.map(p => `\`${p.name}: ${p.type}\``).join(", ")}`).join("\n")}
`;

        return {
          content: [{ type: "text", text: summary }]
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
  console.error("Design Tools MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
