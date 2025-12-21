/**
 * SDLC Documentation Generation Module
 *
 * Automatically generates documentation for each phase of the SDLC process.
 * Documentation is generated based on artifacts, consensus, and AI feedback.
 */

import { PhaseType, PHASE_CONFIGS } from "./workflow.js";

// Phase folder mapping - numbered for correct ordering
export const PHASE_FOLDERS: Record<PhaseType, string> = {
  REQUIREMENTS: "docs/01-requirements",
  ARCHITECTURE: "docs/02-architecture",
  PLANNING: "docs/03-planning",
  DEVELOPMENT: "docs/04-development",
  TESTING: "docs/05-testing",
  DEPLOYMENT: "docs/06-deployment"
};

// Get the folder path for a phase
export function getPhaseFolderPath(phase: PhaseType): string {
  return PHASE_FOLDERS[phase];
}

// Document template types
export type DocumentType =
  | "PHASE_SUMMARY"
  | "REQUIREMENTS_DOC"
  | "ARCHITECTURE_DOC"
  | "API_DOC"
  | "TASK_BREAKDOWN"
  | "TEST_PLAN"
  | "DEPLOYMENT_GUIDE"
  | "RUNBOOK"
  | "CHANGELOG"
  | "PROJECT_README";

// Document generation input
export interface DocumentInput {
  projectId: string;
  projectName: string;
  phase: PhaseType;
  artifacts: {
    type: string;
    content: string;
    version: number;
  }[];
  iterations: {
    iterationNumber: number;
    consensusStatus: string;
    chatgptFeedback?: string;
    geminiFeedback?: string;
    humanApproved: boolean;
  }[];
  tasks?: {
    id: string;
    title: string;
    status: string;
    agentType: string;
    epic: string;
    estimatedHours: number;
    actualHours?: number;
  }[];
  qualityGates?: {
    level: string;
    passed: boolean;
    details?: string;
  }[];
  techStack: string[];
}

// Generated document
export interface GeneratedDocument {
  type: DocumentType;
  title: string;
  filename: string;
  content: string;
  phase: PhaseType;
  generatedAt: string;
}

/**
 * Generate phase summary document
 */
export function generatePhaseSummary(input: DocumentInput): GeneratedDocument {
  const config = PHASE_CONFIGS[input.phase];
  const latestIteration = input.iterations[input.iterations.length - 1];

  let content = `# ${config.nameTr} (${input.phase}) - Phase Summary

## Project: ${input.projectName}

**Generated:** ${new Date().toISOString()}
**Phase:** ${input.phase}
**Status:** ${latestIteration?.humanApproved ? 'COMPLETED' : 'IN_PROGRESS'}

---

## Overview

| Metric | Value |
|--------|-------|
| Total Iterations | ${input.iterations.length} |
| Final Consensus | ${latestIteration?.consensusStatus || 'N/A'} |
| Human Approved | ${latestIteration?.humanApproved ? 'Yes' : 'No'} |
| Artifacts Created | ${input.artifacts.length} |

---

## Artifacts Produced

`;

  for (const artifact of input.artifacts) {
    content += `### ${artifact.type} (v${artifact.version})

\`\`\`
${artifact.content.substring(0, 500)}${artifact.content.length > 500 ? '...' : ''}
\`\`\`

`;
  }

  content += `---

## Iteration History

| Iteration | Consensus | ChatGPT | Gemini | Human |
|-----------|-----------|---------|--------|-------|
`;

  for (const iter of input.iterations) {
    content += `| ${iter.iterationNumber} | ${iter.consensusStatus} | ${iter.chatgptFeedback ? 'Reviewed' : '-'} | ${iter.geminiFeedback ? 'Challenged' : '-'} | ${iter.humanApproved ? '✅' : '⏳'} |
`;
  }

  content += `
---

## AI Feedback Summary

### ChatGPT (Reviewer)
${latestIteration?.chatgptFeedback || 'No feedback recorded'}

### Gemini (Challenger)
${latestIteration?.geminiFeedback || 'No feedback recorded'}

---

## Exit Criteria

`;

  for (const criteria of config.exitCriteria) {
    content += `- [${latestIteration?.humanApproved ? 'x' : ' '}] ${criteria}
`;
  }

  content += `
---

## Next Phase

${config.nextPhase ? `Proceeding to: **${config.nextPhase}**` : '🎉 Project Complete!'}
`;

  return {
    type: "PHASE_SUMMARY",
    title: `${input.phase} Phase Summary`,
    filename: `${getPhaseFolderPath(input.phase)}/summary.md`,
    content,
    phase: input.phase,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate project README
 */
export function generateProjectReadme(input: DocumentInput): GeneratedDocument {
  const content = `# ${input.projectName}

> Auto-generated documentation from AI-Orchestrated SDLC

## Tech Stack

${input.techStack.map(t => `- ${t}`).join('\n')}

## Project Status

| Phase | Status |
|-------|--------|
| Requirements | ${input.phase === 'REQUIREMENTS' ? '🔄 In Progress' : '✅ Complete'} |
| Architecture | ${['ARCHITECTURE'].includes(input.phase) ? '🔄 In Progress' : input.phase === 'REQUIREMENTS' ? '⏳ Pending' : '✅ Complete'} |
| Planning | ${['PLANNING'].includes(input.phase) ? '🔄 In Progress' : ['REQUIREMENTS', 'ARCHITECTURE'].includes(input.phase) ? '⏳ Pending' : '✅ Complete'} |
| Development | ${['DEVELOPMENT'].includes(input.phase) ? '🔄 In Progress' : ['REQUIREMENTS', 'ARCHITECTURE', 'PLANNING'].includes(input.phase) ? '⏳ Pending' : '✅ Complete'} |
| Testing | ${['TESTING'].includes(input.phase) ? '🔄 In Progress' : ['REQUIREMENTS', 'ARCHITECTURE', 'PLANNING', 'DEVELOPMENT'].includes(input.phase) ? '⏳ Pending' : '✅ Complete'} |
| Deployment | ${['DEPLOYMENT'].includes(input.phase) ? '🔄 In Progress' : '⏳ Pending'} |

## Quick Start

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd ${input.projectName.toLowerCase().replace(/\s+/g, '-')}

# Install dependencies
# (Commands vary by tech stack)

# Run the application
# (Commands vary by tech stack)
\`\`\`

## Documentation

- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [API Contracts](docs/api-contracts.yaml)
- [Test Plan](docs/test-plan.md)
- [Deployment Guide](docs/deployment.md)

## AI Consensus

This project was developed using the AI-Orchestrated SDLC Framework with multi-AI consensus:

- **Claude**: Primary orchestrator and developer
- **ChatGPT**: Artifact reviewer (UX perspective)
- **Gemini**: Artifact challenger (edge cases, security)

All major deliverables were approved by all three AI systems and human stakeholders.

## Generated By

🤖 AI-Orchestrated SDLC Framework
📅 ${new Date().toISOString().split('T')[0]}
`;

  return {
    type: "PROJECT_README",
    title: "Project README",
    filename: "README.md",
    content,
    phase: input.phase,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate development task breakdown document
 */
export function generateTaskBreakdown(input: DocumentInput): GeneratedDocument {
  const folder = input.phase === "PLANNING"
    ? getPhaseFolderPath("PLANNING")
    : getPhaseFolderPath("DEVELOPMENT");

  if (!input.tasks) {
    return {
      type: "TASK_BREAKDOWN",
      title: "Task Breakdown",
      filename: `${folder}/task-breakdown.md`,
      content: "# Task Breakdown\n\nNo tasks defined yet.",
      phase: input.phase,
      generatedAt: new Date().toISOString()
    };
  }

  // Group tasks by epic
  const tasksByEpic: Record<string, typeof input.tasks> = {};
  for (const task of input.tasks) {
    if (!tasksByEpic[task.epic]) tasksByEpic[task.epic] = [];
    tasksByEpic[task.epic].push(task);
  }

  let content = `# Task Breakdown

## Project: ${input.projectName}

**Generated:** ${new Date().toISOString()}

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | ${input.tasks.length} |
| Completed | ${input.tasks.filter(t => t.status === 'COMPLETED').length} |
| In Progress | ${input.tasks.filter(t => t.status === 'IN_PROGRESS').length} |
| Pending | ${input.tasks.filter(t => t.status === 'PENDING').length} |
| Estimated Hours | ${input.tasks.reduce((sum, t) => sum + t.estimatedHours, 0)}h |
| Actual Hours | ${input.tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0)}h |

---

`;

  for (const [epic, tasks] of Object.entries(tasksByEpic)) {
    content += `## ${epic}

| Task | Agent | Est. | Actual | Status |
|------|-------|------|--------|--------|
`;
    for (const task of tasks) {
      const statusIcon = task.status === 'COMPLETED' ? '✅' :
                         task.status === 'IN_PROGRESS' ? '🔄' : '⏳';
      content += `| ${task.title} | ${task.agentType} | ${task.estimatedHours}h | ${task.actualHours || '-'}h | ${statusIcon} ${task.status} |
`;
    }
    content += '\n';
  }

  return {
    type: "TASK_BREAKDOWN",
    title: "Task Breakdown",
    filename: `${folder}/task-breakdown.md`,
    content,
    phase: input.phase,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate test plan document
 */
export function generateTestPlan(input: DocumentInput): GeneratedDocument {
  const qualityGates = input.qualityGates || [];

  let content = `# Test Plan

## Project: ${input.projectName}

**Generated:** ${new Date().toISOString()}

---

## Test Strategy

### Unit Testing
- Framework: Based on tech stack (xUnit/.NET, Jest/Node, Pytest/Python)
- Coverage Target: 80%
- Focus: Business logic, services, utilities

### Integration Testing
- API endpoints with in-memory/test database
- External service mocking
- Message queue integration

### E2E Testing
- Critical user flows
- Cross-browser compatibility
- Mobile responsive testing

### Performance Testing
- Load testing (target: 10,000 concurrent users)
- Response time targets (< 200ms p95)
- Stress testing for peak loads

### Security Testing
- OWASP Top 10 validation
- Authentication/Authorization testing
- Input validation and sanitization

---

## Quality Gate Status

| Gate | Level | Status | Details |
|------|-------|--------|---------|
`;

  const gateOrder = [
    'L1_TASK_COMPLETION',
    'L2_UNIT_TESTING',
    'L3_INTEGRATION_TESTING',
    'L4_E2E_TESTING',
    'L5_PERFORMANCE_TESTING',
    'L6_SECURITY_SCAN',
    'L7_REGRESSION_TESTING'
  ];

  for (const level of gateOrder) {
    const gate = qualityGates.find(g => g.level === level);
    const status = gate ? (gate.passed ? '✅ Passed' : '❌ Failed') : '⏳ Pending';
    const details = gate?.details || '-';
    content += `| ${level.replace('_', ' ').replace('L', 'Level ')} | ${level} | ${status} | ${details} |
`;
  }

  content += `
---

## Test Execution

### Prerequisites
- Test environment configured
- Test database seeded
- External services mocked/stubbed

### Commands

\`\`\`bash
# Run unit tests
make test

# Run with coverage
make test-coverage

# Run integration tests
make test-integration

# Run E2E tests
make test-e2e
\`\`\`

---

## Acceptance Criteria

All tests must pass before deployment:
- [ ] Unit test coverage ≥ 80%
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Performance targets met
- [ ] Security scan clean
- [ ] Regression tests passing
`;

  return {
    type: "TEST_PLAN",
    title: "Test Plan",
    filename: `${getPhaseFolderPath("TESTING")}/test-plan.md`,
    content,
    phase: input.phase,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate deployment guide
 */
export function generateDeploymentGuide(input: DocumentInput): GeneratedDocument {
  const content = `# Deployment Guide

## Project: ${input.projectName}

**Generated:** ${new Date().toISOString()}

---

## Prerequisites

- Docker and Docker Compose installed
- kubectl configured (for Kubernetes)
- Access to container registry
- Environment secrets configured

---

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@host:5432/db |
| REDIS_URL | Redis connection string | redis://host:6379 |
| JWT_SECRET | JWT signing key | (min 32 chars) |

---

## Docker Deployment

### Build Image

\`\`\`bash
docker build -t ${input.projectName.toLowerCase().replace(/\s+/g, '-')}:latest .
\`\`\`

### Run with Docker Compose

\`\`\`bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

---

## Kubernetes Deployment

### Apply Manifests

\`\`\`bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
\`\`\`

### Verify Deployment

\`\`\`bash
kubectl get pods -n ${input.projectName.toLowerCase().replace(/\s+/g, '-')}
kubectl get svc -n ${input.projectName.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

---

## Health Checks

### Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| /health/live | Liveness check | 200 OK |
| /health/ready | Readiness check | 200 OK with dependencies status |

### Verify

\`\`\`bash
curl http://localhost:5000/health/live
curl http://localhost:5000/health/ready
\`\`\`

---

## Rollback

### Docker Compose

\`\`\`bash
docker-compose down
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

### Kubernetes

\`\`\`bash
kubectl rollout undo deployment/${input.projectName.toLowerCase().replace(/\s+/g, '-')} -n ${input.projectName.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

---

## Monitoring

- **Logs**: Elasticsearch/Kibana or CloudWatch
- **Metrics**: Prometheus/Grafana
- **Alerts**: PagerDuty/Opsgenie integration

---

## Support

For issues, contact the DevOps team or create a ticket in the issue tracker.
`;

  return {
    type: "DEPLOYMENT_GUIDE",
    title: "Deployment Guide",
    filename: `${getPhaseFolderPath("DEPLOYMENT")}/deployment-guide.md`,
    content,
    phase: input.phase,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate changelog
 */
export function generateChangelog(
  projectName: string,
  version: string,
  changes: { type: string; description: string }[]
): GeneratedDocument {
  const date = new Date().toISOString().split('T')[0];

  let content = `# Changelog

All notable changes to ${projectName} will be documented in this file.

## [${version}] - ${date}

`;

  const grouped: Record<string, string[]> = {
    'Added': [],
    'Changed': [],
    'Fixed': [],
    'Removed': []
  };

  for (const change of changes) {
    const type = change.type.charAt(0).toUpperCase() + change.type.slice(1);
    if (grouped[type]) {
      grouped[type].push(change.description);
    } else {
      grouped['Changed'].push(change.description);
    }
  }

  for (const [type, items] of Object.entries(grouped)) {
    if (items.length > 0) {
      content += `### ${type}\n`;
      for (const item of items) {
        content += `- ${item}\n`;
      }
      content += '\n';
    }
  }

  return {
    type: "CHANGELOG",
    title: "Changelog",
    filename: "CHANGELOG.md",
    content,
    phase: "DEPLOYMENT",
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate all documents for a phase
 */
export function generatePhaseDocuments(input: DocumentInput): GeneratedDocument[] {
  const documents: GeneratedDocument[] = [];

  // Always generate phase summary
  documents.push(generatePhaseSummary(input));

  // Phase-specific documents
  switch (input.phase) {
    case "REQUIREMENTS":
      // Requirements doc is the artifact itself
      break;

    case "ARCHITECTURE":
      // Architecture doc is the artifact itself
      break;

    case "PLANNING":
      documents.push(generateTaskBreakdown(input));
      break;

    case "DEVELOPMENT":
      documents.push(generateTaskBreakdown(input));
      break;

    case "TESTING":
      documents.push(generateTestPlan(input));
      break;

    case "DEPLOYMENT":
      documents.push(generateDeploymentGuide(input));
      documents.push(generateProjectReadme(input));
      break;
  }

  return documents;
}

/**
 * Generate document write sequence
 */
export function generateDocumentWriteSequence(
  projectId: string,
  documents: GeneratedDocument[]
): { tool: string; params: object }[] {
  return documents.map(doc => ({
    tool: "dev_file_write",
    params: {
      projectId,
      path: doc.filename,
      content: doc.content
    }
  }));
}
