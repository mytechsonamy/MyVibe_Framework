# SDLC Orchestrator MCP Server

The brain of the AI-Orchestrated SDLC Framework. Provides workflow automation with minimal user input.

## Overview

This server orchestrates the other 3 MCP servers (ai-gateway, project-state, dev-tools) and guides Claude through the entire SDLC workflow with simple commands.

## Quick Commands

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
| `yardım` | `?` | Show help |

## Installation

```bash
cd sdlc-orchestrator-mcp-server
npm install
npm run build
```

## Available Tools

| Tool | Description |
|------|-------------|
| `sdlc_init` | Initialize new SDLC project (creates everything) |
| `sdlc_status` | Comprehensive project status |
| `sdlc_continue` | Auto-determine and execute next step |
| `sdlc_review` | Run AI review cycle |
| `sdlc_sprint` | Sprint summary and planning |
| `sdlc_next` | Get single next action |
| `sdlc_help` | Show command reference |

## Workflow

```
REQUIREMENTS → ARCHITECTURE → PLANNING → DEVELOPMENT → TESTING → DEPLOYMENT
     ↓              ↓             ↓            ↓            ↓          ↓
   5 iter        4 iter       3 iter      sprints       5 iter      3 iter
     ↓              ↓             ↓            ↓            ↓          ↓
  AI Review     AI Review     AI Review   Quality      Quality     Deploy
  Consensus     Consensus     Consensus    Gates        Gates      Verify
     ↓              ↓             ↓            ↓            ↓          ↓
  Human OK      Human OK      Human OK    Sprint OK    Human OK    Complete!
```

## Usage Example

### Start New Project
```
> Yeni bir e-commerce API projesi başlat

Claude: sdlc_init çağırıyorum...
✅ Proje oluşturuldu
✅ Workspace hazır
✅ Git initialized
📍 REQUIREMENTS fazında. `devam` yazarak başla.
```

### Continue Workflow
```
> devam

Claude: Requirements oluşturuyorum...
[creates document]
AI Review başlatıyorum...
ChatGPT: ✅ Approved (3 minor suggestions)
Gemini: ⚠️ 2 challenges found
Consensus: NEEDS_REVISION

Düzeltip devam edeyim mi? (d/detay/revize)
```

### Simple Commands
```
> d                    # Continue
> durum                # Status check  
> revize: Add rate limiting details
> onayla               # Approve and advance
```

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sdlc-orchestrator": {
      "command": "node",
      "args": ["/path/to/sdlc-orchestrator-mcp-server/dist/index.js"]
    }
  }
}
```

## Philosophy

- **Minimal Input**: User says `devam`, Claude handles the rest
- **Smart Defaults**: Auto-detects what phase/action is needed
- **Transparent**: Always shows what's happening
- **Controllable**: User can override with `revize` or `durdur`

## License

MIT

## Author

Mustafa Yıldırım
