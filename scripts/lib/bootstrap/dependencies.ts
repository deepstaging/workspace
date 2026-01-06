/**
 * Dependency checking and installation
 */

import { execSync } from 'child_process';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { DependencyCheck, DeepstagingEnv } from './types.js';

export function checkDependencies(): DependencyCheck {
  const required = [
    { name: 'brew', check: 'brew --version' },
    { name: 'gh', check: 'gh --version' },
    { name: 'direnv', check: 'direnv --version' },
    { name: 'jq', check: 'jq --version' },
    { name: 'node', check: 'node --version' },
    { name: 'npm', check: 'npm --version' },
  ];

  const missing: string[] = [];
  const installed: string[] = [];

  for (const dep of required) {
    try {
      execSync(dep.check, { stdio: 'ignore' });
      installed.push(dep.name);
    } catch {
      missing.push(dep.name);
    }
  }

  return { missing, installed };
}

export async function installMissingDependencies(
  check: DependencyCheck,
  env: DeepstagingEnv,
  autoYes: boolean
): Promise<void> {
  if (check.installed.length > 0) {
    console.log(chalk.green(`✓ Installed: ${check.installed.join(', ')}`));
  }

  if (check.missing.length > 0) {
    console.log(chalk.yellow(`⚠️  Missing: ${check.missing.join(', ')}`));

    const shouldInstall = autoYes || await confirm({
      message: 'Install missing dependencies with Homebrew?',
      default: true,
    });

    if (shouldInstall) {
      console.log(chalk.blue('\n📦 Installing dependencies...\n'));
      execSync('brew bundle', { stdio: 'inherit', cwd: env.DEEPSTAGING_ORG_ROOT });
      console.log(chalk.green('\n✅ Dependencies installed\n'));
    } else {
      console.log(chalk.yellow('\n⚠️  Skipping dependency installation. Some features may not work.\n'));
    }
  }
}

export function installNpmDependencies(workspaceDir: string): void {
  console.log(chalk.blue('📦 Installing npm dependencies...\n'));
  execSync('npm install', { stdio: 'inherit', cwd: workspaceDir });
  console.log(chalk.green('\n✅ npm dependencies installed\n'));
}

export function buildTypeScript(workspaceDir: string): void {
  console.log(chalk.blue('🔨 Building TypeScript...\n'));
  execSync('npm run build', { stdio: 'inherit', cwd: workspaceDir });
  console.log(chalk.green('\n✅ TypeScript built\n'));
}

export function checkGitHubAuth(): void {
  console.log(chalk.blue('🔐 Checking GitHub authentication...\n'));
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    console.log(chalk.green('✓ GitHub CLI authenticated\n'));
  } catch {
    console.log(chalk.yellow('⚠️  GitHub CLI not authenticated'));
    console.log(chalk.cyan('   Run: gh auth login\n'));
    throw new Error('GitHub CLI not authenticated');
  }
}
