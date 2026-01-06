/**
 * Repository discovery and cloning
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import { DeepstagingEnv } from './types.js';

export function getExistingRepos(githubOrg: string): string[] {
  try {
    const output = execSync(`gh repo list ${githubOrg} --limit 100 --json name --jq '.[].name'`, {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error(chalk.red('❌ Failed to fetch repositories from GitHub'));
    throw error;
  }
}

export function getClonedRepos(repositoriesDir: string): string[] {
  if (!existsSync(repositoriesDir)) {
    return [];
  }

  return readdirSync(repositoriesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && existsSync(join(repositoriesDir, dirent.name, '.git')))
    .map(dirent => dirent.name);
}

export async function discoverAndCloneRepositories(
  env: DeepstagingEnv,
  autoYes: boolean
): Promise<void> {
  if (autoYes) {
    console.log(chalk.cyan('⏭️  Skipping repository cloning in non-interactive mode\n'));
    return;
  }

  console.log(chalk.blue('🔍 Discovering repositories...\n'));

  const githubRepos = getExistingRepos(env.DEEPSTAGING_GITHUB_ORG);
  const clonedRepos = getClonedRepos(env.DEEPSTAGING_REPOSITORIES_DIR);
  
  // Filter out the workspace repository itself (already cloned as the current workspace)
  const cloneableRepos = githubRepos.filter(repo => repo !== 'workspace');
  const unclonedRepos = cloneableRepos.filter(repo => !clonedRepos.includes(repo));

  if (clonedRepos.length > 0) {
    console.log(chalk.green(`✓ Already cloned (${clonedRepos.length}): ${clonedRepos.join(', ')}\n`));
  }
  
  // Note about workspace
  console.log(chalk.dim(`ℹ  Workspace repository is your current location (not shown)\n`));

  if (unclonedRepos.length === 0) {
    console.log(chalk.green('✅ All repositories are already cloned\n'));
    return;
  }

  console.log(chalk.cyan(`📋 Available repositories (${unclonedRepos.length}):\n`));

  const reposToClone = await checkbox({
    message: 'Select repositories to clone:',
    choices: unclonedRepos.map(repo => ({ name: repo, value: repo })),
  });

  if (reposToClone.length === 0) {
    console.log(chalk.yellow('\n⚠️  No repositories selected\n'));
    return;
  }

  console.log(chalk.blue(`\n📥 Cloning ${reposToClone.length} repositories...\n`));

  for (const repo of reposToClone) {
    console.log(chalk.cyan(`  Cloning ${repo}...`));
    try {
      execSync(
        `gh repo clone ${env.DEEPSTAGING_GITHUB_ORG}/${repo} "${env.DEEPSTAGING_REPOSITORIES_DIR}/${repo}"`,
        { stdio: 'inherit' }
      );
      console.log(chalk.green(`  ✓ ${repo} cloned\n`));
    } catch (error) {
      console.error(chalk.red(`  ❌ Failed to clone ${repo}\n`));
    }
  }
}
