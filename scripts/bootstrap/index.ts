#!/usr/bin/env tsx

/**
 * Deepstaging Workspace Bootstrap
 * 
 * Sets up the multi-repository workspace environment:
 * - Copies .envrc to parent directory if missing
 * - Validates environment from parent .envrc
 * - Checks for required dependencies
 * - Installs npm dependencies
 * - Discovers and clones repositories
 * - Generates script aliases
 * 
 * Usage:
 *   ./bootstrap.ts [--yes|-y]
 *   npm run bootstrap [-- --yes]
 * 
 * Options:
 *   --yes, -y    Run in non-interactive mode (auto-accept all prompts)
 */

import { join } from 'path';
import chalk from 'chalk';
import { copyEnvrcIfMissing, loadEnvFromEnvrc, validateEnvironment } from '../lib/bootstrap/environment.js';
import { checkDependencies, installMissingDependencies, installNpmDependencies, buildTypeScript, checkGitHubAuth } from '../lib/bootstrap/dependencies.js';
import { createDirectoryStructure } from '../lib/bootstrap/directories.js';
import { discoverAndCloneRepositories } from '../lib/bootstrap/repositories.js';
import { generateScriptAliases, configureDirenv, runEnvironmentCheck, printSuccessMessage } from '../lib/bootstrap/finalize.js';

async function main() {
  const args = process.argv.slice(2);
  const autoYes = args.includes('--yes') || args.includes('-y');

  console.log(chalk.bold.blue('🚀 Deepstaging Workspace Bootstrap'));
  console.log(chalk.blue('═'.repeat(40)));
  if (autoYes) {
    console.log(chalk.cyan('Running in non-interactive mode (--yes)\n'));
  }

  const orgRoot = join(process.cwd(), '..');
  const workspaceDir = process.cwd();
  const envrcPath = join(orgRoot, '.envrc');

  try {
    // Step 1: Copy .envrc if missing
    copyEnvrcIfMissing(orgRoot, workspaceDir);

    // Step 2: Load and validate environment
    console.log(chalk.blue('📂 Loading environment from parent .envrc...\n'));
    const env = loadEnvFromEnvrc(envrcPath, orgRoot);
    
    if (!validateEnvironment(env)) {
      throw new Error('Environment validation failed');
    }

    // Step 3: Check and install dependencies
    console.log(chalk.blue('\n🔍 Checking dependencies...\n'));
    const depCheck = checkDependencies();
    await installMissingDependencies(depCheck, env, autoYes);

    // Step 4: Install npm dependencies
    installNpmDependencies(env.DEEPSTAGING_WORKSPACE_DIR);

    // Step 5: Create directory structure
    createDirectoryStructure(env);

    // Step 6: Build TypeScript
    buildTypeScript(env.DEEPSTAGING_WORKSPACE_DIR);

    // Step 7: Check GitHub auth
    checkGitHubAuth();

    // Step 8: Discover and clone repositories
    await discoverAndCloneRepositories(env, autoYes);

    // Step 9: Generate script aliases
    generateScriptAliases(env);

    // Step 10: Configure direnv
    configureDirenv(env.DEEPSTAGING_ORG_ROOT);

    // Step 11: Run environment check
    runEnvironmentCheck(env);

    // Success!
    printSuccessMessage();
  } catch (error) {
    console.error(chalk.red('❌ Bootstrap failed:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red('❌ Bootstrap failed:'), error instanceof Error ? error.message : error);
  process.exit(1);
});
