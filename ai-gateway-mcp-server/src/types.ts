// AI Role definitions for the SDLC framework
export enum AIRole {
  // Planning phase roles
  LEAD_ANALYST = "lead_analyst",
  REVIEWER = "reviewer", 
  CHALLENGER = "challenger",
  
  // Architecture phase roles
  ARCHITECT = "architect",
  ALTERNATIVE_EXPLORER = "alternative_explorer",
  VALIDATOR = "validator",
  
  // Planning phase roles
  PLANNER = "planner",
  OPTIMIZER = "optimizer",
  DEPENDENCY_ANALYZER = "dependency_analyzer",
  
  // Development phase roles
  DEVELOPER = "developer",
  CODE_REVIEWER = "code_reviewer",
  
  // Generic roles
  ASSISTANT = "assistant"
}

// Response format options
export enum ResponseFormat {
  JSON = "json",
  MARKDOWN = "markdown",
  TEXT = "text"
}

// AI Provider types
export enum AIProvider {
  CHATGPT = "chatgpt",
  GEMINI = "gemini"
}

// Consensus status
export enum ConsensusStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  NEEDS_REVISION = "needs_revision"
}

// AI Response structure
export interface AIResponse {
  provider: AIProvider;
  role: AIRole;
  content: string;
  approved: boolean;
  feedback?: FeedbackItem[];
  challenges?: ChallengeItem[];
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  timestamp: string;
}

// Feedback item from reviewer
export interface FeedbackItem {
  type: "missing" | "unclear" | "improvement" | "alternative";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  suggestion?: string;
  location?: string;
}

// Challenge item from challenger
export interface ChallengeItem {
  type: "edge_case" | "contradiction" | "security" | "performance" | "scalability";
  description: string;
  impact: "low" | "medium" | "high";
  resolution?: string;
}

// Consensus check result
export interface ConsensusResult {
  status: ConsensusStatus;
  chatgpt: {
    approved: boolean;
    notes: string;
  };
  gemini: {
    approved: boolean;
    notes: string;
  };
  combinedFeedback: string[];
  readyForHumanApproval: boolean;
  // Negotiation tracking
  negotiationRound?: number;
  unresolvedCriticalIssues?: DisagreementItem[];
  requiresHumanIntervention?: boolean;
}

// Disagreement severity for negotiation
export type DisagreementSeverity = "low" | "medium" | "high" | "critical";

// Individual disagreement item between agents
export interface DisagreementItem {
  id: string;
  topic: string;
  severity: DisagreementSeverity;
  chatgptPosition: string;
  geminiPosition: string;
  suggestedResolution?: string;
  resolved: boolean;
  resolvedBy?: "auto" | "chatgpt_conceded" | "gemini_conceded" | "compromise" | "human";
}

// Negotiation round result
export interface NegotiationRound {
  roundNumber: number;
  disagreements: DisagreementItem[];
  resolvedCount: number;
  unresolvedCount: number;
  criticalUnresolvedCount: number;
  chatgptResponse: string;
  geminiResponse: string;
}

// Full negotiation result
export interface NegotiationResult {
  success: boolean;
  totalRounds: number;
  maxRoundsReached: boolean;
  rounds: NegotiationRound[];
  finalDisagreements: DisagreementItem[];
  consensusReached: boolean;
  requiresHumanDecision: boolean;
  humanDecisionItems: DisagreementItem[];
  summary: string;
}

// Artifact types that can be reviewed
export type ArtifactType = 
  | "requirements"
  | "architecture"
  | "epic_breakdown"
  | "task_list"
  | "code"
  | "test_plan"
  | "documentation";

// Tool input/output types
export interface InvokeAIInput {
  prompt: string;
  role: AIRole;
  context?: string;
  artifactType?: ArtifactType;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: ResponseFormat;
}

export interface ReviewArtifactInput {
  artifact: string;
  artifactType: ArtifactType;
  context?: string;
  previousFeedback?: string;
}

export interface ChallengeArtifactInput {
  artifact: string;
  artifactType: ArtifactType;
  context?: string;
  focusAreas?: string[];
}

export interface CheckConsensusInput {
  artifact: string;
  artifactType: ArtifactType;
  chatgptReview: string;
  geminiChallenge: string;
}
