# Project State MCP Server

An MCP (Model Context Protocol) server for managing SDLC project state, phases, iterations, artifacts, and consensus tracking.

## Overview

This server provides persistent state management for the AI-Orchestrated SDLC Framework:

- **Project Management**: Create and track SDLC projects
- **Phase Tracking**: 6 phases (Requirements → Architecture → Planning → Development → Testing → Deployment)
- **Iteration Control**: Track iterations with max limit and auto-escalation
- **Consensus Recording**: Track Claude/ChatGPT/Gemini approvals
- **Artifact Versioning**: Auto-versioned artifact storage
- **Agent Registry**: Project-specific agent definitions
- **Task Management**: Task tracking with dependencies
- **Quality Gates**: 7-level quality gate tracking

## Prerequisites

- Node.js ≥ 18.x
- PostgreSQL ≥ 15
- npm or yarn

## Installation

```bash
cd project-state-mcp-server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your database URL
nano .env

# Push database schema
npm run db:push

# Build
npm run build
```

## Database Setup

### Option 1: Local PostgreSQL

```bash
# macOS with Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb sdlc_db

# Update .env
DATABASE_URL="postgresql://localhost:5432/sdlc_db"
```

### Option 2: Docker

```bash
docker run -d \
  --name sdlc-postgres \
  -e POSTGRES_USER=sdlc \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=sdlc_db \
  -p 5432:5432 \
  postgres:15

# Update .env
DATABASE_URL="postgresql://sdlc:password@localhost:5432/sdlc_db"
```

### Option 3: Cloud (Supabase, Neon, etc.)

Use the connection string from your cloud provider.

## Available Tools

### Project Management
| Tool | Description |
|------|-------------|
| `state_create_project` | Create new SDLC project |
| `state_get_project` | Get project status and summary |

### Phase Management
| Tool | Description |
|------|-------------|
| `state_get_phase` | Get current/specific phase status |
| `state_start_phase` | Start a phase |
| `state_advance_phase` | Move to next phase (requires consensus) |

### Iteration Management
| Tool | Description |
|------|-------------|
| `state_create_iteration` | Create new iteration |
| `state_record_review` | Record ChatGPT/Gemini responses |
| `state_record_consensus` | Record consensus status |
| `state_record_human_approval` | Record human approval |

### Artifact Management
| Tool | Description |
|------|-------------|
| `state_save_artifact` | Save artifact (auto-versions) |
| `state_get_artifact` | Get artifact by type/version |

### Agent Management
| Tool | Description |
|------|-------------|
| `state_register_agent` | Register project agent |
| `state_get_agents` | List project agents |

### Task Management
| Tool | Description |
|------|-------------|
| `state_create_task` | Create task in phase |
| `state_update_task` | Update task status |
| `state_get_tasks` | List tasks with filters |

### Quality Gates
| Tool | Description |
|------|-------------|
| `state_run_quality_gate` | Record quality gate result |

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "project-state": {
      "command": "node",
      "args": ["/path/to/project-state-mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://sdlc:password@localhost:5432/sdlc_db"
      }
    }
  }
}
```

## Workflow Example

```
1. state_create_project({ name: "Todo API", techStack: ["dotnet", "postgresql"] })
2. state_start_phase({ projectId: "...", phaseType: "REQUIREMENTS" })
3. state_create_iteration({ projectId: "..." })
4. Claude creates requirements...
5. state_save_artifact({ projectId: "...", type: "REQUIREMENTS", content: "..." })
6. ai_review_artifact (from ai-gateway) → get ChatGPT review
7. ai_challenge_artifact (from ai-gateway) → get Gemini challenge
8. state_record_review({ projectId: "...", iterationNumber: 1, chatgptReview: "...", geminiChallenge: "..." })
9. state_record_consensus({ projectId: "...", iterationNumber: 1, claudeApproved: true, chatgptApproved: false, geminiApproved: false })
10. If not consensus → goto step 3 (new iteration)
11. If consensus → state_record_human_approval({ approved: true })
12. state_advance_phase({ projectId: "..." }) → moves to ARCHITECTURE
```

## Database Schema

See `prisma/schema.prisma` for full schema. Key models:

- **Project**: Main project entity
- **Phase**: 6 phases per project
- **Iteration**: Iterations within phases
- **Artifact**: Versioned artifacts
- **Agent**: Project-specific agents
- **Task**: Development tasks
- **QualityGate**: Quality check results

## Development

```bash
# Watch mode
npm run dev

# Database studio (GUI)
npm run db:studio

# Test with MCP Inspector
npm run inspect
```

## License

MIT

## Author

Mustafa Yıldırım
