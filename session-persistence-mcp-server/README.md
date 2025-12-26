# Session Persistence MCP Server

Büyük projelerde çalışırken context kaybını önleyen, oturum devam ettirme ve bağlam kurtarma sistemi.

## Özellikler

- **Session Management**: Proje bazlı oturum oluşturma, takip ve yönetim
- **Snapshot System**: Otomatik ve manuel checkpoint'ler ile durum kaydetme
- **Context Tracking**: Dosya erişimleri, kod değişiklikleri, kararlar ve konuşmaları takip
- **Smart Resumption**: Kaldığınız yerden devam için akıllı context özeti
- **AI Memory**: Önemli kararlar, öğrenilen pattern'ler ve bekleyen sorular

## Araçlar (14 Tool)

### Session Management
| Tool | Açıklama |
|------|----------|
| `session_create` | Yeni proje session'ı oluştur |
| `session_get` | Session bilgilerini al |
| `session_list` | Session'ları listele (filtreli) |
| `session_update` | Session durumunu güncelle |

### Snapshot Management
| Tool | Açıklama |
|------|----------|
| `session_snapshot` | Mevcut durumun snapshot'ını al |
| `session_get_snapshot` | Belirli bir snapshot'ı getir |
| `session_list_snapshots` | Session snapshot'larını listele |

### Context Tracking
| Tool | Açıklama |
|------|----------|
| `session_track_file` | Dosya erişimini kaydet |
| `session_track_change` | Kod değişikliğini kaydet |
| `session_record_decision` | Alınan kararı kaydet |
| `session_record_conversation` | Konuşma özetini kaydet |

### Resumption
| Tool | Açıklama |
|------|----------|
| `session_resume` | Session'ı devam ettir |
| `session_get_context` | Devam etme context'ini al |
| `session_cleanup` | Eski session'ları temizle |

## Session Durumları

```
active    → Aktif çalışma
paused    → Geçici durma
completed → Tamamlandı
abandoned → Terk edildi
```

## Snapshot Tetikleyicileri

```
auto             → Otomatik (5 dk interval)
manual           → Manuel tetikleme
phase-transition → Faz geçişi
error-recovery   → Hata kurtarma
checkpoint       → Önemli nokta
```

## Veri Yapısı

### Session
```typescript
interface Session {
  id: string;
  projectId: string;
  projectPath: string;
  status: SessionStatus;
  metadata: SessionMetadata;
  snapshots: SessionSnapshot[];
}
```

### Snapshot İçeriği
```typescript
interface SessionSnapshot {
  // Proje Durumu
  projectState: {
    phase: string;
    iteration: number;
    artifacts: ArtifactRef[];
    pendingDecisions: Decision[];
  };

  // Kod Context'i
  codeContext: {
    activeFiles: FileContext[];
    recentChanges: ChangeRecord[];
    hotPaths: string[];
    importantSymbols: SymbolRef[];
  };

  // AI Memory
  aiMemory: {
    recentConversations: ConversationSummary[];
    keyDecisions: KeyDecision[];
    pendingQuestions: PendingQuestion[];
    learnedPatterns: LearnedPattern[];
  };

  // Workspace State
  workspaceState: {
    branch: string;
    uncommittedChanges: string[];
    testResults?: TestResultSnapshot;
    buildStatus?: BuildStatusSnapshot;
  };
}
```

## Kullanım Örnekleri

### Session Başlatma
```json
{
  "tool": "session_create",
  "arguments": {
    "projectPath": "/path/to/project",
    "projectName": "MyApp",
    "metadata": {
      "language": "TypeScript",
      "framework": "React",
      "phase": "implementation"
    }
  }
}
```

### Snapshot Alma
```json
{
  "tool": "session_snapshot",
  "arguments": {
    "projectPath": "/path/to/project",
    "trigger": "checkpoint",
    "summary": "User authentication completed"
  }
}
```

### Session Devam Ettirme
```json
{
  "tool": "session_resume",
  "arguments": {
    "projectPath": "/path/to/project"
  }
}
```

**Örnek Çıktı:**
```markdown
## Session Resumed

**Proje**: MyApp
**Faz**: implementation
**İlerleme**: 7/15 tasks completed
**Son aktivite**: Authentication module (2 hours ago)

### Öne Çıkanlar
- User login/logout implemented
- JWT token handling added
- 3 pending tests to fix

### Önerilen Aksiyonlar
- **Fix failing tests**: 3 tests need attention
- **Continue with user profile**: Next feature in backlog
```

### Karar Kaydetme
```json
{
  "tool": "session_record_decision",
  "arguments": {
    "projectPath": "/path/to/project",
    "type": "architecture",
    "question": "Which state management to use?",
    "context": "Need global state for user auth and theme",
    "resolution": "Using Zustand for simplicity",
    "options": ["Redux", "Zustand", "Jotai", "Context API"]
  }
}
```

## Konfigürasyon

```typescript
const SESSION_CONFIG = {
  autoSnapshotInterval: 5 * 60 * 1000,  // 5 dakika
  maxSnapshotsPerSession: 50,
  snapshotRetentionDays: 30,
  maxActiveFilesTracked: 20,
  maxRecentChanges: 100,
  maxConversationHistory: 10
};
```

## Depolama

Session verileri `~/.myvibe/sessions/` dizininde JSON formatında saklanır:

```
~/.myvibe/sessions/
├── index.json           # Session index
├── {session-id}.json    # Session data
└── snapshots/
    └── {snapshot-id}.json
```

## Entegrasyon

### SDLC Orchestrator ile
```json
{
  "tool": "session_track_change",
  "arguments": {
    "projectPath": "/path/to/project",
    "file": "src/auth/login.ts",
    "type": "modified",
    "summary": "Added password validation",
    "linesChanged": 25
  }
}
```

### Context Orchestrator ile
Session context'i, Context Orchestrator'ın relevance scoring'inde kullanılır.

## Kurulum

```bash
cd session-persistence-mcp-server
npm install
npm run build
```

## Claude Desktop Konfigürasyonu

```json
{
  "mcpServers": {
    "session-persistence": {
      "command": "node",
      "args": ["/path/to/session-persistence-mcp-server/dist/index.js"]
    }
  }
}
```

## Lisans

MIT
