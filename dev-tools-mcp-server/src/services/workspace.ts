import * as fs from "fs/promises";
import * as path from "path";

// In-memory mapping of projectId -> workspace path
// In production, this could be persisted to a JSON file or database
const workspaceMap = new Map<string, string>();
const WORKSPACE_MAP_FILE = "workspace-map.json";

// Get base directory for all SDLC projects
export function getBaseDir(): string {
  const baseDir = process.env.WORKSPACE_ROOT || path.join(process.env.HOME || "/tmp", "Projects", "SDLC_Projects");
  return baseDir;
}

// Get workspace map file path
function getMapFilePath(): string {
  return path.join(getBaseDir(), WORKSPACE_MAP_FILE);
}

// Load workspace map from disk
export async function loadWorkspaceMap(): Promise<void> {
  try {
    const mapFile = getMapFilePath();
    const data = await fs.readFile(mapFile, "utf-8");
    const parsed = JSON.parse(data);
    Object.entries(parsed).forEach(([key, value]) => {
      workspaceMap.set(key, value as string);
    });
    console.error(`Loaded ${workspaceMap.size} workspace mappings`);
  } catch (error) {
    // File doesn't exist yet, that's OK
    console.error("No existing workspace map found, starting fresh");
  }
}

// Save workspace map to disk
async function saveWorkspaceMap(): Promise<void> {
  const mapFile = getMapFilePath();
  const data: Record<string, string> = {};
  workspaceMap.forEach((value, key) => {
    data[key] = value;
  });
  await fs.mkdir(path.dirname(mapFile), { recursive: true });
  await fs.writeFile(mapFile, JSON.stringify(data, null, 2));
}

// SDLC Phase folders - numbered for correct ordering in file explorers
const PHASE_FOLDERS = [
  "docs/01-requirements",
  "docs/02-architecture",
  "docs/03-planning",
  "docs/04-development",
  "docs/05-testing",
  "docs/06-deployment"
];

// Create a new workspace for a project
export async function createWorkspace(
  projectId: string,
  name: string,
  description?: string,
  techStack?: string[]
): Promise<{ path: string; created: boolean }> {
  const baseDir = getBaseDir();
  const workspacePath = path.join(baseDir, name);

  // Check if already exists
  if (workspaceMap.has(projectId)) {
    const existingPath = workspaceMap.get(projectId)!;
    return { path: existingPath, created: false };
  }

  // Create base directory structure
  await fs.mkdir(workspacePath, { recursive: true });
  await fs.mkdir(path.join(workspacePath, "src"), { recursive: true });
  await fs.mkdir(path.join(workspacePath, "tests"), { recursive: true });
  await fs.mkdir(path.join(workspacePath, ".sdlc"), { recursive: true });

  // Create SDLC phase-specific documentation folders
  for (const folder of PHASE_FOLDERS) {
    await fs.mkdir(path.join(workspacePath, folder), { recursive: true });
  }

  // Create tech-stack specific folders
  if (techStack) {
    if (techStack.includes("dotnet") || techStack.includes(".net")) {
      await fs.mkdir(path.join(workspacePath, "src", "Api"), { recursive: true });
      await fs.mkdir(path.join(workspacePath, "src", "Api.Tests"), { recursive: true });
    }
    if (techStack.includes("react") || techStack.includes("frontend")) {
      await fs.mkdir(path.join(workspacePath, "src", "web"), { recursive: true });
    }
    if (techStack.includes("mobile") || techStack.includes("react-native")) {
      await fs.mkdir(path.join(workspacePath, "src", "mobile"), { recursive: true });
    }
  }

  // Create .sdlc/config.json with project metadata
  const sdlcConfig = {
    projectId,
    projectName: name,
    createdAt: new Date().toISOString(),
    techStack: techStack || [],
    folderStructure: {
      "docs/01-requirements": "Requirements documents, user stories, NFRs",
      "docs/02-architecture": "Architecture decisions, C4 diagrams, API contracts",
      "docs/03-planning": "Epic breakdown, task lists, sprint plans",
      "docs/04-development": "Development notes, code documentation",
      "docs/05-testing": "Test plans, test results, coverage reports",
      "docs/06-deployment": "Deployment guides, runbooks, release notes",
      "src": "Source code",
      "tests": "Test files"
    }
  };
  await fs.writeFile(
    path.join(workspacePath, ".sdlc", "config.json"),
    JSON.stringify(sdlcConfig, null, 2)
  );

  // Create README with project structure
  const readme = `# ${name}

${description || "SDLC Project"}

## Project ID
\`${projectId}\`

## Tech Stack
${techStack ? techStack.map(t => `- ${t}`).join("\n") : "- TBD"}

## Project Structure

\`\`\`
${name}/
├── docs/
│   ├── 01-requirements/    # Requirements, user stories, NFRs
│   ├── 02-architecture/    # Architecture decisions, diagrams
│   ├── 03-planning/        # Sprint plans, task breakdowns
│   ├── 04-development/     # Development notes
│   ├── 05-testing/         # Test plans, coverage reports
│   └── 06-deployment/      # Deployment guides, runbooks
├── src/                    # Source code
├── tests/                  # Test files
└── .sdlc/                  # SDLC metadata
\`\`\`

## SDLC Status

This project follows the MyVibe SDLC framework with AI-assisted development.

**Current Phase:** REQUIREMENTS

## AI Consensus

All major deliverables are reviewed by:
- **Claude**: Primary orchestrator and developer
- **ChatGPT**: Artifact reviewer (UX perspective)
- **Gemini**: Artifact challenger (edge cases, security)

## Created
${new Date().toISOString()}
`;
  await fs.writeFile(path.join(workspacePath, "README.md"), readme);

  // Create .gitignore
  const gitignore = `# Dependencies
node_modules/
packages/

# Build outputs
dist/
build/
bin/
obj/

# IDE
.vscode/
.idea/
*.swp

# Environment
.env
.env.local
*.local

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Test coverage
coverage/

# SDLC temporary state
.sdlc/state.json
`;
  await fs.writeFile(path.join(workspacePath, ".gitignore"), gitignore);

  // Save mapping
  workspaceMap.set(projectId, workspacePath);
  await saveWorkspaceMap();

  return { path: workspacePath, created: true };
}

// Get workspace path for a project
export async function getWorkspacePath(projectId: string): Promise<string | null> {
  return workspaceMap.get(projectId) || null;
}

// List all workspaces
export async function listWorkspaces(): Promise<Array<{ projectId: string; path: string; name: string }>> {
  const result: Array<{ projectId: string; path: string; name: string }> = [];
  
  workspaceMap.forEach((workspacePath, projectId) => {
    result.push({
      projectId,
      path: workspacePath,
      name: path.basename(workspacePath)
    });
  });

  return result;
}

// Resolve a relative path within a workspace (with security check)
export function resolveWorkspacePath(workspacePath: string, relativePath: string): string {
  // Normalize and resolve the path
  const resolved = path.resolve(workspacePath, relativePath);
  
  // Security: Ensure the resolved path is within the workspace
  if (!resolved.startsWith(workspacePath)) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }
  
  return resolved;
}

// Check if path exists
export async function pathExists(fullPath: string): Promise<boolean> {
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

// Ensure workspace exists and return path
export async function ensureWorkspace(projectId: string): Promise<string> {
  const workspacePath = await getWorkspacePath(projectId);
  if (!workspacePath) {
    throw new Error(`No workspace found for project ${projectId}. Create one first with dev_create_workspace.`);
  }
  
  const exists = await pathExists(workspacePath);
  if (!exists) {
    throw new Error(`Workspace path ${workspacePath} does not exist on disk.`);
  }
  
  return workspacePath;
}
