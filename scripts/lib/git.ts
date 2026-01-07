/**
 * Git operations library
 */

import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import { RepositoryInfo } from './types.js';
import { promises as fs } from 'fs';
import path from 'path';

const gitOptions: Partial<SimpleGitOptions> = {
  binary: 'git',
  maxConcurrentProcesses: 6,
};

/**
 * Quickly scan for git repositories (name and path only, no git operations)
 */
export async function scanRepositoriesQuick(orgRoot: string): Promise<Array<{ name: string; path: string }>> {
  const entries = await fs.readdir(orgRoot, { withFileTypes: true });
  const repos: Array<{ name: string; path: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const repoPath = path.join(orgRoot, entry.name);
    const gitDir = path.join(repoPath, '.git');
    
    try {
      await fs.access(gitDir);
      repos.push({ name: entry.name, path: repoPath });
    } catch {
      continue; // Not a git repo
    }
  }

  return repos;
}

export async function scanRepositories(orgRoot: string): Promise<RepositoryInfo[]> {
  const entries = await fs.readdir(orgRoot, { withFileTypes: true });
  const repos: RepositoryInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const repoPath = path.join(orgRoot, entry.name);
    const gitDir = path.join(repoPath, '.git');
    
    try {
      await fs.access(gitDir);
    } catch {
      continue; // Not a git repo
    }

    const info = await getRepositoryInfo(entry.name, repoPath);
    if (info) {
      repos.push(info);
    }
  }

  return repos;
}

export async function getRepositoryInfo(
  name: string,
  repoPath: string
): Promise<RepositoryInfo | null> {
  const git: SimpleGit = simpleGit(repoPath, gitOptions);

  try {
    // Get current branch
    const branchSummary = await git.branch();
    const branch = branchSummary.current;

    if (!branch) return null;

    // Get commit count
    const log = await git.log();
    const commitCount = log.total;

    // Check for uncommitted changes
    const status = await git.status();
    const hasUncommittedChanges = !status.isClean();

    // Check if remote exists and count commits ahead
    let hasRemote = false;
    let commitsAhead = 0;

    try {
      const remotes = await git.getRemotes();
      hasRemote = remotes.some(r => r.name === 'origin');

      if (hasRemote) {
        // Fetch latest
        await git.fetch('origin', branch).catch(() => {});

        // Count commits ahead
        const aheadBehind = await git.raw([
          'rev-list',
          '--count',
          `origin/${branch}..HEAD`,
        ]).catch(() => '0');
        
        commitsAhead = parseInt(aheadBehind.trim(), 10) || 0;
      }
    } catch {
      // No remote configured
    }

    // Generate status message
    let statusMessage: string;
    if (!hasRemote) {
      statusMessage = hasUncommittedChanges
        ? '⚠️  uncommitted changes, no remote'
        : '❌ no remote';
      commitsAhead = 999; // Force to top of list
    } else if (hasUncommittedChanges) {
      statusMessage = '⚠️  uncommitted changes';
    } else if (commitsAhead > 0) {
      statusMessage = `📤 ${commitsAhead} commit(s) ahead`;
    } else {
      statusMessage = '✓ up to date';
    }

    return {
      name,
      path: repoPath,
      branch,
      commitCount,
      hasUncommittedChanges,
      commitsAhead,
      hasRemote,
      statusMessage,
    };
  } catch (error) {
    console.error(`Error scanning ${name}:`, error);
    return null;
  }
}

export async function commitChanges(
  repoPath: string,
  message: string
): Promise<void> {
  const git: SimpleGit = simpleGit(repoPath, gitOptions);
  await git.add('.');
  await git.commit(message);
}

export async function pushRepository(
  repoPath: string,
  branch: string
): Promise<void> {
  const git: SimpleGit = simpleGit(repoPath, gitOptions);
  await git.push('origin', branch);
}

export function getGithubRepoName(localName: string): string {
  // Handle special mapping: github-profile -> .github
  return localName === 'github-profile' ? '.github' : localName;
}

export function getLocalDirName(githubName: string): string {
  // Handle special mapping: .github -> github-profile
  return githubName === '.github' ? 'github-profile' : githubName;
}
