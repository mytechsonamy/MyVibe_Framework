import { simpleGit, SimpleGit, StatusResult, LogResult } from "simple-git";

// Create a git instance for a workspace
export function getGit(workspacePath: string): SimpleGit {
  return simpleGit(workspacePath);
}

// Initialize a new git repository
export async function gitInit(workspacePath: string, initialBranch: string = "main"): Promise<{ success: boolean; message: string }> {
  const git = getGit(workspacePath);
  
  try {
    await git.init(["-b", initialBranch]);
    return { success: true, message: `Git repository initialized with branch '${initialBranch}'` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Git init failed: ${message}` };
  }
}

// Get repository status
export async function gitStatus(workspacePath: string): Promise<{
  isRepo: boolean;
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}> {
  const git = getGit(workspacePath);
  
  try {
    const status: StatusResult = await git.status();
    
    return {
      isRepo: true,
      branch: status.current || "unknown",
      staged: status.staged,
      modified: status.modified,
      untracked: status.not_added,
      ahead: status.ahead,
      behind: status.behind
    };
  } catch (error) {
    return {
      isRepo: false,
      branch: "",
      staged: [],
      modified: [],
      untracked: [],
      ahead: 0,
      behind: 0
    };
  }
}

// Stage files
export async function gitAdd(workspacePath: string, paths: string[] = ["."]): Promise<{ success: boolean; message: string }> {
  const git = getGit(workspacePath);
  
  try {
    await git.add(paths);
    return { success: true, message: `Staged: ${paths.join(", ")}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Git add failed: ${message}` };
  }
}

// Commit changes
export async function gitCommit(
  workspacePath: string,
  commitMessage: string,
  addAll: boolean = true
): Promise<{ success: boolean; message: string; hash?: string }> {
  const git = getGit(workspacePath);
  
  try {
    if (addAll) {
      await git.add(".");
    }
    
    const result = await git.commit(commitMessage);
    
    return {
      success: true,
      message: `Committed: ${commitMessage}`,
      hash: result.commit
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Git commit failed: ${message}` };
  }
}

// Get commit log
export async function gitLog(workspacePath: string, limit: number = 10): Promise<{
  success: boolean;
  commits: Array<{ hash: string; date: string; message: string; author: string }>;
}> {
  const git = getGit(workspacePath);
  
  try {
    const log: LogResult = await git.log({ maxCount: limit });
    
    return {
      success: true,
      commits: log.all.map(commit => ({
        hash: commit.hash.substring(0, 7),
        date: commit.date,
        message: commit.message,
        author: commit.author_name
      }))
    };
  } catch (error) {
    return { success: false, commits: [] };
  }
}

// List branches
export async function gitBranches(workspacePath: string): Promise<{
  current: string;
  branches: string[];
}> {
  const git = getGit(workspacePath);
  
  try {
    const branchSummary = await git.branchLocal();
    return {
      current: branchSummary.current,
      branches: branchSummary.all
    };
  } catch (error) {
    return { current: "", branches: [] };
  }
}

// Create branch
export async function gitCreateBranch(
  workspacePath: string,
  branchName: string,
  checkout: boolean = false
): Promise<{ success: boolean; message: string }> {
  const git = getGit(workspacePath);
  
  try {
    if (checkout) {
      await git.checkoutLocalBranch(branchName);
      return { success: true, message: `Created and checked out branch '${branchName}'` };
    } else {
      await git.branch([branchName]);
      return { success: true, message: `Created branch '${branchName}'` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Git branch failed: ${message}` };
  }
}

// Checkout branch
export async function gitCheckout(workspacePath: string, branchName: string): Promise<{ success: boolean; message: string }> {
  const git = getGit(workspacePath);

  try {
    await git.checkout(branchName);
    return { success: true, message: `Checked out branch '${branchName}'` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Git checkout failed: ${message}` };
  }
}

// Revert a commit (creates a new commit that undoes changes)
export async function gitRevert(
  workspacePath: string,
  commitHash: string,
  noCommit: boolean = false
): Promise<{ success: boolean; message: string; revertHash?: string }> {
  const git = getGit(workspacePath);

  try {
    const options = noCommit ? ["--no-commit", commitHash] : [commitHash];
    await git.revert(options);

    if (noCommit) {
      return { success: true, message: `Reverted ${commitHash} (staged, not committed)` };
    }

    const log = await git.log({ maxCount: 1 });
    return {
      success: true,
      message: `Reverted ${commitHash}`,
      revertHash: log.latest?.hash.substring(0, 7)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Git revert failed: ${message}` };
  }
}

// Reset to a specific commit (destructive - use with caution)
export async function gitReset(
  workspacePath: string,
  commitHash: string,
  mode: "soft" | "mixed" | "hard" = "mixed"
): Promise<{ success: boolean; message: string }> {
  const git = getGit(workspacePath);

  try {
    await git.reset([`--${mode}`, commitHash]);
    return { success: true, message: `Reset to ${commitHash} (${mode})` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Git reset failed: ${message}` };
  }
}

// Create a tag (useful for marking deployments)
export async function gitTag(
  workspacePath: string,
  tagName: string,
  message?: string,
  commitHash?: string
): Promise<{ success: boolean; message: string }> {
  const git = getGit(workspacePath);

  try {
    const options: string[] = [];
    if (message) {
      options.push("-a", tagName, "-m", message);
    } else {
      options.push(tagName);
    }
    if (commitHash) {
      options.push(commitHash);
    }

    await git.tag(options);
    return { success: true, message: `Created tag '${tagName}'` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Git tag failed: ${message}` };
  }
}

// List tags
export async function gitListTags(workspacePath: string): Promise<{
  success: boolean;
  tags: string[];
}> {
  const git = getGit(workspacePath);

  try {
    const result = await git.tags();
    return { success: true, tags: result.all };
  } catch (error) {
    return { success: false, tags: [] };
  }
}

// Get diff between commits (useful for rollback analysis)
export async function gitDiff(
  workspacePath: string,
  fromCommit: string,
  toCommit: string = "HEAD"
): Promise<{ success: boolean; diff: string; filesChanged: number }> {
  const git = getGit(workspacePath);

  try {
    const diff = await git.diff([fromCommit, toCommit]);
    const diffStat = await git.diffSummary([fromCommit, toCommit]);
    return {
      success: true,
      diff,
      filesChanged: diffStat.files.length
    };
  } catch (error) {
    return { success: false, diff: "", filesChanged: 0 };
  }
}
