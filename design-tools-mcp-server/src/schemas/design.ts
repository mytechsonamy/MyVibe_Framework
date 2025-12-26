import { z } from "zod";

// ============================================================================
// FIGMA SCHEMAS
// ============================================================================

export const CreateFileSchema = z.object({
  projectId: z.string().describe("Project ID"),
  projectName: z.string().describe("Project name for the design file"),
  designType: z.enum(["wireframe", "mockup", "prototype"]).default("wireframe")
}).strict();

export const CreateFrameSchema = z.object({
  fileId: z.string().describe("Figma file ID"),
  frameName: z.string().describe("Name of the frame/artboard"),
  frameType: z.enum(["mobile", "tablet", "desktop", "component"]).default("mobile"),
  width: z.number().optional().describe("Frame width in pixels"),
  height: z.number().optional().describe("Frame height in pixels")
}).strict();

export const AddComponentSchema = z.object({
  fileId: z.string().describe("Figma file ID"),
  frameId: z.string().describe("Frame ID to add component to"),
  componentType: z.enum(["button", "input", "card", "nav", "modal", "list", "form", "header", "footer", "sidebar"]),
  properties: z.object({
    label: z.string().optional(),
    variant: z.string().optional(),
    size: z.enum(["sm", "md", "lg"]).optional(),
    disabled: z.boolean().optional(),
    icon: z.string().optional()
  }).optional()
}).strict();

export const CreateFlowSchema = z.object({
  fileId: z.string().describe("Figma file ID"),
  flowName: z.string().describe("Name of the user flow"),
  screens: z.array(z.string()).describe("List of screen/frame IDs"),
  connections: z.array(z.object({
    from: z.string(),
    to: z.string(),
    action: z.string(),
    condition: z.string().optional()
  }))
}).strict();

export const GetFileSchema = z.object({
  fileId: z.string().describe("Figma file ID")
}).strict();

// ============================================================================
// DESIGN TOKEN SCHEMAS
// ============================================================================

export const ExtractTokensSchema = z.object({
  fileId: z.string().describe("Figma file ID to extract tokens from")
}).strict();

export const ExportTokensSchema = z.object({
  fileId: z.string().describe("Figma file ID"),
  format: z.enum(["css", "scss", "json", "tailwind", "styled-components"]).default("css"),
  outputPath: z.string().optional().describe("Output file path")
}).strict();

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const ReviewAccessibilitySchema = z.object({
  fileId: z.string().describe("Figma file ID to review")
}).strict();

export const ReviewConsistencySchema = z.object({
  fileId: z.string().describe("Figma file ID to review"),
  designSystemId: z.string().optional().describe("Design system file ID to compare against")
}).strict();

// ============================================================================
// COMPONENT MAP SCHEMA
// ============================================================================

export const GenerateComponentMapSchema = z.object({
  fileId: z.string().describe("Figma file ID"),
  framework: z.enum(["react", "vue", "angular", "svelte"]).default("react"),
  outputPath: z.string().optional().describe("Output directory for component map")
}).strict();

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type CreateFileInput = z.infer<typeof CreateFileSchema>;
export type CreateFrameInput = z.infer<typeof CreateFrameSchema>;
export type AddComponentInput = z.infer<typeof AddComponentSchema>;
export type CreateFlowInput = z.infer<typeof CreateFlowSchema>;
export type GetFileInput = z.infer<typeof GetFileSchema>;
export type ExtractTokensInput = z.infer<typeof ExtractTokensSchema>;
export type ExportTokensInput = z.infer<typeof ExportTokensSchema>;
export type ReviewAccessibilityInput = z.infer<typeof ReviewAccessibilitySchema>;
export type ReviewConsistencyInput = z.infer<typeof ReviewConsistencySchema>;
export type GenerateComponentMapInput = z.infer<typeof GenerateComponentMapSchema>;
