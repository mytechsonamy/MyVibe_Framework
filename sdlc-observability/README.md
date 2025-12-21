# SDLC Observability Stack

Elasticsearch + Kibana + Grafana stack for monitoring AI-Orchestrated SDLC Framework.

## Quick Start

```bash
cd sdlc-observability

# Start the stack
docker-compose up -d

# Wait for services to be ready (~30 seconds)
docker-compose ps
```

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3000 | admin / sdlc2024 |
| Kibana | http://localhost:5601 | - |
| Elasticsearch | http://localhost:9200 | - |

## Pre-built Dashboards

1. **SDLC Pipeline Overview** (`/d/sdlc-pipeline`)
   - Total projects, phase transitions
   - AI review activity
   - Recent events log

2. **Task Velocity & Sprints** (`/d/sdlc-velocity`)
   - Estimated vs Actual hours
   - Velocity metrics
   - Sprint burndown
   - Quality gate pass rates

3. **AI Consensus Tracking** (`/d/sdlc-consensus`)
   - Claude/ChatGPT/Gemini approval rates
   - Consensus status distribution
   - Iterations to consensus by phase
   - Rejection reasons analysis

## Integration with MCP Servers

### 1. Copy Logger to Each MCP Server

```bash
cp shared/logger.ts /path/to/ai-gateway-mcp-server/src/services/
cp shared/logger.ts /path/to/project-state-mcp-server/src/services/
cp shared/logger.ts /path/to/dev-tools-mcp-server/src/services/
cp shared/logger.ts /path/to/sdlc-orchestrator-mcp-server/src/services/
```

### 2. Add Environment Variable

Add to each MCP server's config:
```json
{
  "env": {
    "ELASTICSEARCH_URL": "http://localhost:9200"
  }
}
```

### 3. Use Logger in Code

```typescript
import { initLogger } from './services/logger.js';

const logger = initLogger('project-state');

// Log events
logger.logProjectCreated(projectId, projectName, techStack);
logger.logPhaseTransition(projectId, projectName, 'REQUIREMENTS', 'ARCHITECTURE');
logger.logAIReview(projectId, projectName, 'REQUIREMENTS', 1, 'chatgpt', false, 5, 'high');
logger.logConsensusReached(projectId, projectName, 'REQUIREMENTS', 3, 'APPROVED', true, true, true);
logger.logTaskCompleted(projectId, projectName, taskId, 'Implement auth', 'BACKEND_DOTNET', 'Epic 1', 1, 4, 2);
```

## Log Event Types

| Event Type | Description |
|------------|-------------|
| `project_created` | New project initialized |
| `phase_transition` | Phase changed (e.g., REQUIREMENTS → ARCHITECTURE) |
| `iteration_created` | New iteration started |
| `ai_review` | AI (Claude/ChatGPT/Gemini) reviewed artifact |
| `consensus_reached` | All 3 AIs reached consensus |
| `human_approval` | Human approved/rejected |
| `task_completed` | Development task finished |
| `quality_gate` | Quality check executed |
| `sprint_completed` | Sprint finished |
| `git_commit` | Code committed |

## Log Structure

```json
{
  "@timestamp": "2024-12-20T15:00:00.000Z",
  "level": "info",
  "event_type": "task_completed",
  "service": "project-state",
  "project_id": "405f7a5b-3ac3-4af0-a6d9-bb829dd68247",
  "project_name": "Todo List API",
  "task_id": "task-123",
  "task_title": "Implement user registration",
  "agent_type": "BACKEND_DOTNET",
  "epic": "Epic 1: Authentication",
  "sprint_number": 1,
  "estimated_hours": 4,
  "actual_hours": 2,
  "velocity": 2.0,
  "message": "Task \"Implement user registration\" completed (2h, velocity: 2.00x)"
}
```

## Kibana Index Pattern

After logs start flowing, create index pattern in Kibana:

1. Go to http://localhost:5601
2. Stack Management → Index Patterns
3. Create pattern: `sdlc-logs-*`
4. Time field: `@timestamp`

## Stop Stack

```bash
docker-compose down

# Remove volumes (clears all data)
docker-compose down -v
```

## Troubleshooting

**Elasticsearch not starting?**
```bash
# Check logs
docker-compose logs elasticsearch

# Increase vm.max_map_count (Linux)
sudo sysctl -w vm.max_map_count=262144
```

**Grafana dashboards not loading?**
```bash
# Check datasource
curl http://localhost:9200/_cluster/health

# Restart Grafana
docker-compose restart grafana
```

## Architecture

```
┌──────────────────┐
│   MCP Servers    │
│  (ai-gateway,    │
│  project-state,  │──────┐
│  dev-tools,      │      │
│  orchestrator)   │      │
└──────────────────┘      │
                          ▼
              ┌───────────────────┐
              │   Elasticsearch   │
              │   (Port 9200)     │
              └─────────┬─────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│      Kibana      │       │     Grafana      │
│   (Port 5601)    │       │   (Port 3000)    │
│   Log Search     │       │   Dashboards     │
└──────────────────┘       └──────────────────┘
```

## Resource Requirements

- Elasticsearch: ~512MB RAM
- Kibana: ~256MB RAM
- Grafana: ~128MB RAM
- Total: ~1GB RAM minimum

## License

MIT
