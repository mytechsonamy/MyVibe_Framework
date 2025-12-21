import OpenAI from "openai";
import { AIRole, AIResponse, AIProvider, FeedbackItem } from "../types.js";
import { ROLE_SYSTEM_PROMPTS, ROLE_TEMPERATURES, DEFAULT_MAX_TOKENS } from "../constants.js";

// Singleton OpenAI client
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface ChatGPTOptions {
  role: AIRole;
  context?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export async function invokeChatGPT(
  prompt: string,
  options: ChatGPTOptions
): Promise<AIResponse> {
  const client = getOpenAIClient();
  const {
    role,
    context,
    temperature = ROLE_TEMPERATURES[role],
    maxTokens = DEFAULT_MAX_TOKENS.generate,
    model = "gpt-5.2"
  } = options;

  const systemPrompt = ROLE_SYSTEM_PROMPTS[role];
  const userMessage = context ? `${context}\n\n---\n\n${prompt}` : prompt;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature,
      max_completion_tokens: maxTokens
    });

    const content = response.choices[0]?.message?.content || "";
    const usage = response.usage;

    // Try to extract approval status from response
    const approved = extractApprovalStatus(content);
    const feedback = extractFeedback(content);

    return {
      provider: AIProvider.CHATGPT,
      role,
      content,
      approved,
      feedback,
      tokensUsed: usage ? {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      } : undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`ChatGPT invocation failed: ${errorMessage}`);
  }
}

// Helper to extract approval status from response
function extractApprovalStatus(content: string): boolean {
  const lowerContent = content.toLowerCase();

  // Check for explicit approval indicators
  if (lowerContent.includes('"approved": true') ||
    lowerContent.includes('"approved":true') ||
    lowerContent.includes("approved: true")) {
    return true;
  }

  if (lowerContent.includes('"approved": false') ||
    lowerContent.includes('"approved":false') ||
    lowerContent.includes("approved: false") ||
    lowerContent.includes("needs revision") ||
    lowerContent.includes("not approved")) {
    return false;
  }

  // Check for positive sentiment indicators
  const positiveIndicators = [
    "looks good",
    "well done",
    "comprehensive",
    "complete",
    "no major issues",
    "approve this"
  ];

  const negativeIndicators = [
    "missing",
    "unclear",
    "needs work",
    "insufficient",
    "incomplete",
    "critical issue"
  ];

  const positiveCount = positiveIndicators.filter(i => lowerContent.includes(i)).length;
  const negativeCount = negativeIndicators.filter(i => lowerContent.includes(i)).length;

  return positiveCount > negativeCount;
}

// Helper to extract feedback items from response
function extractFeedback(content: string): FeedbackItem[] {
  const feedback: FeedbackItem[] = [];

  // Try to parse as JSON first
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.feedback && Array.isArray(parsed.feedback)) {
        return parsed.feedback as FeedbackItem[];
      }
    }
  } catch {
    // Not JSON, try to extract from text
  }

  // Extract feedback from text patterns
  const patterns = [
    /(?:issue|problem|concern):\s*(.+?)(?:\n|$)/gi,
    /(?:suggestion|improvement):\s*(.+?)(?:\n|$)/gi,
    /(?:missing|lacking):\s*(.+?)(?:\n|$)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      feedback.push({
        type: "improvement",
        severity: "medium",
        description: match[1].trim()
      });
    }
  }

  return feedback;
}

// Specific function for review operations
export async function chatGPTReview(
  artifact: string,
  artifactType: string,
  context?: string
): Promise<AIResponse> {
  const prompt = `Please review the following ${artifactType}:

\`\`\`
${artifact}
\`\`\`

Provide your review in the following JSON format:
{
  "approved": boolean,
  "summary": "Brief overall assessment",
  "feedback": [
    {
      "type": "missing|unclear|improvement|alternative",
      "severity": "low|medium|high|critical",
      "description": "What the issue is",
      "suggestion": "How to fix it",
      "location": "Where in the artifact (if applicable)"
    }
  ],
  "strengths": ["List of things done well"],
  "concerns": ["List of main concerns"]
}`;

  return invokeChatGPT(prompt, {
    role: AIRole.REVIEWER,
    context,
    maxTokens: DEFAULT_MAX_TOKENS.review
  });
}
