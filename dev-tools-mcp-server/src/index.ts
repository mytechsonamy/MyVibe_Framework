import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

import {
  loadWorkspaceMap,
  createWorkspace,
  getWorkspacePath,
  listWorkspaces,
  resolveWorkspacePath,
  ensureWorkspace,
  pathExists
} from "./services/workspace.js";

import {
  gitInit,
  gitStatus,
  gitAdd,
  gitCommit,
  gitLog,
  gitBranches,
  gitCreateBranch,
  gitCheckout
} from "./services/git.js";

import {
  CreateWorkspaceSchema,
  GetWorkspaceSchema,
  ListWorkspacesSchema,
  FileWriteSchema,
  FileReadSchema,
  FileListSchema,
  FileDeleteSchema,
  FileCopySchema,
  GitInitSchema,
  GitStatusSchema,
  GitAddSchema,
  GitCommitSchema,
  GitLogSchema,
  GitBranchSchema,
  GitCheckoutSchema,
  ExecCommandSchema,
  RunTestsSchema,
  RunBuildSchema,
  RunLintSchema
} from "./schemas/tools.js";

const execAsync = promisify(exec);

const server = new McpServer({
  name: "dev-tools-mcp-server",
  version: "1.0.0"
});

// ============================================================================
// WORKSPACE TOOLS
// ============================================================================

server.tool(
  "dev_create_workspace",
  "Create a new workspace folder for an SDLC project with standard structure (docs/, src/)",
  CreateWorkspaceSchema.shape,
  async (params) => {
    try {
      const result = await createWorkspace(params.projectId, params.name, params.description, params.techStack);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            workspace: { path: result.path, created: result.created, projectId: params.projectId, name: params.name },
            message: result.created ? `Workspace created at ${result.path}` : `Workspace exists at ${result.path}`
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_get_workspace",
  "Get workspace path for a project",
  GetWorkspaceSchema.shape,
  async (params) => {
    try {
      const workspacePath = await getWorkspacePath(params.projectId);
      if (!workspacePath) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "No workspace found. Create one with dev_create_workspace." }) }], isError: true };
      }
      const exists = await pathExists(workspacePath);
      return { content: [{ type: "text", text: JSON.stringify({ success: true, workspace: { path: workspacePath, exists, projectId: params.projectId } }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_list_workspaces",
  "List all SDLC project workspaces",
  ListWorkspacesSchema.shape,
  async () => {
    try {
      const workspaces = await listWorkspaces();
      return { content: [{ type: "text", text: JSON.stringify({ success: true, workspaces, count: workspaces.length }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

// ============================================================================
// FILE TOOLS
// ============================================================================

server.tool(
  "dev_file_write",
  "Write content to a file in the project workspace",
  FileWriteSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const fullPath = resolveWorkspacePath(workspacePath, params.path);
      if (params.createDirs) await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, params.content, "utf-8");
      return { content: [{ type: "text", text: JSON.stringify({ success: true, file: { path: params.path, fullPath, size: params.content.length }, message: `Written: ${params.path}` }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_file_read",
  "Read content from a file in the project workspace",
  FileReadSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const fullPath = resolveWorkspacePath(workspacePath, params.path);
      const content = await fs.readFile(fullPath, "utf-8");
      const stats = await fs.stat(fullPath);
      return { content: [{ type: "text", text: JSON.stringify({ success: true, file: { path: params.path, size: stats.size, modified: stats.mtime.toISOString() }, content }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_file_list",
  "List files and directories in the project workspace",
  FileListSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const fullPath = resolveWorkspacePath(workspacePath, params.path);

      async function listDir(dirPath: string, prefix: string = ""): Promise<string[]> {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const results: string[] = [];
        for (const entry of entries) {
          if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            results.push(`${relativePath}/`);
            if (params.recursive) {
              const subEntries = await listDir(path.join(dirPath, entry.name), relativePath);
              results.push(...subEntries);
            }
          } else {
            results.push(relativePath);
          }
        }
        return results;
      }

      const files = await listDir(fullPath);
      return { content: [{ type: "text", text: JSON.stringify({ success: true, path: params.path, files, count: files.length }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_file_delete",
  "Delete a file from the project workspace",
  FileDeleteSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const fullPath = resolveWorkspacePath(workspacePath, params.path);
      await fs.unlink(fullPath);
      return { content: [{ type: "text", text: JSON.stringify({ success: true, message: `Deleted: ${params.path}` }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_file_copy",
  "Copy a file within the project workspace",
  FileCopySchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const sourcePath = resolveWorkspacePath(workspacePath, params.sourcePath);
      const destPath = resolveWorkspacePath(workspacePath, params.destPath);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(sourcePath, destPath);
      return { content: [{ type: "text", text: JSON.stringify({ success: true, message: `Copied ${params.sourcePath} to ${params.destPath}` }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

// ============================================================================
// GIT TOOLS
// ============================================================================

server.tool(
  "dev_git_init",
  "Initialize a Git repository in the project workspace",
  GitInitSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const result = await gitInit(workspacePath, params.initialBranch);
      return { content: [{ type: "text", text: JSON.stringify({ success: result.success, message: result.message }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_git_status",
  "Get Git repository status",
  GitStatusSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const status = await gitStatus(workspacePath);
      return { content: [{ type: "text", text: JSON.stringify({ success: true, status }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_git_add",
  "Stage files for commit",
  GitAddSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const result = await gitAdd(workspacePath, params.paths);
      return { content: [{ type: "text", text: JSON.stringify({ success: result.success, message: result.message }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_git_commit",
  "Commit staged changes",
  GitCommitSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const result = await gitCommit(workspacePath, params.message, params.addAll);
      return { content: [{ type: "text", text: JSON.stringify({ success: result.success, message: result.message, hash: result.hash }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_git_log",
  "Get commit history",
  GitLogSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const result = await gitLog(workspacePath, params.limit);
      return { content: [{ type: "text", text: JSON.stringify({ success: result.success, commits: result.commits }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_git_branch",
  "List or create branches",
  GitBranchSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      if (params.name) {
        const result = await gitCreateBranch(workspacePath, params.name, params.checkout);
        return { content: [{ type: "text", text: JSON.stringify({ success: result.success, message: result.message }, null, 2) }] };
      } else {
        const branches = await gitBranches(workspacePath);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, current: branches.current, branches: branches.branches }, null, 2) }] };
      }
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

server.tool(
  "dev_git_checkout",
  "Checkout a branch",
  GitCheckoutSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const result = await gitCheckout(workspacePath, params.branch);
      return { content: [{ type: "text", text: JSON.stringify({ success: result.success, message: result.message }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: String(error) }) }], isError: true };
    }
  }
);

// ============================================================================
// EXEC TOOLS
// ============================================================================

server.tool(
  "dev_exec_command",
  "Execute a shell command in the project workspace",
  ExecCommandSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const { stdout, stderr } = await execAsync(params.command, {
        cwd: workspacePath,
        timeout: params.timeout,
        maxBuffer: 10 * 1024 * 1024
      });
      return { content: [{ type: "text", text: JSON.stringify({ success: true, stdout, stderr, command: params.command }, null, 2) }] };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: execError.message, stdout: execError.stdout, stderr: execError.stderr }, null, 2) }], isError: true };
    }
  }
);

server.tool(
  "dev_run_tests",
  "Run tests in the project workspace (auto-detects framework)",
  RunTestsSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      
      let command: string;
      const framework = params.framework;

      if (framework === "auto") {
        // Auto-detect
        const hasPackageJson = await pathExists(path.join(workspacePath, "package.json"));
        const hasCsproj = (await fs.readdir(workspacePath)).some(f => f.endsWith(".csproj") || f.endsWith(".sln"));
        const hasPytest = await pathExists(path.join(workspacePath, "pytest.ini")) || await pathExists(path.join(workspacePath, "pyproject.toml"));

        if (hasCsproj) command = "dotnet test";
        else if (hasPytest) command = "pytest";
        else if (hasPackageJson) command = "npm test";
        else command = "echo 'No test framework detected'";
      } else {
        const commands: Record<string, string> = {
          jest: "npx jest",
          pytest: "pytest",
          xunit: "dotnet test",
          dotnet: "dotnet test",
          npm: "npm test"
        };
        command = commands[framework] || "npm test";
      }

      if (params.filter) command += ` --filter "${params.filter}"`;

      const { stdout, stderr } = await execAsync(command, { cwd: workspacePath, timeout: 300000 });
      return { content: [{ type: "text", text: JSON.stringify({ success: true, framework, command, stdout, stderr }, null, 2) }] };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: execError.message, stdout: execError.stdout, stderr: execError.stderr }, null, 2) }], isError: true };
    }
  }
);

server.tool(
  "dev_run_build",
  "Build the project (auto-detects build system)",
  RunBuildSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      
      let command = params.command;
      
      if (!command) {
        const hasPackageJson = await pathExists(path.join(workspacePath, "package.json"));
        const hasCsproj = (await fs.readdir(workspacePath)).some(f => f.endsWith(".csproj") || f.endsWith(".sln"));
        
        if (hasCsproj) command = "dotnet build";
        else if (hasPackageJson) command = "npm run build";
        else command = "echo 'No build system detected'";
      }

      const { stdout, stderr } = await execAsync(command, { cwd: workspacePath, timeout: 300000 });
      return { content: [{ type: "text", text: JSON.stringify({ success: true, command, stdout, stderr }, null, 2) }] };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: execError.message, stdout: execError.stdout, stderr: execError.stderr }, null, 2) }], isError: true };
    }
  }
);

server.tool(
  "dev_run_lint",
  "Run linter on the project",
  RunLintSchema.shape,
  async (params) => {
    try {
      const workspacePath = await ensureWorkspace(params.projectId);
      const hasPackageJson = await pathExists(path.join(workspacePath, "package.json"));
      
      let command = hasPackageJson ? (params.fix ? "npm run lint -- --fix" : "npm run lint") : "echo 'No linter configured'";

      const { stdout, stderr } = await execAsync(command, { cwd: workspacePath, timeout: 120000 });
      return { content: [{ type: "text", text: JSON.stringify({ success: true, command, stdout, stderr }, null, 2) }] };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: execError.message, stdout: execError.stdout, stderr: execError.stderr }, null, 2) }], isError: true };
    }
  }
);

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  await loadWorkspaceMap();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Dev Tools MCP Server started successfully");
  console.error("Tools: dev_create_workspace, dev_get_workspace, dev_list_workspaces, dev_file_write, dev_file_read, dev_file_list, dev_file_delete, dev_file_copy, dev_git_init, dev_git_status, dev_git_add, dev_git_commit, dev_git_log, dev_git_branch, dev_git_checkout, dev_exec_command, dev_run_tests, dev_run_build, dev_run_lint");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
