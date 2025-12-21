// SDLC Phase definitions and workflow templates

export type PhaseType = 
  | "REQUIREMENTS"
  | "ARCHITECTURE"
  | "PLANNING"
  | "DEVELOPMENT"
  | "TESTING"
  | "DEPLOYMENT";

export type UserCommand = 
  | "devam" | "d" | "continue" | "c"      // Continue to next step
  | "durum" | "status" | "s"              // Show status
  | "detay" | "detail"                    // Show more details
  | "revize" | "r"                        // Revise with feedback
  | "durdur" | "stop" | "pause"           // Pause workflow
  | "tasks" | "t"                         // Show tasks
  | "dosyalar" | "files" | "f"            // Show files
  | "commit"                              // Git commit
  | "log"                                 // Git log
  | "review"                              // Run AI review cycle
  | "sprint"                              // Sprint summary
  | "yardım" | "help" | "?"               // Show help
  ;

export interface PhaseConfig {
  type: PhaseType;
  name: string;
  nameTr: string;
  maxIterations: number;
  requiredArtifacts: string[];
  deliverables: string[];
  exitCriteria: string[];
  nextPhase: PhaseType | null;
  toolsUsed: string[];
}

export const PHASE_CONFIGS: Record<PhaseType, PhaseConfig> = {
  REQUIREMENTS: {
    type: "REQUIREMENTS",
    name: "Requirements Analysis",
    nameTr: "Gereksinim Analizi",
    maxIterations: 5,
    requiredArtifacts: ["REQUIREMENTS", "USER_STORIES"],
    deliverables: [
      "docs/requirements.md",
      "docs/user-stories.md"
    ],
    exitCriteria: [
      "All user stories have acceptance criteria",
      "NFRs are quantified and measurable",
      "All 3 AIs approve (consensus)",
      "Human approval received"
    ],
    nextPhase: "ARCHITECTURE",
    toolsUsed: [
      "state_create_iteration",
      "state_save_artifact",
      "ai_review_artifact",
      "ai_challenge_artifact",
      "state_record_consensus",
      "dev_file_write",
      "dev_git_commit"
    ]
  },
  ARCHITECTURE: {
    type: "ARCHITECTURE",
    name: "Architecture Design",
    nameTr: "Mimari Tasarım",
    maxIterations: 4,
    requiredArtifacts: ["ARCHITECTURE", "API_CONTRACTS", "DATA_MODEL"],
    deliverables: [
      "docs/architecture.md",
      "docs/api-contracts.yaml",
      "docs/data-model.sql"
    ],
    exitCriteria: [
      "System architecture documented (C4 model)",
      "API contracts defined (OpenAPI 3.0)",
      "Data model complete with indexes",
      "Security architecture defined",
      "All 3 AIs approve",
      "Human approval received"
    ],
    nextPhase: "PLANNING",
    toolsUsed: [
      "state_get_artifact",
      "state_create_iteration",
      "state_save_artifact",
      "ai_review_artifact",
      "ai_challenge_artifact",
      "state_record_consensus",
      "dev_file_write",
      "dev_git_commit"
    ]
  },
  PLANNING: {
    type: "PLANNING",
    name: "Sprint Planning",
    nameTr: "Sprint Planlama",
    maxIterations: 3,
    requiredArtifacts: ["EPIC_BREAKDOWN", "TASK_LIST"],
    deliverables: [
      "docs/epic-breakdown.md",
      "docs/task-breakdown.md"
    ],
    exitCriteria: [
      "Epics defined with clear scope",
      "Tasks ≤ 4 hours each",
      "Dependencies mapped",
      "Agents assigned to tasks",
      "All 3 AIs approve",
      "Human approval received"
    ],
    nextPhase: "DEVELOPMENT",
    toolsUsed: [
      "state_get_artifact",
      "state_register_agent",
      "state_create_task",
      "state_save_artifact",
      "ai_review_artifact",
      "ai_challenge_artifact",
      "state_record_consensus",
      "dev_file_write",
      "dev_git_commit"
    ]
  },
  DEVELOPMENT: {
    type: "DEVELOPMENT",
    name: "Development",
    nameTr: "Geliştirme",
    maxIterations: 10,
    requiredArtifacts: ["CODE"],
    deliverables: [
      "src/**/*"
    ],
    exitCriteria: [
      "All tasks completed",
      "All quality gates passed (L1-L2)",
      "Code committed to git",
      "Build successful"
    ],
    nextPhase: "TESTING",
    toolsUsed: [
      "state_get_tasks",
      "state_update_task",
      "state_run_quality_gate",
      "dev_file_write",
      "dev_file_read",
      "dev_git_commit",
      "dev_run_build",
      "dev_exec_command"
    ]
  },
  TESTING: {
    type: "TESTING",
    name: "Testing & QA",
    nameTr: "Test ve Kalite",
    maxIterations: 5,
    requiredArtifacts: ["TEST_PLAN"],
    deliverables: [
      "docs/test-plan.md",
      "tests/**/*"
    ],
    exitCriteria: [
      "Unit test coverage ≥ 80%",
      "Integration tests passing",
      "E2E tests passing",
      "Performance targets met",
      "Security scan clean"
    ],
    nextPhase: "DEPLOYMENT",
    toolsUsed: [
      "state_get_tasks",
      "state_run_quality_gate",
      "dev_run_tests",
      "dev_exec_command",
      "dev_file_write",
      "dev_git_commit"
    ]
  },
  DEPLOYMENT: {
    type: "DEPLOYMENT",
    name: "Deployment",
    nameTr: "Dağıtım",
    maxIterations: 3,
    requiredArtifacts: ["DOCUMENTATION"],
    deliverables: [
      "docs/deployment.md",
      "docs/runbook.md",
      "README.md"
    ],
    exitCriteria: [
      "Deployment successful",
      "Health checks passing",
      "Documentation complete",
      "Runbook created"
    ],
    nextPhase: null,
    toolsUsed: [
      "dev_file_write",
      "dev_run_build",
      "dev_exec_command",
      "dev_git_commit",
      "state_advance_phase"
    ]
  }
};

// Sprint configuration for DEVELOPMENT phase
export interface SprintConfig {
  maxTasksPerSprint: number;
  maxHoursPerSprint: number;
  qualityGatesRequired: string[];
}

export const SPRINT_CONFIG: SprintConfig = {
  maxTasksPerSprint: 10,
  maxHoursPerSprint: 40,
  qualityGatesRequired: ["L1_TASK_COMPLETION", "L2_UNIT_TESTING"]
};

// Command shortcuts mapping
export const COMMAND_MAP: Record<string, string> = {
  "d": "continue",
  "devam": "continue",
  "c": "continue",
  "s": "status",
  "durum": "status",
  "r": "revise",
  "revize": "revise",
  "t": "tasks",
  "f": "files",
  "dosyalar": "files",
  "?": "help",
  "yardım": "help"
};

// Response templates
export const RESPONSE_TEMPLATES = {
  awaitingInput: (phase: string, options: string[]) => `
📍 **${phase}** fazında bekliyorum.

Komutlar:
${options.map(o => `- \`${o}\``).join("\n")}
`,

  phaseComplete: (phase: string, nextPhase: string | null) => `
✅ **${phase}** fazı tamamlandı!

${nextPhase ? `Sonraki faz: **${nextPhase}**\n\n\`devam\` yazarak devam edebilirsin.` : "🎉 Proje tamamlandı!"}
`,

  negotiationInProgress: (iteration: number, maxIterations: number, round: number) => `
🔄 **Agent Negotiation** (İterasyon ${iteration}/${maxIterations}, Round ${round})

AI agent'lar anlaşmazlıkları çözmeye çalışıyor...
Bu süreç otomatik olarak devam ediyor.
`,

  consensusNeeded: (iteration: number, maxIterations: number) => `
🔄 Consensus için çalışılıyor (İterasyon ${iteration}/${maxIterations})

AI agent'lar otomatik olarak negotiate ediyor ve revizyon yapıyor.
Max iterasyona kadar kullanıcı müdahalesi gerekmez.
`,

  humanDecisionNeeded: () => `
⚠️ **İnsan Kararı Gerekli**

Max iterasyona ulaşıldı ve aşağıdaki kritik konularda AI agent'lar uzlaşamadı:

Bu konularda kararınızı belirtmeniz gerekiyor:
- Her konu için ChatGPT veya Gemini pozisyonunu seçin
- Ya da kendi çözümünüzü belirtin

Komutlar:
- \`karar: [konu_id] chatgpt\` → ChatGPT pozisyonunu kabul et
- \`karar: [konu_id] gemini\` → Gemini pozisyonunu kabul et
- \`karar: [konu_id] [özel çözüm]\` → Kendi çözümünüzü belirtin
- \`detay\` → Tüm pozisyonları görüntüle
`,

  humanApprovalNeeded: () => `
🔔 **İnsan Onayı Gerekli**

Consensus sağlandı. Devam etmek için:
- \`onayla\` veya \`devam\` → Sonraki faza geç
- \`revize: [feedback]\` → Değişiklik iste
`,

  autoIterating: (iteration: number, maxIterations: number, resolvedCount: number, totalCount: number) => `
🔄 **Otomatik İterasyon** (${iteration}/${maxIterations})

Çözülen: ${resolvedCount}/${totalCount} konu
Agent'lar kalan konuları çözmek için çalışıyor...
`
};
