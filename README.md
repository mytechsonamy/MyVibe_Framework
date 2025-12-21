# MyVibe Framework

AI-Orchestrated SDLC Framework - A comprehensive software development lifecycle automation system powered by multi-AI consensus.

## Overview

MyVibe Framework enables fully automated software development through AI orchestration. Claude acts as the primary orchestrator, while ChatGPT and Gemini provide review and challenge capabilities, ensuring high-quality deliverables through multi-AI consensus.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MyVibe Framework                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│   │    Claude    │    │   ChatGPT    │    │    Gemini    │                  │
│   │ Orchestrator │◄──►│   Reviewer   │◄──►│  Challenger  │                  │
│   └──────┬───────┘    └──────────────┘    └──────────────┘                  │
│          │                                                                   │
│          ▼                                                                   │
│   ┌─────────────────────────────────────────────────────────┐               │
│   │              SDLC Orchestrator (MCP Server)              │               │
│   │  sdlc_init │ sdlc_status │ sdlc_continue │ sdlc_review  │               │
│   └─────────────────────────┬───────────────────────────────┘               │
│                             │                                                │
│          ┌──────────────────┼──────────────────┐                            │
│          ▼                  ▼                  ▼                            │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│   │ AI Gateway  │    │Project State│    │  Dev Tools  │                     │
│   │ MCP Server  │    │ MCP Server  │    │ MCP Server  │                     │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                     │
│          │                  │                  │                            │
│          ▼                  ▼                  ▼                            │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│   │ OpenAI API  │    │ PostgreSQL  │    │ File System │                     │
│   │ Google API  │    │  Database   │    │    + Git    │                     │
│   └─────────────┘    └─────────────┘    └─────────────┘                     │
│                             │                                                │
│                             ▼                                                │
│               ┌───────────────────────────┐                                 │
│               │   Observability Stack     │                                 │
│               │ Elasticsearch + Grafana   │                                 │
│               └───────────────────────────┘                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

- **Multi-AI Consensus**: Claude orchestrates, ChatGPT reviews, Gemini challenges
- **6-Phase SDLC**: Requirements → Architecture → Planning → Development → Testing → Deployment
- **Iteration Control**: Automatic iteration with configurable max limits per phase
- **Quality Gates**: 7-level quality gates (L1-L7) from task completion to regression testing
- **Human-in-the-Loop**: Mandatory human approval before phase transitions
- **Real-time Observability**: Elasticsearch + Grafana dashboards for monitoring
- **Minimal User Input**: Simple commands like `devam` (continue) to progress

## SDLC Workflow

```
REQUIREMENTS ──► ARCHITECTURE ──► PLANNING ──► DEVELOPMENT ──► TESTING ──► DEPLOYMENT
    │                │               │              │             │            │
    ▼                ▼               ▼              ▼             ▼            ▼
 5 iter           4 iter          3 iter        sprints        5 iter       3 iter
    │                │               │              │             │            │
    ▼                ▼               ▼              ▼             ▼            ▼
AI Review       AI Review       AI Review     Quality       Quality       Deploy
Consensus       Consensus       Consensus      Gates         Gates        Verify
    │                │               │              │             │            │
    ▼                ▼               ▼              ▼             ▼            ▼
Human OK        Human OK        Human OK     Sprint OK      Human OK     Complete!
```

### Phase Details

| Phase | Max Iterations | Required Artifacts | Exit Criteria |
|-------|----------------|-------------------|---------------|
| REQUIREMENTS | 5 | Requirements, User Stories | Acceptance criteria defined, NFRs quantified, AI consensus |
| ARCHITECTURE | 4 | Architecture, API Contracts, Data Model | C4 model, OpenAPI 3.0, Security design |
| PLANNING | 3 | Epic Breakdown, Task List | Tasks ≤4h, Dependencies mapped, Agents assigned |
| DEVELOPMENT | 10 | Code | All tasks done, Quality gates L1-L2 passed |
| TESTING | 5 | Test Plan | 80% coverage, Integration/E2E/Performance tests pass |
| DEPLOYMENT | 3 | Documentation | Deployment successful, Health checks pass |

## Components

### 1. SDLC Orchestrator MCP Server
**Location**: `sdlc-orchestrator-mcp-server/`

The brain of the framework. Orchestrates all other servers and guides the workflow.

| Tool | Description |
|------|-------------|
| `sdlc_init` | Initialize new SDLC project |
| `sdlc_status` | Get comprehensive project status |
| `sdlc_continue` | Auto-determine and execute next step |
| `sdlc_review` | Trigger AI review cycle |
| `sdlc_sprint` | Sprint summary and planning |
| `sdlc_next` | Get single next action |
| `sdlc_help` | Show command reference |

### 2. AI Gateway MCP Server
**Location**: `ai-gateway-mcp-server/`

Unified access to multiple AI systems for review and consensus.

| Tool | Description |
|------|-------------|
| `ai_invoke_chatgpt` | Send prompt to ChatGPT with role context |
| `ai_invoke_gemini` | Send prompt to Gemini with role context |
| `ai_review_artifact` | Submit artifact for ChatGPT review |
| `ai_challenge_artifact` | Submit artifact for Gemini challenge |
| `ai_check_consensus` | Check if all AIs approved |

**AI Roles**:
- `lead_analyst` - Requirements gathering
- `reviewer` - Artifact review (ChatGPT default)
- `challenger` - Edge case finding (Gemini default)
- `architect` - System design
- `planner` - Task breakdown
- `developer` - Code generation
- `code_reviewer` - Code review

### 3. Project State MCP Server
**Location**: `project-state-mcp-server/`

PostgreSQL-backed persistent state management.

| Tool | Description |
|------|-------------|
| `state_create_project` | Create new SDLC project |
| `state_get_project` | Get project status |
| `state_get_phase` | Get current/specific phase |
| `state_start_phase` | Start a phase |
| `state_advance_phase` | Move to next phase |
| `state_create_iteration` | Create new iteration |
| `state_record_review` | Record AI reviews |
| `state_record_consensus` | Record consensus status |
| `state_record_human_approval` | Record human approval |
| `state_save_artifact` | Save versioned artifact |
| `state_get_artifact` | Get artifact |
| `state_register_agent` | Register project agent |
| `state_create_task` | Create task |
| `state_update_task` | Update task status |
| `state_get_tasks` | List tasks |
| `state_run_quality_gate` | Record quality gate result |

### 4. Dev Tools MCP Server
**Location**: `dev-tools-mcp-server/`

File system and Git operations for development.

| Tool | Description |
|------|-------------|
| `dev_create_workspace` | Create project folder |
| `dev_get_workspace` | Get workspace path |
| `dev_list_workspaces` | List all workspaces |
| `dev_file_write` | Write file |
| `dev_file_read` | Read file |
| `dev_file_list` | List directory |
| `dev_file_delete` | Delete file |
| `dev_file_copy` | Copy file |
| `dev_git_init` | Initialize Git |
| `dev_git_status` | Get Git status |
| `dev_git_add` | Stage files |
| `dev_git_commit` | Commit changes |
| `dev_git_log` | View history |
| `dev_git_branch` | Manage branches |
| `dev_git_checkout` | Switch branch |
| `dev_exec_command` | Run shell command |
| `dev_run_tests` | Run tests |
| `dev_run_build` | Build project |
| `dev_run_lint` | Run linter |

### 5. Observability Stack
**Location**: `sdlc-observability/`

Real-time monitoring with Elasticsearch, Kibana, and Grafana.

**Dashboards**:
- SDLC Pipeline Overview
- Task Velocity & Sprints
- AI Consensus Tracking
- Project Progress

**Log Events**:
- `project_created` - New project initialized
- `phase_transition` - Phase changed
- `iteration_created` - New iteration started
- `ai_review` - AI reviewed artifact
- `consensus_reached` - Consensus achieved
- `human_approval` - Human approved/rejected
- `task_completed` - Task finished
- `quality_gate` - Quality check executed
- `sprint_completed` - Sprint finished
- `git_commit` - Code committed

## Quality Gates

| Level | Gate | Description |
|-------|------|-------------|
| L1 | TASK_COMPLETION | Task marked as done |
| L2 | UNIT_TESTING | Unit tests pass |
| L3 | INTEGRATION_TESTING | Integration tests pass |
| L4 | E2E_TESTING | End-to-end tests pass |
| L5 | PERFORMANCE_TESTING | Performance targets met |
| L6 | SECURITY_SCAN | Security scan clean |
| L7 | REGRESSION_TESTING | Regression tests pass |

## Installation

### Prerequisites

- Node.js ≥ 18.x
- PostgreSQL ≥ 15
- Docker (for observability stack)
- Claude Desktop or Claude Code CLI

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/MyVibe_Framework.git
cd MyVibe_Framework
```

### 2. Setup Database

```bash
# Using Docker
docker run -d \
  --name sdlc-postgres \
  -e POSTGRES_USER=sdlc \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=sdlc_db \
  -p 5432:5432 \
  postgres:15
```

### 3. Install MCP Servers

```bash
# Project State Server
cd project-state-mcp-server
cp .env.example .env
# Edit .env with DATABASE_URL
npm install
npm run db:push
npm run build

# AI Gateway Server
cd ../ai-gateway-mcp-server
cp .env.example .env
# Edit .env with OPENAI_API_KEY and GOOGLE_API_KEY
npm install
npm run build

# Dev Tools Server
cd ../dev-tools-mcp-server
cp .env.example .env
# Edit .env with WORKSPACE_ROOT
npm install
npm run build

# SDLC Orchestrator Server
cd ../sdlc-orchestrator-mcp-server
npm install
npm run build
```

### 4. Start Observability Stack

```bash
cd sdlc-observability
docker-compose up -d
```

Access points:
- Grafana: http://localhost:3000 (admin/sdlc2024)
- Kibana: http://localhost:5601
- Elasticsearch: http://localhost:9200

### 5. Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sdlc-orchestrator": {
      "command": "node",
      "args": ["/path/to/sdlc-orchestrator-mcp-server/dist/index.js"]
    },
    "ai-gateway": {
      "command": "node",
      "args": ["/path/to/ai-gateway-mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key",
        "GOOGLE_API_KEY": "AIza-your-key"
      }
    },
    "project-state": {
      "command": "node",
      "args": ["/path/to/project-state-mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://sdlc:password@localhost:5432/sdlc_db",
        "ELASTICSEARCH_URL": "http://localhost:9200"
      }
    },
    "dev-tools": {
      "command": "node",
      "args": ["/path/to/dev-tools-mcp-server/dist/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/path/to/SDLC_Projects",
        "ELASTICSEARCH_URL": "http://localhost:9200"
      }
    }
  }
}
```

## Usage

### Quick Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `devam` | `d`, `c` | Continue to next step |
| `durum` | `s` | Show project status |
| `tasks` | `t` | List all tasks |
| `dosyalar` | `f` | List workspace files |
| `review` | - | Run AI review cycle |
| `sprint` | - | Show sprint summary |
| `commit` | - | Git commit changes |
| `detay` | - | Show more details |
| `revize: [msg]` | `r` | Request revision |
| `onayla` | - | Give human approval |
| `yardim` | `?` | Show help |

### Example Session

```
User: Yeni bir Todo List API projesi baslat

Claude: sdlc_init cagriyorum...
✅ Proje olusturuldu: Todo List API
✅ Workspace: /SDLC_Projects/todo-list-api
✅ Git initialized
📍 REQUIREMENTS fazinda. `devam` yazarak basla.

User: devam

Claude: Requirements olusturuyorum...
[creates requirements.md, user-stories.md]

AI Review baslatiyorum...
ChatGPT: ✅ Approved (3 minor suggestions)
Gemini: ⚠️ 2 challenges found
Consensus: NEEDS_REVISION

Duzeltip devam edeyim mi? (d/detay/revize)

User: d

Claude: Feedback'e gore revize ediyorum...
[updates documents]

ChatGPT: ✅ Approved
Gemini: ✅ Approved
Consensus: APPROVED ✅

🔔 Insan Onayi Gerekli
`onayla` veya `devam` ile sonraki faza gec.

User: onayla

Claude: ✅ REQUIREMENTS fazı tamamlandı!
📍 ARCHITECTURE fazina geciliyor...
```

## Project Structure

```
MyVibe_Framework/
├── README.md                           # This file
├── PlanningFiles/                      # Original design documents
│   ├── AI-Orchestrated-SDLC-Framework.docx
│   └── MCP-SDLC-Orchestration-Framework.docx
│
├── sdlc-orchestrator-mcp-server/       # Main orchestrator
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── workflow.ts                 # Phase definitions
│   │   └── schemas/orchestrator.ts     # Tool schemas
│   └── package.json
│
├── ai-gateway-mcp-server/              # Multi-AI gateway
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── constants.ts                # System prompts
│   │   ├── types.ts                    # TypeScript types
│   │   ├── schemas/prompts.ts          # Zod schemas
│   │   └── services/
│   │       ├── openai-client.ts        # ChatGPT client
│   │       ├── google-client.ts        # Gemini client
│   │       └── logger.ts               # Elasticsearch logger
│   └── package.json
│
├── project-state-mcp-server/           # State management
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── types.ts                    # TypeScript types
│   │   ├── schemas/state.ts            # Zod schemas
│   │   └── services/
│   │       ├── db.ts                   # Prisma client
│   │       └── logger.ts               # Elasticsearch logger
│   ├── prisma/
│   │   └── schema.prisma               # Database schema
│   └── package.json
│
├── dev-tools-mcp-server/               # File/Git operations
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── schemas/tools.ts            # Tool schemas
│   │   └── services/
│   │       ├── workspace.ts            # Workspace management
│   │       ├── git.ts                  # Git operations
│   │       └── logger.ts               # Elasticsearch logger
│   └── package.json
│
└── sdlc-observability/                 # Monitoring stack
    ├── docker-compose.yml              # ELK + Grafana
    ├── shared/
    │   └── logger.ts                   # Shared logger utility
    └── grafana/
        ├── provisioning/
        │   ├── datasources/
        │   │   └── elasticsearch.yml
        │   └── dashboards/
        │       └── dashboards.yml
        └── dashboards/
            ├── sdlc-pipeline.json
            ├── sdlc-velocity.json
            ├── sdlc-consensus.json
            └── sdlc-progress.json
```

## Environment Variables

### AI Gateway
| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for ChatGPT |
| `GOOGLE_API_KEY` | Yes | Google AI API key for Gemini |
| `ELASTICSEARCH_URL` | No | Elasticsearch for logging |

### Project State
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ELASTICSEARCH_URL` | No | Elasticsearch for logging |

### Dev Tools
| Variable | Required | Description |
|----------|----------|-------------|
| `WORKSPACE_ROOT` | Yes | Base path for project workspaces |
| `ELASTICSEARCH_URL` | No | Elasticsearch for logging |

## Troubleshooting

### MCP Server Not Starting

```bash
# Check if server builds correctly
cd <mcp-server-folder>
npm run build

# Run manually to see errors
node dist/index.js
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql postgresql://sdlc:password@localhost:5432/sdlc_db

# Check Prisma schema
cd project-state-mcp-server
npm run db:studio
```

### Elasticsearch Not Starting

```bash
# Check logs
cd sdlc-observability
docker-compose logs elasticsearch

# Increase memory map limit (Linux)
sudo sysctl -w vm.max_map_count=262144
```

## Roadmap

- [ ] Token usage tracking per AI agent (Claude, ChatGPT, Gemini)
- [ ] Enforcement middleware for phase transitions
- [ ] Automatic AI review execution
- [ ] Quality gate enforcement
- [ ] Documentation generation per SDLC phase
- [ ] Agent management system
- [ ] Cost estimation and tracking

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT

## Author

Mustafa Yildirim

---

**Note**: This framework is designed for AI-assisted development. Human oversight and approval are required at each phase transition to ensure quality and correctness.
