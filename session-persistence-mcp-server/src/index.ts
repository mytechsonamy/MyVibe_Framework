#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

import { SessionPersistence } from "./services/persistence.js";
import {
  CreateSessionSchema,
  GetSessionSchema,
  ListSessionsSchema,
  UpdateSessionSchema,
  CreateSnapshotSchema,
  GetSnapshotSchema,
  ListSnapshotsSchema,
  TrackFileAccessSchema,
  TrackChangeSchema,
  RecordDecisionSchema,
  RecordConversationSchema,
  ResumeSessionSchema,
  GetResumptionContextSchema,
  CleanupSessionsSchema
} from "./schemas/session.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "session_create",
    description: "Create a new session for a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: { type: "string", description: "Project workspace path" },
        projectName: { type: "string", description: "Project name" },
        metadata: {
          type: "object",
          properties: {
            language: { type: "string" },
            framework: { type: "string" },
            phase: { type: "string" }
          }
        }
      },
      required: ["projectPath", "projectName"]
    }
  },
  {
    name: "session_get",
    description: "Get session by ID or project path.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        projectPath: { type: "string" }
      }
    }
  },
  {
    name: "session_list",
    description: "List sessions with optional filters.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: { type: "string" },
        status: { type: "string", enum: ["active", "paused", "completed", "abandoned"] },
        limit: { type: "number", default: 10 }
      }
    }
  },
  {
    name: "session_update",
    description: "Update session status or metadata.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        status: { type: "string", enum: ["active", "paused", "completed", "abandoned"] },
        metadata: { type: "object" }
      },
      required: ["sessionId"]
    }
  },
  {
    name: "session_snapshot",
    description: "Create a snapshot of current session state.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        projectPath: { type: "string" },
        trigger: { type: "string", enum: ["auto", "manual", "phase-transition", "error-recovery", "checkpoint"], default: "manual" },
        summary: { type: "string" }
      }
    }
  },
  {
    name: "session_get_snapshot",
    description: "Get a specific snapshot or latest for session.",
    inputSchema: {
      type: "object",
      properties: {
        snapshotId: { type: "string" },
        sessionId: { type: "string" }
      }
    }
  },
  {
    name: "session_list_snapshots",
    description: "List snapshots for a session.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        limit: { type: "number", default: 10 }
      },
      required: ["sessionId"]
    }
  },
  {
    name: "session_track_file",
    description: "Track file access for context.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        projectPath: { type: "string" },
        filePath: { type: "string" },
        relevanceScore: { type: "number", minimum: 0, maximum: 100 }
      },
      required: ["filePath"]
    }
  },
  {
    name: "session_track_change",
    description: "Track a code change.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        projectPath: { type: "string" },
        file: { type: "string" },
        type: { type: "string", enum: ["created", "modified", "deleted"] },
        summary: { type: "string" },
        linesChanged: { type: "number" }
      },
      required: ["file", "type", "summary"]
    }
  },
  {
    name: "session_record_decision",
    description: "Record a decision for future reference.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        projectPath: { type: "string" },
        type: { type: "string", enum: ["architecture", "implementation", "testing", "deployment"] },
        question: { type: "string" },
        context: { type: "string" },
        resolution: { type: "string" },
        options: { type: "array", items: { type: "string" } }
      },
      required: ["type", "question", "context"]
    }
  },
  {
    name: "session_record_conversation",
    description: "Record a conversation summary.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        projectPath: { type: "string" },
        topic: { type: "string" },
        outcome: { type: "string" },
        keyPoints: { type: "array", items: { type: "string" } }
      },
      required: ["topic", "outcome", "keyPoints"]
    }
  },
  {
    name: "session_resume",
    description: "Resume a session and get context for continuation.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: { type: "string", description: "Project to resume" },
        snapshotId: { type: "string", description: "Specific snapshot to resume from" }
      },
      required: ["projectPath"]
    }
  },
  {
    name: "session_get_context",
    description: "Get resumption context for a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: { type: "string" },
        includeFullContext: { type: "boolean", default: false }
      },
      required: ["projectPath"]
    }
  },
  {
    name: "session_cleanup",
    description: "Cleanup old sessions.",
    inputSchema: {
      type: "object",
      properties: {
        olderThanDays: { type: "number", default: 30 },
        status: { type: "string", enum: ["completed", "abandoned"] },
        dryRun: { type: "boolean", default: true }
      }
    }
  }
];

// Singleton persistence instance
const persistence = new SessionPersistence();

// Create server
const server = new Server(
  {
    name: "session-persistence-mcp-server",
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
      case "session_create": {
        const input = CreateSessionSchema.parse(args);
        const session = persistence.createSession(
          input.projectPath,
          input.projectName,
          input.metadata
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              created: true,
              sessionId: session.id,
              projectName: session.metadata.projectName,
              status: session.status
            }, null, 2)
          }]
        };
      }

      case "session_get": {
        const input = GetSessionSchema.parse(args);
        const session = persistence.getSession(input.sessionId, input.projectPath);

        if (!session) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Session not found" }) }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              id: session.id,
              projectPath: session.projectPath,
              status: session.status,
              metadata: session.metadata,
              snapshotCount: session.snapshots.length,
              lastActiveAt: session.lastActiveAt
            }, null, 2)
          }]
        };
      }

      case "session_list": {
        const input = ListSessionsSchema.parse(args);
        const sessions = persistence.listSessions(input.projectPath, input.status, input.limit);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              count: sessions.length,
              sessions: sessions.map(s => ({
                id: s.id,
                projectName: s.metadata.projectName,
                status: s.status,
                phase: s.metadata.currentPhase,
                updatedAt: s.updatedAt
              }))
            }, null, 2)
          }]
        };
      }

      case "session_update": {
        const input = UpdateSessionSchema.parse(args);
        const session = persistence.updateSession(input.sessionId, {
          status: input.status,
          metadata: input.metadata
        });

        if (!session) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Session not found" }) }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ updated: true, status: session.status }, null, 2)
          }]
        };
      }

      case "session_snapshot": {
        const input = CreateSnapshotSchema.parse(args);
        const snapshot = persistence.createSnapshot(
          input.sessionId || input.projectPath || "",
          input.trigger,
          input.summary
        );

        if (!snapshot) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Could not create snapshot" }) }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              created: true,
              snapshotId: snapshot.id,
              trigger: snapshot.trigger,
              summary: snapshot.summary
            }, null, 2)
          }]
        };
      }

      case "session_get_snapshot": {
        const input = GetSnapshotSchema.parse(args);
        const snapshot = persistence.getSnapshot(input.snapshotId, input.sessionId);

        if (!snapshot) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Snapshot not found" }) }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              id: snapshot.id,
              trigger: snapshot.trigger,
              createdAt: snapshot.createdAt,
              summary: snapshot.summary,
              projectState: snapshot.projectState,
              activeFiles: snapshot.codeContext.activeFiles.length,
              recentChanges: snapshot.codeContext.recentChanges.length,
              pendingDecisions: snapshot.aiMemory.pendingQuestions.length
            }, null, 2)
          }]
        };
      }

      case "session_list_snapshots": {
        const input = ListSnapshotsSchema.parse(args);
        const snapshots = persistence.listSnapshots(input.sessionId, input.limit);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              count: snapshots.length,
              snapshots: snapshots.map(s => ({
                id: s.id,
                trigger: s.trigger,
                createdAt: s.createdAt,
                summary: s.summary
              }))
            }, null, 2)
          }]
        };
      }

      case "session_track_file": {
        const input = TrackFileAccessSchema.parse(args);
        persistence.trackFileAccess(
          input.sessionId || input.projectPath || "",
          input.filePath,
          input.relevanceScore
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ tracked: true, file: input.filePath })
          }]
        };
      }

      case "session_track_change": {
        const input = TrackChangeSchema.parse(args);
        persistence.trackChange(
          input.sessionId || input.projectPath || "",
          input.file,
          input.type,
          input.summary,
          input.linesChanged
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ tracked: true, change: { file: input.file, type: input.type } })
          }]
        };
      }

      case "session_record_decision": {
        const input = RecordDecisionSchema.parse(args);
        const decision = persistence.recordDecision(
          input.sessionId || input.projectPath || "",
          input.type,
          input.question,
          input.context,
          input.resolution,
          input.options
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              recorded: true,
              decisionId: decision.id,
              resolved: decision.resolved
            }, null, 2)
          }]
        };
      }

      case "session_record_conversation": {
        const input = RecordConversationSchema.parse(args);
        persistence.recordConversation(
          input.sessionId || input.projectPath || "",
          input.topic,
          input.outcome,
          input.keyPoints
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ recorded: true, topic: input.topic })
          }]
        };
      }

      case "session_resume": {
        const input = ResumeSessionSchema.parse(args);
        const context = persistence.resumeSession(input.projectPath, input.snapshotId);

        if (!context) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "No session found for this project" }) }]
          };
        }

        // Format resumption message
        const summary = context.summary;
        const message = `
## Session Resumed

**Proje**: ${summary.projectName}
**Faz**: ${summary.currentPhase}
**İlerleme**: ${summary.progress}
**Son aktivite**: ${summary.lastActivity} (${summary.timeSinceLastActive})

### Öne Çıkanlar
${summary.keyHighlights.map(h => `- ${h}`).join("\n")}

### Önerilen Aksiyonlar
${context.suggestedActions.map(a => `- **${a.action}**: ${a.reason}`).join("\n")}
`;

        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      }

      case "session_get_context": {
        const input = GetResumptionContextSchema.parse(args);
        const context = persistence.getResumptionContext(input.projectPath, input.includeFullContext);

        if (!context) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "No session found" }) }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              summary: context.summary,
              suggestedActions: context.suggestedActions,
              snapshot: {
                id: context.snapshot.id,
                projectState: context.snapshot.projectState,
                activeFileCount: context.snapshot.codeContext.activeFiles.length,
                recentChangeCount: context.snapshot.codeContext.recentChanges.length
              }
            }, null, 2)
          }]
        };
      }

      case "session_cleanup": {
        const input = CleanupSessionsSchema.parse(args);
        const result = persistence.cleanupSessions(
          input.olderThanDays,
          input.status,
          input.dryRun
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              dryRun: input.dryRun,
              toDelete: result.toDelete.length,
              deleted: result.deleted.length,
              sessions: result.toDelete
            }, null, 2)
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
  console.error("Session Persistence MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
