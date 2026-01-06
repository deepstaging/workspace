/**
 * Environment setup and validation
 */

import { existsSync, readFileSync, copyFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { DeepstagingEnv } from './types.js';

export function copyEnvrcIfMissing(orgRoot: string, workspaceDir: string): void {
  const envrcPath = join(orgRoot, '.envrc');
  const workspaceEnvrcPath = join(workspaceDir, '.envrc');

  if (!existsSync(envrcPath)) {
    console.log(chalk.blue('📂 Setting up .envrc in parent directory...\n'));
    
    if (!existsSync(workspaceEnvrcPath)) {
      throw new Error(`Template .envrc not found at: ${workspaceEnvrcPath}`);
    }

    copyFileSync(workspaceEnvrcPath, envrcPath);
    console.log(chalk.green(`✓ Copied .envrc to: ${envrcPath}\n`));
  } else {
    console.log(chalk.gray(`✓ .envrc already exists at: ${envrcPath}\n`));
  }
}

export function copyAgentsGuide(orgRoot: string, workspaceDir: string): void {
  const agentsPath = join(orgRoot, 'AGENTS.md');
  const templatePath = join(workspaceDir, 'templates', 'AGENTS.md');

  if (!existsSync(agentsPath)) {
    if (!existsSync(templatePath)) {
      console.log(chalk.yellow('⚠️  AGENTS.md template not found, skipping'));
      return;
    }

    copyFileSync(templatePath, agentsPath);
    console.log(chalk.green(`✓ Copied AGENTS.md to: ${agentsPath}\n`));
  } else {
    console.log(chalk.gray(`✓ AGENTS.md already exists at: ${agentsPath}\n`));
  }
}

export function loadEnvFromEnvrc(envrcPath: string, orgRoot: string): DeepstagingEnv {
  if (!existsSync(envrcPath)) {
    throw new Error(`.envrc not found at: ${envrcPath}`);
  }

  const content = readFileSync(envrcPath, 'utf-8');
  const env: Partial<DeepstagingEnv> = {};

  // Parse environment variables from .envrc
  const exportRegex = /export\s+(\w+)="([^"]+)"/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    const [, key, value] = match;
    if (key.startsWith('DEEPSTAGING_')) {
      // Evaluate $(pwd) as orgRoot
      let evaluatedValue = value.replace(/\$\(pwd\)/g, orgRoot);
      // Evaluate variable references
      evaluatedValue = evaluatedValue.replace(/\$\{?(\w+)\}?/g, (_, varName) => {
        return env[varName as keyof DeepstagingEnv] || process.env[varName] || '';
      });
      env[key as keyof DeepstagingEnv] = evaluatedValue;
    }
  }

  // Validate required variables
  const required: (keyof DeepstagingEnv)[] = [
    'DEEPSTAGING_ORG_ROOT',
    'DEEPSTAGING_WORKSPACE_DIR',
    'DEEPSTAGING_REPOSITORIES_DIR',
    'DEEPSTAGING_GITHUB_ORG',
    'DEEPSTAGING_LOCAL_NUGET_FEED',
    'DEEPSTAGING_ARTIFACTS_DIR',
  ];

  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return env as DeepstagingEnv;
}

export function validateEnvironment(env: DeepstagingEnv): boolean {
  console.log(chalk.blue('\n📋 Validating environment...\n'));

  let valid = true;

  // Check ORG_ROOT exists
  if (!existsSync(env.DEEPSTAGING_ORG_ROOT)) {
    console.error(chalk.red(`❌ DEEPSTAGING_ORG_ROOT does not exist: ${env.DEEPSTAGING_ORG_ROOT}`));
    valid = false;
  } else {
    console.log(chalk.green(`✓ DEEPSTAGING_ORG_ROOT: ${env.DEEPSTAGING_ORG_ROOT}`));
  }

  // Check WORKSPACE_DIR exists
  if (!existsSync(env.DEEPSTAGING_WORKSPACE_DIR)) {
    console.error(chalk.red(`❌ DEEPSTAGING_WORKSPACE_DIR does not exist: ${env.DEEPSTAGING_WORKSPACE_DIR}`));
    valid = false;
  } else {
    console.log(chalk.green(`✓ DEEPSTAGING_WORKSPACE_DIR: ${env.DEEPSTAGING_WORKSPACE_DIR}`));
  }

  // REPOSITORIES_DIR may not exist yet (we'll create it)
  console.log(chalk.cyan(`  DEEPSTAGING_REPOSITORIES_DIR: ${env.DEEPSTAGING_REPOSITORIES_DIR}`));

  // Show other vars
  console.log(chalk.cyan(`  DEEPSTAGING_GITHUB_ORG: ${env.DEEPSTAGING_GITHUB_ORG}`));
  console.log(chalk.cyan(`  DEEPSTAGING_LOCAL_NUGET_FEED: ${env.DEEPSTAGING_LOCAL_NUGET_FEED}`));
  console.log(chalk.cyan(`  DEEPSTAGING_ARTIFACTS_DIR: ${env.DEEPSTAGING_ARTIFACTS_DIR}`));

  return valid;
}
