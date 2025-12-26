# MyVibe Framework

AI-Orchestrated SDLC Framework - A comprehensive software development lifecycle automation system powered by multi-AI consensus. Supports both greenfield and brownfield (100K+ LOC) projects.

## Overview

MyVibe Framework enables fully automated software development through AI orchestration. Claude acts as the primary orchestrator, while ChatGPT and Gemini provide review and challenge capabilities, ensuring high-quality deliverables through multi-AI consensus.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MyVibe Framework                                       │
│                              14 MCP Servers • Multi-AI Consensus                          │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗   │
│  ║                              AI ORCHESTRATION LAYER                                ║   │
│  ╠═══════════════════════════════════════════════════════════════════════════════════╣   │
│  ║  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐                   ║   │
│  ║  │    Claude    │◄─────►│   ChatGPT    │◄─────►│    Gemini    │                   ║   │
│  ║  │ Orchestrator │       │   Reviewer   │       │  Challenger  │                   ║   │
│  ║  └──────┬───────┘       └──────────────┘       └──────────────┘                   ║   │
│  ╚═════════╪═════════════════════════════════════════════════════════════════════════╝   │
│            │                                                                              │
│            ▼                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗   │
│  ║                                 CORE MCP SERVERS                                   ║   │
│  ╠═══════════════════════════════════════════════════════════════════════════════════╣   │
│  ║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  ║   │
│  ║  │     SDLC        │  │   AI Gateway    │  │  Project State  │  │  Dev Tools   │  ║   │
│  ║  │  Orchestrator   │  │   (ChatGPT +    │  │   (PostgreSQL)  │  │  (Git + FS)  │  ║   │
│  ║  │                 │  │    Gemini)      │  │                 │  │              │  ║   │
│  ║  └─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────────┘  ║   │
│  ╚═══════════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                           │
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗   │
│  ║                          BROWNFIELD SUPPORT (Large Codebases)                      ║   │
│  ╠═══════════════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                                    ║   │
│  ║  ┌─ P0: Core Infrastructure ─────────────────────────────────────────────────────┐║   │
│  ║  │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐                 │║   │
│  ║  │  │ Repo Indexer │  │ Context          │  │ Session          │                 │║   │
│  ║  │  │ (AST+Symbols)│  │ Orchestrator     │  │ Persistence      │                 │║   │
│  ║  │  │              │  │ (Token Budget)   │  │ (Context Recovery)│                │║   │
│  ║  │  └──────────────┘  └──────────────────┘  └──────────────────┘                 │║   │
│  ║  └───────────────────────────────────────────────────────────────────────────────┘║   │
│  ║                                                                                    ║   │
│  ║  ┌─ P1: Workflow Enhancement ────────────────────────────────────────────────────┐║   │
│  ║  │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐                 │║   │
│  ║  │  │ Delivery     │  │ Test             │  │ Architecture     │                 │║   │
│  ║  │  │ Planner      │  │ Intelligence     │  │ Guardrails       │                 │║   │
│  ║  │  │ (PR Slicing) │  │ (Smart Selection)│  │ (Layer Rules)    │                 │║   │
│  ║  │  └──────────────┘  └──────────────────┘  └──────────────────┘                 │║   │
│  ║  └───────────────────────────────────────────────────────────────────────────────┘║   │
│  ║                                                                                    ║   │
│  ║  ┌─ P2: Integration & Analytics ─────────────────────────────────────────────────┐║   │
│  ║  │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐                 │║   │
│  ║  │  │ PR           │  │ Hotspot          │  │ Repo             │                 │║   │
│  ║  │  │ Orchestrator │  │ Analyzer         │  │ Fingerprint      │                 │║   │
│  ║  │  │ (CODEOWNERS) │  │ (Churn+Risk)     │  │ (Style Learning) │                 │║   │
│  ║  │  └──────────────┘  └──────────────────┘  └──────────────────┘                 │║   │
│  ║  └───────────────────────────────────────────────────────────────────────────────┘║   │
│  ╚═══════════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                           │
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗   │
│  ║                               OBSERVABILITY LAYER                                  ║   │
│  ╠═══════════════════════════════════════════════════════════════════════════════════╣   │
│  ║       Elasticsearch  ◄────────►  Kibana  ◄────────►  Grafana Dashboards           ║   │
│  ╚═══════════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

### Core Capabilities
- **Multi-AI Consensus**: Claude orchestrates, ChatGPT reviews, Gemini challenges
- **7-Phase SDLC**: Requirements → Design → Architecture → Planning → Development → Testing → Deployment
- **Quality Gates**: 7-level gates (L1-L7) from task completion to regression testing
- **Human-in-the-Loop**: Human approval at phase transitions only
- **Real-time Observability**: Elasticsearch + Grafana dashboards

### Brownfield Support (Large Codebases)
- **Codebase Intelligence**: AST parsing, symbol extraction, dependency graphs
- **Smart Context**: Token budget management, relevance scoring, semantic chunking
- **Session Persistence**: Context recovery across sessions, auto-snapshots
- **Test Intelligence**: Impact-based test selection, flaky test detection
- **Architecture Guardrails**: Layer boundary enforcement, pattern validation
- **PR Automation**: CODEOWNERS, AI provenance, reviewer suggestions

## SDLC Workflow

```
REQUIREMENTS ──► DESIGN ──► ARCHITECTURE ──► PLANNING ──► DEVELOPMENT ──► TESTING ──► DEPLOYMENT
    │              │            │               │              │             │            │
    ▼              ▼            ▼               ▼              ▼             ▼            ▼
 5 iter         5 iter       4 iter          3 iter        sprints        5 iter       3 iter
    │              │            │               │              │             │            │
    ▼              ▼            ▼               ▼              ▼             ▼            ▼
AI Review      AI Review    AI Review       AI Review     Quality       Quality       Deploy
Consensus      Consensus    Consensus       Consensus      Gates         Gates        Verify
    │              │            │               │              │             │            │
    ▼              ▼            ▼               ▼              ▼             ▼            ▼
Human OK       Human OK     Human OK        Human OK     Sprint OK      Human OK     Complete!
```

### Phase Details

| Phase | Default Max Iter | AI Consensus | Human Approval | Required Artifacts | Exit Criteria |
|-------|------------------|--------------|----------------|-------------------|---------------|
| REQUIREMENTS | 5 | ✅ Required | At phase end | Requirements, User Stories | Acceptance criteria, NFRs, AI consensus |
| DESIGN | 5 | ✅ Required | At phase end | Wireframes, Mockups, Design Tokens | A11y score ≥80, Consistency validated |
| ARCHITECTURE | 4 | ✅ Required | At phase end | Architecture, API Contracts, Data Model | C4 model, OpenAPI 3.0, Security design |
| PLANNING | 3 | ✅ Required | At phase end | Epic Breakdown, Task List | Tasks ≤4h, Dependencies mapped |
| DEVELOPMENT | 10 | ❌ Not needed | Sprint completion | Code | All tasks done, L1-L2 quality gates |
| TESTING | 5 | ❌ Not needed | At phase end | Test Plan | L3-L6 quality gates pass |
| DEPLOYMENT | 3 | ❌ Not needed | At phase end | Documentation | Deployment successful |

> **Note**: Max iterations are configurable per phase using `state_update_phase_max_iterations`. Values shown are defaults.

## Components (14 MCP Servers)

### Core Servers

#### 1. SDLC Orchestrator MCP Server
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
| `sdlc_validate_advance` | Check if phase can advance (enforcement) |
| `sdlc_run_ai_review` | Execute full AI review sequence |
| `sdlc_get_agents` | Get agents for tech stack (includes project-specific) |
| `sdlc_get_agent_context` | Get agent's system prompt for task execution |
| `sdlc_validate_agents` | Validate all required agents are registered |
| `sdlc_generate_docs` | Generate phase documentation |
| `sdlc_generate_changelog` | Generate changelog from iterations |
| `sdlc_rollback` | Rollback failed deployment (revert or reset) |
| `sdlc_check_deployment_health` | Run health checks, auto-rollback on failure |

#### 2. AI Gateway MCP Server
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

#### 3. Project State MCP Server
**Location**: `project-state-mcp-server/`

PostgreSQL-backed persistent state management.

| Tool | Description |
|------|-------------|
| `state_create_project` | Create new SDLC project |
| `state_get_project` | Get project status |
| `state_get_phase` | Get current/specific phase |
| `state_start_phase` | Start a phase |
| `state_advance_phase` | Move to next phase |
| `state_update_phase_max_iterations` | Update max iterations for a phase |
| `state_create_iteration` | Create new iteration |
| `state_record_review` | Record AI reviews |
| `state_record_consensus` | Record consensus status |
| `state_record_human_approval` | Record human approval |
| `state_save_artifact` | Save versioned artifact |
| `state_get_artifact` | Get artifact |
| `state_register_agent` | Register project agent |
| `state_get_agents` | Get registered agents |
| `state_create_task` | Create task |
| `state_update_task` | Update task status |
| `state_get_tasks` | List tasks |
| `state_run_quality_gate` | Record quality gate result |

#### 4. Dev Tools MCP Server
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
| `dev_git_revert` | Revert a commit (safe rollback) |
| `dev_git_reset` | Reset to commit (destructive rollback) |
| `dev_git_tag` | Create deployment tags |
| `dev_git_list_tags` | List available tags |
| `dev_git_diff` | Compare commits for rollback analysis |
| `dev_exec_command` | Run shell command |
| `dev_run_tests` | Run tests |
| `dev_run_build` | Build project |
| `dev_run_lint` | Run linter |

#### 5. Design Tools MCP Server
**Location**: `design-tools-mcp-server/`

UI/UX design tools with Figma integration, design tokens, and accessibility reviews.

| Tool | Description |
|------|-------------|
| `design_create_file` | Create new Figma design file |
| `design_create_frame` | Create frame/artboard (mobile/tablet/desktop) |
| `design_add_component` | Add UI component to frame |
| `design_create_flow` | Create user flow diagram |
| `design_get_file` | Get Figma file details |
| `design_extract_tokens` | Extract design tokens from file |
| `design_export_tokens` | Export tokens (CSS/SCSS/Tailwind/JSON) |
| `design_review_accessibility` | Run WCAG accessibility checks |
| `design_review_consistency` | Check design system consistency |
| `design_generate_component_map` | Generate frontend component mapping |

### Brownfield Support Servers

#### 6. Repo Indexer MCP Server
**Location**: `repo-indexer-mcp-server/`

Codebase intelligence through indexing, symbol tracking, and dependency analysis.

| Tool | Description |
|------|-------------|
| `repo_index` | Index repository (incremental, multi-language) |
| `repo_status` | Get index status and stats |
| `repo_query_symbols` | Query symbols (functions, classes, types) |
| `repo_query_dependencies` | Find file dependencies (incoming/outgoing) |
| `repo_dependency_graph` | Generate dependency graph (adjacency/edges/mermaid) |
| `repo_analyze_impact` | Analyze change impact with risk scoring |
| `repo_get_hotspots` | Find code hotspots (dependents/complexity/churn) |
| `repo_search` | Search symbols across codebase |

#### 7. Context Orchestrator MCP Server
**Location**: `context-orchestrator-mcp-server/`

Intelligent context selection and token budget management for large codebases.

| Tool | Description |
|------|-------------|
| `context_plan` | Plan optimal context selection for a task |
| `context_get` | Get optimized context chunks within token budget |
| `context_analyze_relevance` | Analyze file relevance for targets |
| `context_summarize_file` | Get concise file summary |
| `context_chunk_file` | Split file into semantic chunks |
| `context_estimate_tokens` | Estimate token counts for files |

#### 8. Delivery Planner MCP Server
**Location**: `delivery-planner-mcp-server/`

Incremental delivery planning - slices large changes into reviewable PRs.

| Tool | Description |
|------|-------------|
| `delivery_analyze_changes` | Analyze changes between branches |
| `delivery_detect_breaking` | Detect breaking changes in files |
| `delivery_slice_changes` | Slice changes into PR chunks |
| `delivery_generate_flags` | Generate feature flag definitions |
| `delivery_generate_flag_code` | Generate flag code snippets |
| `delivery_create_rollout` | Create rollout plan with stages |
| `delivery_rollback_plan` | Generate rollback procedures |
| `delivery_compatibility_plan` | Generate backwards compatibility plan |
| `delivery_create_plan` | Create complete delivery plan |
| `delivery_validate_plan` | Validate delivery plan |

#### 9. Test Intelligence MCP Server
**Location**: `test-intelligence-mcp-server/`

Smart test selection and flaky test detection.

| Tool | Description |
|------|-------------|
| `test_discover` | Discover all test files |
| `test_analyze_file` | Analyze test cases in a file |
| `test_select` | Select tests based on changed files |
| `test_impacted` | Get tests impacted by changes |
| `test_detect_flaky` | Detect flaky tests from history |
| `test_quarantine` | Quarantine flaky tests |
| `test_coverage` | Analyze code coverage |
| `test_coverage_gaps` | Find files with low coverage |
| `test_health` | Get test suite health score |
| `test_record_run` | Record test run results |
| `test_history` | Get test run history |

#### 10. Architecture Guardrails MCP Server
**Location**: `arch-guardrails-mcp-server/`

Architecture-level linting and enforcement.

| Tool | Description |
|------|-------------|
| `arch_init` | Initialize config with preset |
| `arch_load_config` | Load existing config |
| `arch_update_rule` | Update rule configuration |
| `arch_analyze` | Run architecture analysis |
| `arch_analyze_layers` | Analyze layer dependencies |
| `arch_find_circular` | Find circular dependencies |
| `arch_check_security` | Run security checks |
| `arch_report` | Generate analysis report |
| `arch_score` | Get architecture health score |

#### 11. PR Orchestrator MCP Server
**Location**: `pr-orchestrator-mcp-server/`

VCS-native workflow with PR templates, CODEOWNERS, and AI provenance.

| Tool | Description |
|------|-------------|
| `pr_create_branch` | Create branch following naming conventions |
| `pr_validate_branch` | Validate branch name against conventions |
| `pr_get_branch_info` | Get branch information |
| `pr_parse_codeowners` | Parse CODEOWNERS file |
| `pr_get_owners` | Get code owners for files |
| `pr_generate_codeowners` | Auto-generate CODEOWNERS from history |
| `pr_generate_template` | Generate PR description from template |
| `pr_analyze` | Analyze PR for complexity and risk |
| `pr_get_size` | Get PR size classification |
| `pr_generate_provenance` | Generate AI provenance metadata |
| `pr_track_ai_change` | Track AI-generated changes |
| `pr_suggest_reviewers` | Suggest reviewers based on ownership |
| `pr_init_workflow` | Initialize workflow configuration |
| `pr_generate_labels` | Generate appropriate labels |

#### 12. Hotspot Analyzer MCP Server
**Location**: `hotspot-analyzer-mcp-server/`

Git churn analysis, bug-prone detection, and ownership mapping.

| Tool | Description |
|------|-------------|
| `hotspot_analyze` | Analyze code hotspots |
| `hotspot_file` | Get detailed hotspot for a file |
| `hotspot_churn` | Analyze code churn patterns |
| `ownership_map` | Get ownership map for files |
| `ownership_find` | Find owners for specific files |
| `ownership_domains` | Analyze domain areas |
| `ownership_teams` | Get team ownership distribution |
| `bugs_find_prone` | Find bug-prone files |
| `bugs_indicators` | Analyze bug indicators |
| `risk_model` | Calculate risk model |
| `risk_trend` | Get risk trend over time |
| `risk_factors` | Identify risk factors |
| `authors_contributions` | Analyze author contributions |
| `authors_file` | Get authors for a file |
| `authors_inactive` | Find files with inactive owners |

#### 13. Repo Fingerprint MCP Server
**Location**: `repo-fingerprint-mcp-server/`

Learns project "dialect" - coding style, patterns, and conventions.

| Tool | Description |
|------|-------------|
| `fingerprint_create` | Create repository fingerprint |
| `fingerprint_get` | Get existing fingerprint |
| `fingerprint_update` | Update fingerprint |
| `fingerprint_coding_style` | Analyze coding style |
| `fingerprint_naming` | Analyze naming conventions |
| `fingerprint_error_handling` | Analyze error handling patterns |
| `fingerprint_logging` | Analyze logging standards |
| `fingerprint_detect_patterns` | Detect common code patterns |
| `fingerprint_learn_pattern` | Learn custom patterns |
| `fingerprint_validate` | Validate code against fingerprint |
| `fingerprint_structure` | Analyze project structure |
| `fingerprint_dependencies` | Analyze dependencies |
| `fingerprint_testing` | Analyze testing patterns |
| `fingerprint_style_guide` | Generate style guide |
| `fingerprint_template` | Generate code templates |
| `fingerprint_suggest` | Suggest naming conventions |

#### 14. Session Persistence MCP Server
**Location**: `session-persistence-mcp-server/`

Context preservation and session recovery for large projects.

| Tool | Description |
|------|-------------|
| `session_create` | Create new project session |
| `session_get` | Get session information |
| `session_list` | List sessions with filters |
| `session_update` | Update session status |
| `session_snapshot` | Create state snapshot |
| `session_get_snapshot` | Get specific snapshot |
| `session_list_snapshots` | List session snapshots |
| `session_track_file` | Track file access |
| `session_track_change` | Track code changes |
| `session_record_decision` | Record decisions made |
| `session_record_conversation` | Record conversation summaries |
| `session_resume` | Resume session with context |
| `session_get_context` | Get resumption context |
| `session_cleanup` | Cleanup old sessions |

### Observability Stack
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

## Project-Specific Agents

Define custom agents for your project in `docs/agents/*.md` files. Each agent can have:

```markdown
# Backend Node Developer Agent

## Metadata
| Alan | Değer |
|------|-------|
| **ID** | `uuid-here` |
| **Tip** | `BACKEND_NODE` |
| **İsim** | Backend Node Developer |

## Tech Stack
- TypeScript
- Node.js
- Express

## Sorumluluklar
1. Express server implementasyonu
2. REST API endpoint'leri

## System Prompt
\`\`\`
Sen projenin Backend Developer'ısın.
- TypeScript strict mode kullan
- Tüm input'ları Zod ile validate et
...
\`\`\`
```

Use `sdlc_get_agent_context` to load agent's system prompt during task execution:

```typescript
// Get agent context
const context = await sdlc_get_agent_context({
  workspacePath: "/path/to/project",
  agentType: "BACKEND_NODE",
  taskDescription: "Implement login endpoint"
});
// context.systemPrompt contains the agent's instructions
```

## Installation

### Prerequisites

- Node.js ≥ 18.x
- PostgreSQL ≥ 15
- Docker (for observability stack)
- Claude Desktop or Claude Code CLI

### 1. Clone the Repository

```bash
git clone https://github.com/mytechsonamy/MyVibe_Framework.git
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
    },
    "design-tools": {
      "command": "node",
      "args": ["/path/to/design-tools-mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your-token"
      }
    },
    "repo-indexer": {
      "command": "node",
      "args": ["/path/to/repo-indexer-mcp-server/dist/index.js"]
    },
    "context-orchestrator": {
      "command": "node",
      "args": ["/path/to/context-orchestrator-mcp-server/dist/index.js"]
    },
    "session-persistence": {
      "command": "node",
      "args": ["/path/to/session-persistence-mcp-server/dist/index.js"]
    }
  }
}
```

> **Brownfield Support**: For large existing codebases, also add: `delivery-planner`, `test-intelligence`, `arch-guardrails`, `pr-orchestrator`, `hotspot-analyzer`, `repo-fingerprint`

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

### Session Persistence (Large Projects)

For long-running projects, use session persistence to preserve context across sessions:

```
User: session_resume ile devam et

Claude: session_resume çağırıyorum...

## Session Resumed

**Proje**: Todo List API
**Faz**: DEVELOPMENT
**İlerleme**: 7/15 task tamamlandı
**Son aktivite**: User auth module (2 saat önce)

### Öne Çıkanlar
- Login/logout endpoints implemented
- JWT token handling complete
- 3 failing tests to fix

### Önerilen Aksiyonlar
- **Fix failing tests**: auth.test.ts has 3 errors
- **Continue with user profile**: Next feature in backlog
```

**Key Commands**:
| Command | Description |
|---------|-------------|
| `session_create` | Start tracking a new project |
| `session_snapshot` | Create checkpoint (auto every 5 min) |
| `session_resume` | Resume with full context |
| `session_track_file` | Track important files |
| `session_record_decision` | Record architecture decisions |

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
│   │   ├── agents.ts                   # Default agent registry
│   │   ├── agent-loader.ts             # Project-specific agent loader
│   │   ├── enforcement.ts              # Phase transition enforcement
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
├── design-tools-mcp-server/            # UI/UX Design tools
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── types.ts                    # Type definitions
│   │   ├── schemas/design.ts           # Tool schemas
│   │   └── services/
│   │       └── design.ts               # Figma, tokens, accessibility
│   └── package.json
│
├── repo-indexer-mcp-server/            # Codebase intelligence
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── types.ts                    # Type definitions
│   │   ├── schemas/indexer.ts          # Tool schemas
│   │   └── services/
│   │       ├── indexer.ts              # Main indexer + impact analysis
│   │       ├── parser.ts               # Multi-language code parser
│   │       └── storage.ts              # SQLite index storage
│   └── package.json
│
├── context-orchestrator-mcp-server/    # Context management
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── types.ts                    # Type definitions
│   │   ├── schemas/context.ts          # Tool schemas
│   │   └── services/
│   │       ├── orchestrator.ts         # Context selection logic
│   │       └── tokenizer.ts            # Token counting (tiktoken)
│   └── package.json
│
├── delivery-planner-mcp-server/        # Incremental delivery
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── types.ts                    # Type definitions
│   │   ├── schemas/planner.ts          # Tool schemas
│   │   └── services/
│   │       └── planner.ts              # PR slicing, feature flags
│   └── package.json
│
├── test-intelligence-mcp-server/       # Test intelligence
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── types.ts                    # Type definitions
│   │   ├── schemas/tests.ts            # Tool schemas
│   │   └── services/
│   │       └── intelligence.ts         # Test selection, flaky detection
│   └── package.json
│
├── arch-guardrails-mcp-server/         # Architecture enforcement
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── types.ts                    # Type definitions
│   │   ├── schemas/guardrails.ts       # Tool schemas
│   │   └── services/
│   │       └── guardrails.ts           # Layer analysis, rules
│   └── package.json
│
├── pr-orchestrator-mcp-server/         # PR/Branch workflow
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── types.ts                    # Type definitions
│   │   ├── schemas/orchestrator.ts     # Tool schemas
│   │   └── services/
│   │       └── orchestrator.ts         # PR templates, CODEOWNERS
│   └── package.json
│
├── hotspot-analyzer-mcp-server/        # Hotspot & ownership
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── types.ts                    # Type definitions
│   │   ├── schemas/analyzer.ts         # Tool schemas
│   │   └── services/
│   │       └── analyzer.ts             # Churn, risk, ownership
│   └── package.json
│
├── repo-fingerprint-mcp-server/        # Repo fingerprinting
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── types.ts                    # Type definitions
│   │   ├── schemas/fingerprint.ts      # Tool schemas
│   │   └── services/
│   │       └── fingerprint.ts          # Style, patterns, conventions
│   └── package.json
│
├── session-persistence-mcp-server/     # Session & context recovery
│   ├── src/
│   │   ├── index.ts                    # MCP server entry
│   │   ├── types.ts                    # Type definitions
│   │   ├── schemas/session.ts          # Tool schemas
│   │   └── services/
│   │       └── persistence.ts          # Session management, snapshots
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
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-5.2 |
| `GOOGLE_API_KEY` | Yes | Google AI API key for Gemini 3 Flash |
| `ELASTICSEARCH_URL` | No | Elasticsearch for logging |

### Token Costs (per 1M tokens)
| Provider | Model | Input | Output |
|----------|-------|-------|--------|
| OpenAI | GPT-5.2 | $1.75 | $14.00 |
| Google | Gemini 3 Flash | $0.50 | $3.00 |
| Anthropic | Claude Opus 4 | $15.00 | $75.00 |

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

### Completed Features
- [x] Token usage tracking per AI agent (Claude, ChatGPT, Gemini)
- [x] Enforcement middleware for phase transitions
- [x] Automatic AI review execution
- [x] Quality gate enforcement
- [x] Documentation generation per SDLC phase
- [x] Agent management system
- [x] Cost estimation and tracking
- [x] Project-specific agent definitions (docs/agents/*.md)
- [x] Dynamic max iteration configuration

### Recently Completed
- [x] Multi-project dashboard (`sdlc-multi-project.json`)
- [x] Agent collaboration visualization (`sdlc-agent-collaboration.json`)
- [x] Automated rollback on failed deployments (`sdlc_rollback`, `sdlc_check_deployment_health`)

### Brownfield Support (Existing Large Codebase Adaptation)

Framework'ü mevcut büyük projelerde (100K+ LOC) çalışabilir hale getirmek için planlanan özellikler:

#### P0 - Critical (Core Infrastructure) ✅ COMPLETED

| Feature | Description | Status |
|---------|-------------|--------|
| **Repo Intelligence Indexer** | AST + Symbol + Dependency Graph extraction for codebase understanding. Multi-language support (TS/JS, Python, Go). Incremental indexing with SQLite cache. | ✅ Done |
| **Change Impact Engine** | Graph-based impact analysis with risk scoring. Git history integration for churn analysis, blame info, and hotspot detection. | ✅ Done |
| **Context Orchestrator** | Selective file loading + smart chunking + token budget management. Multiple strategies: full_files, smart_chunks, summaries, hybrid. | ✅ Done |

#### P1 - High Priority (Workflow Enhancement) ✅ COMPLETED

| Feature | Description | Status |
|---------|-------------|--------|
| **Incremental Delivery Planner** | Slices large changes into reviewable PRs. Feature flag strategies, backwards compatibility playbooks, rollout plans. | ✅ Done |
| **Test Intelligence Layer** | Impact-based test selection, flaky test management, coverage gap detection, mutation testing support. | ✅ Done |
| **Architecture Guardrails** | Linter-like rules at architecture level. Enforces layer boundaries, coding patterns, and project conventions. | ✅ Done |

#### P2 - Medium Priority (Integration & Analytics) ✅ COMPLETED

| Feature | Description | Status |
|---------|-------------|--------|
| **PR/Branch Orchestrator** | VCS-native workflow with auto-generated PR templates, CODEOWNERS integration, AI provenance tracking. | ✅ Done |
| **Hotspot & Ownership Analyzer** | Git churn analysis, bug-prone file detection, domain ownership mapping. Risk model integration. | ✅ Done |
| **Repo Fingerprinting** | Learns project "dialect" - coding style, error handling patterns, logging standards, naming conventions. | ✅ Done |

#### Key Challenges Identified (via AI Consensus)

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| **Contextual Hallucination** | Critical | Hybrid Graph-RAG + grounded citations |
| **Technical Debt Blindness** | High | Repo fingerprinting + ADR integration |
| **Dependency Hell** | High | Runtime trace analysis + DI container awareness |
| **Validation Paradox** | Medium | Impact-based test selection + parallel execution |
| **Lost in the Middle** | Medium | Hierarchical summarization + context-on-demand |

#### Comparison with Other Tools

| Tool | Approach | MyVibe Advantage |
|------|----------|------------------|
| Cursor | IDE-level indexing, fast but misses big picture | Full SDLC lifecycle + multi-AI consensus |
| Devin | Autonomous agent, expensive and slow | Human-in-the-loop balance, cost-effective |
| Copilot Workspace | Issue → Plan → Code | Deep planning phases + quality gates |
| Aider | ctags-based, lightweight | Enterprise-grade state management + observability |

#### P3 - Session & Context Management ✅ COMPLETED

| Feature | Description | Status |
|---------|-------------|--------|
| **Session Persistence** | Context preservation across sessions. Auto-snapshots, resumption context, AI memory tracking. | ✅ Done |

#### Implementation Phases

```
Phase 1 (Core) ✅         Phase 2 (Workflow) ✅      Phase 3 (Integration) ✅    Phase 4 (Context) ✅
─────────────────────    ─────────────────────     ─────────────────────      ─────────────────────
✓ Repo Indexer           ✓ Slice Planner           ✓ PR Orchestrator          ✓ Session Persistence
✓ Impact Engine          ✓ Test Intelligence       ✓ Hotspot Analyzer
✓ Context Orchestrator   ✓ Arch Guardrails         ✓ Repo Fingerprinting
```

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
