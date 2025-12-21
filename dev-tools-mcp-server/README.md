# Dev Tools MCP Server

MCP Server for development operations - file management, Git, and code execution for SDLC projects.

## Overview

This server provides file system and development tool access for AI-orchestrated SDLC projects:

- **Workspace Management**: Create/manage project folders
- **File Operations**: Read, write, list, copy, delete files
- **Git Operations**: Init, status, add, commit, branch, checkout
- **Code Execution**: Run commands, tests, builds, lints

## Installation

```bash
cd dev-tools-mcp-server
npm install
npm run build
```

## Configuration

Create `.env` file:
```bash
WORKSPACE_ROOT=/Users/musti/Projects/SDLC_Projects
```

## Available Tools (19 total)

### Workspace Management
| Tool | Description |
|------|-------------|
| `dev_create_workspace` | Create project folder with standard structure |
| `dev_get_workspace` | Get workspace path for project |
| `dev_list_workspaces` | List all project workspaces |

### File Operations
| Tool | Description |
|------|-------------|
| `dev_file_write` | Write content to file |
| `dev_file_read` | Read file content |
| `dev_file_list` | List directory contents |
| `dev_file_delete` | Delete file |
| `dev_file_copy` | Copy file |

### Git Operations
| Tool | Description |
|------|-------------|
| `dev_git_init` | Initialize Git repository |
| `dev_git_status` | Get repository status |
| `dev_git_add` | Stage files |
| `dev_git_commit` | Commit changes |
| `dev_git_log` | View commit history |
| `dev_git_branch` | List/create branches |
| `dev_git_checkout` | Switch branches |

### Code Execution
| Tool | Description |
|------|-------------|
| `dev_exec_command` | Run shell command |
| `dev_run_tests` | Run tests (auto-detect framework) |
| `dev_run_build` | Build project |
| `dev_run_lint` | Run linter |

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dev-tools": {
      "command": "node",
      "args": ["/path/to/dev-tools-mcp-server/dist/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/Users/musti/Projects/SDLC_Projects"
      }
    }
  }
}
```

## Workspace Structure

```
WORKSPACE_ROOT/
├── workspace-map.json          # Project ID → folder mapping
├── todo-list-api/              # Project workspace
│   ├── README.md
│   ├── .gitignore
│   ├── docs/
│   │   ├── requirements.md
│   │   ├── architecture.md
│   │   └── api-contracts.yaml
│   └── src/
│       ├── Api/
│       └── Api.Tests/
└── another-project/
    └── ...
```

## Usage Example

```
1. dev_create_workspace({ projectId: "...", name: "todo-list-api", techStack: ["dotnet", "postgresql"] })
2. dev_file_write({ projectId: "...", path: "docs/requirements.md", content: "..." })
3. dev_git_init({ projectId: "..." })
4. dev_git_commit({ projectId: "...", message: "Initial requirements" })
5. dev_run_build({ projectId: "..." })
6. dev_run_tests({ projectId: "..." })
```

## Security

- Path traversal protection (can't escape workspace)
- Commands run in workspace directory only
- No access to system files

## License

MIT

## Author

Mustafa Yıldırım
