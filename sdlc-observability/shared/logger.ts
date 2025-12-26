/**
 * SDLC Logger - Structured logging for Elasticsearch
 * 
 * Usage in MCP servers:
 * import { SDLCLogger } from './logger';
 * const logger = new SDLCLogger('ai-gateway');
 * logger.logEvent('ai_review', { project_id: '...', ai_name: 'chatgpt', approved: true });
 */

export type EventType =
  | 'project_created'
  | 'project_updated'
  | 'phase_started'
  | 'phase_transition'
  | 'phase_completed'
  | 'phase_progress'
  | 'phase_status'
  | 'iteration_created'
  | 'ai_review'
  | 'consensus_reached'
  | 'human_approval'
  | 'artifact_saved'
  | 'artifact_updated'
  | 'task_created'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'task_status_change'
  | 'quality_gate'
  | 'sprint_started'
  | 'sprint_completed'
  | 'sprint_progress'
  | 'git_commit'
  | 'file_created'
  | 'file_updated'
  | 'build_started'
  | 'build_completed'
  | 'test_run'
  | 'token_usage'
  | 'ai_invocation'
  // Brownfield - Context Orchestrator Events
  | 'context_plan_created'
  | 'context_retrieved'
  | 'context_analysis'
  | 'token_budget_allocated'
  | 'context_chunk_created'
  // Brownfield - Repo Indexer Events
  | 'repo_indexing_started'
  | 'repo_indexing_completed'
  | 'symbol_extracted'
  | 'dependency_analyzed'
  | 'impact_analysis'
  | 'hotspot_detected'
  | 'circular_dependency_found'
  // Brownfield - Architecture & Delivery Events
  | 'arch_validation'
  | 'arch_violation'
  | 'delivery_plan_created'
  | 'feature_flag_created'
  | 'rollout_started'
  // Brownfield - Test Intelligence Events
  | 'test_selection'
  | 'flaky_test_detected'
  | 'test_coverage_analysis'
  // Brownfield - Session & Fingerprint Events
  | 'session_snapshot_created'
  | 'session_restored'
  | 'codebase_fingerprint'
  | 'style_guide_generated'
  // Design Phase Events
  | 'design_file_created'
  | 'design_frame_created'
  | 'design_component_added'
  | 'design_flow_created'
  | 'design_tokens_extracted'
  | 'design_tokens_exported'
  | 'design_accessibility_review'
  | 'design_consistency_review'
  | 'design_component_map_generated'
  | 'design_human_review_requested'
  | 'design_human_feedback_received'
  | 'error'
  | 'warning'
  | 'info';

// AI Provider types for token tracking
export type AIProvider = 'claude' | 'chatgpt' | 'gemini' | 'multi';

// Token usage structure
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Estimated cost per 1M tokens (USD) - updated December 2024
export const TOKEN_COSTS: Record<AIProvider, { input: number; output: number }> = {
  claude: { input: 15.00, output: 75.00 },      // Claude Opus 4
  chatgpt: { input: 1.75, output: 14.00 },       // GPT-5.2
  gemini: { input: 0.50, output: 3.00 },         // Gemini 3 Flash
  multi: { input: 1.125, output: 8.50 }          // Average of ChatGPT + Gemini for combined ops
};

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SDLCEvent {
  '@timestamp': string;
  level: LogLevel;
  event_type: EventType;
  service: string;
  project_id?: string;
  project_name?: string;
  phase?: string;
  iteration?: number;
  message: string;
  [key: string]: unknown;
}

export interface LoggerConfig {
  elasticsearchUrl?: string;
  indexPrefix?: string;
  consoleOutput?: boolean;
  minLevel?: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export class SDLCLogger {
  private service: string;
  private config: Required<LoggerConfig>;
  private buffer: SDLCEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(service: string, config: LoggerConfig = {}) {
    this.service = service;
    this.config = {
      elasticsearchUrl: config.elasticsearchUrl || process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      indexPrefix: config.indexPrefix || 'sdlc-logs',
      consoleOutput: config.consoleOutput ?? (process.env.NODE_ENV !== 'production'),
      minLevel: config.minLevel || 'info'
    };

    // Start buffer flush interval (every 5 seconds)
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatEvent(level: LogLevel, eventType: EventType, data: Record<string, unknown>): SDLCEvent {
    // Normalize project_name to prevent case-sensitivity issues in dashboards
    if (data.project_name && typeof data.project_name === 'string') {
      data.project_name = data.project_name.trim();
    }

    const event: SDLCEvent = {
      '@timestamp': new Date().toISOString(),
      level,
      event_type: eventType,
      service: this.service,
      message: data.message as string || `${eventType} event`,
      ...data
    };

    // Remove undefined values
    Object.keys(event).forEach(key => {
      if (event[key] === undefined) delete event[key];
    });

    return event;
  }

  private async sendToElasticsearch(events: SDLCEvent[]): Promise<void> {
    if (events.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const indexName = `${this.config.indexPrefix}-${today}`;

    try {
      // Bulk API format
      const body = events.flatMap(event => [
        { index: { _index: indexName } },
        event
      ]);

      const response = await fetch(`${this.config.elasticsearchUrl}/_bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: body.map(item => JSON.stringify(item)).join('\n') + '\n'
      });

      if (!response.ok) {
        console.error(`Failed to send logs to Elasticsearch: ${response.status}`);
      }
    } catch (error) {
      console.error('Elasticsearch logging error:', error);
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    await this.sendToElasticsearch(events);
  }

  private log(level: LogLevel, eventType: EventType, data: Record<string, unknown> = {}): void {
    if (!this.shouldLog(level)) return;

    const event = this.formatEvent(level, eventType, data);

    // Console output
    if (this.config.consoleOutput) {
      const color = {
        debug: '\x1b[90m',
        info: '\x1b[36m',
        warn: '\x1b[33m',
        error: '\x1b[31m'
      }[level];
      console.error(`${color}[${this.service}] ${event.event_type}: ${event.message}\x1b[0m`);
    }

    // Add to buffer for Elasticsearch
    this.buffer.push(event);

    // Immediate flush for errors
    if (level === 'error') {
      this.flush();
    }
  }

  // ============================================================================
  // PUBLIC LOGGING METHODS
  // ============================================================================

  debug(eventType: EventType, data: Record<string, unknown> = {}): void {
    this.log('debug', eventType, data);
  }

  info(eventType: EventType, data: Record<string, unknown> = {}): void {
    this.log('info', eventType, data);
  }

  warn(eventType: EventType, data: Record<string, unknown> = {}): void {
    this.log('warn', eventType, data);
  }

  error(eventType: EventType, data: Record<string, unknown> = {}): void {
    this.log('error', eventType, data);
  }

  // ============================================================================
  // SPECIALIZED EVENT METHODS
  // ============================================================================

  logProjectCreated(projectId: string, projectName: string, techStack: string[]): void {
    this.info('project_created', {
      project_id: projectId,
      project_name: projectName,
      tech_stack: techStack,
      message: `Project "${projectName}" created`
    });
  }

  logPhaseTransition(projectId: string, projectName: string, fromPhase: string, toPhase: string): void {
    this.info('phase_transition', {
      project_id: projectId,
      project_name: projectName,
      phase_from: fromPhase,
      phase_to: toPhase,
      message: `Phase transition: ${fromPhase} → ${toPhase}`
    });
  }

  logIterationCreated(projectId: string, projectName: string, phase: string, iteration: number): void {
    this.info('iteration_created', {
      project_id: projectId,
      project_name: projectName,
      phase,
      iteration,
      message: `Iteration ${iteration} created in ${phase}`
    });
  }

  logAIReview(
    projectId: string,
    projectName: string,
    phase: string,
    iteration: number,
    aiName: 'claude' | 'chatgpt' | 'gemini',
    approved: boolean,
    feedbackCount: number,
    feedbackSeverity?: string
  ): void {
    this.info('ai_review', {
      project_id: projectId,
      project_name: projectName,
      phase,
      iteration,
      ai_name: aiName,
      approved,
      approved_percent: approved ? 100 : 0,
      feedback_count: feedbackCount,
      feedback_severity: feedbackSeverity,
      message: `${aiName} ${approved ? 'approved' : 'rejected'} (${feedbackCount} feedback items)`
    });
  }

  logConsensusReached(
    projectId: string,
    projectName: string,
    phase: string,
    iteration: number,
    status: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION',
    claudeApproved: boolean,
    chatgptApproved: boolean,
    geminiApproved: boolean
  ): void {
    this.info('consensus_reached', {
      project_id: projectId,
      project_name: projectName,
      phase,
      iteration,
      iterations_to_consensus: iteration,
      consensus_status: status,
      claude_approved: claudeApproved,
      chatgpt_approved: chatgptApproved,
      gemini_approved: geminiApproved,
      message: `Consensus ${status} after ${iteration} iterations`
    });
  }

  logTaskCompleted(
    projectId: string,
    projectName: string,
    taskId: string,
    taskTitle: string,
    agentType: string,
    epic: string,
    sprintNumber: number,
    estimatedHours: number,
    actualHours: number
  ): void {
    const velocity = estimatedHours / actualHours;
    this.info('task_completed', {
      project_id: projectId,
      project_name: projectName,
      task_id: taskId,
      task_title: taskTitle,
      agent_type: agentType,
      epic,
      sprint_number: sprintNumber,
      estimated_hours: estimatedHours,
      actual_hours: actualHours,
      velocity,
      message: `Task "${taskTitle}" completed (${actualHours}h, velocity: ${velocity.toFixed(2)}x)`
    });
  }

  logQualityGate(
    projectId: string,
    projectName: string,
    taskId: string,
    gateLevel: string,
    passed: boolean,
    passRate: number,
    details?: string
  ): void {
    this.info('quality_gate', {
      project_id: projectId,
      project_name: projectName,
      task_id: taskId,
      gate_level: gateLevel,
      passed,
      pass_rate: passRate,
      details,
      message: `Quality gate ${gateLevel}: ${passed ? 'PASSED' : 'FAILED'} (${passRate}%)`
    });
  }

  logSprintCompleted(
    projectId: string,
    projectName: string,
    sprintNumber: number,
    tasksCompleted: number,
    estimatedHours: number,
    actualHours: number
  ): void {
    this.info('sprint_completed', {
      project_id: projectId,
      project_name: projectName,
      sprint_number: sprintNumber,
      tasks_completed: tasksCompleted,
      estimated_hours: estimatedHours,
      actual_hours: actualHours,
      velocity: estimatedHours / actualHours,
      message: `Sprint ${sprintNumber} completed: ${tasksCompleted} tasks, ${actualHours}h`
    });
  }

  logGitCommit(projectId: string, projectName: string, commitHash: string, message: string): void {
    this.info('git_commit', {
      project_id: projectId,
      project_name: projectName,
      commit_hash: commitHash,
      commit_message: message,
      message: `Git commit: ${commitHash.substring(0, 7)} - ${message}`
    });
  }

  // ============================================================================
  // TASK LIFECYCLE EVENTS
  // ============================================================================

  logTaskCreated(
    projectId: string,
    projectName: string,
    taskId: string,
    taskTitle: string,
    agentType: string,
    epic: string,
    estimatedHours: number,
    dependencies: string[] = []
  ): void {
    this.info('task_created', {
      project_id: projectId,
      project_name: projectName,
      task_id: taskId,
      task_title: taskTitle,
      agent_type: agentType,
      epic,
      estimated_hours: estimatedHours,
      dependencies,
      status: 'PENDING',
      message: `Task created: "${taskTitle}" (${estimatedHours}h)`
    });
  }

  logTaskStarted(
    projectId: string,
    projectName: string,
    taskId: string,
    taskTitle: string,
    agentType: string,
    epic: string,
    sprintNumber: number
  ): void {
    this.info('task_started', {
      project_id: projectId,
      project_name: projectName,
      task_id: taskId,
      task_title: taskTitle,
      agent_type: agentType,
      epic,
      sprint_number: sprintNumber,
      status: 'IN_PROGRESS',
      message: `Task started: "${taskTitle}"`
    });
  }

  logTaskStatusChange(
    projectId: string,
    projectName: string,
    taskId: string,
    taskTitle: string,
    fromStatus: string,
    toStatus: string,
    agentType: string,
    epic: string
  ): void {
    this.info('task_status_change', {
      project_id: projectId,
      project_name: projectName,
      task_id: taskId,
      task_title: taskTitle,
      from_status: fromStatus,
      status: toStatus,
      agent_type: agentType,
      epic,
      message: `Task "${taskTitle}": ${fromStatus} → ${toStatus}`
    });
  }

  logTaskFailed(
    projectId: string,
    projectName: string,
    taskId: string,
    taskTitle: string,
    reason: string,
    agentType: string,
    epic: string
  ): void {
    this.error('task_failed', {
      project_id: projectId,
      project_name: projectName,
      task_id: taskId,
      task_title: taskTitle,
      failure_reason: reason,
      agent_type: agentType,
      epic,
      status: 'FAILED',
      message: `Task failed: "${taskTitle}" - ${reason}`
    });
  }

  // ============================================================================
  // PHASE & ITERATION PROGRESS EVENTS
  // ============================================================================

  logPhaseStarted(
    projectId: string,
    projectName: string,
    phase: string,
    maxIterations: number
  ): void {
    this.info('phase_started', {
      project_id: projectId,
      project_name: projectName,
      phase,
      current_phase: phase,
      max_iterations: maxIterations,
      iteration: 0,
      progress_percent: 0,
      message: `Phase started: ${phase}`
    });
  }

  logPhaseProgress(
    projectId: string,
    projectName: string,
    phase: string,
    progressPercent: number,
    tasksCompleted: number,
    tasksTotal: number
  ): void {
    this.info('phase_progress', {
      project_id: projectId,
      project_name: projectName,
      phase,
      progress_percent: progressPercent,
      tasks_completed: tasksCompleted,
      tasks_total: tasksTotal,
      message: `${phase}: ${progressPercent}% complete (${tasksCompleted}/${tasksTotal} tasks)`
    });
  }

  logPhaseCompleted(
    projectId: string,
    projectName: string,
    phase: string,
    totalIterations: number,
    durationMinutes: number
  ): void {
    this.info('phase_completed', {
      project_id: projectId,
      project_name: projectName,
      phase,
      total_iterations: totalIterations,
      duration_minutes: durationMinutes,
      progress_percent: 100,
      message: `Phase completed: ${phase} (${totalIterations} iterations, ${durationMinutes}min)`
    });
  }

  logPhaseStatus(
    projectId: string,
    projectName: string,
    currentPhase: string,
    iteration: number,
    maxIterations: number,
    consensusStatus: string
  ): void {
    this.info('phase_status', {
      project_id: projectId,
      project_name: projectName,
      current_phase: currentPhase,
      phase: currentPhase,
      iteration,
      max_iterations: maxIterations,
      consensus_status: consensusStatus,
      message: `Phase ${currentPhase}: Iteration ${iteration}/${maxIterations}, Consensus: ${consensusStatus}`
    });
  }

  // ============================================================================
  // SPRINT PROGRESS EVENTS
  // ============================================================================

  logSprintStarted(
    projectId: string,
    projectName: string,
    sprintNumber: number,
    tasksPlanned: number,
    estimatedHours: number
  ): void {
    this.info('sprint_started', {
      project_id: projectId,
      project_name: projectName,
      sprint_number: sprintNumber,
      tasks_planned: tasksPlanned,
      tasks_total: tasksPlanned,
      tasks_completed: 0,
      estimated_hours: estimatedHours,
      completion_percent: 0,
      message: `Sprint ${sprintNumber} started: ${tasksPlanned} tasks, ${estimatedHours}h planned`
    });
  }

  logSprintProgress(
    projectId: string,
    projectName: string,
    sprintNumber: number,
    tasksCompleted: number,
    tasksTotal: number,
    hoursSpent: number,
    hoursEstimated: number
  ): void {
    const completionPercent = Math.round((tasksCompleted / tasksTotal) * 100);
    this.info('sprint_progress', {
      project_id: projectId,
      project_name: projectName,
      sprint_number: sprintNumber,
      tasks_completed: tasksCompleted,
      tasks_total: tasksTotal,
      hours_spent: hoursSpent,
      hours_estimated: hoursEstimated,
      completion_percent: completionPercent,
      message: `Sprint ${sprintNumber}: ${tasksCompleted}/${tasksTotal} tasks (${completionPercent}%)`
    });
  }

  // ============================================================================
  // HUMAN APPROVAL EVENT
  // ============================================================================

  logHumanApproval(
    projectId: string,
    projectName: string,
    phase: string,
    iteration: number,
    approved: boolean,
    feedback?: string
  ): void {
    this.info('human_approval', {
      project_id: projectId,
      project_name: projectName,
      phase,
      iteration,
      approved,
      feedback,
      message: `Human ${approved ? 'approved' : 'rejected'} ${phase} iteration ${iteration}`
    });
  }

  // ============================================================================
  // ARTIFACT EVENTS
  // ============================================================================

  logArtifactSaved(
    projectId: string,
    projectName: string,
    artifactType: string,
    version: number,
    phase: string
  ): void {
    this.info('artifact_saved', {
      project_id: projectId,
      project_name: projectName,
      artifact_type: artifactType,
      version,
      phase,
      message: `Artifact saved: ${artifactType} v${version}`
    });
  }

  // ============================================================================
  // TOKEN USAGE & AI INVOCATION TRACKING
  // ============================================================================

  /**
   * Log token usage for an AI invocation
   * Tracks prompt tokens, completion tokens, total tokens, and estimated cost
   */
  logTokenUsage(
    projectId: string,
    projectName: string,
    aiProvider: AIProvider,
    phase: string,
    operation: string,
    tokens: TokenUsage,
    model?: string
  ): void {
    // Calculate estimated cost
    const costs = TOKEN_COSTS[aiProvider];
    const inputCost = (tokens.promptTokens / 1_000_000) * costs.input;
    const outputCost = (tokens.completionTokens / 1_000_000) * costs.output;
    const totalCost = inputCost + outputCost;

    this.info('token_usage', {
      project_id: projectId,
      project_name: projectName,
      ai_provider: aiProvider,
      phase,
      operation,
      model: model || 'default',
      prompt_tokens: tokens.promptTokens,
      completion_tokens: tokens.completionTokens,
      total_tokens: tokens.totalTokens,
      estimated_cost_usd: totalCost,
      input_cost_usd: inputCost,
      output_cost_usd: outputCost,
      message: `${aiProvider} used ${tokens.totalTokens} tokens (~$${totalCost.toFixed(4)}) for ${operation}`
    });
  }

  /**
   * Log a complete AI invocation with all details
   */
  logAIInvocation(
    projectId: string,
    projectName: string,
    aiProvider: AIProvider,
    phase: string,
    operation: 'review' | 'challenge' | 'consensus' | 'generate' | 'analyze' | 'negotiate',
    role: string,
    tokens: TokenUsage | null,
    durationMs: number,
    success: boolean,
    approved?: boolean,
    model?: string,
    errorMessage?: string
  ): void {
    // Calculate cost if tokens available
    let estimatedCost = 0;
    if (tokens) {
      const costs = TOKEN_COSTS[aiProvider];
      estimatedCost = (tokens.promptTokens / 1_000_000) * costs.input +
                      (tokens.completionTokens / 1_000_000) * costs.output;
    }

    const level: LogLevel = success ? 'info' : 'error';
    const eventData: Record<string, unknown> = {
      project_id: projectId,
      project_name: projectName,
      ai_provider: aiProvider,
      phase,
      operation,
      role,
      model: model || 'default',
      duration_ms: durationMs,
      success,
      prompt_tokens: tokens?.promptTokens || 0,
      completion_tokens: tokens?.completionTokens || 0,
      total_tokens: tokens?.totalTokens || 0,
      estimated_cost_usd: estimatedCost,
      message: success
        ? `${aiProvider} ${operation} completed in ${durationMs}ms (${tokens?.totalTokens || 0} tokens, ~$${estimatedCost.toFixed(4)})`
        : `${aiProvider} ${operation} failed: ${errorMessage}`
    };

    if (approved !== undefined) {
      eventData.approved = approved;
    }

    if (errorMessage) {
      eventData.error_message = errorMessage;
    }

    this.log(level, 'ai_invocation', eventData);
  }

  /**
   * Log aggregated token usage summary for a project
   */
  logTokenSummary(
    projectId: string,
    projectName: string,
    phase: string,
    summary: {
      claude: TokenUsage;
      chatgpt: TokenUsage;
      gemini: TokenUsage;
    }
  ): void {
    // Calculate costs for each provider
    const claudeCost = (summary.claude.promptTokens / 1_000_000) * TOKEN_COSTS.claude.input +
                       (summary.claude.completionTokens / 1_000_000) * TOKEN_COSTS.claude.output;
    const chatgptCost = (summary.chatgpt.promptTokens / 1_000_000) * TOKEN_COSTS.chatgpt.input +
                        (summary.chatgpt.completionTokens / 1_000_000) * TOKEN_COSTS.chatgpt.output;
    const geminiCost = (summary.gemini.promptTokens / 1_000_000) * TOKEN_COSTS.gemini.input +
                       (summary.gemini.completionTokens / 1_000_000) * TOKEN_COSTS.gemini.output;

    const totalTokens = summary.claude.totalTokens + summary.chatgpt.totalTokens + summary.gemini.totalTokens;
    const totalCost = claudeCost + chatgptCost + geminiCost;

    this.info('token_usage', {
      project_id: projectId,
      project_name: projectName,
      phase,
      operation: 'phase_summary',
      // Claude stats
      claude_prompt_tokens: summary.claude.promptTokens,
      claude_completion_tokens: summary.claude.completionTokens,
      claude_total_tokens: summary.claude.totalTokens,
      claude_cost_usd: claudeCost,
      // ChatGPT stats
      chatgpt_prompt_tokens: summary.chatgpt.promptTokens,
      chatgpt_completion_tokens: summary.chatgpt.completionTokens,
      chatgpt_total_tokens: summary.chatgpt.totalTokens,
      chatgpt_cost_usd: chatgptCost,
      // Gemini stats
      gemini_prompt_tokens: summary.gemini.promptTokens,
      gemini_completion_tokens: summary.gemini.completionTokens,
      gemini_total_tokens: summary.gemini.totalTokens,
      gemini_cost_usd: geminiCost,
      // Totals
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
      message: `Phase ${phase} token summary: ${totalTokens} tokens (~$${totalCost.toFixed(4)})`
    });
  }

  // ============================================================================
  // BROWNFIELD - CONTEXT ORCHESTRATOR EVENTS
  // ============================================================================

  /**
   * Log context plan creation for brownfield projects
   */
  logContextPlanCreated(
    projectId: string,
    projectName: string,
    targetFiles: string[],
    strategy: 'full_files' | 'smart_chunks' | 'summaries' | 'hybrid',
    tokenBudget: number,
    filesAnalyzed: number,
    filesSelected: number,
    estimatedTokens: number
  ): void {
    this.info('context_plan_created', {
      project_id: projectId,
      project_name: projectName,
      target_files: targetFiles,
      context_strategy: strategy,
      token_budget: tokenBudget,
      files_analyzed: filesAnalyzed,
      files_selected: filesSelected,
      estimated_tokens: estimatedTokens,
      budget_utilization: Math.round((estimatedTokens / tokenBudget) * 100),
      message: `Context plan: ${filesSelected}/${filesAnalyzed} files, ${estimatedTokens}/${tokenBudget} tokens (${strategy})`
    });
  }

  /**
   * Log context retrieval for brownfield projects
   */
  logContextRetrieved(
    projectId: string,
    projectName: string,
    filesRetrieved: number,
    chunksRetrieved: number,
    totalTokens: number,
    tokenBudget: number,
    retrievalTimeMs: number
  ): void {
    this.info('context_retrieved', {
      project_id: projectId,
      project_name: projectName,
      files_retrieved: filesRetrieved,
      chunks_retrieved: chunksRetrieved,
      total_tokens: totalTokens,
      token_budget: tokenBudget,
      budget_utilization: Math.round((totalTokens / tokenBudget) * 100),
      retrieval_time_ms: retrievalTimeMs,
      message: `Context retrieved: ${filesRetrieved} files, ${chunksRetrieved} chunks, ${totalTokens} tokens in ${retrievalTimeMs}ms`
    });
  }

  /**
   * Log file relevance analysis
   */
  logContextAnalysis(
    projectId: string,
    projectName: string,
    targetFile: string,
    analyzedFiles: number,
    relevantFiles: number,
    avgRelevanceScore: number,
    analysisTimeMs: number
  ): void {
    this.info('context_analysis', {
      project_id: projectId,
      project_name: projectName,
      target_file: targetFile,
      analyzed_files: analyzedFiles,
      relevant_files: relevantFiles,
      avg_relevance_score: avgRelevanceScore,
      analysis_time_ms: analysisTimeMs,
      message: `Context analysis: ${relevantFiles}/${analyzedFiles} relevant files (avg score: ${avgRelevanceScore.toFixed(2)})`
    });
  }

  /**
   * Log token budget allocation
   */
  logTokenBudgetAllocated(
    projectId: string,
    projectName: string,
    totalBudget: number,
    allocatedBudget: number,
    reservedForResponse: number,
    filesCount: number
  ): void {
    this.info('token_budget_allocated', {
      project_id: projectId,
      project_name: projectName,
      total_budget: totalBudget,
      allocated_budget: allocatedBudget,
      reserved_for_response: reservedForResponse,
      files_count: filesCount,
      avg_tokens_per_file: Math.round(allocatedBudget / filesCount),
      message: `Token budget: ${allocatedBudget}/${totalBudget} allocated for ${filesCount} files`
    });
  }

  // ============================================================================
  // BROWNFIELD - REPO INDEXER EVENTS
  // ============================================================================

  /**
   * Log repository indexing start
   */
  logRepoIndexingStarted(
    projectId: string,
    projectName: string,
    repoPath: string,
    languages: string[],
    isIncremental: boolean,
    excludePatterns: string[]
  ): void {
    this.info('repo_indexing_started', {
      project_id: projectId,
      project_name: projectName,
      repo_path: repoPath,
      languages,
      is_incremental: isIncremental,
      exclude_patterns: excludePatterns,
      message: `Indexing started: ${repoPath} (${languages.join(', ')}, ${isIncremental ? 'incremental' : 'full'})`
    });
  }

  /**
   * Log repository indexing completion
   */
  logRepoIndexingCompleted(
    projectId: string,
    projectName: string,
    repoPath: string,
    filesIndexed: number,
    symbolsExtracted: number,
    dependenciesMapped: number,
    indexingTimeMs: number,
    indexSizeBytes: number
  ): void {
    this.info('repo_indexing_completed', {
      project_id: projectId,
      project_name: projectName,
      repo_path: repoPath,
      files_indexed: filesIndexed,
      symbols_extracted: symbolsExtracted,
      dependencies_mapped: dependenciesMapped,
      indexing_time_ms: indexingTimeMs,
      index_size_bytes: indexSizeBytes,
      files_per_second: Math.round((filesIndexed / indexingTimeMs) * 1000),
      message: `Indexing completed: ${filesIndexed} files, ${symbolsExtracted} symbols, ${dependenciesMapped} deps in ${indexingTimeMs}ms`
    });
  }

  /**
   * Log symbol extraction statistics
   */
  logSymbolExtracted(
    projectId: string,
    projectName: string,
    filePath: string,
    language: string,
    functions: number,
    classes: number,
    interfaces: number,
    types: number,
    variables: number
  ): void {
    const totalSymbols = functions + classes + interfaces + types + variables;
    this.debug('symbol_extracted', {
      project_id: projectId,
      project_name: projectName,
      file_path: filePath,
      language,
      functions_count: functions,
      classes_count: classes,
      interfaces_count: interfaces,
      types_count: types,
      variables_count: variables,
      total_symbols: totalSymbols,
      message: `Symbols extracted: ${filePath} (${totalSymbols} symbols)`
    });
  }

  /**
   * Log dependency analysis
   */
  logDependencyAnalyzed(
    projectId: string,
    projectName: string,
    filePath: string,
    incomingDeps: number,
    outgoingDeps: number,
    couplingScore: number
  ): void {
    this.info('dependency_analyzed', {
      project_id: projectId,
      project_name: projectName,
      file_path: filePath,
      incoming_dependencies: incomingDeps,
      outgoing_dependencies: outgoingDeps,
      total_dependencies: incomingDeps + outgoingDeps,
      coupling_score: couplingScore,
      message: `Dependencies: ${filePath} (in: ${incomingDeps}, out: ${outgoingDeps}, coupling: ${couplingScore.toFixed(2)})`
    });
  }

  /**
   * Log impact analysis for code changes
   */
  logImpactAnalysis(
    projectId: string,
    projectName: string,
    changedFiles: string[],
    affectedFiles: number,
    affectedSymbols: number,
    riskScore: number,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    analysisTimeMs: number
  ): void {
    this.info('impact_analysis', {
      project_id: projectId,
      project_name: projectName,
      changed_files: changedFiles,
      changed_files_count: changedFiles.length,
      affected_files: affectedFiles,
      affected_symbols: affectedSymbols,
      risk_score: riskScore,
      risk_level: riskLevel,
      analysis_time_ms: analysisTimeMs,
      blast_radius: affectedFiles / Math.max(changedFiles.length, 1),
      message: `Impact analysis: ${changedFiles.length} changes → ${affectedFiles} affected files (risk: ${riskLevel}, score: ${riskScore.toFixed(2)})`
    });
  }

  /**
   * Log code hotspot detection
   */
  logHotspotDetected(
    projectId: string,
    projectName: string,
    filePath: string,
    hotspotType: 'high_churn' | 'high_coupling' | 'high_complexity' | 'bus_factor',
    score: number,
    metrics: {
      dependents?: number;
      commits?: number;
      authors?: number;
      complexity?: number;
    }
  ): void {
    this.warn('hotspot_detected', {
      project_id: projectId,
      project_name: projectName,
      file_path: filePath,
      hotspot_type: hotspotType,
      hotspot_score: score,
      dependents_count: metrics.dependents,
      commits_count: metrics.commits,
      authors_count: metrics.authors,
      complexity_score: metrics.complexity,
      message: `Hotspot detected: ${filePath} (${hotspotType}, score: ${score.toFixed(2)})`
    });
  }

  /**
   * Log circular dependency detection
   */
  logCircularDependencyFound(
    projectId: string,
    projectName: string,
    cycle: string[],
    cycleLength: number,
    severity: 'warning' | 'error'
  ): void {
    const level = severity === 'error' ? 'error' : 'warn';
    this.log(level, 'circular_dependency_found', {
      project_id: projectId,
      project_name: projectName,
      cycle_files: cycle,
      cycle_length: cycleLength,
      severity,
      message: `Circular dependency: ${cycle.join(' → ')} → ${cycle[0]}`
    });
  }

  // ============================================================================
  // BROWNFIELD - ARCHITECTURE & DELIVERY EVENTS
  // ============================================================================

  /**
   * Log architecture validation
   */
  logArchValidation(
    projectId: string,
    projectName: string,
    rulesChecked: number,
    rulesPassed: number,
    rulesFailed: number,
    validationTimeMs: number
  ): void {
    const passRate = Math.round((rulesPassed / rulesChecked) * 100);
    this.info('arch_validation', {
      project_id: projectId,
      project_name: projectName,
      rules_checked: rulesChecked,
      rules_passed: rulesPassed,
      rules_failed: rulesFailed,
      pass_rate: passRate,
      validation_time_ms: validationTimeMs,
      message: `Architecture validation: ${rulesPassed}/${rulesChecked} rules passed (${passRate}%)`
    });
  }

  /**
   * Log architecture violation
   */
  logArchViolation(
    projectId: string,
    projectName: string,
    ruleName: string,
    violationType: string,
    filePath: string,
    details: string,
    severity: 'warning' | 'error'
  ): void {
    const level = severity === 'error' ? 'error' : 'warn';
    this.log(level, 'arch_violation', {
      project_id: projectId,
      project_name: projectName,
      rule_name: ruleName,
      violation_type: violationType,
      file_path: filePath,
      violation_details: details,
      severity,
      message: `Architecture violation: ${ruleName} in ${filePath} - ${details}`
    });
  }

  /**
   * Log delivery plan creation
   */
  logDeliveryPlanCreated(
    projectId: string,
    projectName: string,
    totalChanges: number,
    prCount: number,
    estimatedRiskScore: number,
    featureFlagsCount: number
  ): void {
    this.info('delivery_plan_created', {
      project_id: projectId,
      project_name: projectName,
      total_changes: totalChanges,
      pr_count: prCount,
      avg_changes_per_pr: Math.round(totalChanges / prCount),
      estimated_risk_score: estimatedRiskScore,
      feature_flags_count: featureFlagsCount,
      message: `Delivery plan: ${totalChanges} changes → ${prCount} PRs (risk: ${estimatedRiskScore.toFixed(2)})`
    });
  }

  // ============================================================================
  // BROWNFIELD - TEST INTELLIGENCE EVENTS
  // ============================================================================

  /**
   * Log smart test selection
   */
  logTestSelection(
    projectId: string,
    projectName: string,
    changedFiles: number,
    totalTests: number,
    selectedTests: number,
    estimatedTimeMs: number,
    selectionStrategy: string
  ): void {
    const coverage = Math.round((selectedTests / totalTests) * 100);
    this.info('test_selection', {
      project_id: projectId,
      project_name: projectName,
      changed_files: changedFiles,
      total_tests: totalTests,
      selected_tests: selectedTests,
      tests_skipped: totalTests - selectedTests,
      selection_coverage: coverage,
      estimated_time_ms: estimatedTimeMs,
      selection_strategy: selectionStrategy,
      time_savings_percent: Math.round(((totalTests - selectedTests) / totalTests) * 100),
      message: `Test selection: ${selectedTests}/${totalTests} tests selected (${coverage}% coverage, ${selectionStrategy})`
    });
  }

  /**
   * Log flaky test detection
   */
  logFlakyTestDetected(
    projectId: string,
    projectName: string,
    testName: string,
    testFile: string,
    flakinessScore: number,
    recentRuns: number,
    failureRate: number
  ): void {
    this.warn('flaky_test_detected', {
      project_id: projectId,
      project_name: projectName,
      test_name: testName,
      test_file: testFile,
      flakiness_score: flakinessScore,
      recent_runs: recentRuns,
      failure_rate: failureRate,
      message: `Flaky test: ${testName} (flakiness: ${flakinessScore.toFixed(2)}, ${Math.round(failureRate * 100)}% failures)`
    });
  }

  // ============================================================================
  // BROWNFIELD - SESSION & FINGERPRINT EVENTS
  // ============================================================================

  /**
   * Log session snapshot creation
   */
  logSessionSnapshotCreated(
    projectId: string,
    projectName: string,
    sessionId: string,
    phase: string,
    artifactsCount: number,
    decisionsCount: number,
    snapshotSizeBytes: number
  ): void {
    this.info('session_snapshot_created', {
      project_id: projectId,
      project_name: projectName,
      session_id: sessionId,
      phase,
      artifacts_count: artifactsCount,
      decisions_count: decisionsCount,
      snapshot_size_bytes: snapshotSizeBytes,
      message: `Session snapshot: ${sessionId} (${artifactsCount} artifacts, ${decisionsCount} decisions)`
    });
  }

  /**
   * Log session restoration
   */
  logSessionRestored(
    projectId: string,
    projectName: string,
    sessionId: string,
    restoredPhase: string,
    restoredArtifacts: number,
    restorationTimeMs: number
  ): void {
    this.info('session_restored', {
      project_id: projectId,
      project_name: projectName,
      session_id: sessionId,
      restored_phase: restoredPhase,
      restored_artifacts: restoredArtifacts,
      restoration_time_ms: restorationTimeMs,
      message: `Session restored: ${sessionId} at ${restoredPhase} (${restoredArtifacts} artifacts in ${restorationTimeMs}ms)`
    });
  }

  /**
   * Log codebase fingerprinting
   */
  logCodebaseFingerprint(
    projectId: string,
    projectName: string,
    filesAnalyzed: number,
    patternsDetected: number,
    conventionsIdentified: number,
    languages: string[],
    frameworks: string[],
    analysisTimeMs: number
  ): void {
    this.info('codebase_fingerprint', {
      project_id: projectId,
      project_name: projectName,
      files_analyzed: filesAnalyzed,
      patterns_detected: patternsDetected,
      conventions_identified: conventionsIdentified,
      languages,
      frameworks,
      analysis_time_ms: analysisTimeMs,
      message: `Codebase fingerprint: ${filesAnalyzed} files, ${patternsDetected} patterns, ${conventionsIdentified} conventions`
    });
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

// Singleton instance for convenience
let defaultLogger: SDLCLogger | null = null;

export function getLogger(service?: string): SDLCLogger {
  if (!defaultLogger) {
    defaultLogger = new SDLCLogger(service || 'sdlc');
  }
  return defaultLogger;
}

export function initLogger(service: string, config?: LoggerConfig): SDLCLogger {
  defaultLogger = new SDLCLogger(service, config);
  return defaultLogger;
}
