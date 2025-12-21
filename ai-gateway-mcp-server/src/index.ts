// Load .env file silently (quiet mode prevents stdout pollution that breaks MCP stdio)
import dotenv from "dotenv";
dotenv.config({ quiet: true } as dotenv.DotenvConfigOptions);

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { invokeChatGPT, chatGPTReview } from "./services/openai-client.js";
import { invokeGemini, geminiChallenge } from "./services/google-client.js";
import {
  AIRole,
  ConsensusStatus,
  ConsensusResult,
  DisagreementItem,
  DisagreementSeverity,
  NegotiationRound,
  NegotiationResult
} from "./types.js";
import { ARTIFACT_REVIEW_CONTEXT } from "./constants.js";
import {
  InvokeChatGPTSchema,
  InvokeGeminiSchema,
  ReviewArtifactSchema,
  ChallengeArtifactSchema,
  CheckConsensusSchema
} from "./schemas/prompts.js";
import { initLogger, SDLCLogger, TokenUsage } from "./services/logger.js";

// Initialize logger
const logger: SDLCLogger = initLogger('ai-gateway');

// Extended schemas with project context for token tracking
const ExtendedChatGPTSchema = InvokeChatGPTSchema.extend({
  projectId: z.string().optional().describe("Project ID for token tracking"),
  projectName: z.string().optional().describe("Project name for token tracking"),
  phase: z.string().optional().describe("Current SDLC phase for logging")
});

const ExtendedGeminiSchema = InvokeGeminiSchema.extend({
  projectId: z.string().optional().describe("Project ID for token tracking"),
  projectName: z.string().optional().describe("Project name for token tracking"),
  phase: z.string().optional().describe("Current SDLC phase for logging")
});

const ExtendedReviewSchema = ReviewArtifactSchema.extend({
  projectId: z.string().optional().describe("Project ID for token tracking"),
  projectName: z.string().optional().describe("Project name for token tracking"),
  phase: z.string().optional().describe("Current SDLC phase for logging")
});

const ExtendedChallengeSchema = ChallengeArtifactSchema.extend({
  projectId: z.string().optional().describe("Project ID for token tracking"),
  projectName: z.string().optional().describe("Project name for token tracking"),
  phase: z.string().optional().describe("Current SDLC phase for logging")
});

// Create MCP Server
const server = new McpServer({
  name: "ai-gateway-mcp-server",
  version: "1.0.0"
});

// ============================================================================
// TOOL: ai_invoke_chatgpt
// ============================================================================
server.tool(
  "ai_invoke_chatgpt",
  "Send a prompt to ChatGPT with a specific role context. The role determines the system prompt and behavior. Use this for direct ChatGPT interactions in the SDLC workflow.",
  ExtendedChatGPTSchema.shape,
  async (params) => {
    const startTime = Date.now();
    try {
      const { prompt, role, context, temperature, maxTokens, projectId, projectName, phase } = params;

      const response = await invokeChatGPT(prompt, {
        role: role as AIRole,
        context,
        temperature,
        maxTokens
      });

      // Always log token usage (use 'unknown' for missing project context)
      if (response.tokensUsed) {
        const tokens: TokenUsage = {
          promptTokens: response.tokensUsed.prompt,
          completionTokens: response.tokensUsed.completion,
          totalTokens: response.tokensUsed.total
        };
        logger.logAIInvocation(
          projectId || 'unknown',
          projectName || 'unknown',
          'chatgpt',
          phase || 'unknown',
          'generate',
          role as string,
          tokens,
          Date.now() - startTime,
          true,
          response.approved,
          'gpt-5.2'
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              provider: response.provider,
              role: response.role,
              approved: response.approved,
              response: response.content,
              feedback: response.feedback,
              tokensUsed: response.tokensUsed,
              timestamp: response.timestamp
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Always log errors
      const { projectId, projectName, phase, role } = params;
      logger.logAIInvocation(
        projectId || 'unknown',
        projectName || 'unknown',
        'chatgpt',
        phase || 'unknown',
        'generate',
        role as string,
        null,
        Date.now() - startTime,
        false,
        undefined,
        'gpt-5.2',
        errorMessage
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: ai_invoke_gemini
// ============================================================================
server.tool(
  "ai_invoke_gemini",
  "Send a prompt to Google Gemini with a specific role context. The role determines the system prompt and behavior. Use this for direct Gemini interactions in the SDLC workflow.",
  ExtendedGeminiSchema.shape,
  async (params) => {
    const startTime = Date.now();
    try {
      const { prompt, role, context, temperature, maxTokens, projectId, projectName, phase } = params;

      const response = await invokeGemini(prompt, {
        role: role as AIRole,
        context,
        temperature,
        maxTokens
      });

      // Always log token usage (use 'unknown' for missing project context)
      if (response.tokensUsed) {
        const tokens: TokenUsage = {
          promptTokens: response.tokensUsed.prompt,
          completionTokens: response.tokensUsed.completion,
          totalTokens: response.tokensUsed.total
        };
        logger.logAIInvocation(
          projectId || 'unknown',
          projectName || 'unknown',
          'gemini',
          phase || 'unknown',
          'generate',
          role as string,
          tokens,
          Date.now() - startTime,
          true,
          response.approved,
          'gemini-3-flash'
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              provider: response.provider,
              role: response.role,
              approved: response.approved,
              response: response.content,
              challenges: response.challenges,
              tokensUsed: response.tokensUsed,
              timestamp: response.timestamp
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Always log errors
      const { projectId, projectName, phase, role } = params;
      logger.logAIInvocation(
        projectId || 'unknown',
        projectName || 'unknown',
        'gemini',
        phase || 'unknown',
        'generate',
        role as string,
        null,
        Date.now() - startTime,
        false,
        undefined,
        'gemini-3-flash',
        errorMessage
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: ai_review_artifact
// ============================================================================
server.tool(
  "ai_review_artifact",
  "Submit an artifact (requirements, architecture, code, etc.) to ChatGPT for review. Returns structured feedback with approval status, issues found, and suggestions for improvement.",
  ExtendedReviewSchema.shape,
  async (params) => {
    const startTime = Date.now();
    try {
      const { artifact, artifactType, context, previousFeedback, projectId, projectName, phase } = params;

      // Build context with artifact-specific guidance
      const reviewContext = [
        ARTIFACT_REVIEW_CONTEXT[artifactType],
        context,
        previousFeedback ? `\nPrevious feedback to consider:\n${previousFeedback}` : ""
      ].filter(Boolean).join("\n\n");

      const response = await chatGPTReview(artifact, artifactType, reviewContext);

      // Always log token usage (use 'unknown' for missing project context)
      if (response.tokensUsed) {
        const tokens: TokenUsage = {
          promptTokens: response.tokensUsed.prompt,
          completionTokens: response.tokensUsed.completion,
          totalTokens: response.tokensUsed.total
        };
        logger.logAIInvocation(
          projectId || 'unknown',
          projectName || 'unknown',
          'chatgpt',
          phase || artifactType,
          'review',
          'reviewer',
          tokens,
          Date.now() - startTime,
          true,
          response.approved,
          'gpt-5.2'
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              artifactType,
              approved: response.approved,
              review: response.content,
              feedback: response.feedback,
              tokensUsed: response.tokensUsed,
              timestamp: response.timestamp
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Always log errors
      const { projectId, projectName, phase, artifactType } = params;
      logger.logAIInvocation(
        projectId || 'unknown',
        projectName || 'unknown',
        'chatgpt',
        phase || artifactType,
        'review',
        'reviewer',
        null,
        Date.now() - startTime,
        false,
        undefined,
        'gpt-5.2',
        errorMessage
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: ai_challenge_artifact
// ============================================================================
server.tool(
  "ai_challenge_artifact",
  "Submit an artifact to Gemini for challenging. Returns edge cases, contradictions, security concerns, and other potential issues that need to be addressed.",
  ExtendedChallengeSchema.shape,
  async (params) => {
    const startTime = Date.now();
    try {
      const { artifact, artifactType, context, focusAreas, projectId, projectName, phase } = params;

      // Build context with artifact-specific guidance
      const challengeContext = [
        ARTIFACT_REVIEW_CONTEXT[artifactType],
        context
      ].filter(Boolean).join("\n\n");

      const response = await geminiChallenge(artifact, artifactType, challengeContext, focusAreas);

      // Always log token usage (use 'unknown' for missing project context)
      if (response.tokensUsed) {
        const tokens: TokenUsage = {
          promptTokens: response.tokensUsed.prompt,
          completionTokens: response.tokensUsed.completion,
          totalTokens: response.tokensUsed.total
        };
        logger.logAIInvocation(
          projectId || 'unknown',
          projectName || 'unknown',
          'gemini',
          phase || artifactType,
          'challenge',
          'challenger',
          tokens,
          Date.now() - startTime,
          true,
          response.approved,
          'gemini-3-flash'
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              artifactType,
              approved: response.approved,
              challenge: response.content,
              challenges: response.challenges,
              tokensUsed: response.tokensUsed,
              timestamp: response.timestamp
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Always log errors
      const { projectId, projectName, phase, artifactType } = params;
      logger.logAIInvocation(
        projectId || 'unknown',
        projectName || 'unknown',
        'gemini',
        phase || artifactType,
        'challenge',
        'challenger',
        null,
        Date.now() - startTime,
        false,
        undefined,
        'gemini-3-flash',
        errorMessage
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: ai_check_consensus
// ============================================================================

// Helper: Extract disagreements from AI responses
function extractDisagreements(
  chatgptReview: string,
  geminiChallenge: string,
  chatgptApproved: boolean,
  geminiApproved: boolean
): DisagreementItem[] {
  const disagreements: DisagreementItem[] = [];

  try {
    const chatgptData = JSON.parse(chatgptReview);
    const geminiData = JSON.parse(geminiChallenge);

    // Extract feedback items from ChatGPT
    const chatgptFeedback = chatgptData.feedback || chatgptData.issues || [];
    const geminiChallenges = geminiData.challenges || geminiData.issues || [];

    // Map ChatGPT feedback to disagreements
    if (Array.isArray(chatgptFeedback)) {
      chatgptFeedback.forEach((item: any, idx: number) => {
        const severity = mapSeverity(item.severity || item.priority || "medium");
        disagreements.push({
          id: `chatgpt-${idx}`,
          topic: item.description || item.issue || item.message || String(item),
          severity,
          chatgptPosition: item.suggestion || item.recommendation || "Needs attention",
          geminiPosition: "Not addressed",
          resolved: false
        });
      });
    }

    // Map Gemini challenges to disagreements
    if (Array.isArray(geminiChallenges)) {
      geminiChallenges.forEach((item: any, idx: number) => {
        const severity = mapSeverity(item.impact || item.severity || "medium");
        // Check if already exists from ChatGPT
        const existing = disagreements.find(d =>
          d.topic.toLowerCase().includes(item.description?.toLowerCase()?.substring(0, 20) || "")
        );
        if (!existing) {
          disagreements.push({
            id: `gemini-${idx}`,
            topic: item.description || item.challenge || item.message || String(item),
            severity,
            chatgptPosition: "Not addressed",
            geminiPosition: item.resolution || item.suggestion || "Needs resolution",
            resolved: false
          });
        }
      });
    }
  } catch {
    // If parsing fails, create a generic disagreement
    if (!chatgptApproved || !geminiApproved) {
      disagreements.push({
        id: "generic-1",
        topic: "AI agents have differing opinions on artifact quality",
        severity: "high",
        chatgptPosition: chatgptApproved ? "Approved" : "Not approved",
        geminiPosition: geminiApproved ? "Approved" : "Not approved",
        resolved: false
      });
    }
  }

  return disagreements;
}

// Helper: Map various severity formats to standard
function mapSeverity(input: string): DisagreementSeverity {
  const normalized = input.toLowerCase();
  if (normalized.includes("critical") || normalized.includes("blocker")) return "critical";
  if (normalized.includes("high") || normalized.includes("major")) return "high";
  if (normalized.includes("low") || normalized.includes("minor") || normalized.includes("trivial")) return "low";
  return "medium";
}

// Helper: Auto-resolve low severity issues
function autoResolveLowSeverity(disagreements: DisagreementItem[]): DisagreementItem[] {
  return disagreements.map(d => {
    if (d.severity === "low" && !d.resolved) {
      return {
        ...d,
        resolved: true,
        resolvedBy: "auto" as const,
        suggestedResolution: "Auto-resolved: Low severity issue will be addressed in implementation"
      };
    }
    return d;
  });
}

server.tool(
  "ai_check_consensus",
  "Check if both ChatGPT (reviewer) and Gemini (challenger) have approved an artifact. Returns consensus status, combined feedback, and extracted disagreements for negotiation. Use this to determine if an artifact is ready for human approval or needs agent negotiation.",
  CheckConsensusSchema.shape,
  async (params) => {
    try {
      const { artifact, artifactType, chatgptReview, geminiChallenge } = params;

      // Parse ChatGPT review
      let chatgptApproved = false;
      let chatgptNotes = "";
      let chatgptFeedbackItems: any[] = [];
      try {
        const chatgptData = JSON.parse(chatgptReview);
        chatgptApproved = chatgptData.approved === true;
        chatgptNotes = chatgptData.summary || chatgptData.notes || "";
        chatgptFeedbackItems = chatgptData.feedback || chatgptData.issues || [];
      } catch {
        chatgptApproved = chatgptReview.toLowerCase().includes('"approved": true') ||
                         chatgptReview.toLowerCase().includes('approved: true');
        chatgptNotes = "Unable to parse structured response";
      }

      // Parse Gemini challenge
      let geminiApproved = false;
      let geminiNotes = "";
      let geminiChallengeItems: any[] = [];
      try {
        const geminiData = JSON.parse(geminiChallenge);
        geminiApproved = geminiData.approved === true;
        geminiNotes = geminiData.summary || geminiData.notes || "";
        geminiChallengeItems = geminiData.challenges || geminiData.issues || [];
      } catch {
        geminiApproved = geminiChallenge.toLowerCase().includes('"approved": true') ||
                        geminiChallenge.toLowerCase().includes('approved: true');
        geminiNotes = "Unable to parse structured response";
      }

      // Extract disagreements for potential negotiation
      let disagreements = extractDisagreements(
        chatgptReview,
        geminiChallenge,
        chatgptApproved,
        geminiApproved
      );

      // Auto-resolve low severity issues
      disagreements = autoResolveLowSeverity(disagreements);

      // Count unresolved by severity
      const unresolvedCritical = disagreements.filter(d => !d.resolved && d.severity === "critical");
      const unresolvedHigh = disagreements.filter(d => !d.resolved && d.severity === "high");
      const unresolvedMedium = disagreements.filter(d => !d.resolved && d.severity === "medium");
      const totalUnresolved = disagreements.filter(d => !d.resolved);

      // Determine consensus status
      let status: ConsensusStatus;
      let requiresHumanIntervention = false;

      if (chatgptApproved && geminiApproved) {
        status = ConsensusStatus.APPROVED;
      } else if (!chatgptApproved && !geminiApproved) {
        status = ConsensusStatus.REJECTED;
      } else {
        // Partial approval - check if negotiation can resolve
        status = ConsensusStatus.NEEDS_REVISION;
      }

      // Combined feedback
      const combinedFeedback: string[] = [];
      if (!chatgptApproved) {
        combinedFeedback.push(`ChatGPT: ${chatgptNotes || "Review not approved"}`);
      }
      if (!geminiApproved) {
        combinedFeedback.push(`Gemini: ${geminiNotes || "Challenge not passed"}`);
      }

      const result: ConsensusResult = {
        status,
        chatgpt: {
          approved: chatgptApproved,
          notes: chatgptNotes
        },
        gemini: {
          approved: geminiApproved,
          notes: geminiNotes
        },
        combinedFeedback,
        readyForHumanApproval: status === ConsensusStatus.APPROVED,
        negotiationRound: 0,
        unresolvedCriticalIssues: unresolvedCritical,
        requiresHumanIntervention
      };

      // Determine next action recommendation
      let nextAction = "";
      let shouldNegotiate = false;

      if (status === ConsensusStatus.APPROVED) {
        nextAction = "ready_for_human_approval";
      } else if (totalUnresolved.length > 0) {
        shouldNegotiate = true;
        nextAction = "start_negotiation";
      } else {
        nextAction = "iterate_with_feedback";
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              artifactType,
              consensus: result,
              disagreements: {
                total: disagreements.length,
                resolved: disagreements.filter(d => d.resolved).length,
                unresolved: totalUnresolved.length,
                bySeverity: {
                  critical: unresolvedCritical.length,
                  high: unresolvedHigh.length,
                  medium: unresolvedMedium.length
                },
                items: disagreements
              },
              nextAction,
              shouldNegotiate,
              message: result.readyForHumanApproval
                ? "✅ Consensus reached! Artifact is ready for human approval."
                : shouldNegotiate
                  ? `🔄 Consensus not reached. ${totalUnresolved.length} unresolved issue(s). Use ai_negotiate to attempt resolution.`
                  : `⚠️ Consensus not reached. Status: ${status}. See combined feedback for details.`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// ============================================================================
// TOOL: ai_negotiate
// ============================================================================

const NegotiateSchema = z.object({
  artifact: z.string().describe("The artifact being discussed"),
  artifactType: z.enum([
    "requirements", "architecture", "epic_breakdown",
    "task_list", "code", "test_plan", "documentation"
  ]).describe("Type of artifact"),
  disagreements: z.array(z.object({
    id: z.string(),
    topic: z.string(),
    severity: z.enum(["low", "medium", "high", "critical"]),
    chatgptPosition: z.string(),
    geminiPosition: z.string(),
    resolved: z.boolean().default(false)
  })).describe("List of disagreements to resolve"),
  currentIteration: z.number().describe("Current iteration number"),
  maxIterations: z.number().describe("Maximum iterations allowed for this phase"),
  maxNegotiationRounds: z.number().default(3).describe("Maximum negotiation rounds before escalation"),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  phase: z.string().optional()
});

server.tool(
  "ai_negotiate",
  "Facilitate negotiation between ChatGPT and Gemini to resolve disagreements on an artifact. Agents will attempt to find common ground. Only escalates to human when max iterations reached AND critical issues remain unresolved.",
  NegotiateSchema.shape,
  async (params) => {
    const startTime = Date.now();
    try {
      const {
        artifact,
        artifactType,
        disagreements,
        currentIteration,
        maxIterations,
        maxNegotiationRounds,
        projectId,
        projectName,
        phase
      } = params;

      const rounds: NegotiationRound[] = [];
      let currentDisagreements = [...disagreements] as DisagreementItem[];
      let roundNumber = 0;

      // Auto-resolve low severity items first
      currentDisagreements = autoResolveLowSeverity(currentDisagreements);

      // Negotiation loop
      while (roundNumber < maxNegotiationRounds) {
        roundNumber++;

        const unresolvedItems = currentDisagreements.filter(d => !d.resolved);
        if (unresolvedItems.length === 0) {
          break; // All resolved
        }

        // Prepare negotiation prompt for ChatGPT
        const chatgptNegotiationPrompt = `
You are in a negotiation round to reach consensus on a ${artifactType} artifact.

The following issues need resolution. For each one, consider Gemini's position and either:
1. CONCEDE if their point is valid
2. PROPOSE a COMPROMISE that addresses both concerns
3. MAINTAIN your position with stronger justification (only for critical issues)

IMPORTANT: Be collaborative. The goal is consensus, not winning. Minor and medium issues should be resolved through compromise.

Issues to negotiate:
${unresolvedItems.map(d => `
- Topic: ${d.topic}
  Severity: ${d.severity}
  Your position: ${d.chatgptPosition}
  Gemini's position: ${d.geminiPosition}
`).join('\n')}

Respond in JSON format:
{
  "decisions": [
    {
      "id": "issue-id",
      "action": "concede" | "compromise" | "maintain",
      "reasoning": "why this decision",
      "proposedResolution": "if compromise, what's the middle ground"
    }
  ],
  "overallStance": "collaborative" | "firm"
}
`;

        // Prepare negotiation prompt for Gemini
        const geminiNegotiationPrompt = `
You are in a negotiation round to reach consensus on a ${artifactType} artifact.

The following issues need resolution. For each one, consider ChatGPT's position and either:
1. CONCEDE if their point is valid
2. PROPOSE a COMPROMISE that addresses both concerns
3. MAINTAIN your position with stronger justification (only for truly critical security/edge cases)

IMPORTANT: Be collaborative. The goal is consensus, not winning. Focus on finding common ground.

Issues to negotiate:
${unresolvedItems.map(d => `
- Topic: ${d.topic}
  Severity: ${d.severity}
  ChatGPT's position: ${d.chatgptPosition}
  Your position: ${d.geminiPosition}
`).join('\n')}

Respond in JSON format:
{
  "decisions": [
    {
      "id": "issue-id",
      "action": "concede" | "compromise" | "maintain",
      "reasoning": "why this decision",
      "proposedResolution": "if compromise, what's the middle ground"
    }
  ],
  "overallStance": "collaborative" | "firm"
}
`;

        // Call both AIs
        const [chatgptResponse, geminiResponse] = await Promise.all([
          invokeChatGPT(chatgptNegotiationPrompt, { role: AIRole.REVIEWER }),
          invokeGemini(geminiNegotiationPrompt, { role: AIRole.CHALLENGER })
        ]);

        // Parse responses and resolve disagreements
        let chatgptDecisions: any[] = [];
        let geminiDecisions: any[] = [];

        try {
          const chatgptData = JSON.parse(chatgptResponse.content);
          chatgptDecisions = chatgptData.decisions || [];
        } catch {
          // Try to extract from text
        }

        try {
          const geminiData = JSON.parse(geminiResponse.content);
          geminiDecisions = geminiData.decisions || [];
        } catch {
          // Try to extract from text
        }

        // Resolve based on decisions
        let resolvedThisRound = 0;
        currentDisagreements = currentDisagreements.map(d => {
          if (d.resolved) return d;

          const chatgptDecision = chatgptDecisions.find((dec: any) => dec.id === d.id);
          const geminiDecision = geminiDecisions.find((dec: any) => dec.id === d.id);

          // Resolution logic
          if (chatgptDecision?.action === "concede" || geminiDecision?.action === "concede") {
            resolvedThisRound++;
            return {
              ...d,
              resolved: true,
              resolvedBy: chatgptDecision?.action === "concede" ? "chatgpt_conceded" as const : "gemini_conceded" as const,
              suggestedResolution: chatgptDecision?.action === "concede"
                ? d.geminiPosition
                : d.chatgptPosition
            };
          }

          if (chatgptDecision?.action === "compromise" && geminiDecision?.action === "compromise") {
            resolvedThisRound++;
            return {
              ...d,
              resolved: true,
              resolvedBy: "compromise" as const,
              suggestedResolution: chatgptDecision.proposedResolution || geminiDecision.proposedResolution
            };
          }

          // For medium severity with any compromise offer, accept it
          if (d.severity === "medium" && (chatgptDecision?.action === "compromise" || geminiDecision?.action === "compromise")) {
            resolvedThisRound++;
            return {
              ...d,
              resolved: true,
              resolvedBy: "compromise" as const,
              suggestedResolution: chatgptDecision?.proposedResolution || geminiDecision?.proposedResolution || "Compromise accepted"
            };
          }

          return d;
        });

        const unresolvedAfterRound = currentDisagreements.filter(d => !d.resolved);
        const criticalUnresolved = unresolvedAfterRound.filter(d => d.severity === "critical");

        rounds.push({
          roundNumber,
          disagreements: [...currentDisagreements],
          resolvedCount: resolvedThisRound,
          unresolvedCount: unresolvedAfterRound.length,
          criticalUnresolvedCount: criticalUnresolved.length,
          chatgptResponse: chatgptResponse.content,
          geminiResponse: geminiResponse.content
        });

        // If all resolved, break
        if (unresolvedAfterRound.length === 0) {
          break;
        }

        // If only non-critical issues remain after 2 rounds, auto-resolve with compromise
        if (roundNumber >= 2 && criticalUnresolved.length === 0) {
          currentDisagreements = currentDisagreements.map(d => {
            if (!d.resolved) {
              return {
                ...d,
                resolved: true,
                resolvedBy: "compromise" as const,
                suggestedResolution: "Auto-compromised after negotiation: Will implement with both perspectives considered"
              };
            }
            return d;
          });
          break;
        }
      }

      // Final assessment
      const finalUnresolved = currentDisagreements.filter(d => !d.resolved);
      const criticalUnresolved = finalUnresolved.filter(d => d.severity === "critical");

      // Only require human decision if:
      // 1. Max iterations reached AND
      // 2. Critical issues still unresolved
      const atMaxIteration = currentIteration >= maxIterations;
      const requiresHumanDecision = atMaxIteration && criticalUnresolved.length > 0;

      const consensusReached = finalUnresolved.length === 0;

      const result: NegotiationResult = {
        success: true,
        totalRounds: rounds.length,
        maxRoundsReached: rounds.length >= maxNegotiationRounds,
        rounds,
        finalDisagreements: currentDisagreements,
        consensusReached,
        requiresHumanDecision,
        humanDecisionItems: requiresHumanDecision ? criticalUnresolved : [],
        summary: consensusReached
          ? `✅ Consensus reached after ${rounds.length} negotiation round(s). All ${disagreements.length} issue(s) resolved.`
          : requiresHumanDecision
            ? `⚠️ Max iterations reached with ${criticalUnresolved.length} critical issue(s) unresolved. Human decision required.`
            : `🔄 Negotiation ongoing. ${finalUnresolved.length} issue(s) remaining. Continue with iteration.`
      };

      // Always log negotiation results
      logger.logAIInvocation(
        projectId || 'unknown',
        projectName || 'unknown',
        'multi',
        phase || 'negotiation',
        'negotiate',
        'negotiator',
        null,
        Date.now() - startTime,
        consensusReached || !requiresHumanDecision,
        consensusReached,
        'gpt-4o+gemini'
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              negotiation: result,
              nextAction: consensusReached
                ? "proceed_to_human_approval"
                : requiresHumanDecision
                  ? "request_human_decision"
                  : "continue_iteration",
              message: result.summary
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
);

// ============================================================================
// START SERVER
// ============================================================================
async function main() {
  // Validate required environment variables
  const requiredEnvVars = ["OPENAI_API_KEY", "GOOGLE_API_KEY"];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(", ")}`);
    console.error("Please set these in your environment or .env file.");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("AI Gateway MCP Server started successfully");
  console.error("Available tools: ai_invoke_chatgpt, ai_invoke_gemini, ai_review_artifact, ai_challenge_artifact, ai_check_consensus, ai_negotiate");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
