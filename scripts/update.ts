#!/usr/bin/env tsx

/**
 * Update Workspace
 * 
 * Pull latest workspace changes from GitHub and rebuild
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

function main() {
  console.log(chalk.bold.blue('\n🔄 Update Workspace\n'));

  const workspaceDir = process.env.DEEPSTAGING_WORKSPACE_DIR || process.cwd();

  // Pull latest changes
  const pullSpinner = ora('Pulling latest changes from GitHub...').start();
  try {
    execSync('git pull', { 
      cwd: workspaceDir, 
      stdio: 'pipe',
      encoding: 'utf8' 
    });
    pullSpinner.succeed('Pulled latest changes');
  } catch (error: any) {
    pullSpinner.fail('Failed to pull changes');
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  // Install dependencies
  const npmSpinner = ora('Installing npm dependencies...').start();
  try {
    execSync('npm install', { 
      cwd: workspaceDir, 
      stdio: 'pipe',
      encoding: 'utf8' 
    });
    npmSpinner.succeed('Dependencies installed');
  } catch (error: any) {
    npmSpinner.fail('Failed to install dependencies');
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  // Build TypeScript
  const buildSpinner = ora('Building TypeScript...').start();
  try {
    execSync('npm run build', { 
      cwd: workspaceDir, 
      stdio: 'pipe',
      encoding: 'utf8' 
    });
    buildSpinner.succeed('TypeScript built');
  } catch (error: any) {
    buildSpinner.fail('Failed to build');
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  console.log(chalk.bold.green('\n✅ Workspace updated successfully!\n'));
}

main();
