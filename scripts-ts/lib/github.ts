/**
 * GitHub operations library
 */

import { execSync } from 'child_process';

export async function checkGitHubAuth(): Promise<boolean> {
  try {
    execSync('gh auth status', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export async function getExistingRepos(org: string): Promise<string[]> {
  try {
    const output = execSync(
      `gh repo list ${org} --json name --limit 100 --jq '.[].name'`,
      { encoding: 'utf8' }
    );
    return output.trim().split('\n').filter(Boolean).sort();
  } catch (error) {
    console.error('Error fetching repos from GitHub:', error);
    return [];
  }
}

export async function ensureRepoExists(
  repoName: string,
  org: string,
  existingRepos: string[]
): Promise<boolean> {
  if (existingRepos.includes(repoName)) {
    return true;
  }

  console.log(`Repository ${repoName} does not exist on GitHub.`);
  console.log('Create it manually or via gh CLI if needed.');
  return false;
}

export async function configureRemote(
  repoPath: string,
  repoName: string,
  org: string
): Promise<void> {
  const { execSync } = await import('child_process');
  
  try {
    // Check if remote exists
    execSync('git remote get-url origin', {
      cwd: repoPath,
      stdio: 'pipe',
    });
    console.log(`  ✓ Remote already configured`);
  } catch {
    // Add remote
    const remoteUrl = `git@github.com:${org}/${repoName}.git`;
    execSync(`git remote add origin ${remoteUrl}`, {
      cwd: repoPath,
      stdio: 'inherit',
    });
    console.log(`  ✓ Added remote: ${remoteUrl}`);
  }
}
