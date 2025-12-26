import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  Session,
  SessionSnapshot,
  SessionStatus,
  SnapshotTrigger,
  SessionMetadata,
  ProjectStateSnapshot,
  CodeContextSnapshot,
  AIMemorySnapshot,
  WorkspaceStateSnapshot,
  FileContext,
  ChangeRecord,
  Decision,
  ConversationSummary,
  ResumptionContext,
  ResumptionSummary,
  SuggestedAction,
  SESSION_CONFIG
} from "../types.js";

export class SessionPersistence {
  private sessionsDir: string;
  private activeSessions: Map<string, Session> = new Map();
  private fileAccessLog: Map<string, FileContext[]> = new Map();
  private changeLog: Map<string, ChangeRecord[]> = new Map();
  private decisionLog: Map<string, Decision[]> = new Map();
  private conversationLog: Map<string, ConversationSummary[]> = new Map();

  constructor(baseDir?: string) {
    this.sessionsDir = baseDir || path.join(process.env.HOME || "", ".myvibe", "sessions");
    this.ensureDirectory(this.sessionsDir);
    this.loadActiveSessions();
  }

  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadActiveSessions(): void {
    try {
      const indexPath = path.join(this.sessionsDir, "index.json");
      if (fs.existsSync(indexPath)) {
        const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
        for (const sessionRef of index.active || []) {
          const session = this.loadSession(sessionRef.id);
          if (session) {
            this.activeSessions.set(session.projectPath, session);
          }
        }
      }
    } catch {
      // Start fresh
    }
  }

  private saveIndex(): void {
    const index = {
      active: Array.from(this.activeSessions.values()).map(s => ({
        id: s.id,
        projectPath: s.projectPath,
        projectName: s.metadata.projectName,
        updatedAt: s.updatedAt
      })),
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(
      path.join(this.sessionsDir, "index.json"),
      JSON.stringify(index, null, 2)
    );
  }

  private loadSession(sessionId: string): Session | null {
    try {
      const sessionPath = path.join(this.sessionsDir, sessionId, "session.json");
      if (fs.existsSync(sessionPath)) {
        return JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
      }
    } catch {
      // Session not found
    }
    return null;
  }

  private saveSession(session: Session): void {
    const sessionDir = path.join(this.sessionsDir, session.id);
    this.ensureDirectory(sessionDir);
    fs.writeFileSync(
      path.join(sessionDir, "session.json"),
      JSON.stringify(session, null, 2)
    );
    this.saveIndex();
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  createSession(
    projectPath: string,
    projectName: string,
    metadata?: Partial<SessionMetadata>
  ): Session {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: Session = {
      id: sessionId,
      projectId: this.generateProjectId(projectPath),
      projectPath,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      metadata: {
        projectName,
        language: metadata?.language || this.detectLanguage(projectPath),
        framework: metadata?.framework || this.detectFramework(projectPath),
        currentPhase: metadata?.currentPhase || "REQUIREMENTS",
        currentIteration: 1,
        totalTasks: 0,
        completedTasks: 0,
        lastAction: "Session created"
      },
      snapshots: []
    };

    this.activeSessions.set(projectPath, session);
    this.saveSession(session);

    // Initialize logs
    this.fileAccessLog.set(sessionId, []);
    this.changeLog.set(sessionId, []);
    this.decisionLog.set(sessionId, []);
    this.conversationLog.set(sessionId, []);

    return session;
  }

  getSession(sessionId?: string, projectPath?: string): Session | null {
    if (sessionId) {
      return this.loadSession(sessionId);
    }
    if (projectPath && this.activeSessions.has(projectPath)) {
      return this.activeSessions.get(projectPath)!;
    }
    return null;
  }

  getSessionForProject(projectPath: string): Session | null {
    return this.activeSessions.get(projectPath) || null;
  }

  listSessions(
    projectPath?: string,
    status?: SessionStatus,
    limit: number = 10
  ): Session[] {
    const sessions: Session[] = [];

    // List session directories
    try {
      const dirs = fs.readdirSync(this.sessionsDir);
      for (const dir of dirs) {
        if (dir === "index.json") continue;
        const session = this.loadSession(dir);
        if (session) {
          if (projectPath && session.projectPath !== projectPath) continue;
          if (status && session.status !== status) continue;
          sessions.push(session);
        }
      }
    } catch {
      // No sessions
    }

    return sessions
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  updateSession(
    sessionId: string,
    updates: { status?: SessionStatus; metadata?: Partial<SessionMetadata> }
  ): Session | null {
    const session = this.loadSession(sessionId);
    if (!session) return null;

    if (updates.status) {
      session.status = updates.status;
    }
    if (updates.metadata) {
      session.metadata = { ...session.metadata, ...updates.metadata };
    }
    session.updatedAt = new Date().toISOString();
    session.lastActiveAt = new Date().toISOString();

    if (session.status === "active") {
      this.activeSessions.set(session.projectPath, session);
    } else {
      this.activeSessions.delete(session.projectPath);
    }

    this.saveSession(session);
    return session;
  }

  // ============================================================================
  // SNAPSHOT MANAGEMENT
  // ============================================================================

  createSnapshot(
    sessionIdOrPath: string,
    trigger: SnapshotTrigger = "manual",
    summary?: string
  ): SessionSnapshot | null {
    let session = this.loadSession(sessionIdOrPath);
    if (!session) {
      session = this.getSessionForProject(sessionIdOrPath);
    }
    if (!session) return null;

    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const snapshot: SessionSnapshot = {
      id: snapshotId,
      sessionId: session.id,
      trigger,
      createdAt: new Date().toISOString(),
      summary: summary || this.generateSnapshotSummary(session),

      projectState: this.captureProjectState(session),
      codeContext: this.captureCodeContext(session),
      aiMemory: this.captureAIMemory(session),
      workspaceState: this.captureWorkspaceState(session.projectPath)
    };

    // Add to session
    session.snapshots.push(snapshot);

    // Limit snapshots
    if (session.snapshots.length > SESSION_CONFIG.maxSnapshotsPerSession) {
      session.snapshots = session.snapshots.slice(-SESSION_CONFIG.maxSnapshotsPerSession);
    }

    session.updatedAt = new Date().toISOString();
    this.saveSession(session);

    // Save snapshot separately for quick access
    const snapshotPath = path.join(this.sessionsDir, session.id, "snapshots", `${snapshotId}.json`);
    this.ensureDirectory(path.dirname(snapshotPath));
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

    return snapshot;
  }

  getSnapshot(snapshotId?: string, sessionId?: string): SessionSnapshot | null {
    if (snapshotId && sessionId) {
      const snapshotPath = path.join(this.sessionsDir, sessionId, "snapshots", `${snapshotId}.json`);
      if (fs.existsSync(snapshotPath)) {
        return JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
      }
    }

    if (sessionId) {
      const session = this.loadSession(sessionId);
      if (session && session.snapshots.length > 0) {
        return session.snapshots[session.snapshots.length - 1];
      }
    }

    return null;
  }

  listSnapshots(sessionId: string, limit: number = 10): SessionSnapshot[] {
    const session = this.loadSession(sessionId);
    if (!session) return [];

    return session.snapshots
      .slice(-limit)
      .reverse();
  }

  // ============================================================================
  // CONTEXT TRACKING
  // ============================================================================

  trackFileAccess(
    sessionIdOrPath: string,
    filePath: string,
    relevanceScore: number = 50
  ): void {
    const session = this.getSession(undefined, sessionIdOrPath) || this.loadSession(sessionIdOrPath);
    if (!session) return;

    const log = this.fileAccessLog.get(session.id) || [];

    // Update or add file context
    const existing = log.find(f => f.path === filePath);
    if (existing) {
      existing.lastAccessed = new Date().toISOString();
      existing.accessCount++;
      existing.relevanceScore = Math.max(existing.relevanceScore, relevanceScore);
    } else {
      log.push({
        path: filePath,
        lastAccessed: new Date().toISOString(),
        accessCount: 1,
        relevanceScore
      });
    }

    // Keep only top files
    log.sort((a, b) => b.relevanceScore - a.relevanceScore);
    this.fileAccessLog.set(session.id, log.slice(0, SESSION_CONFIG.maxActiveFilesTracked));
  }

  trackChange(
    sessionIdOrPath: string,
    file: string,
    type: "created" | "modified" | "deleted",
    summary: string,
    linesChanged: number = 0
  ): void {
    const session = this.getSession(undefined, sessionIdOrPath) || this.loadSession(sessionIdOrPath);
    if (!session) return;

    const log = this.changeLog.get(session.id) || [];
    log.push({
      file,
      type,
      timestamp: new Date().toISOString(),
      summary,
      linesChanged
    });

    // Keep recent changes
    this.changeLog.set(session.id, log.slice(-SESSION_CONFIG.maxRecentChanges));
  }

  recordDecision(
    sessionIdOrPath: string,
    type: Decision["type"],
    question: string,
    context: string,
    resolution?: string,
    options?: string[]
  ): Decision {
    const session = this.getSession(undefined, sessionIdOrPath) || this.loadSession(sessionIdOrPath);
    const sessionId = session?.id || "unknown";

    const decision: Decision = {
      id: `dec_${Date.now()}`,
      type,
      question,
      context,
      options,
      resolved: !!resolution,
      resolution,
      timestamp: new Date().toISOString()
    };

    const log = this.decisionLog.get(sessionId) || [];
    log.push(decision);
    this.decisionLog.set(sessionId, log);

    return decision;
  }

  recordConversation(
    sessionIdOrPath: string,
    topic: string,
    outcome: string,
    keyPoints: string[]
  ): void {
    const session = this.getSession(undefined, sessionIdOrPath) || this.loadSession(sessionIdOrPath);
    const sessionId = session?.id || "unknown";

    const log = this.conversationLog.get(sessionId) || [];
    log.push({
      timestamp: new Date().toISOString(),
      topic,
      outcome,
      keyPoints
    });

    // Keep recent conversations
    this.conversationLog.set(sessionId, log.slice(-SESSION_CONFIG.maxConversationHistory));
  }

  // ============================================================================
  // RESUMPTION
  // ============================================================================

  resumeSession(projectPath: string, snapshotId?: string): ResumptionContext | null {
    // Find session for project
    let session = this.getSessionForProject(projectPath);

    if (!session) {
      // Look for any session with this project
      const sessions = this.listSessions(projectPath);
      if (sessions.length > 0) {
        session = sessions[0];
      }
    }

    if (!session) return null;

    // Get snapshot
    let snapshot: SessionSnapshot | null = null;
    if (snapshotId) {
      snapshot = this.getSnapshot(snapshotId, session.id);
    } else if (session.snapshots.length > 0) {
      snapshot = session.snapshots[session.snapshots.length - 1];
    }

    if (!snapshot) {
      // Create a fresh snapshot
      snapshot = this.createSnapshot(session.id, "checkpoint", "Resumption checkpoint");
    }

    if (!snapshot) return null;

    // Update session status
    this.updateSession(session.id, { status: "active" });

    // Generate resumption context
    return {
      session,
      snapshot,
      summary: this.generateResumptionSummary(session, snapshot),
      suggestedActions: this.generateSuggestedActions(session, snapshot)
    };
  }

  getResumptionContext(projectPath: string, includeFullContext: boolean = false): ResumptionContext | null {
    return this.resumeSession(projectPath);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanupSessions(
    olderThanDays: number = 30,
    status?: SessionStatus,
    dryRun: boolean = true
  ): { toDelete: string[]; deleted: string[] } {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const toDelete: string[] = [];
    const deleted: string[] = [];

    const sessions = this.listSessions(undefined, status, 1000);
    for (const session of sessions) {
      const updatedAt = new Date(session.updatedAt);
      if (updatedAt < cutoff) {
        toDelete.push(session.id);

        if (!dryRun) {
          const sessionDir = path.join(this.sessionsDir, session.id);
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true });
            deleted.push(session.id);
          }
          this.activeSessions.delete(session.projectPath);
        }
      }
    }

    if (!dryRun) {
      this.saveIndex();
    }

    return { toDelete, deleted };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private generateProjectId(projectPath: string): string {
    return `proj_${Buffer.from(projectPath).toString("base64").substr(0, 12)}`;
  }

  private detectLanguage(projectPath: string): string {
    if (fs.existsSync(path.join(projectPath, "package.json"))) return "typescript";
    if (fs.existsSync(path.join(projectPath, "requirements.txt"))) return "python";
    if (fs.existsSync(path.join(projectPath, "go.mod"))) return "go";
    if (fs.existsSync(path.join(projectPath, "Cargo.toml"))) return "rust";
    return "unknown";
  }

  private detectFramework(projectPath: string): string | undefined {
    try {
      const pkgPath = path.join(projectPath, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps["next"]) return "next.js";
        if (deps["@nestjs/core"]) return "nestjs";
        if (deps["express"]) return "express";
        if (deps["react"]) return "react";
      }
    } catch {
      // Ignore
    }
    return undefined;
  }

  private generateSnapshotSummary(session: Session): string {
    return `${session.metadata.currentPhase} phase, iteration ${session.metadata.currentIteration}. ` +
           `${session.metadata.completedTasks}/${session.metadata.totalTasks} tasks completed.`;
  }

  private captureProjectState(session: Session): ProjectStateSnapshot {
    return {
      phase: session.metadata.currentPhase,
      iteration: session.metadata.currentIteration,
      status: session.status,
      artifacts: [],
      pendingDecisions: this.decisionLog.get(session.id)?.filter(d => !d.resolved) || [],
      recentReviews: []
    };
  }

  private captureCodeContext(session: Session): CodeContextSnapshot {
    const fileAccess = this.fileAccessLog.get(session.id) || [];
    const changes = this.changeLog.get(session.id) || [];

    return {
      activeFiles: fileAccess.slice(0, 20),
      recentChanges: changes.slice(-20),
      hotPaths: fileAccess
        .filter(f => f.accessCount > 3)
        .map(f => f.path),
      importantSymbols: []
    };
  }

  private captureAIMemory(session: Session): AIMemorySnapshot {
    const decisions = this.decisionLog.get(session.id) || [];
    const conversations = this.conversationLog.get(session.id) || [];

    return {
      recentConversations: conversations.slice(-10),
      keyDecisions: decisions
        .filter(d => d.resolved)
        .slice(-10)
        .map(d => ({
          id: d.id,
          topic: d.type,
          decision: d.resolution || "",
          rationale: d.context,
          timestamp: d.timestamp,
          impact: "medium" as const
        })),
      pendingQuestions: decisions
        .filter(d => !d.resolved)
        .map(d => ({
          id: d.id,
          question: d.question,
          context: d.context,
          priority: "medium" as const,
          createdAt: d.timestamp
        })),
      learnedPatterns: []
    };
  }

  private captureWorkspaceState(projectPath: string): WorkspaceStateSnapshot {
    let branch = "main";
    let uncommittedChanges: string[] = [];
    let stagedFiles: string[] = [];
    let lastCommit = "";
    let lastCommitMessage = "";

    try {
      branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: projectPath,
        encoding: "utf-8"
      }).trim();

      const status = execSync("git status --porcelain", {
        cwd: projectPath,
        encoding: "utf-8"
      });

      for (const line of status.split("\n").filter(Boolean)) {
        const file = line.substring(3);
        if (line.startsWith("M ") || line.startsWith("A ")) {
          stagedFiles.push(file);
        } else if (line.startsWith(" M") || line.startsWith("??")) {
          uncommittedChanges.push(file);
        }
      }

      lastCommit = execSync("git rev-parse --short HEAD", {
        cwd: projectPath,
        encoding: "utf-8"
      }).trim();

      lastCommitMessage = execSync("git log -1 --format=%s", {
        cwd: projectPath,
        encoding: "utf-8"
      }).trim();
    } catch {
      // Not a git repo or other error
    }

    return {
      branch,
      uncommittedChanges,
      stagedFiles,
      lastCommit,
      lastCommitMessage
    };
  }

  private generateResumptionSummary(session: Session, snapshot: SessionSnapshot): ResumptionSummary {
    const lastActive = new Date(session.lastActiveAt);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeSince: string;
    if (diffDays > 0) {
      timeSince = `${diffDays} gün önce`;
    } else if (diffHours > 0) {
      timeSince = `${diffHours} saat önce`;
    } else {
      timeSince = `${diffMins} dakika önce`;
    }

    const highlights: string[] = [];

    // Add recent changes
    if (snapshot.codeContext.recentChanges.length > 0) {
      const lastChange = snapshot.codeContext.recentChanges[snapshot.codeContext.recentChanges.length - 1];
      highlights.push(`Son değişiklik: ${lastChange.file} (${lastChange.type})`);
    }

    // Add pending decisions
    if (snapshot.aiMemory.pendingQuestions.length > 0) {
      highlights.push(`${snapshot.aiMemory.pendingQuestions.length} bekleyen karar var`);
    }

    // Add workspace state
    if (snapshot.workspaceState.uncommittedChanges.length > 0) {
      highlights.push(`${snapshot.workspaceState.uncommittedChanges.length} commit edilmemiş dosya`);
    }

    return {
      projectName: session.metadata.projectName,
      currentPhase: session.metadata.currentPhase,
      progress: `${session.metadata.completedTasks}/${session.metadata.totalTasks} task tamamlandı`,
      lastActivity: session.metadata.lastAction,
      timeSinceLastActive: timeSince,
      keyHighlights: highlights
    };
  }

  private generateSuggestedActions(session: Session, snapshot: SessionSnapshot): SuggestedAction[] {
    const actions: SuggestedAction[] = [];

    // Check for uncommitted changes
    if (snapshot.workspaceState.uncommittedChanges.length > 0) {
      actions.push({
        action: "Değişiklikleri commit et",
        reason: `${snapshot.workspaceState.uncommittedChanges.length} dosya commit bekliyor`,
        priority: "high",
        command: "git add . && git commit"
      });
    }

    // Check for pending decisions
    if (snapshot.aiMemory.pendingQuestions.length > 0) {
      const firstQuestion = snapshot.aiMemory.pendingQuestions[0];
      actions.push({
        action: "Bekleyen kararı çöz",
        reason: firstQuestion.question,
        priority: "high"
      });
    }

    // Suggest continuing with current task
    actions.push({
      action: `${session.metadata.currentPhase} fazına devam et`,
      reason: `${session.metadata.totalTasks - session.metadata.completedTasks} task kaldı`,
      priority: "medium",
      command: "devam"
    });

    // Suggest snapshot if none recent
    const lastSnapshot = session.snapshots[session.snapshots.length - 1];
    if (lastSnapshot) {
      const snapshotAge = Date.now() - new Date(lastSnapshot.createdAt).getTime();
      if (snapshotAge > 30 * 60 * 1000) { // 30 minutes
        actions.push({
          action: "Checkpoint oluştur",
          reason: "Son snapshot 30 dakikadan eski",
          priority: "low",
          command: "session_snapshot"
        });
      }
    }

    return actions;
  }
}
