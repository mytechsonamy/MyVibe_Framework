# MyVibe Framework - Architecture Documentation

## Overview

MyVibe Framework is an AI-Orchestrated SDLC (Software Development Lifecycle) automation system that enables fully automated software development through multi-AI consensus.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Interface                                  │
│                     (Claude Desktop / Claude Code CLI)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SDLC Orchestrator (Brain)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Workflow  │  │   Phase     │  │  Quality    │  │  Session Persist   │ │
│  │   Engine    │  │   Manager   │  │   Gates     │  │  (Context Recovery)│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
     ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
     │  AI Gateway  │        │Project State │        │  Dev Tools   │
     │  (Multi-AI)  │        │  (Postgres)  │        │  (FS + Git)  │
     └──────────────┘        └──────────────┘        └──────────────┘
              │                       │                       │
              ▼                       ▼                       ▼
     ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
     │   ChatGPT    │        │   Database   │        │  Workspace   │
     │   Gemini     │        │   + Index    │        │  + Git Repo  │
     └──────────────┘        └──────────────┘        └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            Design Tools Layer                                │
│                   ┌────────────────────────────────────┐                     │
│                   │  Design Tools (Figma + Tokens)     │                     │
│                   │  Wireframes │ Mockups │ A11y Check │                     │
│                   └────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        Brownfield Support Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │Repo Indexer  │  │   Context    │  │   Delivery   │  │    Test          │ │
│  │+ Impact Eng  │  │ Orchestrator │  │   Planner    │  │  Intelligence    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │    Arch      │  │     PR       │  │   Hotspot    │  ┌──────────────────┐ │
│  │  Guardrails  │  │ Orchestrator │  │   Analyzer   │  │ Repo Fingerprint │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         Observability Layer                                  │
│           Elasticsearch  │  Kibana  │  Grafana  │  Logging                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## MCP Server Catalog

### Core Servers (5)

| Server | Purpose | Key Tools |
|--------|---------|-----------|
| **SDLC Orchestrator** | Workflow management, phase transitions | `sdlc_init`, `sdlc_continue`, `sdlc_status` |
| **AI Gateway** | Multi-AI consensus (ChatGPT, Gemini) | `ai_review_artifact`, `ai_check_consensus` |
| **Project State** | Persistent state, PostgreSQL | `state_create_project`, `state_save_artifact` |
| **Dev Tools** | File system, Git operations | `dev_file_write`, `dev_git_commit` |
| **Design Tools** | UI/UX design, Figma integration | `design_create_file`, `design_review_accessibility` |

### Brownfield Support Servers (9)

| Server | Purpose | Key Tools |
|--------|---------|-----------|
| **Repo Indexer** | Code intelligence, AST parsing | `repo_index`, `repo_analyze_impact` |
| **Context Orchestrator** | Token budget, smart context | `context_plan`, `context_get` |
| **Session Persistence** | Context recovery, snapshots | `session_create`, `session_resume` |
| **Delivery Planner** | PR slicing, feature flags | `delivery_slice_changes`, `delivery_create_rollout` |
| **Test Intelligence** | Smart test selection | `test_select`, `test_detect_flaky` |
| **Arch Guardrails** | Architecture enforcement | `arch_analyze`, `arch_find_circular` |
| **PR Orchestrator** | VCS workflow, CODEOWNERS | `pr_generate_template`, `pr_suggest_reviewers` |
| **Hotspot Analyzer** | Churn, risk, ownership | `hotspot_analyze`, `risk_model` |
| **Repo Fingerprint** | Style, patterns, conventions | `fingerprint_create`, `fingerprint_style_guide` |

## Data Flow

### 1. Project Initialization

```
User Request → SDLC Orchestrator
                    │
                    ├──► Project State (create project record)
                    ├──► Dev Tools (create workspace + git init)
                    ├──► Repo Indexer (initial index)
                    └──► Repo Fingerprint (learn conventions)
```

### 2. Development Cycle

```
sdlc_continue
    │
    ├──► Project State (get current phase)
    ├──► Context Orchestrator (gather relevant context)
    │
    ├──► [Claude generates code]
    │
    ├──► Arch Guardrails (validate architecture)
    ├──► Test Intelligence (select impacted tests)
    ├──► Dev Tools (write files, run tests)
    │
    └──► Project State (update iteration)
```

### 3. Review & Consensus

```
sdlc_review
    │
    ├──► AI Gateway
    │       ├──► ChatGPT (reviewer)
    │       └──► Gemini (challenger)
    │
    ├──► Project State (record reviews)
    │
    └──► Consensus Check
            │
            ├──► APPROVED → Phase transition
            └──► NEEDS_REVISION → Continue iteration
```

### 4. Deployment

```
Phase: DEPLOYMENT
    │
    ├──► Delivery Planner (create rollout plan)
    ├──► Dev Tools (create tags, deploy)
    ├──► Hotspot Analyzer (risk assessment)
    │
    └──► Health Check
            │
            ├──► HEALTHY → Complete
            └──► UNHEALTHY → Auto-rollback
```

## Session Persistence (Context Recovery)

### Problem

Large brownfield projects require multiple sessions. Context loss between sessions causes:
- Repeated analysis
- Lost decision history
- Inconsistent progress

### Solution: Session Snapshots

```
┌─────────────────────────────────────────────────────────────────┐
│                     Session Persistence Layer                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │  Snapshot   │───►│   Session   │───►│    Recovery         │  │
│  │  Service    │    │   Storage   │    │    Service          │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Session Snapshot Contents:
├── Project State
│   ├── Current phase & iteration
│   ├── Completed tasks
│   └── Pending decisions
│
├── Code Context
│   ├── Active files (last 20)
│   ├── Recent changes
│   └── Dependency graph (hot paths)
│
├── AI Memory
│   ├── Recent conversations
│   ├── Key decisions made
│   └── Pending questions
│
└── Workspace State
    ├── Uncommitted changes
    ├── Branch state
    └── Test results
```

### Snapshot Triggers

1. **Automatic**: Every 5 minutes during active work
2. **Phase Transition**: Before moving to next phase
3. **Manual**: User command `sdlc_snapshot`
4. **Error Recovery**: Before any potentially risky operation

### Recovery Process

```
1. sdlc_resume (or auto-detect on init)
   │
   ├── Load latest snapshot
   ├── Restore project state
   ├── Load relevant context files
   ├── Summarize recent decisions
   │
   └── Present continuation prompt:
       "Son oturumda X fazındasınız.
        Y task tamamlandı, Z task bekliyor.
        Kaldığınız yerden devam etmek ister misiniz?"
```

## Directory Structure

```
MyVibe_Framework/
├── ARCHITECTURE.md              # This file
├── README.md                    # Main documentation
├── PlanningFiles/               # Original design docs
│
├── sdlc-orchestrator-mcp-server/    # Core orchestrator
├── ai-gateway-mcp-server/           # Multi-AI gateway
├── project-state-mcp-server/        # State management
├── dev-tools-mcp-server/            # File/Git operations
├── design-tools-mcp-server/         # UI/UX design, Figma
│
├── repo-indexer-mcp-server/         # P0: Code intelligence
├── context-orchestrator-mcp-server/ # P0: Context management
├── session-persistence-mcp-server/  # P0: Session recovery
├── delivery-planner-mcp-server/     # P1: Delivery planning
├── test-intelligence-mcp-server/    # P1: Test selection
├── arch-guardrails-mcp-server/      # P1: Architecture rules
├── pr-orchestrator-mcp-server/      # P2: PR workflow
├── hotspot-analyzer-mcp-server/     # P2: Risk analysis
├── repo-fingerprint-mcp-server/     # P2: Project dialect
│
└── sdlc-observability/              # Monitoring stack
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| AI Orchestration | Claude (primary), ChatGPT, Gemini |
| Backend | Node.js, TypeScript |
| Database | PostgreSQL (state), SQLite (index) |
| Protocol | MCP (Model Context Protocol) |
| Observability | Elasticsearch, Grafana, Kibana |
| Version Control | Git |
| Token Counting | tiktoken (cl100k_base) |

## Quality Gates

| Level | Gate | When Applied |
|-------|------|--------------|
| L1 | Task Completion | Every task |
| L2 | Unit Tests | Development phase |
| L3 | Integration Tests | Testing phase |
| L4 | E2E Tests | Testing phase |
| L5 | Performance Tests | Testing phase |
| L6 | Security Scan | Pre-deployment |
| L7 | Regression Tests | Pre-deployment |

## Security Considerations

1. **API Keys**: Never committed, environment variables only
2. **Secrets Detection**: `arch_check_security` scans for hardcoded secrets
3. **SQL Injection**: Parameterized queries only
4. **Input Validation**: Zod schemas for all tool inputs
5. **Audit Logging**: All operations logged to Elasticsearch

## Performance Optimization

1. **Incremental Indexing**: Only changed files re-indexed
2. **Context Caching**: Smart context cached per session
3. **Parallel Execution**: Independent tools run in parallel
4. **Token Budgeting**: Stay within model context limits
5. **WAL Mode**: SQLite write-ahead logging for concurrency

## Extension Points

### Adding a New MCP Server

1. Create directory: `my-feature-mcp-server/`
2. Implement: `src/index.ts` (MCP handlers)
3. Define schemas: `src/schemas/*.ts` (Zod)
4. Add to Claude config
5. Update README.md

### Custom Architecture Rules

```json
// .arch-guardrails.json
{
  "rules": {
    "my-custom-rule": ["error", {
      "pattern": "...",
      "message": "..."
    }]
  }
}
```

### Custom Patterns (Fingerprinting)

```typescript
fingerprint_learn_pattern({
  name: "our-logger-pattern",
  description: "Custom logging format",
  regex: "logger\\.(info|error)\\(\\{[^}]+\\}\\)"
})
```

## SDLC Workflow

```
REQUIREMENTS ──► DESIGN ──► ARCHITECTURE ──► PLANNING ──► DEVELOPMENT ──► TESTING ──► DEPLOYMENT
     │             │             │              │              │              │            │
     ▼             ▼             ▼              ▼              ▼              ▼            ▼
  5 iter        5 iter        4 iter         3 iter        sprints        5 iter       3 iter
     │             │             │              │              │              │            │
     ▼             ▼             ▼              ▼              ▼              ▼            ▼
 AI Review    AI Review     AI Review      AI Review     Quality       Quality        Deploy
 Consensus    Consensus     Consensus      Consensus      Gates         Gates        Verify
```

### DESIGN Phase (New)

The DESIGN phase sits between REQUIREMENTS and ARCHITECTURE:

| Aspect | Details |
|--------|---------|
| **Purpose** | UI/UX design, wireframes, mockups, design tokens |
| **Max Iterations** | 5 |
| **AI Roles** | Claude: Design system • ChatGPT: UX review • Gemini: Accessibility |
| **Required Artifacts** | WIREFRAMES, MOCKUPS, DESIGN_TOKENS, COMPONENT_MAP |
| **Exit Criteria** | A11y score ≥80, Consistency validated, Human approval |

## Roadmap Integration

All Brownfield Support features (P0, P1, P2) and Session Persistence are complete.

### Completed
- Session Persistence - Context recovery across sessions
- DESIGN Phase - UI/UX design workflow with Figma integration

### Next Priorities
1. **Multi-Project Dashboard** - Manage multiple projects
2. **Plugin System** - Easy extension mechanism
3. **Cloud Deployment** - Hosted version

---

Last Updated: 2025-12-26
Version: 3.0.0 (DESIGN Phase + Session Persistence Complete)
