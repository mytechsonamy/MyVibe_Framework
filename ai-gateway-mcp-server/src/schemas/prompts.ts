import { z } from "zod";

// AI Role enum as Zod
export const AIRoleSchema = z.enum([
  "lead_analyst",
  "reviewer",
  "challenger",
  "architect",
  "alternative_explorer",
  "validator",
  "planner",
  "optimizer",
  "dependency_analyzer",
  "developer",
  "code_reviewer",
  "assistant"
]);

// Response format enum
export const ResponseFormatSchema = z.enum(["json", "markdown", "text"]);

// Artifact type enum
export const ArtifactTypeSchema = z.enum([
  "requirements",
  "architecture",
  "epic_breakdown",
  "task_list",
  "code",
  "test_plan",
  "documentation"
]);

// Invoke ChatGPT input schema
export const InvokeChatGPTSchema = z.object({
  prompt: z.string()
    .min(1, "Prompt cannot be empty")
    .max(100000, "Prompt too long")
    .describe("The prompt to send to ChatGPT"),
  role: AIRoleSchema
    .default("assistant")
    .describe("The role context for ChatGPT (affects system prompt)"),
  context: z.string()
    .optional()
    .describe("Additional context to prepend to the prompt"),
  temperature: z.number()
    .min(0)
    .max(2)
    .optional()
    .describe("Temperature for response generation (0-2, default varies by role)"),
  maxTokens: z.number()
    .int()
    .min(100)
    .max(16000)
    .optional()
    .describe("Maximum tokens in response (default: 8000)")
}).strict();

// Invoke Gemini input schema
export const InvokeGeminiSchema = z.object({
  prompt: z.string()
    .min(1, "Prompt cannot be empty")
    .max(100000, "Prompt too long")
    .describe("The prompt to send to Gemini"),
  role: AIRoleSchema
    .default("assistant")
    .describe("The role context for Gemini (affects system prompt)"),
  context: z.string()
    .optional()
    .describe("Additional context to prepend to the prompt"),
  temperature: z.number()
    .min(0)
    .max(2)
    .optional()
    .describe("Temperature for response generation (0-2, default varies by role)"),
  maxTokens: z.number()
    .int()
    .min(100)
    .max(32000)
    .optional()
    .describe("Maximum tokens in response (default: 8000)")
}).strict();

// Review artifact input schema
export const ReviewArtifactSchema = z.object({
  artifact: z.string()
    .min(1, "Artifact cannot be empty")
    .describe("The artifact content to review"),
  artifactType: ArtifactTypeSchema
    .describe("Type of artifact being reviewed"),
  context: z.string()
    .optional()
    .describe("Additional context about the artifact or project"),
  previousFeedback: z.string()
    .optional()
    .describe("Previous feedback to consider in the review"),
  responseFormat: ResponseFormatSchema
    .default("json")
    .describe("Desired response format")
}).strict();

// Challenge artifact input schema
export const ChallengeArtifactSchema = z.object({
  artifact: z.string()
    .min(1, "Artifact cannot be empty")
    .describe("The artifact content to challenge"),
  artifactType: ArtifactTypeSchema
    .describe("Type of artifact being challenged"),
  context: z.string()
    .optional()
    .describe("Additional context about the artifact or project"),
  focusAreas: z.array(z.string())
    .optional()
    .describe("Specific areas to focus challenges on (e.g., 'security', 'scalability')"),
  responseFormat: ResponseFormatSchema
    .default("json")
    .describe("Desired response format")
}).strict();

// Check consensus input schema
export const CheckConsensusSchema = z.object({
  artifact: z.string()
    .min(1, "Artifact cannot be empty")
    .describe("The artifact that was reviewed"),
  artifactType: ArtifactTypeSchema
    .describe("Type of artifact"),
  chatgptReview: z.string()
    .min(1, "ChatGPT review cannot be empty")
    .describe("The review response from ChatGPT"),
  geminiChallenge: z.string()
    .min(1, "Gemini challenge cannot be empty")
    .describe("The challenge response from Gemini")
}).strict();

// Export types inferred from schemas
export type InvokeChatGPTInput = z.infer<typeof InvokeChatGPTSchema>;
export type InvokeGeminiInput = z.infer<typeof InvokeGeminiSchema>;
export type ReviewArtifactInput = z.infer<typeof ReviewArtifactSchema>;
export type ChallengeArtifactInput = z.infer<typeof ChallengeArtifactSchema>;
export type CheckConsensusInput = z.infer<typeof CheckConsensusSchema>;
