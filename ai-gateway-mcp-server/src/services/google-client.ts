import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { AIRole, AIResponse, AIProvider, ChallengeItem } from "../types.js";
import { ROLE_SYSTEM_PROMPTS, ROLE_TEMPERATURES, DEFAULT_MAX_TOKENS } from "../constants.js";

// Singleton Gemini client
let geminiClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is required");
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

export interface GeminiOptions {
  role: AIRole;
  context?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export async function invokeGemini(
  prompt: string,
  options: GeminiOptions
): Promise<AIResponse> {
  const client = getGeminiClient();
  const {
    role,
    context,
    temperature = ROLE_TEMPERATURES[role],
    maxTokens = DEFAULT_MAX_TOKENS.generate,
    model = "gemini-3-flash-preview"
  } = options;

  const systemPrompt = ROLE_SYSTEM_PROMPTS[role];
  const fullPrompt = context
    ? `${systemPrompt}\n\n---\n\nContext:\n${context}\n\n---\n\nRequest:\n${prompt}`
    : `${systemPrompt}\n\n---\n\nRequest:\n${prompt}`;

  try {
    const generativeModel: GenerativeModel = client.getGenerativeModel({
      model,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    });

    const result = await generativeModel.generateContent(fullPrompt);
    const response = result.response;
    const content = response.text();

    // Try to extract approval status and challenges
    const approved = extractApprovalStatus(content);
    const challenges = extractChallenges(content);

    // Get token usage if available
    const usageMetadata = response.usageMetadata;

    return {
      provider: AIProvider.GEMINI,
      role,
      content,
      approved,
      challenges,
      tokensUsed: usageMetadata ? {
        prompt: usageMetadata.promptTokenCount || 0,
        completion: usageMetadata.candidatesTokenCount || 0,
        total: usageMetadata.totalTokenCount || 0
      } : undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Gemini invocation failed: ${errorMessage}`);
  }
}

// Helper to extract approval status from response
function extractApprovalStatus(content: string): boolean {
  const lowerContent = content.toLowerCase();

  // Check for explicit approval indicators
  if (lowerContent.includes('"approved": true') ||
    lowerContent.includes('"approved":true') ||
    lowerContent.includes("approved: true") ||
    lowerContent.includes("validation passed")) {
    return true;
  }

  if (lowerContent.includes('"approved": false') ||
    lowerContent.includes('"approved":false') ||
    lowerContent.includes("approved: false") ||
    lowerContent.includes("validation failed") ||
    lowerContent.includes("critical issues found")) {
    return false;
  }

  // Check for challenge severity - if there are critical challenges, not approved
  if (lowerContent.includes('"impact": "high"') ||
    lowerContent.includes("critical:") ||
    lowerContent.includes("blocker:")) {
    return false;
  }

  // Default to approved if no major issues found
  return !lowerContent.includes("major concern") &&
    !lowerContent.includes("significant issue");
}

// Helper to extract challenges from response
function extractChallenges(content: string): ChallengeItem[] {
  const challenges: ChallengeItem[] = [];

  // Try to parse as JSON first
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.challenges && Array.isArray(parsed.challenges)) {
        return parsed.challenges as ChallengeItem[];
      }
    }
  } catch {
    // Not JSON, try to extract from text
  }

  // Extract challenges from text patterns
  const edgeCasePattern = /edge case[s]?:\s*(.+?)(?:\n|$)/gi;
  const contradictionPattern = /contradiction[s]?:\s*(.+?)(?:\n|$)/gi;
  const securityPattern = /security (?:concern|issue)[s]?:\s*(.+?)(?:\n|$)/gi;
  const performancePattern = /performance (?:concern|issue)[s]?:\s*(.+?)(?:\n|$)/gi;

  const patterns = [
    { pattern: edgeCasePattern, type: "edge_case" as const },
    { pattern: contradictionPattern, type: "contradiction" as const },
    { pattern: securityPattern, type: "security" as const },
    { pattern: performancePattern, type: "performance" as const }
  ];

  for (const { pattern, type } of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      challenges.push({
        type,
        description: match[1].trim(),
        impact: "medium"
      });
    }
  }

  return challenges;
}

// Specific function for challenge operations
export async function geminiChallenge(
  artifact: string,
  artifactType: string,
  context?: string,
  focusAreas?: string[]
): Promise<AIResponse> {
  const focusAreasText = focusAreas && focusAreas.length > 0
    ? `\n\nFocus particularly on these areas:\n${focusAreas.map(a => `- ${a}`).join('\n')}`
    : '';

  const prompt = `Please challenge and validate the following ${artifactType}:

\`\`\`
${artifact}
\`\`\`
${focusAreasText}

Provide your analysis in the following JSON format:
{
  "approved": boolean,
  "summary": "Brief overall assessment",
  "challenges": [
    {
      "type": "edge_case|contradiction|security|performance|scalability",
      "description": "What the challenge/issue is",
      "impact": "low|medium|high",
      "resolution": "Suggested way to address this"
    }
  ],
  "validations": [
    {
      "aspect": "What was validated",
      "status": "passed|failed|warning",
      "notes": "Any relevant notes"
    }
  ],
  "questions": ["Questions that need clarification"]
}`;

  return invokeGemini(prompt, {
    role: AIRole.CHALLENGER,
    context,
    maxTokens: DEFAULT_MAX_TOKENS.challenge
  });
}
