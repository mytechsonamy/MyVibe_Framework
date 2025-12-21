# AI Gateway MCP Server

An MCP (Model Context Protocol) server that provides unified access to ChatGPT and Google Gemini for AI-orchestrated SDLC workflows.

## Overview

This server enables Claude to orchestrate multiple AI systems (ChatGPT and Gemini) through the MCP protocol. It's designed for the AI-Orchestrated SDLC Framework where:

- **Claude** acts as the orchestrator and primary developer
- **ChatGPT** serves as the reviewer (UX perspective, alternatives)
- **Gemini** serves as the challenger (edge cases, validation)

## Features

- 🤖 **Multi-AI Invocation**: Direct access to ChatGPT and Gemini
- 📝 **Artifact Review**: Structured review with feedback
- ⚡ **Challenge System**: Edge case and contradiction detection
- ✅ **Consensus Checking**: Automated approval status aggregation
- 🎭 **Role-based Prompts**: 12 pre-configured roles for SDLC phases

## Installation

```bash
# Clone or copy the project
cd ai-gateway-mcp-server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env

# Build
npm run build
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for ChatGPT |
| `GOOGLE_API_KEY` | Yes | Google AI API key for Gemini |

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-gateway": {
      "command": "node",
      "args": ["/path/to/ai-gateway-mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key",
        "GOOGLE_API_KEY": "AIza-your-key"
      }
    }
  }
}
```

## Available Tools

### `ai_invoke_chatgpt`

Send a prompt to ChatGPT with role context.

```typescript
{
  prompt: string,      // The prompt to send
  role: AIRole,        // Role context (reviewer, challenger, etc.)
  context?: string,    // Additional context
  temperature?: number,// 0-2 (default varies by role)
  maxTokens?: number   // Max response tokens
}
```

### `ai_invoke_gemini`

Send a prompt to Gemini with role context.

```typescript
{
  prompt: string,
  role: AIRole,
  context?: string,
  temperature?: number,
  maxTokens?: number
}
```

### `ai_review_artifact`

Submit an artifact for ChatGPT review.

```typescript
{
  artifact: string,           // Content to review
  artifactType: ArtifactType, // requirements, architecture, code, etc.
  context?: string,
  previousFeedback?: string
}
```

### `ai_challenge_artifact`

Submit an artifact for Gemini challenge.

```typescript
{
  artifact: string,
  artifactType: ArtifactType,
  context?: string,
  focusAreas?: string[]  // e.g., ["security", "scalability"]
}
```

### `ai_check_consensus`

Check if both AIs approved an artifact.

```typescript
{
  artifact: string,
  artifactType: ArtifactType,
  chatgptReview: string,   // Response from ai_review_artifact
  geminiChallenge: string  // Response from ai_challenge_artifact
}
```

## Available Roles

| Role | Use Case |
|------|----------|
| `lead_analyst` | Requirements gathering |
| `reviewer` | Artifact review (ChatGPT default) |
| `challenger` | Edge case finding (Gemini default) |
| `architect` | System design |
| `alternative_explorer` | Alternative approaches |
| `validator` | Technical validation |
| `planner` | Task breakdown |
| `optimizer` | Efficiency improvements |
| `dependency_analyzer` | Dependency mapping |
| `developer` | Code generation |
| `code_reviewer` | Code review |
| `assistant` | General purpose |

## Artifact Types

- `requirements` - User stories, NFRs
- `architecture` - System design docs
- `epic_breakdown` - Epic/feature breakdown
- `task_list` - Development tasks
- `code` - Source code
- `test_plan` - Test strategies
- `documentation` - Technical docs

## Development

```bash
# Watch mode
npm run dev

# Test with MCP Inspector
npm run inspect
```

## Example Usage

```
Claude: I'll review the requirements using the AI Gateway.

1. First, get ChatGPT's review:
   ai_review_artifact({
     artifact: "<requirements content>",
     artifactType: "requirements"
   })

2. Then, get Gemini's challenge:
   ai_challenge_artifact({
     artifact: "<requirements content>",
     artifactType: "requirements",
     focusAreas: ["security", "edge_cases"]
   })

3. Check consensus:
   ai_check_consensus({
     artifact: "<requirements content>",
     artifactType: "requirements",
     chatgptReview: "<review response>",
     geminiChallenge: "<challenge response>"
   })
```

## License

MIT

## Author

Mustafa Yıldırım
