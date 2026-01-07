#!/usr/bin/env tsx
/**
 * Git Hooks Install - Install workspace git hooks into repositories
 * 
 * This script installs shared git hooks from workspace/hooks/ into one or more
 * repositories via symlinks, allowing centralized hook management.
 * 
 * Usage:
 *   workspace-hooks-install                    # Install in current repo
 *   workspace-hooks-install --all              # Install in all repos
 *   workspace-hooks-install --uninstall        # Remove hooks from current repo
 *   workspace-hooks-install --all --uninstall  # Remove hooks from all repos
 */

import chalk from 'chalk';
import { existsSync, readdirSync, lstatSync, symlinkSync, unlinkSync, mkdirSync } from 'fs';
import { join, relative } from 'path';
import { confirm } from '@inquirer/prompts';

const workspaceDir = process.env.DEEPSTAGING_WORKSPACE_DIR;
const repositoriesDir = process.env.DEEPSTAGING_REPOSITORIES_DIR;

if (!workspaceDir || !repositoriesDir) {
  console.error(chalk.red('❌ Required environment variables not set.'));
  console.error(chalk.yellow('   Run: cd <org-root> && direnv allow'));
  process.exit(1);
}

const hooksDir = join(workspaceDir, 'hooks');

// Parse command line arguments
const args = process.argv.slice(2);
const installAll = args.includes('--all');
const uninstall = args.includes('--uninstall');

interface HookInstallResult {
  repo: string;
  success: boolean;
  hooks: string[];
  errors: string[];
}

async function main() {
  console.log(chalk.bold.cyan('\n🪝 Git Hooks Installation\n'));

  // Verify hooks directory exists
  if (!existsSync(hooksDir)) {
    console.error(chalk.red('❌ Hooks directory not found:'), hooksDir);
    console.error(chalk.yellow('   Expected: workspace/hooks/'));
    process.exit(1);
  }

  // Get available hooks
  const availableHooks = readdirSync(hooksDir)
    .filter(file => {
      const path = join(hooksDir, file);
      return lstatSync(path).isFile() && 
             file !== 'README.md' && 
             !file.startsWith('.');
    });

  if (availableHooks.length === 0) {
    console.error(chalk.yellow('⚠️  No hooks found in workspace/hooks/'));
    process.exit(0);
  }

  console.log(chalk.white('Available hooks:'), chalk.cyan(availableHooks.join(', ')));
  console.log();

  // Determine target repositories
  let targetRepos: string[] = [];

  if (installAll) {
    // Get all repositories
    if (!existsSync(repositoriesDir)) {
      console.error(chalk.red('❌ Repositories directory not found:'), repositoriesDir);
      process.exit(1);
    }

    targetRepos = readdirSync(repositoriesDir)
      .map(name => join(repositoriesDir, name))
      .filter(path => {
        const gitDir = join(path, '.git');
        return existsSync(gitDir);
      });

    if (targetRepos.length === 0) {
      console.error(chalk.yellow('⚠️  No git repositories found in:'), repositoriesDir);
      process.exit(0);
    }

    console.log(chalk.white(`Found ${targetRepos.length} repositories\n`));

    // Confirm installation
    const action = uninstall ? 'uninstall hooks from' : 'install hooks to';
    const confirmed = await confirm({
      message: `${action} all ${targetRepos.length} repositories?`,
      default: true
    });

    if (!confirmed) {
      console.log(chalk.yellow('\n⚠️  Cancelled by user\n'));
      process.exit(0);
    }
  } else {
    // Use current directory
    const cwd = process.cwd();
    const gitDir = join(cwd, '.git');

    if (!existsSync(gitDir)) {
      console.error(chalk.red('❌ Not a git repository:'), cwd);
      console.error(chalk.yellow('   Run this command from a repository root, or use --all'));
      process.exit(1);
    }

    targetRepos = [cwd];
  }

  // Install/uninstall hooks
  const results: HookInstallResult[] = [];

  for (const repoPath of targetRepos) {
    const repoName = repoPath.split('/').pop() || repoPath;
    const result: HookInstallResult = {
      repo: repoName,
      success: true,
      hooks: [],
      errors: []
    };

    const gitHooksDir = join(repoPath, '.git', 'hooks');

    // Ensure .git/hooks directory exists
    if (!existsSync(gitHooksDir)) {
      try {
        mkdirSync(gitHooksDir, { recursive: true });
      } catch (error) {
        result.success = false;
        result.errors.push(`Failed to create .git/hooks: ${error}`);
        results.push(result);
        continue;
      }
    }

    for (const hookName of availableHooks) {
      const sourcePath = join(hooksDir, hookName);
      const targetPath = join(gitHooksDir, hookName);

      try {
        if (uninstall) {
          // Remove symlink if it exists
          if (existsSync(targetPath)) {
            const stat = lstatSync(targetPath);
            if (stat.isSymbolicLink()) {
              unlinkSync(targetPath);
              result.hooks.push(hookName);
            } else {
              result.errors.push(`${hookName}: Not a symlink (manual hook exists)`);
            }
          }
        } else {
          // Install symlink
          // Remove existing if it's a symlink
          if (existsSync(targetPath)) {
            const stat = lstatSync(targetPath);
            if (stat.isSymbolicLink()) {
              unlinkSync(targetPath);
            } else {
              result.errors.push(`${hookName}: File exists (not a symlink, skipping)`);
              continue;
            }
          }

          // Create relative symlink
          const relativeSource = relative(gitHooksDir, sourcePath);
          symlinkSync(relativeSource, targetPath);
          result.hooks.push(hookName);
        }
      } catch (error) {
        result.success = false;
        result.errors.push(`${hookName}: ${error}`);
      }
    }

    results.push(result);
  }

  // Print results
  console.log();
  console.log(chalk.bold('─'.repeat(80)));
  console.log(chalk.bold('Results:\n'));

  let successCount = 0;
  let failCount = 0;

  for (const result of results) {
    if (result.success && result.hooks.length > 0) {
      successCount++;
      const action = uninstall ? 'Uninstalled from' : 'Installed to';
      console.log(chalk.green('✓'), chalk.white(result.repo));
      console.log(chalk.gray(`  ${action}: ${result.hooks.join(', ')}`));
    } else if (result.errors.length > 0) {
      failCount++;
      console.log(chalk.yellow('⚠'), chalk.white(result.repo));
      for (const error of result.errors) {
        console.log(chalk.gray(`  ${error}`));
      }
    } else {
      console.log(chalk.gray('−'), chalk.white(result.repo));
      console.log(chalk.gray(`  No changes`));
    }
  }

  console.log();
  console.log(chalk.bold('─'.repeat(80)));
  
  if (uninstall) {
    console.log(chalk.green(`\n✅ Uninstalled hooks from ${successCount} repositories\n`));
  } else {
    console.log(chalk.green(`\n✅ Installed hooks to ${successCount} repositories\n`));
    if (successCount > 0) {
      console.log(chalk.white('Hooks are symlinked - updates to workspace/hooks/ apply automatically'));
      console.log();
    }
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ Failed:'), error.message);
  process.exit(1);
});
