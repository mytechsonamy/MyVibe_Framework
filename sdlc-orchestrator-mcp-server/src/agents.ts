/**
 * SDLC Agent Management Module
 *
 * Defines all agents required for the SDLC process and their responsibilities.
 * Agents are specialized roles that handle specific types of work.
 */

import { PhaseType } from "./workflow.js";

// Agent type enum
export type AgentType =
  | "REQUIREMENTS_ANALYST"
  | "SOLUTION_ARCHITECT"
  | "SPRINT_PLANNER"
  | "BACKEND_DOTNET"
  | "BACKEND_NODE"
  | "BACKEND_PYTHON"
  | "FRONTEND_REACT"
  | "FRONTEND_VUE"
  | "FRONTEND_ANGULAR"
  | "DATABASE"
  | "DEVOPS"
  | "SECURITY"
  | "UNIT_TEST_ENGINEER"
  | "INTEGRATION_TEST_ENGINEER"
  | "E2E_TEST_ENGINEER"
  | "PERFORMANCE_TEST_ENGINEER"
  | "QA_LEAD"
  | "TECH_WRITER";

// Agent definition
export interface AgentDefinition {
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  phases: PhaseType[];
  qualityGates: string[];
  toolsUsed: string[];
}

// Complete agent registry
export const AGENT_REGISTRY: Record<AgentType, AgentDefinition> = {
  // ============================================================================
  // REQUIREMENTS PHASE AGENTS
  // ============================================================================
  REQUIREMENTS_ANALYST: {
    type: "REQUIREMENTS_ANALYST",
    name: "Requirements Analyst",
    description: "Gathers and documents functional and non-functional requirements",
    capabilities: [
      "Analyze user needs",
      "Write user stories with acceptance criteria",
      "Define NFRs (performance, security, availability)",
      "Create requirements traceability matrix",
      "Identify edge cases and constraints"
    ],
    phases: ["REQUIREMENTS"],
    qualityGates: [],
    toolsUsed: [
      "state_save_artifact",
      "dev_file_write",
      "ai_review_artifact",
      "ai_challenge_artifact"
    ]
  },

  // ============================================================================
  // ARCHITECTURE PHASE AGENTS
  // ============================================================================
  SOLUTION_ARCHITECT: {
    type: "SOLUTION_ARCHITECT",
    name: "Solution Architect",
    description: "Designs system architecture, API contracts, and data models",
    capabilities: [
      "Create C4 model diagrams (Context, Container, Component)",
      "Design OpenAPI 3.0 specifications",
      "Define data models and relationships",
      "Document security architecture",
      "Plan integration patterns",
      "Evaluate technology trade-offs"
    ],
    phases: ["ARCHITECTURE"],
    qualityGates: [],
    toolsUsed: [
      "state_save_artifact",
      "dev_file_write",
      "ai_review_artifact",
      "ai_challenge_artifact"
    ]
  },

  // ============================================================================
  // PLANNING PHASE AGENTS
  // ============================================================================
  SPRINT_PLANNER: {
    type: "SPRINT_PLANNER",
    name: "Sprint Planner",
    description: "Breaks down epics into tasks and plans sprints",
    capabilities: [
      "Decompose epics into manageable tasks",
      "Estimate task effort (max 4 hours each)",
      "Identify task dependencies",
      "Assign tasks to appropriate agent types",
      "Plan sprint capacity and velocity",
      "Create parallel execution paths"
    ],
    phases: ["PLANNING"],
    qualityGates: [],
    toolsUsed: [
      "state_create_task",
      "state_register_agent",
      "state_save_artifact",
      "dev_file_write"
    ]
  },

  // ============================================================================
  // DEVELOPMENT PHASE AGENTS - BACKEND
  // ============================================================================
  BACKEND_DOTNET: {
    type: "BACKEND_DOTNET",
    name: "Backend Developer (.NET)",
    description: "Implements .NET/C# backend services and APIs",
    capabilities: [
      "ASP.NET Core Web API development",
      "Entity Framework Core data access",
      "Dependency injection patterns",
      "Authentication/Authorization (JWT, OAuth)",
      "Background services and workers",
      "Unit test implementation (xUnit)"
    ],
    phases: ["DEVELOPMENT"],
    qualityGates: ["L1_TASK_COMPLETION", "L2_UNIT_TESTING"],
    toolsUsed: [
      "dev_file_write",
      "dev_file_read",
      "dev_exec_command",
      "dev_run_build",
      "dev_run_tests",
      "state_update_task",
      "state_run_quality_gate"
    ]
  },

  BACKEND_NODE: {
    type: "BACKEND_NODE",
    name: "Backend Developer (Node.js)",
    description: "Implements Node.js/TypeScript backend services",
    capabilities: [
      "Express/Fastify API development",
      "Prisma/TypeORM data access",
      "TypeScript best practices",
      "JWT authentication",
      "Worker threads and async patterns",
      "Jest unit testing"
    ],
    phases: ["DEVELOPMENT"],
    qualityGates: ["L1_TASK_COMPLETION", "L2_UNIT_TESTING"],
    toolsUsed: [
      "dev_file_write",
      "dev_file_read",
      "dev_exec_command",
      "dev_run_build",
      "dev_run_tests",
      "state_update_task",
      "state_run_quality_gate"
    ]
  },

  BACKEND_PYTHON: {
    type: "BACKEND_PYTHON",
    name: "Backend Developer (Python)",
    description: "Implements Python backend services and APIs",
    capabilities: [
      "FastAPI/Django REST API development",
      "SQLAlchemy data access",
      "Async programming with asyncio",
      "JWT authentication",
      "Celery task queues",
      "Pytest unit testing"
    ],
    phases: ["DEVELOPMENT"],
    qualityGates: ["L1_TASK_COMPLETION", "L2_UNIT_TESTING"],
    toolsUsed: [
      "dev_file_write",
      "dev_file_read",
      "dev_exec_command",
      "dev_run_build",
      "dev_run_tests",
      "state_update_task",
      "state_run_quality_gate"
    ]
  },

  // ============================================================================
  // DEVELOPMENT PHASE AGENTS - FRONTEND
  // ============================================================================
  FRONTEND_REACT: {
    type: "FRONTEND_REACT",
    name: "Frontend Developer (React)",
    description: "Implements React/TypeScript frontend applications",
    capabilities: [
      "React component development",
      "State management (Redux, Zustand)",
      "API integration with React Query",
      "Form handling and validation",
      "Responsive design with Tailwind",
      "React Testing Library tests"
    ],
    phases: ["DEVELOPMENT"],
    qualityGates: ["L1_TASK_COMPLETION", "L2_UNIT_TESTING"],
    toolsUsed: [
      "dev_file_write",
      "dev_file_read",
      "dev_exec_command",
      "dev_run_build",
      "dev_run_tests",
      "state_update_task",
      "state_run_quality_gate"
    ]
  },

  FRONTEND_VUE: {
    type: "FRONTEND_VUE",
    name: "Frontend Developer (Vue)",
    description: "Implements Vue.js frontend applications",
    capabilities: [
      "Vue 3 Composition API",
      "Pinia state management",
      "Vue Router navigation",
      "Form validation with VeeValidate",
      "Tailwind CSS styling",
      "Vitest unit testing"
    ],
    phases: ["DEVELOPMENT"],
    qualityGates: ["L1_TASK_COMPLETION", "L2_UNIT_TESTING"],
    toolsUsed: [
      "dev_file_write",
      "dev_file_read",
      "dev_exec_command",
      "dev_run_build",
      "dev_run_tests",
      "state_update_task",
      "state_run_quality_gate"
    ]
  },

  FRONTEND_ANGULAR: {
    type: "FRONTEND_ANGULAR",
    name: "Frontend Developer (Angular)",
    description: "Implements Angular frontend applications",
    capabilities: [
      "Angular component architecture",
      "RxJS reactive programming",
      "NgRx state management",
      "Angular forms and validation",
      "Angular Material UI",
      "Jasmine/Karma testing"
    ],
    phases: ["DEVELOPMENT"],
    qualityGates: ["L1_TASK_COMPLETION", "L2_UNIT_TESTING"],
    toolsUsed: [
      "dev_file_write",
      "dev_file_read",
      "dev_exec_command",
      "dev_run_build",
      "dev_run_tests",
      "state_update_task",
      "state_run_quality_gate"
    ]
  },

  // ============================================================================
  // DEVELOPMENT PHASE AGENTS - DATABASE
  // ============================================================================
  DATABASE: {
    type: "DATABASE",
    name: "Database Engineer",
    description: "Designs and implements database schemas and migrations",
    capabilities: [
      "Database schema design",
      "SQL migration scripts",
      "Index optimization",
      "Query performance tuning",
      "Data seeding scripts",
      "Backup and recovery procedures"
    ],
    phases: ["DEVELOPMENT"],
    qualityGates: ["L1_TASK_COMPLETION"],
    toolsUsed: [
      "dev_file_write",
      "dev_exec_command",
      "state_update_task"
    ]
  },

  // ============================================================================
  // DEVOPS AGENT
  // ============================================================================
  DEVOPS: {
    type: "DEVOPS",
    name: "DevOps Engineer",
    description: "Implements CI/CD pipelines and infrastructure",
    capabilities: [
      "Docker containerization",
      "Kubernetes manifests",
      "GitHub Actions workflows",
      "Infrastructure as Code (Terraform)",
      "Monitoring and alerting setup",
      "Environment configuration"
    ],
    phases: ["DEPLOYMENT"],
    qualityGates: [],
    toolsUsed: [
      "dev_file_write",
      "dev_exec_command",
      "dev_run_build",
      "state_update_task"
    ]
  },

  // ============================================================================
  // SECURITY AGENT
  // ============================================================================
  SECURITY: {
    type: "SECURITY",
    name: "Security Engineer",
    description: "Reviews and implements security measures",
    capabilities: [
      "Security code review",
      "OWASP vulnerability assessment",
      "Authentication/Authorization review",
      "Secrets management",
      "Security headers configuration",
      "Penetration testing coordination"
    ],
    phases: ["TESTING", "DEPLOYMENT"],
    qualityGates: ["L6_SECURITY_SCAN"],
    toolsUsed: [
      "dev_exec_command",
      "state_run_quality_gate",
      "ai_review_artifact"
    ]
  },

  // ============================================================================
  // TESTING PHASE AGENTS
  // ============================================================================
  UNIT_TEST_ENGINEER: {
    type: "UNIT_TEST_ENGINEER",
    name: "Unit Test Engineer",
    description: "Writes and maintains unit tests",
    capabilities: [
      "Unit test implementation",
      "Mocking and stubbing",
      "Code coverage analysis",
      "Test-driven development",
      "Parameterized testing",
      "Test fixtures and factories"
    ],
    phases: ["DEVELOPMENT", "TESTING"],
    qualityGates: ["L2_UNIT_TESTING"],
    toolsUsed: [
      "dev_file_write",
      "dev_run_tests",
      "state_run_quality_gate",
      "state_update_task"
    ]
  },

  INTEGRATION_TEST_ENGINEER: {
    type: "INTEGRATION_TEST_ENGINEER",
    name: "Integration Test Engineer",
    description: "Implements integration tests for API and database",
    capabilities: [
      "API integration testing",
      "Database integration testing",
      "Test containers setup",
      "In-memory database testing",
      "HTTP client testing",
      "Message queue testing"
    ],
    phases: ["TESTING"],
    qualityGates: ["L3_INTEGRATION_TESTING"],
    toolsUsed: [
      "dev_file_write",
      "dev_run_tests",
      "state_run_quality_gate",
      "state_update_task"
    ]
  },

  E2E_TEST_ENGINEER: {
    type: "E2E_TEST_ENGINEER",
    name: "E2E Test Engineer",
    description: "Implements end-to-end tests with browser automation",
    capabilities: [
      "Playwright/Cypress test automation",
      "Page Object Model patterns",
      "Visual regression testing",
      "Cross-browser testing",
      "Mobile responsive testing",
      "Accessibility testing"
    ],
    phases: ["TESTING"],
    qualityGates: ["L4_E2E_TESTING"],
    toolsUsed: [
      "dev_file_write",
      "dev_run_tests",
      "state_run_quality_gate",
      "state_update_task"
    ]
  },

  PERFORMANCE_TEST_ENGINEER: {
    type: "PERFORMANCE_TEST_ENGINEER",
    name: "Performance Test Engineer",
    description: "Implements and executes performance tests",
    capabilities: [
      "Load testing with k6/JMeter",
      "Stress testing",
      "Endurance testing",
      "API benchmark testing",
      "Database performance testing",
      "Performance bottleneck analysis"
    ],
    phases: ["TESTING"],
    qualityGates: ["L5_PERFORMANCE_TESTING"],
    toolsUsed: [
      "dev_file_write",
      "dev_exec_command",
      "state_run_quality_gate",
      "state_update_task"
    ]
  },

  QA_LEAD: {
    type: "QA_LEAD",
    name: "QA Lead",
    description: "Coordinates testing efforts and reviews test coverage",
    capabilities: [
      "Test strategy definition",
      "Test coverage analysis",
      "Bug triage and prioritization",
      "Test environment management",
      "Release readiness assessment",
      "Quality metrics reporting"
    ],
    phases: ["TESTING"],
    qualityGates: ["L7_REGRESSION_TESTING"],
    toolsUsed: [
      "state_get_tasks",
      "state_run_quality_gate",
      "ai_review_artifact"
    ]
  },

  // ============================================================================
  // DOCUMENTATION AGENT
  // ============================================================================
  TECH_WRITER: {
    type: "TECH_WRITER",
    name: "Technical Writer",
    description: "Creates and maintains project documentation",
    capabilities: [
      "API documentation",
      "User guides and tutorials",
      "Architecture documentation",
      "README files",
      "Deployment runbooks",
      "Changelog maintenance"
    ],
    phases: ["DEPLOYMENT"],
    qualityGates: [],
    toolsUsed: [
      "dev_file_write",
      "dev_file_read",
      "state_save_artifact"
    ]
  }
};

// Get agents by phase
export function getAgentsByPhase(phase: PhaseType): AgentDefinition[] {
  return Object.values(AGENT_REGISTRY).filter(agent =>
    agent.phases.includes(phase)
  );
}

// Get agents by quality gate
export function getAgentsByQualityGate(gateLevel: string): AgentDefinition[] {
  return Object.values(AGENT_REGISTRY).filter(agent =>
    agent.qualityGates.includes(gateLevel)
  );
}

// Get required agents for a tech stack
export function getAgentsForTechStack(techStack: string[]): AgentType[] {
  const agents: AgentType[] = [
    "REQUIREMENTS_ANALYST",
    "SOLUTION_ARCHITECT",
    "SPRINT_PLANNER",
    "DATABASE",
    "DEVOPS",
    "SECURITY",
    "UNIT_TEST_ENGINEER",
    "INTEGRATION_TEST_ENGINEER",
    "E2E_TEST_ENGINEER",
    "PERFORMANCE_TEST_ENGINEER",
    "QA_LEAD",
    "TECH_WRITER"
  ];

  // Add backend agent based on tech stack
  const lowerStack = techStack.map(t => t.toLowerCase());
  if (lowerStack.includes("dotnet") || lowerStack.includes(".net") || lowerStack.includes("csharp")) {
    agents.push("BACKEND_DOTNET");
  }
  if (lowerStack.includes("node") || lowerStack.includes("nodejs") || lowerStack.includes("typescript")) {
    agents.push("BACKEND_NODE");
  }
  if (lowerStack.includes("python") || lowerStack.includes("fastapi") || lowerStack.includes("django")) {
    agents.push("BACKEND_PYTHON");
  }

  // Add frontend agent based on tech stack
  if (lowerStack.includes("react") || lowerStack.includes("nextjs")) {
    agents.push("FRONTEND_REACT");
  }
  if (lowerStack.includes("vue") || lowerStack.includes("nuxt")) {
    agents.push("FRONTEND_VUE");
  }
  if (lowerStack.includes("angular")) {
    agents.push("FRONTEND_ANGULAR");
  }

  return agents;
}

// Generate agent registration sequence for a project
export function generateAgentRegistrationSequence(
  projectId: string,
  techStack: string[]
): { tool: string; params: object }[] {
  const requiredAgents = getAgentsForTechStack(techStack);

  return requiredAgents.map(agentType => ({
    tool: "state_register_agent",
    params: {
      projectId,
      agentType,
      name: AGENT_REGISTRY[agentType].name,
      capabilities: AGENT_REGISTRY[agentType].capabilities
    }
  }));
}

// Validate that all required agents are registered
export interface AgentValidation {
  valid: boolean;
  missingAgents: AgentType[];
  registeredAgents: AgentType[];
}

export function validateAgentRegistration(
  registeredAgents: AgentType[],
  techStack: string[]
): AgentValidation {
  const requiredAgents = getAgentsForTechStack(techStack);
  const registeredSet = new Set(registeredAgents);
  const missingAgents = requiredAgents.filter(a => !registeredSet.has(a));

  return {
    valid: missingAgents.length === 0,
    missingAgents,
    registeredAgents
  };
}
